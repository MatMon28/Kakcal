package com.kcalsync.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.Log;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import androidx.health.connect.client.HealthConnectClient;
import com.getcapacitor.Bridge;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginHandle;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "JournalDevice")
public class JournalDevicePlugin extends Plugin {
    /** Stores the app's current background colour (`#rrggbb`) for the native launch surfaces, see LaunchBackground. */
    @PluginMethod
    public void setLaunchBackground(PluginCall call) {
        if (LaunchBackground.save(getContext(), call.getString("color"))) call.resolve();
        else call.reject("Expected a #rrggbb colour");
    }

    @PluginMethod
    public void takeWidgetAction(PluginCall call) {
        JSObject result = new JSObject();
        result.put("action", ((MainActivity) getActivity()).takeWidgetAction());
        call.resolve(result);
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        if (JournalWidgetProvider.OPEN_ACTION.equals(intent.getAction())) {
            // The payload stays in MainActivity until a ready web listener takes it once.
            notifyListeners("widgetActionAvailable", new JSObject());
        }
    }

    /**
     * Stores dated numeric totals for the widgets: no meal names, notes, weight or cycle data,
     * plus the two widget appearance settings (`widgetStyle` light/dark, `widgetCustomButton`).
     * `bmr` is the burned figure for a day with no entries, so the widget matches Today.
     */
    @PluginMethod
    public void publishNutrition(PluginCall call) {
        JSObject days = call.getObject("days");
        String language = "it".equals(call.getString("language")) ? "it" : "en";
        double bmr = call.getData().optDouble("bmr", Double.NaN);
        String style = "dark".equals(call.getString("widgetStyle")) ? "dark" : "light";
        String rawThemeStyle = call.getString("themeStyle", "classic");
        String themeStyle = ("angular".equals(rawThemeStyle) || "aurora".equals(rawThemeStyle) || "pop".equals(rawThemeStyle)
                || "playful".equals(rawThemeStyle) || "minimal".equals(rawThemeStyle) || "mono".equals(rawThemeStyle)
                || "glass".equals(rawThemeStyle) || "material".equals(rawThemeStyle))
                ? rawThemeStyle : "classic";
        String rawMonoHue = call.getString("monoHue", "#64748b");
        String monoHue = rawMonoHue != null && rawMonoHue.matches("^#[0-9a-fA-F]{6}$") ? rawMonoHue.toLowerCase() : "#64748b";
        boolean customButton = Boolean.TRUE.equals(call.getBoolean("widgetCustomButton", false));
        if (days == null || !Double.isFinite(bmr) || bmr <= 0) { call.reject("Missing daily nutrition"); return; }
        try {
            JSONObject clean = new JSONObject();
            Iterator<String> dates = days.keys();
            while (dates.hasNext()) {
                String date = dates.next();
                if (!date.matches("\\d{4}-\\d{2}-\\d{2}")) throw new IllegalArgumentException();
                JSONObject input = days.getJSONObject(date);
                JSONObject row = new JSONObject();
                for (String key : JournalWidgetProvider.NUTRIENTS) {
                    double n = input.getDouble(key);
                    if (!Double.isFinite(n) || n < 0) throw new IllegalArgumentException();
                    row.put(key, n);
                }
                clean.put(date, row);
            }
            SharedPreferences store = JournalWidgetProvider.store(getContext());
            String json = clean.toString();
            String signature = language + "|" + bmr + "|" + style + "|" + themeStyle + "|" + monoHue + "|" + customButton + "|" + json;
            if (!signature.equals(store.getString("signature", ""))) {
                if (!store.edit().putString("days", json).putString("language", language)
                        .putFloat("bmr", (float) bmr).putString("widgetStyle", style)
                        .putString("themeStyle", themeStyle).putString("monoHue", monoHue)
                        .putBoolean("widgetCustomButton", customButton).putString("signature", signature).commit()) {
                    call.reject("Could not save widget data");
                    return;
                }
                JournalWidgetProvider.refresh(getContext(), true);
            }
            call.resolve();
        } catch (Exception error) {
            call.reject("Invalid widget nutrition snapshot");
        }
    }

