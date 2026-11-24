package com.kcalsync.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.Log;
import android.widget.Toast;
import com.getcapacitor.Bridge;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginHandle;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
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
}
