package com.kcalsync.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.res.ColorStateList;
import android.os.Build;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffColorFilter;
import android.graphics.RectF;
import android.graphics.drawable.Drawable;
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
    public static final class Medium extends JournalWidgetProvider {}

    static final String OPEN_ACTION = "com.kcalsync.app.OPEN_WIDGET_ACTION";
    static final String EXTRA_ACTION = "widgetAction";
    /** The only numbers the journal writes for the widgets. */
    static final String[] NUTRIENTS = {
        "calories", "burnedCalories", "proteinGrams", "carbsGrams", "fatGrams",
        "proteinPercent", "carbsPercent", "fatPercent",
    };
    private static final String MIDNIGHT = "com.kcalsync.app.WIDGET_NEW_DAY";
    /** "custom" is the optional sixth button of the Small and Large widgets (Settings > Widgets). */
    private static final String[] ACTIONS = { "food", "movement", "water", "poop", "weight", "custom" };
    private static final int[] BUTTONS = { R.id.widget_food, R.id.widget_movement, R.id.widget_water, R.id.widget_poop, R.id.widget_weight, R.id.widget_custom };
    private static final int[] LABELS = { R.string.widget_food, R.string.widget_movement, R.string.widget_water, R.string.widget_poop, R.string.widget_weight, R.string.widget_custom };
    private static final int[] ICONS = { R.drawable.widget_food_icon, R.drawable.widget_movement_icon, R.drawable.widget_water_icon, R.drawable.widget_poop_icon, R.drawable.widget_weight_icon, R.drawable.widget_custom_icon };
    /** Same icons without the circular plate; tinted per theme style by renderStyledActionBitmap. */
    private static final int[] GLYPHS = { R.drawable.widget_glyph_food, R.drawable.widget_glyph_movement, R.drawable.widget_glyph_water, R.drawable.widget_glyph_poop, R.drawable.widget_glyph_weight, R.drawable.widget_glyph_custom };

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
        refreshType(context, manager, Medium.class);
    }

    private static void refreshType(Context context, AppWidgetManager manager, Class<?> type) {
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, type));
        if (ids.length != 0) manager.updateAppWidget(ids, views(context, type));
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        if (ids.length != 0) manager.updateAppWidget(ids, views(context, getClass()));
        if (hasDayData()) scheduleNextDay(context);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        manager.updateAppWidget(id, views(context, getClass()));
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (hasDayData() && (MIDNIGHT.equals(action) || Intent.ACTION_DATE_CHANGED.equals(action) ||
            Intent.ACTION_TIME_CHANGED.equals(action) || Intent.ACTION_TIMEZONE_CHANGED.equals(action) ||
            Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action))) {
            refresh(context, true);
            scheduleNextDay(context);
        }
    }

    /** Large and Medium both show the day's totals, so both keep the midnight refresh. */
    private boolean hasDayData() { return this instanceof Large || this instanceof Medium; }

    static int dayWidgetCount(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        return manager.getAppWidgetIds(new ComponentName(context, Large.class)).length
            + manager.getAppWidgetIds(new ComponentName(context, Medium.class)).length;
    }

    private static PendingIntent dayAlarm(Context context) {
        return PendingIntent.getBroadcast(context, 0, new Intent(context, Large.class).setAction(MIDNIGHT),
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static void scheduleNextDay(Context context) {
        if (dayWidgetCount(context) == 0) return;
        Calendar next = Calendar.getInstance();
        next.add(Calendar.DATE, 1);
        next.set(Calendar.HOUR_OF_DAY, 0); next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 0); next.set(Calendar.MILLISECOND, 0);
        // Inexact and non-waking: no exact-alarm permission or always-running service.
        context.getSystemService(AlarmManager.class).set(AlarmManager.RTC, next.getTimeInMillis(), dayAlarm(context));
    }

    @Override
    public void onDisabled(Context context) {
        if (dayWidgetCount(context) == 0) context.getSystemService(AlarmManager.class).cancel(dayAlarm(context));
    }

    private static RemoteViews views(Context context, Class<?> type) {
        // "large" here means a day-total widget: Large or Medium.
        boolean large = type == Large.class || type == Medium.class;
        boolean medium = type == Medium.class;
        boolean essential = type == Essential.class;
        SharedPreferences prefs = store(context);
        // Settings > Widgets: a darker translucent look, and the optional custom-tracker button.
        boolean dark = "dark".equals(prefs.getString("widgetStyle", "light"));
        String themeStyle = prefs.getString("themeStyle", "classic");
        String monoHue = prefs.getString("monoHue", "#64748b");
        boolean customButton = !essential && prefs.getBoolean("widgetCustomButton", false);
        int layout = large ? (medium ? (dark ? R.layout.widget_medium_dark : R.layout.widget_medium)
            : (dark ? R.layout.widget_large_dark : R.layout.widget_large))
            : essential ? (dark ? R.layout.widget_essential_dark : R.layout.widget_essential)
            : (dark ? R.layout.widget_small_dark : R.layout.widget_small);
        RemoteViews view = new RemoteViews(context.getPackageName(), layout);
        Locale locale = "it".equals(prefs.getString("language", "en")) ? Locale.ITALIAN : Locale.ENGLISH;
        Configuration config = new Configuration(context.getResources().getConfiguration());
        config.setLocale(locale);
        Resources strings = context.createConfigurationContext(config).getResources();
        for (int i = 0; i < ACTIONS.length; i++) {
            if (essential && (i == 1 || i == 4 || i == 5)) continue;
            if (i == 5 && !customButton) continue;
            Intent open = new Intent(context, MainActivity.class).setAction(OPEN_ACTION)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra(EXTRA_ACTION, ACTIONS[i]);
            view.setOnClickPendingIntent(BUTTONS[i], PendingIntent.getActivity(context, 100 + i, open,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
            view.setContentDescription(BUTTONS[i], strings.getString(LABELS[i]));
            if ("classic".equals(themeStyle)) {
                view.setImageViewResource(BUTTONS[i], ICONS[i]);
            } else {
                Bitmap bmp = renderStyledActionBitmap(context, i, themeStyle, dark, monoHue);
                if (bmp != null) view.setImageViewBitmap(BUTTONS[i], bmp);
                else view.setImageViewResource(BUTTONS[i], ICONS[i]);
            }
        }
        if (!essential) view.setViewVisibility(R.id.widget_custom, customButton ? View.VISIBLE : View.GONE);
        if (!large) applyTrayShape(context, view, themeStyle, dark, monoHue);
        if (large) {
            bindLarge(view, strings, prefs, locale, medium);
            applyLargeTheme(context, view, themeStyle, dark, monoHue, medium);
        }
        return view;
    }

    /**
     * Small and Extra-small: the translucent tray (pill) behind the buttons follows the buttons' shape.
     * Round buttons (classic, aurora, pop, playful, glass) keep the 32 dp pill from the layout; the minimal and
     * mono and material rounded squares get a concentric rounded rectangle, and angular's chamfered buttons a chamfered
     * tray (9-patch, see scripts/render-widget-tray.mjs). Setting a background replaces the view's padding
     * with the drawable's, so the 4 dp padding is restored right after.
     */
    private static void applyTrayShape(Context context, RemoteViews view, String themeStyle, boolean dark, String monoHue) {
        int tray;
        if ("angular".equals(themeStyle)) tray = dark ? R.drawable.widget_tray_angular_dark : R.drawable.widget_tray_angular;
        else if ("minimal".equals(themeStyle)) tray = dark ? R.drawable.widget_tray_minimal_dark : R.drawable.widget_tray_minimal;
        else if ("mono".equals(themeStyle)) tray = dark ? R.drawable.widget_tray_mono_dark : R.drawable.widget_tray_mono;
        else if ("material".equals(themeStyle)) tray = dark ? R.drawable.widget_tray_material_dark : R.drawable.widget_tray_material;
        else if ("glass".equals(themeStyle)) tray = dark ? R.drawable.widget_tray_glass_dark : R.drawable.widget_tray_glass;
        else if ("aurora".equals(themeStyle)) tray = dark ? R.drawable.widget_tray_aurora_dark : R.drawable.widget_tray_aurora;
        else if ("playful".equals(themeStyle)) tray = dark ? R.drawable.widget_tray_playful_dark : R.drawable.widget_tray_playful;
        else return;
        int pad = Math.round(4 * context.getResources().getDisplayMetrics().density);
        view.setInt(R.id.widget_tray, "setBackgroundResource", tray);
        if ("mono".equals(themeStyle) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            int hue = parseColorSafe(monoHue, "#64748b");
            int base = dark ? Color.parseColor("#131926") : Color.WHITE;
            int tinted = mixColor(base, hue, dark ? 0.20f : 0.14f);
            int argb = Color.argb(218, Color.red(tinted), Color.green(tinted), Color.blue(tinted));
            view.setColorStateList(R.id.widget_tray, "setBackgroundTintList", ColorStateList.valueOf(argb));
        }
        view.setViewPadding(R.id.widget_tray, pad, pad, pad, pad);
    }

    /**
     * The same arrangement as Today in Ultra minimal mode: intake and burned cards,
     * then carbs, protein and fat. Missing days show zero intake and the BMR as burned.
     */
    private static void bindLarge(RemoteViews view, Resources strings, SharedPreferences prefs, Locale locale, boolean compact) {
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

        if (!compact) view.setProgressBar(R.id.widget_intake_bar, 100,
            intake > 0 ? (int) Math.max(5, Math.round(intake / scale * 100)) : 0, false);
        if (!compact) view.setProgressBar(R.id.widget_burned_bar, 100,
            (int) Math.max(5, Math.round(burned / scale * 100)), false);

        // Macro letters (Large only). The Medium layout has no letter views.
        if (!compact) {
            view.setTextViewText(R.id.widget_carbs_letter, strings.getString(R.string.widget_letter_carbs));
            view.setTextViewText(R.id.widget_protein_letter, strings.getString(R.string.widget_letter_protein));
            view.setTextViewText(R.id.widget_fat_letter, strings.getString(R.string.widget_letter_fat));
        }
        bindMacro(view, strings, day, "carbs", tenth, whole,
            R.id.widget_carbs_card, R.id.widget_carbs_value, R.id.widget_carbs_percent, R.string.widget_carbs_desc, compact);
        bindMacro(view, strings, day, "protein", tenth, whole,
            R.id.widget_protein_card, R.id.widget_protein_value, R.id.widget_protein_percent, R.string.widget_protein_desc, compact);
        bindMacro(view, strings, day, "fat", tenth, whole,
            R.id.widget_fat_card, R.id.widget_fat_value, R.id.widget_fat_percent, R.string.widget_fat_desc, compact);
    }

    private static void bindMacro(RemoteViews view, Resources strings, JSONObject day, String key,
                                  NumberFormat tenth, NumberFormat whole,
                                  int card, int value, int percent, int description, boolean compact) {
        double grams = day != null ? day.optDouble(key + "Grams", 0) : 0;
        double share = day != null ? day.optDouble(key + "Percent", 0) : 0;
        String gramText = tenth.format(grams);
        String shareText = whole.format(Math.round(share));
        view.setTextViewText(value, gramText);
        if (!compact) view.setTextViewText(percent, shareText + "%");
        view.setContentDescription(card, strings.getString(description, gramText, shareText));
    }


    /**
     * Styles the Large and Medium widgets (surface, Intake/Burned cards, macro cards, badges, icons and progress bars)
     * to match the active app theme style instead of staying on Classic pastels. In Dark widget layouts, swaps the
     * translucent dark card drawables to opaque rounded shapes before tinting so SRC_IN produces exact theme colours.
     */
    private static void applyLargeTheme(Context context, RemoteViews view, String themeStyle, boolean dark, String monoHue, boolean compact) {
        if ("classic".equals(themeStyle)) return;
        int surface, divider;
        int inBg, inText, inTrack, inFill, inBadgeBg, inBadgeText;
        int burnBg, burnText, burnTrack, burnFill, burnBadgeBg, burnBadgeText;
        int cBg, cText, pBg, pText, fBg, fText;

        if ("angular".equals(themeStyle)) {
            surface = Color.parseColor(dark ? "#A6151e2d" : "#94ffffff");
            divider = Color.parseColor(dark ? "#25344d" : "#94a3b8");
            inBg = Color.parseColor(dark ? "#e6edf3" : "#0b1019");
            inText = Color.parseColor(dark ? "#0b1019" : "#ffffff");
            inTrack = Color.parseColor(dark ? "#cbd5e1" : "#334155");
            inFill = inText; inBadgeBg = inText; inBadgeText = inBg;
            burnBg = Color.parseColor("#ff551a"); burnText = Color.parseColor("#0b1019");
            burnTrack = Color.parseColor("#400b1019"); burnFill = burnText;
            burnBadgeBg = burnText; burnBadgeText = burnBg;
            cBg = Color.parseColor(dark ? "#1d3c78" : "#b8d0ff"); cText = Color.parseColor(dark ? "#93c5fd" : "#112663");
            pBg = Color.parseColor(dark ? "#59480d" : "#f8da57"); pText = Color.parseColor(dark ? "#fde047" : "#4d2806");
            fBg = Color.parseColor(dark ? "#3b2366" : "#d4bcff"); fText = Color.parseColor(dark ? "#d8b4fe" : "#35116e");
        } else if ("aurora".equals(themeStyle)) {
            surface = Color.parseColor(dark ? "#A61b1630" : "#94ffffff");
            divider = Color.parseColor(dark ? "#26ffffff" : "#294f46e5");
            inBg = Color.parseColor("#34d399"); inText = Color.parseColor("#06281e");
            inTrack = Color.parseColor("#3306281e"); inFill = inText;
            inBadgeBg = inText; inBadgeText = Color.parseColor("#d1fae5");
            burnBg = Color.parseColor("#f43f5e"); burnText = Color.parseColor("#2d0811");
            burnTrack = Color.parseColor("#382d0811"); burnFill = burnText;
            burnBadgeBg = burnText; burnBadgeText = Color.parseColor("#ffe4e6");
            cBg = Color.parseColor(dark ? "#262040" : "#ffffff"); cText = Color.parseColor(dark ? "#60a5fa" : "#1d4ed8");
            pBg = cBg; pText = Color.parseColor(dark ? "#fbbf24" : "#b45309");
            fBg = cBg; fText = Color.parseColor(dark ? "#c084fc" : "#6d28d9");
        } else if ("pop".equals(themeStyle)) {
            surface = Color.parseColor(dark ? "#A6211c2b" : "#94ffffff");
            divider = Color.parseColor(dark ? "#fef9c3" : "#000000");
            inBg = Color.parseColor("#7ef29d"); inText = Color.parseColor("#09080d");
            inTrack = Color.WHITE; inFill = inText;
            inBadgeBg = inText; inBadgeText = inBg;
            burnBg = Color.parseColor("#ff7a7a"); burnText = Color.parseColor("#09080d");
            burnTrack = Color.parseColor("#4009080d"); burnFill = burnText;
            burnBadgeBg = burnText; burnBadgeText = Color.WHITE;
            cBg = Color.parseColor("#7cc4fa"); cText = Color.parseColor("#09080d");
            pBg = Color.parseColor("#ffb84d"); pText = Color.parseColor("#09080d");
            fBg = Color.parseColor("#c99eff"); fText = Color.parseColor("#09080d");
        } else if ("playful".equals(themeStyle)) {
            surface = Color.parseColor(dark ? "#A6312e81" : "#94ffffff");
            divider = Color.parseColor(dark ? "#38a5b4fc" : "#244c1d95");
            inBg = Color.parseColor(dark ? "#065f46" : "#34d399");
            inText = Color.parseColor(dark ? "#d1fae5" : "#042f2e");
            inTrack = Color.parseColor(dark ? "#33d1fae5" : "#38042f2e"); inFill = inText;
            inBadgeBg = inText; inBadgeText = Color.parseColor(dark ? "#065f46" : "#a7f3d0");
            burnBg = Color.parseColor(dark ? "#9f1239" : "#fb7185");
            burnText = Color.parseColor(dark ? "#ffe4e6" : "#3b0413");
            burnTrack = Color.parseColor(dark ? "#38ffe4e6" : "#383b0413"); burnFill = burnText;
            burnBadgeBg = Color.parseColor(dark ? "#47000000" : "#2e3b0413"); burnBadgeText = burnText;
            cBg = Color.parseColor(dark ? "#1e3a8a" : "#dbeafe"); cText = Color.parseColor(dark ? "#dbeafe" : "#172554");
            pBg = Color.parseColor(dark ? "#713f12" : "#fef08a"); pText = Color.parseColor(dark ? "#fef08a" : "#422006");
            fBg = Color.parseColor(dark ? "#4c1d95" : "#e9d5ff"); fText = Color.parseColor(dark ? "#e9d5ff" : "#2e1065");
        } else if ("minimal".equals(themeStyle)) {
            surface = Color.parseColor(dark ? "#F20d1320" : "#F2eef2f6");
            divider = Color.parseColor(dark ? "#1e293b" : "#cbd5e1");
            inBg = Color.parseColor(dark ? "#151d2e" : "#f1f5f9"); inText = Color.parseColor(dark ? "#34d399" : "#15803d");
            inTrack = divider; inFill = inText;
            inBadgeBg = Color.parseColor(dark ? "#064e3b" : "#dcfce7"); inBadgeText = Color.parseColor(dark ? "#a7f3d0" : "#14532d");
            burnBg = inBg; burnText = Color.parseColor(dark ? "#fecaca" : "#7f1d1d");
            burnTrack = divider; burnFill = Color.parseColor(dark ? "#f87171" : "#dc2626");
            burnBadgeBg = Color.parseColor(dark ? "#450a0a" : "#fee2e2"); burnBadgeText = burnText;
            cBg = inBg; cText = Color.parseColor(dark ? "#bfdbfe" : "#172554");
            pBg = inBg; pText = Color.parseColor(dark ? "#fde68a" : "#713f12");
            fBg = inBg; fText = Color.parseColor(dark ? "#e9d5ff" : "#3b0764");
        } else if ("glass".equals(themeStyle)) {
            surface = Color.parseColor(dark ? "#BD241d4a" : "#BDf4f7fd");
            divider = Color.parseColor(dark ? "#26ffffff" : "#99ffffff");
            inBg = Color.parseColor(dark ? "#A62dbe9f" : "#E679d4be");
            inText = Color.parseColor(dark ? "#d5fbef" : "#08352d");
            inTrack = Color.parseColor(dark ? "#2Effffff" : "#73ffffff"); inFill = inText;
            inBadgeBg = inText; inBadgeText = Color.parseColor(dark ? "#0a3b32" : "#c8f5e8");
            burnBg = Color.parseColor(dark ? "#9Eec5a96" : "#EBde96be");
            burnText = Color.parseColor(dark ? "#ffe3f0" : "#4a0f2c");
            burnTrack = Color.parseColor(dark ? "#2Effffff" : "#66ffffff");
            burnFill = Color.parseColor(dark ? "#ffe3f0" : "#8c2a57");
            burnBadgeBg = Color.parseColor(dark ? "#8C0a041c" : "#5b1a3a");
            burnBadgeText = Color.parseColor(dark ? "#ffe3f0" : "#ffd9ea");
            cBg = Color.parseColor(dark ? "#80608cfa" : "#E07aa0f5"); cText = Color.parseColor(dark ? "#dbe7ff" : "#0f2562");
            pBg = Color.parseColor(dark ? "#75f09664" : "#E6e4b096"); pText = Color.parseColor(dark ? "#ffe5d2" : "#5a2a12");
            fBg = Color.parseColor(dark ? "#85a082fa" : "#E6a898f8"); fText = Color.parseColor(dark ? "#ece4ff" : "#2a1a6e");
        } else if ("material".equals(themeStyle)) {
            surface = Color.parseColor(dark ? "#B8211f26" : "#B8f7edf7");
            divider = Color.TRANSPARENT;
            inBg = Color.parseColor(dark ? "#2b4e37" : "#cfe7d3");
            inText = Color.parseColor(dark ? "#cdebd4" : "#0f3a24");
            inTrack = Color.parseColor(dark ? "#2Ecdebd4" : "#240f3a24");
            inFill = Color.parseColor(dark ? "#cdebd4" : "#1e5a3a");
            inBadgeBg = inFill; inBadgeText = Color.parseColor(dark ? "#143a24" : "#d7f2dd");
            burnBg = Color.parseColor(dark ? "#5e2a34" : "#f0d4d6");
            burnText = Color.parseColor(dark ? "#ffd9dd" : "#55151f");
            burnTrack = Color.parseColor(dark ? "#2Effd9dd" : "#2955151f");
            burnFill = Color.parseColor(dark ? "#ffd9dd" : "#8e2b3c");
            burnBadgeBg = Color.parseColor(dark ? "#66000000" : "#8e2b3c");
            burnBadgeText = Color.parseColor(dark ? "#ffd9dd" : "#ffffff");
            cBg = Color.parseColor(dark ? "#2b4559" : "#d3e4ee"); cText = Color.parseColor(dark ? "#cfe5f7" : "#17364f");
            pBg = Color.parseColor(dark ? "#54402a" : "#efdfcb"); pText = Color.parseColor(dark ? "#f3dfc4" : "#4f3213");
            fBg = Color.parseColor(dark ? "#43385f" : "#e4ddf0"); fText = Color.parseColor(dark ? "#e8defb" : "#3b2d5e");
        } else { // mono
            int base = Color.parseColor(monoHue != null && monoHue.matches("^#[0-9a-fA-F]{6}$") ? monoHue : "#64748b");
            int baseSurface = dark ? mixColor(Color.parseColor("#131926"), base, 0.2f) : Color.WHITE;
            surface = Color.argb(dark ? 0xA6 : 0x94, Color.red(baseSurface), Color.green(baseSurface), Color.blue(baseSurface));
            divider = dark ? mixColor(Color.parseColor("#334155"), base, 0.35f) : mixColor(Color.parseColor("#cbd5e1"), base, 0.35f);
            inBg = dark ? mixColor(base, Color.WHITE, 0.28f) : mixColor(base, Color.parseColor("#090e17"), 0.32f);
            inText = contrastText(inBg);
            inTrack = inText == Color.WHITE ? Color.parseColor("#47ffffff") : Color.parseColor("#38090e17");
            inFill = inText; inBadgeBg = inText; inBadgeText = inBg;
            burnBg = dark ? mixColor(base, Color.parseColor("#090d16"), 0.05f) : mixColor(base, Color.parseColor("#090e17"), 0.08f);
            burnText = contrastText(burnBg);
            burnTrack = burnText == Color.WHITE ? Color.parseColor("#47ffffff") : Color.parseColor("#38090e17");
            burnFill = burnText;
            burnBadgeBg = dark ? Color.parseColor("#73000000") : Color.parseColor("#090e17");
            burnBadgeText = Color.WHITE;
            cBg = dark ? mixColor(Color.parseColor("#1a2233"), base, 0.24f) : mixColor(Color.WHITE, base, 0.16f);
            cText = contrastText(cBg);
            pBg = cBg; pText = cText; fBg = cBg; fText = cText;
        }

        // Pick exact theme-coherent container, card and pill shapes (Angular chamfered/0dp, Minimal 12/16dp, Mono 14/18dp, Material squircle 18/24dp).
        int rootDrawable = "angular".equals(themeStyle) ? (dark ? R.drawable.widget_tray_angular_dark : R.drawable.widget_tray_angular)
            : "minimal".equals(themeStyle) ? R.drawable.widget_surface_minimal
            : "mono".equals(themeStyle) ? R.drawable.widget_surface_mono
            : "material".equals(themeStyle) ? R.drawable.widget_surface_material
            : R.drawable.widget_surface;
        int cardDrawable = "angular".equals(themeStyle) ? R.drawable.widget_card_angular
            : "minimal".equals(themeStyle) ? R.drawable.widget_card_minimal
            : "mono".equals(themeStyle) ? R.drawable.widget_card_mono
            : "material".equals(themeStyle) ? R.drawable.widget_card_material
            : R.drawable.widget_card_intake;
        int pillDrawable = "angular".equals(themeStyle) ? R.drawable.widget_pill_angular
            : "minimal".equals(themeStyle) ? R.drawable.widget_pill_minimal
            : "material".equals(themeStyle) ? R.drawable.widget_pill_material
            : R.drawable.widget_pill_surplus;

        float d = context.getResources().getDisplayMetrics().density;
        int rootPad = Math.round((compact ? 4 : 8) * d);
        int cardPadH = Math.round((compact ? 8 : 10) * d);
        int cardPadV = Math.round((compact ? 4 : 8) * d);
        int macroPad = Math.round(4 * d);
        if ("pop".equals(themeStyle)) {
            // Pop uses multi-layer 3D offset-shadow drawables directly (no tint overwrite so border + hard shadow stay crisp).
            setLayeredBackground(view, R.id.widget_root, dark ? R.drawable.widget_surface_pop_dark : R.drawable.widget_surface_pop, rootPad, rootPad, rootPad + Math.round(4 * d), rootPad + Math.round(4 * d));
            setLayeredBackground(view, R.id.widget_intake_card, dark ? R.drawable.widget_card_pop_intake_dark : R.drawable.widget_card_pop_intake, cardPadH, cardPadV, cardPadH + Math.round(3 * d), cardPadV + Math.round(3 * d));
            setLayeredBackground(view, R.id.widget_burned_card, dark ? R.drawable.widget_card_pop_burned_dark : R.drawable.widget_card_pop_burned, cardPadH, cardPadV, cardPadH + Math.round(3 * d), cardPadV + Math.round(3 * d));
            setLayeredBackground(view, R.id.widget_carbs_card, dark ? R.drawable.widget_card_pop_carbs_dark : R.drawable.widget_card_pop_carbs, macroPad, macroPad, macroPad + Math.round(3 * d), macroPad + Math.round(3 * d));
            setLayeredBackground(view, R.id.widget_protein_card, dark ? R.drawable.widget_card_pop_protein_dark : R.drawable.widget_card_pop_protein, macroPad, macroPad, macroPad + Math.round(3 * d), macroPad + Math.round(3 * d));
            setLayeredBackground(view, R.id.widget_fat_card, dark ? R.drawable.widget_card_pop_fat_dark : R.drawable.widget_card_pop_fat, macroPad, macroPad, macroPad + Math.round(3 * d), macroPad + Math.round(3 * d));
        } else if ("minimal".equals(themeStyle)) {
            int minSurface = dark ? R.drawable.widget_surface_minimal_dark : R.drawable.widget_surface_minimal_light;
            int minCard = dark ? R.drawable.widget_card_minimal_dark : R.drawable.widget_card_minimal_light;
            setLayeredBackground(view, R.id.widget_root, minSurface, rootPad, rootPad, rootPad, rootPad);
            setLayeredBackground(view, R.id.widget_intake_card, minCard, cardPadH, cardPadV, cardPadH, cardPadV);
            setLayeredBackground(view, R.id.widget_burned_card, minCard, cardPadH, cardPadV, cardPadH, cardPadV);
            setLayeredBackground(view, R.id.widget_carbs_card, minCard, macroPad, macroPad, macroPad, macroPad);
            setLayeredBackground(view, R.id.widget_protein_card, minCard, macroPad, macroPad, macroPad, macroPad);
            setLayeredBackground(view, R.id.widget_fat_card, minCard, macroPad, macroPad, macroPad, macroPad);
        } else {
            tintShape(view, R.id.widget_root, rootDrawable, surface, rootPad, rootPad);
            tintShape(view, R.id.widget_intake_card, cardDrawable, inBg, cardPadH, cardPadV);
            tintShape(view, R.id.widget_burned_card, cardDrawable, burnBg, cardPadH, cardPadV);
            tintShape(view, R.id.widget_carbs_card, cardDrawable, cBg, macroPad, macroPad);
            tintShape(view, R.id.widget_protein_card, cardDrawable, pBg, macroPad, macroPad);
            tintShape(view, R.id.widget_fat_card, cardDrawable, fBg, macroPad, macroPad);
        }
        int pillPadH = Math.round(6 * d);
        int pillPadV = Math.round(2 * d);
        tintShape(view, R.id.widget_intake_net, pillDrawable, inBadgeBg, pillPadH, pillPadV);
        tintShape(view, R.id.widget_burned_net, pillDrawable, burnBadgeBg, pillPadH, pillPadV);

        view.setTextColor(R.id.widget_intake_value, inText);
        view.setTextColor(R.id.widget_intake_net, inBadgeText);
        view.setTextColor(R.id.widget_burned_value, burnText);
        view.setTextColor(R.id.widget_burned_net, burnBadgeText);
        view.setTextColor(R.id.widget_carbs_value, cText);
        view.setTextColor(R.id.widget_protein_value, pText);
        view.setTextColor(R.id.widget_fat_value, fText);

        if (!compact) {
            view.setInt(R.id.widget_intake_icon, "setColorFilter", inText);
            view.setInt(R.id.widget_burned_icon, "setColorFilter", burnText);
            view.setInt(R.id.widget_divider, "setBackgroundColor", divider);
            view.setTextColor(R.id.widget_carbs_letter, cText);
            view.setTextColor(R.id.widget_carbs_percent, cText);
            view.setTextColor(R.id.widget_protein_letter, pText);
            view.setTextColor(R.id.widget_protein_percent, pText);
            view.setTextColor(R.id.widget_fat_letter, fText);
            view.setTextColor(R.id.widget_fat_percent, fText);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                view.setColorStateList(R.id.widget_intake_bar, "setProgressTintList", ColorStateList.valueOf(inFill));
                view.setColorStateList(R.id.widget_intake_bar, "setProgressBackgroundTintList", ColorStateList.valueOf(inTrack));
                view.setColorStateList(R.id.widget_burned_bar, "setProgressTintList", ColorStateList.valueOf(burnFill));
                view.setColorStateList(R.id.widget_burned_bar, "setProgressBackgroundTintList", ColorStateList.valueOf(burnTrack));
            }
        }
    }

    private static void setLayeredBackground(RemoteViews view, int viewId, int drawableRes, int padL, int padT, int padR, int padB) {
        view.setInt(viewId, "setBackgroundResource", drawableRes);
        view.setViewPadding(viewId, padL, padT, padR, padB);
    }

    private static void tintShape(RemoteViews view, int viewId, int drawableRes, int color, int padH, int padV) {
        view.setInt(viewId, "setBackgroundResource", drawableRes);
        view.setViewPadding(viewId, padH, padV, padH, padV);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            view.setColorStateList(viewId, "setBackgroundTintList", ColorStateList.valueOf(color));
        } else {
            view.setInt(viewId, "setBackgroundColor", color);
        }
    }

    private static int parseColorSafe(String color, String fallback) {
        try {
            if (color != null) return Color.parseColor(color);
        } catch (Exception ignored) {}
        return Color.parseColor(fallback);
    }

    private static int mixColor(int c1, int c2, float weight) {
        int r = Math.round(Color.red(c1) * (1f - weight) + Color.red(c2) * weight);
        int g = Math.round(Color.green(c1) * (1f - weight) + Color.green(c2) * weight);
        int b = Math.round(Color.blue(c1) * (1f - weight) + Color.blue(c2) * weight);
        return Color.rgb(Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b)));
    }

    private static int contrastText(int bg) {
        double r = Color.red(bg) / 255.0, g = Color.green(bg) / 255.0, b = Color.blue(bg) / 255.0;
        r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
        g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
        b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
        double lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return (lum + 0.05) / 0.054 >= 1.05 / (lum + 0.05) ? Color.parseColor("#090e17") : Color.WHITE;
    }

    private static Bitmap renderStyledActionBitmap(Context context, int index, String themeStyle, boolean dark, String monoHue) {
        try {
            int size = 132;
            Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bmp);
            int fill = Color.parseColor("#C9EFD3");
            int ink = Color.parseColor("#17432A");
            int border = Color.TRANSPARENT;
            float borderWidth = 0f;

            if ("angular".equals(themeStyle)) {
                String[] fills = dark
                    ? new String[]{ "#e6edf3", "#ff551a", "#c7d2fe", "#fde047", "#e9d5ff", "#7dd3fc" }
                    : new String[]{ "#0b1019", "#ff551a", "#b8d0ff", "#f8da57", "#d4bcff", "#7dd3fc" };
                fill = Color.parseColor(fills[index]);
                ink = (!dark && index == 0) ? Color.WHITE : Color.parseColor("#0b1019");
            } else if ("aurora".equals(themeStyle)) {
                String[] fills = { "#34d399", "#fb7185", "#60a5fa", "#fb923c", "#a78bfa", "#facc15" };
                String[] inks = { "#06281e", "#2d0811", "#0f172a", "#1f0a00", "#1e1b4b", "#1c1917" };
                fill = Color.parseColor(fills[index]);
                ink = Color.parseColor(inks[index]);
            } else if ("pop".equals(themeStyle)) {
                String[] fills = { "#7ef29d", "#ff7a7a", "#7cc4fa", "#ffb84d", "#c99eff", "#fde047" };
                fill = Color.parseColor(fills[index]);
                ink = Color.parseColor("#09080d");
                border = dark ? Color.parseColor("#fef9c3") : Color.BLACK;
                borderWidth = 4.5f;
            } else if ("playful".equals(themeStyle)) {
                String[] fills = dark
                    ? new String[]{ "#065f46", "#9f1239", "#1e3a8a", "#9a3412", "#4c1d95", "#854d0e" }
                    : new String[]{ "#34d399", "#fb7185", "#60a5fa", "#fbbf24", "#c084fc", "#fcd34d" };
                String[] inks = dark
                    ? new String[]{ "#d1fae5", "#ffe4e6", "#bfdbfe", "#ffedd5", "#e9d5ff", "#fef08a" }
                    : new String[]{ "#042f2e", "#3b0413", "#172554", "#422006", "#2e1065", "#422006" };
                fill = Color.parseColor(fills[index]);
                ink = Color.parseColor(inks[index]);
            } else if ("minimal".equals(themeStyle)) {
                if (dark) {
                    fill = Color.parseColor("#060911");
                    String[] inks = { "#34d399", "#fda4af", "#93c5fd", "#fde047", "#d8b4fe", "#f8fafc" };
                    ink = Color.parseColor(inks[index]);
                    border = Color.parseColor("#1e293b");
                } else {
                    fill = Color.parseColor("#f1f5f9");
                    String[] inks = { "#15803d", "#9f1239", "#1d4ed8", "#9a3412", "#5b21b6", "#854d0e" };
                    ink = Color.parseColor(inks[index]);
                    border = Color.parseColor("#cbd5e1");
                }
                borderWidth = 3f;
            } else if ("glass".equals(themeStyle)) {
                // Frosted plates with a white rim, like the glass dock (theme-glass.css --dock-1..6).
                String[] fills = dark
                    ? new String[]{ "#2f9d7c", "#c4507a", "#4a78d6", "#c98a4a", "#7e63d6", "#c9a92a" }
                    : new String[]{ "#84dec0", "#f8a6c0", "#96c0fa", "#fac68e", "#c2aafa", "#f6e48a" };
                String[] inks = dark
                    ? new String[]{ "#eafff6", "#fff0f6", "#eef4ff", "#fff3e6", "#f3edff", "#fffbe0" }
                    : new String[]{ "#09382b", "#52122e", "#10264f", "#5a3208", "#2b1a6b", "#4a3c0d" };
                fill = Color.parseColor(fills[index]);
                ink = Color.parseColor(inks[index]);
                border = Color.parseColor(dark ? "#47FFFFFF" : "#A6FFFFFF");
                borderWidth = 3f;
            } else if ("material".equals(themeStyle)) {
                // Material You tonal containers (theme-material.css --dock-1..6), rounded squares.
                String[] fills = dark
                    ? new String[]{ "#2b4e37", "#5e2a34", "#2b4559", "#54402a", "#43385f", "#4c4720" }
                    : new String[]{ "#cde8d2", "#f0d4d6", "#d3e4ee", "#efdfcb", "#e4ddf0", "#ebe5b9" };
                String[] inks = dark
                    ? new String[]{ "#cdebd4", "#ffd9dd", "#cfe5f7", "#f3dfc4", "#e8defb", "#f0e8b0" }
                    : new String[]{ "#0f3a24", "#55151f", "#17364f", "#4f3213", "#3b2d5e", "#4a4310" };
                fill = Color.parseColor(fills[index]);
                ink = Color.parseColor(inks[index]);
            } else if ("mono".equals(themeStyle)) {
                int base = Color.parseColor(monoHue != null && monoHue.matches("^#[0-9a-fA-F]{6}$") ? monoHue : "#64748b");
                // Every button (Food and Movement included) uses the same plate, like the app dock in Mono.
                fill = dark
                    ? mixColor(Color.parseColor("#1a2233"), base, 0.24f)
                    : mixColor(Color.WHITE, base, 0.16f);
                ink = contrastText(fill);
            }

            Path shape = new Path();
            float pad = borderWidth > 0 ? borderWidth / 2f : 0f;
            RectF rect = new RectF(pad, pad, size - pad, size - pad);
            if ("angular".equals(themeStyle)) {
                float cut = 26f;
                shape.moveTo(pad, pad);
                shape.lineTo(size - pad - cut, pad);
                shape.lineTo(size - pad, pad + cut);
                shape.lineTo(size - pad, size - pad);
                shape.lineTo(pad + cut, size - pad);
                shape.lineTo(pad, size - pad - cut);
                shape.close();
            } else if ("minimal".equals(themeStyle)) {
                shape.addRoundRect(rect, 30f, 30f, Path.Direction.CW);
            } else if ("mono".equals(themeStyle)) {
                shape.addRoundRect(rect, 33f, 33f, Path.Direction.CW);
            } else if ("material".equals(themeStyle)) {
                shape.addRoundRect(rect, 44f, 44f, Path.Direction.CW); // 16 dp at 48 dp, like --dock-btn-radius
            } else {
                shape.addOval(rect, Path.Direction.CW);
            }

            Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(fill);
            canvas.drawPath(shape, paint);

            if (borderWidth > 0) {
                paint.setStyle(Paint.Style.STROKE);
                paint.setStrokeWidth(borderWidth);
                paint.setColor(border);
                canvas.drawPath(shape, paint);
            }

            // Glyph-only vectors (no circular plate), tinted with the style's ink colour. The old code
            // cut the glyph out of the classic circle icon by colour distance, which painted the
            // whole plate in ink (or erased dark glyphs) as soon as a non-classic style was used.
            Drawable glyph = context.getDrawable(GLYPHS[index]);
            if (glyph != null) {
                glyph = glyph.mutate();
                glyph.setTint(ink);
                glyph.setBounds(0, 0, size, size);
                glyph.draw(canvas);
            }
            return bmp;
        } catch (Exception ignored) {
            return null;
        }
    }
}