    // ---- Export to a user-chosen file (JSON backup, ZIP, Excel, text) --------------------------------------------
    // Round 2 design (see ExportStore and docs/backup-update.md): the bytes are staged in filesDir under an id, the
    // system "create document" picker is launched by MainActivity (its launcher survives activity re-creation and
    // process death), the result is copied on a background thread in one pass and verified, and the outcome is given
    // to this call, or, when the call is gone, kept for takeLastExport() / the "exportFinished" event.
    private static final Map<String, PluginCall> CALLS = new ConcurrentHashMap<>();

    private static String safeFilename(String requested, String fallback) {
        if (requested == null || requested.trim().isEmpty()) return fallback;
        String clean = requested.replaceAll("[^a-zA-Z0-9._-]", "_");
        return clean.length() > 120 ? fallback : clean;
    }

    private static String mimeType(String kind) {
        switch (kind) {
            case "json": return "application/json";
            case "zip": return "application/zip";
            case "xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "pdf": return "application/pdf";
            default: return "text/plain";
        }
    }

    @PluginMethod
    public void exportFile(PluginCall call) {
        String encoded = call.getString("base64");
        String kind = call.getString("kind", "zip");
        if (encoded == null || encoded.length() > ExportStore.MAX_BYTES / 3 * 4 + 16 || !ExportStore.isKind(kind)) {
            call.reject("Invalid export"); return;
        }
        byte[] bytes;
        try { bytes = Base64.decode(encoded, Base64.DEFAULT); }
        catch (IllegalArgumentException error) { call.reject("Invalid export: the data is not valid base64"); return; }
        call.getData().remove("base64");
        startExport(call, kind, bytes, safeFilename(call.getString("filename"), "kakcal-export." + kind));
    }

    @PluginMethod
    public void exportBackup(PluginCall call) {
        String json = call.getString("json");
        if (json == null || json.trim().isEmpty()) { call.reject("Missing backup"); return; }
        // Keeps the journal out of the Activity's size-limited saved-state Bundle.
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        call.getData().remove("json");
        startExport(call, "json", bytes,
            safeFilename(call.getString("filename"), "kakcal-" + JournalWidgetProvider.localDate() + ".json"));
    }

    /** Stages the bytes (so they exist before the picker does), then opens the picker through MainActivity. */
    private void startExport(PluginCall call, String kind, byte[] bytes, String filename) {
        if (bytes.length == 0) { call.reject("Nothing to export"); return; }
        if (bytes.length > ExportStore.MAX_BYTES) { call.reject("Backup too large"); return; }
        ExportStore store = new ExportStore(getContext());
        final ExportStore.Pending pending;
        try {
            pending = store.stage(kind, filename, bytes);
        } catch (IOException | RuntimeException error) {
            Log.e(ExportStore.TAG, "staging failed", error);
            call.reject("Could not prepare the export: stage " + error.getClass().getSimpleName() + ": " + error.getMessage());
            return;
        }
        if (!(getActivity() instanceof MainActivity)) {
            store.forget(pending.id);
            call.reject("No file picker available");
            return;
        }
        Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType(mimeType(kind))
            .putExtra(Intent.EXTRA_TITLE, filename);
        CALLS.put(pending.id, call);
        store.beginPicker(pending.id);
        ((MainActivity) getActivity()).launchExportPicker(save, error -> {
            Log.e(ExportStore.TAG, "could not open the file picker", error);
            CALLS.remove(pending.id);
            store.takeInflight();
            store.forget(pending.id);
            call.reject("No file picker available: " + error.getClass().getSimpleName() + ": " + error.getMessage());
        });
    }

    /** Outcomes of exports whose call was lost (activity re-created, process killed); read once, then cleared. */
    @PluginMethod
    public void takeLastExport(PluginCall call) {
        try {
            JSObject result = new JSObject();
            result.put("exports", new ExportStore(getContext()).takeLast());
            call.resolve(result);
        } catch (RuntimeException error) {
            call.reject("Could not read the last export");
        }
    }

    // ---- Share a file through the Android share sheet (WhatsApp, email, Drive...) ------------------------------
    // The bytes are written to cache/shared/<filename> (covered by the `cache-path` of res/xml/file_paths.xml), exposed
    // through the app FileProvider with a read grant, and handed to the system chooser. Copies older than an hour are
    // removed on the next share (the receiving app reads the file while the chooser / target is open).
    private static final long SHARED_MAX_AGE_MS = 60L * 60L * 1000L;

