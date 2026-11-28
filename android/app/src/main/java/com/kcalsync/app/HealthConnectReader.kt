package com.kcalsync.app

import android.content.Context
import android.os.Build
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSegment
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.metadata.DataOrigin
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.Period
import java.time.ZoneId
import java.util.function.Consumer
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.reflect.KClass

/**
 * Read-only Health Connect helper. All Health Connect SDK calls are guarded for API >= 26
 * and executed on Dispatchers.IO.
 *
 * Uses Health Connect's native aggregation engine (never raw DistanceRecord summation) and groups
 * workouts by (local date, exerciseType) with overlapping-interval merging so duplicate sources
 * or repeated syncs never inflate totals or exceed Health Connect's request quota.
 */
object HealthConnectReader {
    private const val TAG = "KakcalHC"
    private const val MAX_NON_WALKING_AGG_CALLS = 24
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    @JvmStatic
    val READ_PERMISSIONS: Set<String> = setOf(
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
    )

    @JvmStatic
    fun getSettingsAction(): String = HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS

    @JvmStatic
    fun getSdkStatusCode(context: Context): Int {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return HealthConnectClient.SDK_UNAVAILABLE
        }
        return HealthConnectClient.getSdkStatus(context)
    }

    @JvmStatic
    fun getStatus(
        context: Context,
        onSuccess: Consumer<JSONObject>,
        onError: Consumer<Throwable>,
    ) {
        scope.launch {
            try {
                val result = JSONObject()
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                    result.put("status", "unsupported")
                    result.put("granted", false)
                    onSuccess.accept(result)
                    return@launch
                }
                when (HealthConnectClient.getSdkStatus(context)) {
                    HealthConnectClient.SDK_UNAVAILABLE -> {
                        result.put("status", "unsupported")
                        result.put("granted", false)
                    }
                    HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> {
                        result.put("status", "needs_install")
                        result.put("granted", false)
                    }
                    HealthConnectClient.SDK_AVAILABLE -> {
                        val client = HealthConnectClient.getOrCreate(context)
                        val grantedPerms = client.permissionController.getGrantedPermissions()
                        val allGranted = grantedPerms.containsAll(READ_PERMISSIONS)
                        result.put("status", "available")
                        result.put("granted", allGranted)
                        result.put("grantedPermissions", JSONArray(grantedPerms.toList()))
                    }
                    else -> {
                        result.put("status", "unsupported")
                        result.put("granted", false)
                    }
                }
                onSuccess.accept(result)
            } catch (t: Throwable) {
                onError.accept(t)
            }
        }
    }

    @JvmStatic
    fun readMovement(
        context: Context,
        fromDateIso: String,
        toDateIso: String,
        onSuccess: Consumer<JSONObject>,
        onError: Consumer<Throwable>,
    ) {
        scope.launch {
            try {
                val result = JSONObject()
                val workoutsJson = JSONArray()
                val dailyJson = JSONArray()

                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
                    HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE
                ) {
                    result.put("workouts", workoutsJson)
                    result.put("daily", dailyJson)
                    onSuccess.accept(result)
                    return@launch
                }

                val client = HealthConnectClient.getOrCreate(context)
                val granted = client.permissionController.getGrantedPermissions()
                val permExercise = HealthPermission.getReadPermission(ExerciseSessionRecord::class)
                val permSteps = HealthPermission.getReadPermission(StepsRecord::class)
                val permDistance = HealthPermission.getReadPermission(DistanceRecord::class)
                val permActiveCal = HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class)
                val permTotalCal = HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class)

                if (granted.none { it in READ_PERMISSIONS }) {
                    Log.w(TAG, "No Health Connect read permissions granted")
                    result.put("workouts", workoutsJson)
                    result.put("daily", dailyJson)
                    onSuccess.accept(result)
                    return@launch
                }

                val zone = ZoneId.systemDefault()
                val fromDate = LocalDate.parse(fromDateIso)
                val toDate = LocalDate.parse(toDateIso)
                if (toDate.isBefore(fromDate)) {
                    result.put("workouts", workoutsJson)
                    result.put("daily", dailyJson)
                    onSuccess.accept(result)
                    return@launch
                }

                val nowInstant = Instant.now()
                val rangeStart = fromDate.atStartOfDay(zone).toInstant()
                val rawRangeEnd = toDate.plusDays(1).atStartOfDay(zone).toInstant()
                val rangeEnd = if (rawRangeEnd.isAfter(nowInstant)) nowInstant else rawRangeEnd

                // 1. Read ExerciseSessionRecords in [rangeStart, rangeEnd]
                val sessions = if (permExercise in granted && rangeEnd.isAfter(rangeStart)) {
                    readAllRecords(client, ExerciseSessionRecord::class, TimeRangeFilter.between(rangeStart, rangeEnd))
                } else {
                    emptyList()
                }

                // Walking sessions (EXERCISE_TYPE_WALKING) are combined with all-day walking into a single
                // daily Walking entry derived from Health Connect's deduplicated daily total (minus non-walking
                // workouts). That avoids both extra API calls and overlapping-walk double-counting.
                val walkingDurationByDay = mutableMapOf<String, Int>()
                val walkingIntervalsByDay = mutableMapOf<String, MutableList<Pair<Long, Long>>>()

                // Non-walking sessions grouped by (localDate, exerciseType)
                val nonWalkingByGroup = linkedMapOf<Pair<String, Int>, MutableList<ExerciseSessionRecord>>()

                for (session in sessions) {
                    val startMs = session.startTime.toEpochMilli()
                    val endMs = session.endTime.toEpochMilli()
                    if (endMs <= startMs) continue
                    val localDate = session.startTime.atZone(zone).toLocalDate().toString()

                    if (session.exerciseType == ExerciseSessionRecord.EXERCISE_TYPE_WALKING) {
                        walkingIntervalsByDay.getOrPut(localDate) { mutableListOf() }.add(startMs to endMs)
                    } else {
                        nonWalkingByGroup.getOrPut(localDate to session.exerciseType) { mutableListOf() }.add(session)
                    }
                }

                for ((dayStr, ivs) in walkingIntervalsByDay) {
                    val merged = mergeIntervals(ivs)
                    val mins = (merged.sumOf { (s, e) -> e - s } / 60000.0).roundToInt()
                    if (mins > 0) walkingDurationByDay[dayStr] = mins
                }

                val workoutMetrics = buildSet {
                    if (permSteps in granted) add(StepsRecord.COUNT_TOTAL)
                    if (permDistance in granted) add(DistanceRecord.DISTANCE_TOTAL)
                    if (permActiveCal in granted) add(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL)
                    if (permTotalCal in granted) add(TotalCaloriesBurnedRecord.ENERGY_TOTAL)
                }

                // Track per-day non-walking workout totals to subtract from the single daily aggregate
                val nonWalkStepsByDay = mutableMapOf<String, Long>()
                val nonWalkMetersByDay = mutableMapOf<String, Double>()
                val nonWalkActiveKcalByDay = mutableMapOf<String, Double>()
                var aggCallsUsed = 0

                for ((key, groupSessions) in nonWalkingByGroup) {
                    val (localDate, exerciseType) = key
                    val mergedIntervals = mergeIntervals(
                        groupSessions.map { it.startTime.toEpochMilli() to it.endTime.toEpochMilli() }
                    )
                    if (mergedIntervals.isEmpty()) continue

                    val earliestStartMs = mergedIntervals.first().first
                    val latestEndMs = mergedIntervals.last().second

                    // Subtract pause segments only when sessions do not overlap heavily
                    val pausedMs = groupSessions.sumOf { s ->
                        s.segments
                            .filter { it.segmentType == ExerciseSegment.EXERCISE_SEGMENT_TYPE_PAUSE }
                            .sumOf { Duration.between(it.startTime, it.endTime).toMillis().coerceAtLeast(0L) }
                    }
                    val mergedSpanMs = mergedIntervals.sumOf { (s, e) -> (e - s).coerceAtLeast(0L) }
                    val activeMs = (mergedSpanMs - min(pausedMs, mergedSpanMs / 2)).coerceAtLeast(0L)
                    val durationMin = (activeMs / 60000.0).roundToInt().coerceAtLeast(1)

                    var groupSteps = 0L
                    var groupMeters = 0.0
                    var groupActiveKcal = 0.0
                    var groupTotalKcal = 0.0

                    if (workoutMetrics.isNotEmpty()) {
                        for ((ivStart, ivEnd) in mergedIntervals) {
                            if (aggCallsUsed >= MAX_NON_WALKING_AGG_CALLS) break
                            try {
                                aggCallsUsed++
                                val agg = client.aggregate(
                                    AggregateRequest(
                                        metrics = workoutMetrics,
                                        timeRangeFilter = TimeRangeFilter.between(
                                            Instant.ofEpochMilli(ivStart),
                                            Instant.ofEpochMilli(ivEnd),
                                        ),
                                    )
                                )
                                groupSteps += agg[StepsRecord.COUNT_TOTAL] ?: 0L
                                groupMeters += agg[DistanceRecord.DISTANCE_TOTAL]?.inMeters ?: 0.0
                                groupActiveKcal += agg[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories ?: 0.0
                                groupTotalKcal += agg[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories ?: 0.0
                            } catch (t: Throwable) {
                                Log.w(TAG, "Workout aggregate failed for $localDate type=$exerciseType", t)
                            }
                        }
                    }

                    nonWalkStepsByDay[localDate] = (nonWalkStepsByDay[localDate] ?: 0L) + groupSteps
                    nonWalkMetersByDay[localDate] = (nonWalkMetersByDay[localDate] ?: 0.0) + groupMeters
                    nonWalkActiveKcalByDay[localDate] = (nonWalkActiveKcalByDay[localDate] ?: 0.0) + groupActiveKcal

                    val distanceKm = groupMeters / 1000.0
                    val caloriesBurned = when {
                        groupActiveKcal > 0.0 -> groupActiveKcal
                        groupTotalKcal > 0.0 -> groupTotalKcal
                        else -> 0.0
                    }
                    val title = groupSessions.firstNotNullOfOrNull { it.title?.takeIf { t -> t.isNotBlank() } }

                    val item = JSONObject().apply {
                        put("externalId", "hc-type:$localDate:ex:$exerciseType")
                        put("date", localDate)
                        put("timestamp", Instant.ofEpochMilli(earliestStartMs).toString())
                        put("exerciseType", exerciseType)
                        if (title != null) put("title", title)
                        put("durationMin", durationMin)
                        if (distanceKm > 0.0 && distanceKm.isFinite()) {
                            put("distanceKm", (distanceKm * 100.0).roundToInt() / 100.0)
                        }
                        put("caloriesBurned", if (caloriesBurned.isFinite()) caloriesBurned.roundToInt() else 0)
                        put("startEpochMs", earliestStartMs)
                        put("endEpochMs", latestEndMs)
                    }
                    workoutsJson.put(item)
                }

                // 2. Single AggregateGroupByPeriod call for all 7 days' deduplicated walking / daily movement
                val dailyMetrics = buildSet {
                    if (permSteps in granted) add(StepsRecord.COUNT_TOTAL)
                    if (permDistance in granted) add(DistanceRecord.DISTANCE_TOTAL)
                    if (permActiveCal in granted) add(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL)
                }

                if (dailyMetrics.isNotEmpty()) {
                    val localStart = fromDate.atStartOfDay()
                    val nowLocal = LocalDateTime.ofInstant(nowInstant, zone)
                    val rawLocalEnd = toDate.plusDays(1).atStartOfDay()
                    val localEnd = if (rawLocalEnd.isAfter(nowLocal)) nowLocal else rawLocalEnd

                    if (localEnd.isAfter(localStart)) {
                        val buckets = client.aggregateGroupByPeriod(
                            AggregateGroupByPeriodRequest(
                                metrics = dailyMetrics,
                                timeRangeFilter = TimeRangeFilter.between(localStart, localEnd),
                                timeRangeSlicer = Period.ofDays(1),
                            )
                        )
                        for (bucket in buckets) {
                            val dayStr = bucket.startTime.toLocalDate().toString()
                            val totalSteps = bucket.result[StepsRecord.COUNT_TOTAL] ?: 0L
                            var totalMeters = bucket.result[DistanceRecord.DISTANCE_TOTAL]?.inMeters ?: 0.0
                            val totalActiveKcal = bucket.result[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories ?: 0.0

                            // Guard against multi-source DistanceRecord inflation (e.g. phone + watch + Fit writing
                            // staggered non-overlapping distance blocks so total distance exceeds ~1.5 m/step).
                            val origins = bucket.result.dataOrigins
                            val nonWalkMeters = nonWalkMetersByDay[dayStr] ?: 0.0
                            val rawWalkMeters = (totalMeters - nonWalkMeters).coerceAtLeast(0.0)
                            val walkSteps = (totalSteps - (nonWalkStepsByDay[dayStr] ?: 0L)).coerceAtLeast(0L)
                            if (permDistance in granted && origins.size > 1 && walkSteps > 200 && rawWalkMeters > walkSteps * 1.5) {
                                val resolved = resolveBestOriginDistance(
                                    client,
                                    bucket.startTime,
                                    bucket.endTime,
                                    origins,
                                    expectedMeters = walkSteps * 0.75 + nonWalkMeters,
                                )
                                if (resolved != null) {
                                    Log.d(TAG, "Adjusted multi-origin distance on $dayStr from ${totalMeters}m to ${resolved}m (origins=${origins.map { it.packageName }})")
                                    totalMeters = resolved
                                }
                            }

                            val distanceMeters = (totalMeters - nonWalkMeters).coerceAtLeast(0.0)
                            val activeKcal = (totalActiveKcal - (nonWalkActiveKcalByDay[dayStr] ?: 0.0)).coerceAtLeast(0.0)

                            val distanceKm = if (distanceMeters.isFinite()) {
                                (distanceMeters / 1000.0 * 100.0).roundToInt() / 100.0
                            } else {
                                0.0
                            }
                            val caloriesRounded = if (activeKcal.isFinite()) activeKcal.roundToInt() else 0
                            val walkMins = walkingDurationByDay[dayStr]

                            if (walkSteps > 0L || distanceKm > 0.0 || caloriesRounded > 0 || (walkMins != null && walkMins > 0)) {
                                val dailyItem = JSONObject().apply {
                                    put("externalId", "hc-daily:$dayStr")
                                    put("date", dayStr)
                                    put("steps", walkSteps)
                                    if (distanceKm > 0.0) put("distanceKm", distanceKm)
                                    if (walkMins != null && walkMins > 0) put("durationMin", walkMins)
                                    put("caloriesBurned", caloriesRounded)
                                }
                                dailyJson.put(dailyItem)
                            }
                        }
                    }
                }

                Log.d(TAG, "Read ${workoutsJson.length()} grouped workouts and ${dailyJson.length()} daily walking entries for $fromDateIso..$toDateIso")
                result.put("workouts", workoutsJson)
                result.put("daily", dailyJson)
                onSuccess.accept(result)
            } catch (t: Throwable) {
                Log.e(TAG, "readMovement failed", t)
                onError.accept(t)
            }
        }
    }

    /**
     * When multiple apps contribute non-overlapping DistanceRecords for the same day and the combined
     * sum is implausibly high relative to steps, pick the single origin whose total is most plausible.
     */
    private suspend fun resolveBestOriginDistance(
        client: HealthConnectClient,
        start: LocalDateTime,
        end: LocalDateTime,
        origins: Set<DataOrigin>,
        expectedMeters: Double,
    ): Double? {
        var bestMeters: Double? = null
        var bestDiff = Double.MAX_VALUE
        for (origin in origins.take(4)) {
            try {
                val agg = client.aggregate(
                    AggregateRequest(
                        metrics = setOf(DistanceRecord.DISTANCE_TOTAL),
                        timeRangeFilter = TimeRangeFilter.between(start, end),
                        dataOriginFilter = setOf(origin),
                    )
                )
                val meters = agg[DistanceRecord.DISTANCE_TOTAL]?.inMeters ?: 0.0
                if (meters > 0.0 && meters.isFinite()) {
                    val diff = abs(meters - expectedMeters)
                    if (diff < bestDiff) {
                        bestDiff = diff
                        bestMeters = meters
                    }
                }
            } catch (t: Throwable) {
                Log.w(TAG, "Origin distance probe failed for ${origin.packageName}", t)
            }
        }
        return bestMeters
    }

    private suspend fun <T : Record> readAllRecords(
        client: HealthConnectClient,
        recordType: KClass<T>,
        filter: TimeRangeFilter,
        maxPages: Int = 5,
    ): List<T> {
        val out = mutableListOf<T>()
        var pageToken: String? = null
        var pages = 0
        do {
            val response = client.readRecords(
                ReadRecordsRequest(
                    recordType = recordType,
                    timeRangeFilter = filter,
                    pageToken = pageToken,
                )
            )
            out.addAll(response.records)
            pageToken = response.pageToken
            pages++
        } while (pageToken != null && pages < maxPages)
        return out
    }

    /** Merges overlapping or adjacent [start, end] millisecond intervals. */
    internal fun mergeIntervals(intervals: List<Pair<Long, Long>>): List<Pair<Long, Long>> {
        val sorted = intervals.filter { (s, e) -> e > s }.sortedBy { it.first }
        if (sorted.isEmpty()) return emptyList()
        val merged = mutableListOf<Pair<Long, Long>>()
        for (iv in sorted) {
            if (merged.isEmpty() || iv.first > merged.last().second) {
                merged.add(iv)
            } else {
                val last = merged.removeAt(merged.lastIndex)
                merged.add(last.first to max(last.second, iv.second))
            }
        }
        return merged
    }
}
