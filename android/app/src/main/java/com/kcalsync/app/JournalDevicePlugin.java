package com.kcalsync.app;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.util.Base64;
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
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.regex.Pattern;
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
    // Flow: the bytes are staged in a private cache file, the system "create document" picker opens, and the callback
    // copies the staged file into the chosen document. Hardened so that the picked document never stays 0 bytes:
    //  - an empty payload is rejected before the picker opens;
    //  - the staged file name is also kept in SharedPreferences, so the copy still happens when Capacitor no longer has
    //    the PluginCall (activity re-created while the picker was open);
    //  - the copy tries "wt" and then "w" (some document providers fail with one of them), checks the byte count and
    //    syncs the file descriptor;
    //  - on failure the empty document is removed and the JS call is rejected, never left pending;
    //  - on success the number of bytes written is returned to JS.
    private static final String EXPORT_PREFS = "journal_export";
    private static final String PENDING_KEY = "pendingFile";
    private static final Pattern PENDING_NAME = Pattern.compile("journal-backup-[-0-9]+\\.(json|zip|txt|xlsx)");
    private static final int MAX_EXPORT_BYTES = 32000000;

    private SharedPreferences exportPrefs() {
        return getContext().getSharedPreferences(EXPORT_PREFS, Context.MODE_PRIVATE);
    }

    /** Writes `bytes` to a private cache file and remembers its name (in the call and in SharedPreferences). */
    private File stageExport(PluginCall call, String kind, byte[] bytes) throws IOException {
        File dir = getContext().getCacheDir();
        String previous = exportPrefs().getString(PENDING_KEY, "");
        if (previous != null && PENDING_NAME.matcher(previous).matches()) new File(dir, previous).delete();
        File pending = File.createTempFile("journal-backup-", "." + kind, dir);
        try (FileOutputStream stream = new FileOutputStream(pending)) {
            stream.write(bytes);
            stream.flush();
            try { stream.getFD().sync(); } catch (IOException ignored) { /* best effort */ }
        } catch (IOException | RuntimeException error) {
            pending.delete();
            throw error;
        }
        if (pending.length() != bytes.length) { pending.delete(); throw new IOException("Short write"); }
        exportPrefs().edit().putString(PENDING_KEY, pending.getName()).commit();
        call.getData().put("pendingFile", pending.getName());
        return pending;
    }

    private void forgetPending(File pending) {
        if (pending != null) pending.delete();
        exportPrefs().edit().remove(PENDING_KEY).commit();
    }

    private static String safeFilename(String requested, String fallback) {
        if (requested == null || requested.trim().isEmpty()) return fallback;
        String clean = requested.replaceAll("[^a-zA-Z0-9._-]", "_");
        return clean.length() > 120 ? fallback : clean;
    }

    /** Opens the system "save as" picker; the result is handled by backupDestination. */
    private void launchSave(PluginCall call, File pending, String mimeType, String filename) {
        Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType(mimeType)
            .putExtra(Intent.EXTRA_TITLE, filename);
        try {
            startActivityForResult(call, save, "backupDestination");
        } catch (RuntimeException error) {
            forgetPending(pending);
            call.reject("No file picker available");
        }
    }

    @PluginMethod
    public void exportFile(PluginCall call) {
        String encoded = call.getString("base64");
        String kind = call.getString("kind", "zip");
        if (encoded == null || encoded.length() > MAX_EXPORT_BYTES || !("zip".equals(kind) || "txt".equals(kind) || "xlsx".equals(kind))) {
            call.reject("Invalid export"); return;
        }
        File pending;
        try {
            byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
            if (bytes.length == 0) { call.reject("Nothing to export"); return; }
            pending = stageExport(call, kind, bytes);
            call.getData().remove("base64");
        } catch (Exception error) {
            call.reject("Could not prepare export"); return;
        }
        launchSave(call, pending,
            "zip".equals(kind) ? "application/zip"
                : "xlsx".equals(kind) ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/plain",
            safeFilename(call.getString("filename"), "kakcal-export." + kind));
    }

    @PluginMethod
    public void exportBackup(PluginCall call) {
        String json = call.getString("json");
        if (json == null || json.trim().isEmpty()) { call.reject("Missing backup"); return; }
        File pending;
        try {
            // Keep the journal out of the Activity's size-limited saved-state Bundle.
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
            if (bytes.length > MAX_EXPORT_BYTES) { call.reject("Backup too large"); return; }
            pending = stageExport(call, "json", bytes);
            call.getData().remove("json");
        } catch (Exception error) { call.reject("Could not prepare backup"); return; }
        launchSave(call, pending, "application/json",
            safeFilename(call.getString("filename"), "kakcal-" + JournalWidgetProvider.localDate() + ".json"));
    }

    /** Copies `source` into the chosen document and returns the byte count. Tries "wt" first, then "w". */
    private long copyToDocument(Uri target, File source) throws IOException {
        ContentResolver resolver = getContext().getContentResolver();
        long expected = source.length();
        IOException failure = new IOException("Could not write the selected file");
        for (String mode : new String[] { "wt", "w" }) {
            try (FileInputStream in = new FileInputStream(source);
                 OutputStream out = resolver.openOutputStream(target, mode)) {
                if (out == null) throw new IOException("No output stream");
                byte[] buffer = new byte[16384];
                long total = 0;
                int count;
                while ((count = in.read(buffer)) != -1) { out.write(buffer, 0, count); total += count; }
                out.flush();
                if (out instanceof FileOutputStream) {
                    try { ((FileOutputStream) out).getFD().sync(); } catch (IOException ignored) { /* not syncable */ }
                }
                if (total != expected) throw new IOException("Short write");
                return total; // the stream is closed (and close errors are raised) before this value is used
            } catch (IOException | RuntimeException error) {
                failure = error instanceof IOException ? (IOException) error : new IOException(error);
            }
        }
        throw failure;
    }

    @ActivityCallback
    private void backupDestination(PluginCall call, ActivityResult result) {
        // `call` is null when Capacitor lost it (activity re-created while the picker was open): the staged file is
        // still found through SharedPreferences, so the document is written anyway; only the JS answer is missing.
        String name = call != null ? call.getString("pendingFile", "") : "";
        if (name == null || name.isEmpty()) name = exportPrefs().getString(PENDING_KEY, "");
        if (name == null || !PENDING_NAME.matcher(name).matches()) {
            if (call != null) call.reject("Backup expired");
            return;
        }
        final File pending = new File(getContext().getCacheDir(), name);
        final Uri target = result.getData() != null ? result.getData().getData() : null;
        if (result.getResultCode() != Activity.RESULT_OK || target == null) {
            forgetPending(pending);
            if (call != null) {
                JSObject cancelled = new JSObject();
                cancelled.put("cancelled", true);
                call.resolve(cancelled);
            }
            return;
        }
        bridge.execute(() -> {
            try {
                if (!pending.isFile() || pending.length() == 0) throw new IOException("Nothing to write");
                long written = copyToDocument(target, pending);
                if (call != null) {
                    JSObject done = new JSObject();
                    done.put("bytes", written);
                    call.resolve(done);
                }
            } catch (Throwable error) {
                // Do not leave an empty (0 B) document behind.
                try { DocumentsContract.deleteDocument(getContext().getContentResolver(), target); } catch (Throwable ignored) { /* provider may not allow it */ }
                if (call != null) call.reject("Could not write the selected file");
            } finally {
                forgetPending(pending);
            }
        });
    }
}