    @PluginMethod
    public void shareFile(PluginCall call) {
        String kind = call.getString("kind", "zip");
        if (!ExportStore.isKind(kind)) { call.reject("Invalid share: unsupported kind"); return; }
        String text = call.getString("text");
        String encoded = call.getString("base64");
        byte[] bytes;
        if (text != null) {
            bytes = text.getBytes(StandardCharsets.UTF_8);
        } else {
            if (encoded == null || encoded.length() > ExportStore.MAX_BYTES / 3 * 4 + 16) { call.reject("Invalid share"); return; }
            try { bytes = Base64.decode(encoded, Base64.DEFAULT); }
            catch (IllegalArgumentException error) { call.reject("Invalid share: the data is not valid base64"); return; }
        }
        call.getData().remove("base64");
        call.getData().remove("text");
        if (bytes.length == 0) { call.reject("Nothing to share"); return; }
        if (bytes.length > ExportStore.MAX_BYTES) { call.reject("File too large to share"); return; }
        String filename = safeFilename(call.getString("filename"), "kakcal-export." + kind);
        Activity activity = getActivity();
        if (activity == null) { call.reject("No share sheet available"); return; }
        try {
            File dir = new File(getContext().getCacheDir(), "shared");
            File[] old = dir.listFiles();
            if (old != null) {
                long now = System.currentTimeMillis();
                for (File f : old) if (now - f.lastModified() > SHARED_MAX_AGE_MS) f.delete();
            }
            if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("could not create " + dir);
            File file = new File(dir, filename);
            try (FileOutputStream out = new FileOutputStream(file)) {
                out.write(bytes);
                out.getFD().sync();
            }
            if (file.length() != bytes.length) throw new IOException("wrote " + file.length() + " of " + bytes.length + " bytes");
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
            Intent send = new Intent(Intent.ACTION_SEND)
                .setType(mimeType(kind))
                .putExtra(Intent.EXTRA_STREAM, uri)
                .putExtra(Intent.EXTRA_SUBJECT, filename)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            send.setClipData(ClipData.newRawUri(filename, uri));
            Intent chooser = Intent.createChooser(send, null).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            final int size = bytes.length;
            activity.runOnUiThread(() -> {
                try {
                    activity.startActivity(chooser);
                    JSObject done = new JSObject();
                    done.put("bytes", size);
                    call.resolve(done);
                } catch (RuntimeException error) {
                    Log.e(ExportStore.TAG, "could not open the share sheet", error);
                    call.reject("No share sheet available: " + error.getClass().getSimpleName() + ": " + error.getMessage());
                }
            });
        } catch (IOException | RuntimeException error) {
            Log.e(ExportStore.TAG, "could not prepare the shared file", error);
            call.reject("Could not prepare the file to share: " + error.getClass().getSimpleName() + ": " + error.getMessage());
        }
    }

    /**
     * Hands an outcome to the PluginCall that started the export, or, when that call is gone, keeps it for
     * takeLastExport(), tells a listening web layer and shows a toast (so a recovered export is never silent).
     */
    static void deliver(Context context, Bridge bridge, ExportStore.Outcome outcome) {
        if (outcome == null) return;
        PluginCall call = CALLS.remove(outcome.id);
        if (call != null) {
            try {
                if (ExportStore.Outcome.CANCELLED.equals(outcome.status)) {
                    JSObject cancelled = new JSObject();
                    cancelled.put("cancelled", true);
                    call.resolve(cancelled);
                } else if (ExportStore.Outcome.SAVED.equals(outcome.status)) {
                    JSObject done = new JSObject();
                    done.put("bytes", outcome.bytes);
                    call.resolve(done);
                } else {
                    call.reject(outcome.detail != null ? outcome.detail : "Could not write the selected file");
                }
            } catch (RuntimeException error) {
                Log.e(ExportStore.TAG, "could not answer the web layer", error);
            }
            return;
        }
        if (ExportStore.Outcome.CANCELLED.equals(outcome.status)) return;
        new ExportStore(context).addLast(outcome);
        toast(context, outcome);
        PluginHandle handle = bridge != null ? bridge.getPlugin("JournalDevice") : null;
        if (handle != null && handle.getInstance() instanceof JournalDevicePlugin) {
            ((JournalDevicePlugin) handle.getInstance()).notifyListeners("exportFinished", new JSObject());
        }
    }

