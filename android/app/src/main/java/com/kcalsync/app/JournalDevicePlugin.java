package com.kcalsync.app;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
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
                || "playful".equals(rawThemeStyle) || "minimal".equals(rawThemeStyle) || "mono".equals(rawThemeStyle))
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

    @PluginMethod
    public void exportBackup(PluginCall call) {
        String json = call.getString("json");
        if (json == null) { call.reject("Missing backup"); return; }
        try {
            // Keep the journal out of the Activity's size-limited saved-state Bundle.
            File pending = File.createTempFile("journal-backup-", ".json", getContext().getCacheDir());
            try (FileOutputStream stream = new FileOutputStream(pending)) {
                stream.write(json.getBytes(StandardCharsets.UTF_8));
            }
            call.getData().remove("json");
            call.getData().put("pendingFile", pending.getName());
        } catch (Exception error) { call.reject("Could not prepare backup"); return; }
        Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE).setType("application/json")
            .putExtra(Intent.EXTRA_TITLE, "kakcalculator-" + JournalWidgetProvider.localDate() + ".json");
        startActivityForResult(call, save, "backupDestination");
    }

    @ActivityCallback
    private void backupDestination(PluginCall call, ActivityResult result) {
        if (call == null) return;
        String name = call.getString("pendingFile", "");
        if (!name.matches("journal-backup-[-0-9]+\\.json")) { call.reject("Backup expired"); return; }
        File pending = new File(getContext().getCacheDir(), name);
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            pending.delete();
            call.resolve();
            return;
        }
        bridge.execute(() -> {
            try (FileInputStream in = new FileInputStream(pending);
                 OutputStream out = getContext().getContentResolver().openOutputStream(result.getData().getData(), "wt")) {
                if (out == null) throw new java.io.IOException();
                byte[] buffer = new byte[16384];
                int count;
                while ((count = in.read(buffer)) != -1) out.write(buffer, 0, count);
                out.flush();
                call.resolve();
            } catch (Exception error) {
                call.reject("Could not write the selected file");
            } finally {
                pending.delete();
            }
        });
    }
}
