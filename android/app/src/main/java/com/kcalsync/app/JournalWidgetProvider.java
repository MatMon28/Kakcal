package com.kcalsync.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import org.json.JSONException;
import org.json.JSONObject;

/** Launcher-owned RemoteViews. No WebView, network, or journal parsing in the launcher. */
public abstract class JournalWidgetProvider extends AppWidgetProvider {
    public static final class Small extends JournalWidgetProvider {}
    public static final class Essential extends JournalWidgetProvider {}
    public static final class Large extends JournalWidgetProvider {}

    static final String OPEN_ACTION = "com.kcalsync.app.OPEN_WIDGET_ACTION";
    static final String EXTRA_ACTION = "widgetAction";
    /** The only numbers the journal writes for the widgets. */
    static final String[] NUTRIENTS = {
        "calories", "burnedCalories", "proteinGrams", "carbsGrams", "fatGrams",
        "proteinPercent", "carbsPercent", "fatPercent",
    };
    private static final String MIDNIGHT = "com.kcalsync.app.WIDGET_NEW_DAY";
    private static final String[] ACTIONS = { "food", "movement", "water", "poop", "weight" };
    private static final int[] BUTTONS = { R.id.widget_food, R.id.widget_movement, R.id.widget_water, R.id.widget_poop, R.id.widget_weight };
    private static final int[] LABELS = { R.string.widget_food, R.string.widget_movement, R.string.widget_water, R.string.widget_poop, R.string.widget_weight };

    static SharedPreferences store(Context context) {
        return context.getSharedPreferences("widget_nutrition_v1", Context.MODE_PRIVATE);
    }