    private static void toast(Context context, ExportStore.Outcome outcome) {
        boolean italian = "it".equals(JournalWidgetProvider.store(context).getString("language", "en"));
        boolean saved = ExportStore.Outcome.SAVED.equals(outcome.status);
        String text = saved
            ? (italian ? "File salvato" : "File saved") + (outcome.filename != null ? ": " + outcome.filename : "") + " (" + outcome.bytes + " B)"
            : (italian ? "Esportazione non riuscita. Apri Impostazioni > Backup per i dettagli." : "Export failed. Open Settings > Data Backup for details.");
        new Handler(Looper.getMainLooper()).post(() -> Toast.makeText(context, text, Toast.LENGTH_LONG).show());
    }

    // ---- Health Connect (read-only movement & workouts) ---------------------------------------------------------
    private static final AtomicReference<PluginCall> HEALTH_PERMISSION_CALL = new AtomicReference<>();

    private static void resolveJson(PluginCall call, JSONObject json) {
        try {
            call.resolve(JSObject.fromJSONObject(json));
        } catch (JSONException error) {
            call.reject("Invalid Health Connect response", error);
        }
    }

    @PluginMethod
    public void getHealthConnectStatus(PluginCall call) {
        HealthConnectReader.getStatus(
            getContext(),
            json -> resolveJson(call, json),
            err -> call.reject("Failed to check Health Connect status: " + err.getMessage())
        );
    }

    @PluginMethod
    public void requestHealthConnectPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O
                || HealthConnectReader.getSdkStatusCode(getContext()) != HealthConnectClient.SDK_AVAILABLE
                || !(getActivity() instanceof MainActivity)) {
            JSObject res = new JSObject();
            res.put("granted", false);
            call.resolve(res);
            return;
        }
        PluginCall previous = HEALTH_PERMISSION_CALL.getAndSet(call);
        if (previous != null) {
            JSObject cancelled = new JSObject();
            cancelled.put("granted", false);
            previous.resolve(cancelled);
        }
        ((MainActivity) getActivity()).launchHealthPermissions(
            HealthConnectReader.getREAD_PERMISSIONS(),
            error -> {
                HEALTH_PERMISSION_CALL.compareAndSet(call, null);
                call.reject("Could not open Health Connect permissions: " + error.getMessage());
            }
        );
    }

    static void deliverHealthPermissions(Set<String> granted) {
        PluginCall call = HEALTH_PERMISSION_CALL.getAndSet(null);
        if (call == null) return;
        boolean allGranted = granted != null && granted.containsAll(HealthConnectReader.getREAD_PERMISSIONS());
        JSObject res = new JSObject();
        res.put("granted", allGranted);
        call.resolve(res);
    }

    @PluginMethod
    public void openHealthConnectSettings(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) { call.reject("No activity available"); return; }
        int sdkStatus = HealthConnectReader.getSdkStatusCode(getContext());
        Intent intent;
        if (sdkStatus == HealthConnectClient.SDK_AVAILABLE) {
            intent = new Intent(HealthConnectReader.getSettingsAction());
        } else {
            intent = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.apps.healthdata"));
        }
        activity.runOnUiThread(() -> {
            try {
                activity.startActivity(intent);
                call.resolve();
            } catch (RuntimeException error) {
                try {
                    activity.startActivity(new Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata")
                    ));
                    call.resolve();
                } catch (RuntimeException fallbackError) {
                    call.reject("Could not open Health Connect settings: " + fallbackError.getMessage());
                }
            }
        });
    }

    @PluginMethod
    public void readHealthConnectMovement(PluginCall call) {
        String fromDate = call.getString("fromDate");
        String toDate = call.getString("toDate");
        if (fromDate == null || !fromDate.matches("\\d{4}-\\d{2}-\\d{2}")
                || toDate == null || !toDate.matches("\\d{4}-\\d{2}-\\d{2}")) {
            call.reject("Expected YYYY-MM-DD fromDate and toDate");
            return;
        }
        HealthConnectReader.readMovement(
            getContext(),
            fromDate,
            toDate,
            json -> resolveJson(call, json),
            err -> call.reject("Failed to read Health Connect data: " + err.getMessage())
        );
    }
}
