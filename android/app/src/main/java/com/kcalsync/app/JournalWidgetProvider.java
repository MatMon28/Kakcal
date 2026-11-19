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
        if (!large) applyTrayShape(context, view, themeStyle, dark);
        if (large) bindLarge(view, strings, prefs, locale, medium);
        return view;
    }

    /**
     * Small and Extra-small: the translucent tray (pill) behind the buttons follows the buttons' shape.
     * Round buttons (classic, aurora, pop, playful) keep the 32 dp pill from the layout; the minimal and
     * mono rounded squares get a concentric rounded rectangle, and angular's chamfered buttons a chamfered
     * tray (9-patch, see scripts/render-widget-tray.mjs). Setting a background replaces the view's padding
     * with the drawable's, so the 4 dp padding is restored right after.
     */
    private static void applyTrayShape(Context context, RemoteViews view, String themeStyle, boolean dark) {
        int tray;
        if ("angular".equals(themeStyle)) tray = dark ? R.drawable.widget_tray_angular_dark : R.drawable.widget_tray_angular;
        else if ("minimal".equals(themeStyle)) tray = dark ? R.drawable.widget_tray_minimal_dark : R.drawable.widget_tray_minimal;
        else if ("mono".equals(themeStyle)) tray = dark ? R.drawable.widget_tray_mono_dark : R.drawable.widget_tray_mono;
        else return;
        int pad = Math.round(4 * context.getResources().getDisplayMetrics().density);
        view.setInt(R.id.widget_tray, "setBackgroundResource", tray);
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
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.42 ? Color.parseColor("#090e17") : Color.WHITE;
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
                String[] fills = { "#7ef29d", "#ff7a7a", "#7cc4fa", "#ffb84d", "#c99eff", dark ? "#fde047" : "#ffffff" };
                fill = Color.parseColor(fills[index]);
                ink = Color.parseColor("#09080d");
                border = dark ? Color.parseColor("#fef9c3") : Color.BLACK;
                borderWidth = 4.5f;
            } else if ("playful".equals(themeStyle)) {
                String[] fills = { "#34d399", "#fb7185", "#60a5fa", "#fbbf24", "#c084fc", "#fcd34d" };
                String[] inks = { "#042f2e", "#3b0413", "#172554", "#422006", "#2e1065", "#422006" };
                fill = Color.parseColor(fills[index]);
                ink = Color.parseColor(inks[index]);
            } else if ("minimal".equals(themeStyle)) {
                if (dark) {
                    fill = index == 1 ? Color.parseColor("#2563eb") : Color.parseColor("#060911");
                    String[] inks = { "#93c5fd", "#ffffff", "#93c5fd", "#fde047", "#d8b4fe", "#f8fafc" };
                    ink = Color.parseColor(inks[index]);
                    border = Color.parseColor("#1e293b");
                } else {
                    fill = index == 1 ? Color.parseColor("#0f172a") : Color.WHITE;
                    String[] inks = { "#172554", "#ffffff", "#172554", "#713f12", "#3b0764", "#090e17" };
                    ink = Color.parseColor(inks[index]);
                    border = Color.parseColor("#cbd5e1");
                }
                borderWidth = 3f;
            } else if ("mono".equals(themeStyle)) {
                int base = Color.parseColor(monoHue != null && monoHue.matches("^#[0-9a-fA-F]{6}$") ? monoHue : "#64748b");
                if (dark) {
                    int cardBg = mixColor(Color.parseColor("#1a2233"), base, 0.24f);
                    int intakeBg = mixColor(base, Color.WHITE, 0.28f);
                    int burnedBg = mixColor(base, Color.parseColor("#090d16"), 0.05f);
                    fill = index == 0 ? intakeBg : (index == 1 ? burnedBg : cardBg);
                } else {
                    int cardBg = mixColor(Color.WHITE, base, 0.16f);
                    int intakeBg = mixColor(base, Color.parseColor("#090e17"), 0.32f);
                    int burnedBg = mixColor(base, Color.parseColor("#090e17"), 0.08f);
                    fill = index == 0 ? intakeBg : (index == 1 ? burnedBg : cardBg);
                }
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
