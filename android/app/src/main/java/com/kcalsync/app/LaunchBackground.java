package com.kcalsync.app;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.webkit.WebView;

/**
 * Keeps every native surface that is visible before the web page paints the same colour as the app's current
 * background (`--bg`), so launching shows no cream or white flash before a Dark / Lite Dark theme. The web layer
 * reports the colour through JournalDevicePlugin.setLaunchBackground whenever the theme changes.
 *
 * - System launch screen (Android 13+): Context.setSplashScreenTheme picks the matching generated style
 *   `Splash_<hex>` (values/splash_themes.xml, scripts/generate-splash-themes.mjs). On Android 12 and older the
 *   launch screen keeps the Light colour of AppTheme.NoActionBarLaunch (the platform has no run-time switch).
 * - Activity window and WebView background: set in MainActivity before the page has loaded.
 */
final class LaunchBackground {
    private static final String PREFS = "launch_background";
    private static final String KEY = "color";
    private static final int FALLBACK = 0xFFEFE9DD; // Light, same as capacitor.config.json > android.backgroundColor

    private LaunchBackground() {}

    /** Accepts `#rrggbb` only; returns whether the colour was stored. */
    static boolean save(Context context, String hex) {
        if (hex == null || !hex.matches("^#[0-9a-fA-F]{6}$")) return false;
        String clean = hex.toLowerCase();
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!clean.equals(prefs.getString(KEY, null))) prefs.edit().putString(KEY, clean).apply();
        applySplashTheme(context, clean);
        return true;
    }

    static int color(Context context) {
        String hex = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null);
        try {
            return hex == null ? FALLBACK : Color.parseColor(hex);
        } catch (IllegalArgumentException e) {
            return FALLBACK;
        }
    }

    /** Re-asserts the splash style for the next cold start (also covers an app update that reset it). */
    static void applySplashTheme(Context context) {
        String hex = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null);
        if (hex != null) applySplashTheme(context, hex);
    }

    private static void applySplashTheme(Context context, String hex) {
        if (Build.VERSION.SDK_INT < 33) return;
        Context app = context.getApplicationContext();
        int style = app.getResources().getIdentifier("Splash_" + hex.substring(1), "style", app.getPackageName());
        if (style != 0) app.setSplashScreenTheme(style);
    }

    static void applyToWindow(Activity activity) {
        activity.getWindow().setBackgroundDrawable(new ColorDrawable(color(activity)));
    }

    static void applyToWebView(Activity activity, WebView webView) {
        if (webView != null) webView.setBackgroundColor(color(activity));
    }
}