    static String localDate() { return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()); }

    static String actionFrom(Intent intent) {
        if (intent == null || !OPEN_ACTION.equals(intent.getAction())) return null;
        String value = intent.getStringExtra(EXTRA_ACTION);
        for (String action : ACTIONS) if (action.equals(value)) return action;
        return null;
    }

    static void refresh(Context context, boolean includeShortcuts) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        if (includeShortcuts) {
            refreshType(context, manager, Small.class);
            refreshType(context, manager, Essential.class);
        }
        refreshType(context, manager, Large.class);
    }

    private static void refreshType(Context context, AppWidgetManager manager, Class<?> type) {
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, type));
        if (ids.length != 0) manager.updateAppWidget(ids, views(context, type));
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        if (ids.length != 0) manager.updateAppWidget(ids, views(context, getClass()));
        if (this instanceof Large) scheduleNextDay(context);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        manager.updateAppWidget(id, views(context, getClass()));
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (this instanceof Large && (MIDNIGHT.equals(action) || Intent.ACTION_DATE_CHANGED.equals(action) ||
            Intent.ACTION_TIME_CHANGED.equals(action) || Intent.ACTION_TIMEZONE_CHANGED.equals(action) ||
            Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action))) {
            refresh(context, true);
            scheduleNextDay(context);
        }
    }

    private static PendingIntent dayAlarm(Context context) {
        return PendingIntent.getBroadcast(context, 0, new Intent(context, Large.class).setAction(MIDNIGHT),
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static void scheduleNextDay(Context context) {
        int[] ids = AppWidgetManager.getInstance(context).getAppWidgetIds(new ComponentName(context, Large.class));
        if (ids.length == 0) return;
        Calendar next = Calendar.getInstance();
        next.add(Calendar.DATE, 1);
        next.set(Calendar.HOUR_OF_DAY, 0); next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 0); next.set(Calendar.MILLISECOND, 0);
        // Inexact and non-waking: no exact-alarm permission or always-running service.
        context.getSystemService(AlarmManager.class).set(AlarmManager.RTC, next.getTimeInMillis(), dayAlarm(context));
    }

    @Override
    public void onDisabled(Context context) {
        if (this instanceof Large) context.getSystemService(AlarmManager.class).cancel(dayAlarm(context));
    }

    private static RemoteViews views(Context context, Class<?> type) {
        boolean large = type == Large.class;
        boolean essential = type == Essential.class;
        RemoteViews view = new RemoteViews(context.getPackageName(), large ? R.layout.widget_large :
            essential ? R.layout.widget_essential : R.layout.widget_small);
        SharedPreferences prefs = store(context);
        Locale locale = "it".equals(prefs.getString("language", "en")) ? Locale.ITALIAN : Locale.ENGLISH;
        Configuration config = new Configuration(context.getResources().getConfiguration());
        config.setLocale(locale);
        Resources strings = context.createConfigurationContext(config).getResources();
        for (int i = 0; i < ACTIONS.length; i++) {
            if (essential && (i == 1 || i == 4)) continue;
            Intent open = new Intent(context, MainActivity.class).setAction(OPEN_ACTION)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra(EXTRA_ACTION, ACTIONS[i]);
            view.setOnClickPendingIntent(BUTTONS[i], PendingIntent.getActivity(context, 100 + i, open,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
            view.setContentDescription(BUTTONS[i], strings.getString(LABELS[i]));
        }
        if (large) bindLarge(view, strings, prefs, locale);
        return view;
    }

    /**
     * The same arrangement as Today in Ultra minimal mode: intake and burned cards,
     * then carbs, protein and fat. Missing days show zero intake and the BMR as burned.
     */
    private static void bindLarge(RemoteViews view, Resources strings, SharedPreferences prefs, Locale locale) {
        JSONObject day = null;
        try {
            day = new JSONObject(prefs.getString("days", "{}")).optJSONObject(localDate());
        } catch (JSONException ignored) {
            /* An unreadable cache shows an empty day, never yesterday's values. */
        }
        double bmr = prefs.getFloat("bmr", 0f);
        double intake = day != null ? day.optDouble("calories", 0) : 0;
        double burned = day != null ? day.optDouble("burnedCalories", bmr) : bmr;
        double net = intake - burned;
        NumberFormat whole = NumberFormat.getIntegerInstance(locale);
        NumberFormat tenth = NumberFormat.getNumberInstance(locale);
        tenth.setMaximumFractionDigits(1);
        double scale = Math.max(Math.max(intake, burned), 1);

        String intakeText = whole.format(Math.round(intake));
        String burnedText = whole.format(Math.round(burned));
        view.setTextViewText(R.id.widget_intake_value, intakeText);
        view.setTextViewText(R.id.widget_burned_value, burnedText);
        view.setContentDescription(R.id.widget_intake_card, strings.getString(R.string.widget_intake_desc, intakeText));
        view.setContentDescription(R.id.widget_burned_card, strings.getString(R.string.widget_burned_desc, burnedText));

        // Same rule as Today: a surplus badge sits on Intake; otherwise the balance badge sits on Burned.
        boolean surplus = net > 0;
        view.setViewVisibility(R.id.widget_intake_net, surplus ? View.VISIBLE : View.GONE);
        view.setViewVisibility(R.id.widget_burned_net, surplus ? View.GONE : View.VISIBLE);
        if (surplus) {
            view.setTextViewText(R.id.widget_intake_net, "+" + whole.format(Math.round(net)));
        } else {
            view.setTextViewText(R.id.widget_burned_net, Math.round(net) == 0 ? "0" : "-" + whole.format(Math.round(-net)));
        }

        view.setProgressBar(R.id.widget_intake_bar, 100,
            intake > 0 ? (int) Math.max(5, Math.round(intake / scale * 100)) : 0, false);
        view.setProgressBar(R.id.widget_burned_bar, 100,
            (int) Math.max(5, Math.round(burned / scale * 100)), false);

        bindMacro(view, strings, day, "carbs", tenth, whole,
            R.id.widget_carbs_card, R.id.widget_carbs_value, R.id.widget_carbs_percent, R.string.widget_carbs_desc);
        bindMacro(view, strings, day, "protein", tenth, whole,
            R.id.widget_protein_card, R.id.widget_protein_value, R.id.widget_protein_percent, R.string.widget_protein_desc);
        bindMacro(view, strings, day, "fat", tenth, whole,
            R.id.widget_fat_card, R.id.widget_fat_value, R.id.widget_fat_percent, R.string.widget_fat_desc);
    }

    private static void bindMacro(RemoteViews view, Resources strings, JSONObject day, String key,
                                  NumberFormat tenth, NumberFormat whole,
                                  int card, int value, int percent, int description) {
        double grams = day != null ? day.optDouble(key + "Grams", 0) : 0;
        double share = day != null ? day.optDouble(key + "Percent", 0) : 0;
        String gramText = tenth.format(grams);
        String shareText = whole.format(Math.round(share));
        view.setTextViewText(value, gramText);
        view.setTextViewText(percent, shareText + "%");
        view.setContentDescription(card, strings.getString(description, gramText, shareText));
    }
}
