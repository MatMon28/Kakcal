package com.kcalsync.app;

import android.content.ContentResolver;
import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.util.Log;
import java.io.DataInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.LongSupplier;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Everything about "save this file through the system create-document picker" that is not Capacitor or UI:
 * staging the bytes, remembering them across process death, writing them in one pass, verifying the result and
 * cleaning up the empty document the picker creates. See docs/backup-update.md (section "Android export, round 2").
 *
 * <p>Why it exists: Android creates the (empty) document when the user taps Save in the picker, and the app writes
 * into it afterwards. Anything that interrupts the app in between leaves a 0 B file. So:
 * <ul>
 *   <li>the bytes are staged in {@code getFilesDir()/exports} (app-private, never evicted like {@code cacheDir});</li>
 *   <li>every staged export has an id and a record (id -> absolute path, name, size, target) in SharedPreferences;</li>
 *   <li>the picker target is recorded <em>before</em> the write starts, so a crash during the write is resumable;</li>
 *   <li>{@link #recover()} (called from MainActivity.onCreate) finishes or cleans every record that has a target;</li>
 *   <li>the finished outcome is kept ({@link #addLast}) so the web layer can show it even when its call is gone.</li>
 * </ul>
 * The write is proven by reading the document back and comparing every byte, never by the provider's SIZE column
 * (a cached value on MediaStore-backed providers such as Downloads: it reports 0 for complete files). A document that
 * received bytes is never deleted, and its staged copy is kept; only a provably empty document is removed.
 * The only open-mode retry is "wt" -> "w" after a FileNotFoundException at the open (some cloud providers refuse
 * "wt"); that is safe because a failed open truncates nothing.
 */
final class ExportStore {
    static final String TAG = "KakcalExport";
    /** The one open mode used (truncate + write). A second mode would be the same call, so there is no retry loop. */
    static final String WRITE_MODE = "wt";
    static final int MAX_BYTES = 32000000;
    /** A record that never got a picker result is dropped after this long (and its staged bytes with it). */
    static final long STALE_MS = 24L * 60 * 60 * 1000;
    /** Files in the export directory without a record are swept once they are older than this. */
    static final long ORPHAN_FILE_MS = 10L * 60 * 1000;
    static final List<String> KINDS = Arrays.asList("json", "zip", "txt", "xlsx");

    /** Single background thread for writing into the chosen document (never the UI thread). */
    static final ExecutorService IO = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "kakcal-export");
        thread.setDaemon(true);
        return thread;
    });

    /** Replaced by tests to simulate the passing of time. */
    static LongSupplier clock = System::currentTimeMillis;

    private static final String PREFS = "journal_export";
    private static final String RECORD = "pending.";
    private static final String INFLIGHT = "inflight";
    private static final String LAST = "lastExport";
    private static final String ORPHANS = "orphans";
    private static final String LEGACY_KEY = "pendingFile";
    private static final Pattern ID = Pattern.compile("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");
    private static final Pattern LEGACY_CACHE_NAME = Pattern.compile("journal-backup-[-0-9]+\\.(json|zip|txt|xlsx)");
    private static final int CHUNK = 64 * 1024;
    private static final int MAX_LAST = 5;
    private static final int MAX_ORPHANS = 20;
    private static final Object LOCK = new Object();
    /** Ids whose copy is running in this process right now (recover() must not start a second copy). */
    private static final Set<String> ACTIVE = new HashSet<>();

    /** A staged export. {@code target} is null until the picker returned a document. */
    static final class Pending {
        final String id, path, kind, filename, target;
        final long size, createdAt;

        Pending(String id, String path, String kind, String filename, long size, long createdAt, String target) {
            this.id = id; this.path = path; this.kind = kind; this.filename = filename;
            this.size = size; this.createdAt = createdAt; this.target = target;
        }

        Pending withTarget(String uri) { return new Pending(id, path, kind, filename, size, createdAt, uri); }

        JSONObject toJson() throws JSONException {
            JSONObject o = new JSONObject();
            o.put("id", id).put("path", path).put("kind", kind).put("filename", filename)
                .put("size", size).put("createdAt", createdAt);
            if (target != null) o.put("target", target);
            return o;
        }
    }

    /** The end of an export: what JS is told (or, when its call is gone, what it reads later). */
    static final class Outcome {
        static final String SAVED = "saved", FAILED = "failed", CANCELLED = "cancelled";
        final String id, status, filename, detail;
        final long bytes;

        Outcome(String id, String status, String filename, long bytes, String detail) {
            this.id = id; this.status = status; this.filename = filename; this.bytes = bytes; this.detail = detail;
        }

        JSONObject toJson() {
            JSONObject o = new JSONObject();
            try {
                o.put("id", id).put("status", status).put("bytes", bytes);
                if (filename != null) o.put("filename", filename);
                if (detail != null) o.put("detail", detail);
            } catch (JSONException ignored) { /* keys are constants */ }
            return o;
        }
    }

    /** A failed write; the message already carries mode, exception class and message. */
    static final class ExportException extends IOException {
        /** True when the document had already been handed bytes: it must then never be deleted. */
        final boolean wroteBytes;

        ExportException(String message, Throwable cause) { this(message, cause, false); }

        ExportException(String message, Throwable cause, boolean wroteBytes) {
            super(message, cause);
            this.wroteBytes = wroteBytes;
        }
    }

    private final Context context;
    private final SharedPreferences prefs;

    ExportStore(Context context) {
        this.context = context.getApplicationContext() != null ? context.getApplicationContext() : context;
        this.prefs = this.context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static long now() { return clock.getAsLong(); }

    static boolean isKind(String kind) { return kind != null && KINDS.contains(kind); }

    File exportDir() { return new File(context.getFilesDir(), "exports"); }

    // ---- staging ------------------------------------------------------------------------------------------------

    /** Writes the bytes to app-private storage (fsync, size check) and records them under a new id. */
    Pending stage(String kind, String filename, byte[] bytes) throws IOException {
        if (!isKind(kind)) throw new IOException("Unsupported export kind: " + kind);
        if (bytes.length == 0) throw new IOException("Nothing to export");
        if (bytes.length > MAX_BYTES) throw new IOException("Export too large");
        dropStale();
        File dir = exportDir();
        if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("Cannot create " + dir);
        String id = UUID.randomUUID().toString();
        File file = new File(dir, id + "." + kind);
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(bytes);
            out.flush();
            try { out.getFD().sync(); } catch (IOException error) { Log.w(TAG, "fsync of staged file failed: " + error.getMessage()); }
        } catch (IOException | RuntimeException error) {
            file.delete();
            throw error;
        }
        if (file.length() != bytes.length) { file.delete(); throw new IOException("Short write while staging (" + file.length() + " of " + bytes.length + " bytes)"); }
        Pending pending = new Pending(id, file.getAbsolutePath(), kind, filename, bytes.length, now(), null);
        if (!save(pending)) { file.delete(); throw new IOException("Could not record the staged export"); }
        return pending;
    }

    Pending load(String id) {
        if (id == null || !ID.matcher(id).matches()) return null;
        return parse(prefs.getString(RECORD + id, null));
    }

    private Pending parse(String json) {
        if (json == null) return null;
        try {
            JSONObject o = new JSONObject(json);
            String id = o.getString("id");
            if (!ID.matcher(id).matches()) return null;
            Pending pending = new Pending(id, o.getString("path"), o.getString("kind"), o.optString("filename", ""),
                o.getLong("size"), o.optLong("createdAt", 0), o.has("target") ? o.getString("target") : null);
            return isInsideExportDir(new File(pending.path)) ? pending : null;
        } catch (JSONException | IOException error) {
            return null;
        }
    }

    private boolean isInsideExportDir(File file) throws IOException {
        return file.getCanonicalPath().startsWith(exportDir().getCanonicalPath() + File.separator);
    }

    private boolean save(Pending pending) {
        try { return prefs.edit().putString(RECORD + pending.id, pending.toJson().toString()).commit(); }
        catch (JSONException error) { return false; }
    }

    List<Pending> allPending() {
        List<Pending> list = new ArrayList<>();
        for (String key : new ArrayList<>(prefs.getAll().keySet())) {
            if (!key.startsWith(RECORD)) continue;
            Pending pending = parse(prefs.getString(key, null));
            if (pending == null) prefs.edit().remove(key).commit(); // unreadable or outside the export dir
            else list.add(pending);
        }
        return list;
    }

    /** Removes the record and its staged bytes. */
    void forget(String id) {
        Pending pending = load(id);
        if (pending != null) new File(pending.path).delete();
        if (id != null) prefs.edit().remove(RECORD + id).commit();
    }

    // ---- picker bookkeeping --------------------------------------------------------------------------------------

    /** Persists the document the picker returned, before anything is written into it (crash-safe marker). */
    private boolean markTarget(Pending pending, Uri target) { return save(pending.withTarget(target.toString())); }

    /** Same, for tests that simulate a crash between the picker result and the write. */
    boolean markTarget(String id, Uri target) {
        Pending pending = load(id);
        return pending != null && markTarget(pending, target);
    }

    /** Remembers which export the (single) open picker belongs to; read again in the result callback. */
    void beginPicker(String id) { prefs.edit().putString(INFLIGHT, id).commit(); }

    String takeInflight() {
        synchronized (LOCK) {
            String id = prefs.getString(INFLIGHT, null);
            prefs.edit().remove(INFLIGHT).commit();
            return id;
        }
    }

    Outcome cancelled(String id) {
        Pending pending = load(id);
        forget(id);
        return new Outcome(id, Outcome.CANCELLED, pending != null ? pending.filename : null, 0, null);
    }

    // ---- writing -------------------------------------------------------------------------------------------------

    /**
     * Copies the staged bytes into the chosen document. Never throws. Order: record the target (so a crash is
     * resumable), read the bytes (the target is not opened before they are in memory), open the target, write in one
     * pass, flush, sync, close, then read the document back and compare the bytes. A failure before any byte reached the
     * document removes the document only when it is provably empty (best effort, the grant may not allow it) and
     * drops the staged copy. A failure after bytes were written leaves the document in place and keeps the staged
     * copy (so a retry is possible). The outcome says what happened.
     *
     * @return the outcome, or null when this id is already being written by this process.
     */
    Outcome complete(String id, Uri target) {
        synchronized (ACTIVE) { if (!ACTIVE.add(id)) { Log.w(TAG, "export " + id + " is already being written"); return null; } }
        Pending pending = load(id);
        try {
            if (pending == null) {
                String cleanup = cleanUpEmpty(target);
                return failed(id, null, "Export record is missing: mode=" + WRITE_MODE + " " + describeProvider(target) + cleanup);
            }
            markTarget(pending, target);
            File file = new File(pending.path);
            if (!file.isFile() || file.length() != pending.size) {
                throw new IOException("Staged file is missing or truncated (" + (file.isFile() ? file.length() : 0) + " of " + pending.size + " bytes)");
            }
            byte[] data = readAll(file);
            long written = write(target, data);
            forget(id);
            Log.i(TAG, "saved " + written + " bytes to " + target);
            return new Outcome(id, Outcome.SAVED, pending.filename, written, null);
        } catch (Throwable error) {
            String message = error instanceof ExportException ? error.getMessage() : describe(target, error);
            Log.e(TAG, message, error);
            String cleanup;
            if (error instanceof ExportException && ((ExportException) error).wroteBytes) {
                cleanup = " [the document was left in place: bytes had been written to it; the staged copy was kept]";
                keepStaged(pending);
            } else {
                cleanup = cleanUpEmpty(target);
                forget(id);
            }
            return failed(id, pending != null ? pending.filename : null, message + cleanup);
        } finally {
            synchronized (ACTIVE) { ACTIVE.remove(id); }
        }
    }

    /**
     * Keeps the staged bytes after a failure that happened once the document had received data. The picker target is
     * cleared from the record so recover() does not rewrite the same document on every start; the record is dropped
     * as stale after STALE_MS like any other export that is never finished.
     */
    private void keepStaged(Pending pending) {
        if (pending == null) return;
        if (!new File(pending.path).isFile()) { forget(pending.id); return; }
        save(new Pending(pending.id, pending.path, pending.kind, pending.filename, pending.size, pending.createdAt, null));
    }

    private Outcome failed(String id, String filename, String detail) {
        return new Outcome(id, Outcome.FAILED, filename, 0, detail);
    }

    private static byte[] readAll(File file) throws IOException {
        byte[] data = new byte[(int) file.length()];
        try (DataInputStream in = new DataInputStream(new FileInputStream(file))) { in.readFully(data); }
        return data;
    }

    /**
     * Opens the target, writes everything, flushes, syncs, closes and reads the document back to compare the bytes.
     * Returns the verified byte count. The provider's SIZE column is never used as proof (stale on MediaStore).
     */
    long write(Uri target, byte[] data) throws IOException {
        ContentResolver resolver = context.getContentResolver();
        long written = 0;
        try {
            try (OutputStream out = openForWrite(resolver, target)) {
                if (out == null) throw new IOException("the provider returned no output stream");
                for (int offset = 0; offset < data.length; offset += CHUNK) {
                    int count = Math.min(CHUNK, data.length - offset);
                    out.write(data, offset, count);
                    written += count;
                }
                out.flush();
                if (out instanceof FileOutputStream) {
                    try { ((FileOutputStream) out).getFD().sync(); }
                    catch (IOException error) { Log.d(TAG, "target cannot be fsynced: " + error.getMessage()); }
                }
            } // close() errors are raised here, before the count is trusted
            if (written != data.length) throw new IOException("short write: " + written + " of " + data.length + " bytes");
            return readBack(resolver, target, data); // verified bytes
        } catch (IOException | RuntimeException error) {
            if (error instanceof ExportException) throw (ExportException) error;
            throw new ExportException(describe(target, error), error, written > 0);
        }
    }

    /** "wt" first; a FileNotFoundException at the open (cloud providers) retries once with "w". Nothing was truncated. */
    private static OutputStream openForWrite(ContentResolver resolver, Uri target) throws IOException {
        try {
            return resolver.openOutputStream(target, WRITE_MODE);
        } catch (FileNotFoundException error) {
            Log.w(TAG, "open with mode " + WRITE_MODE + " failed for " + target + " (" + error.getMessage() + "), trying mode w");
            return resolver.openOutputStream(target, "w");
        }
    }

    /** Prove the write by reading it back. The provider's SIZE column is stale on MediaStore providers. */
    private static long readBack(ContentResolver resolver, Uri target, byte[] expected) throws IOException {
        InputStream opened;
        try {
            opened = resolver.openInputStream(target);
        } catch (IOException | RuntimeException error) {
            // Write-only grant or a provider that cannot be read: the write itself succeeded, so accept it.
            // The SIZE column is never a fallback.
            Log.w(TAG, "could not read " + target + " back to verify it: " + error.getClass().getSimpleName() + ": " + error.getMessage());
            return expected.length;
        }
        long total = 0;
        try (InputStream in = opened) {
            if (in == null) throw new IOException("the provider returned no input stream");
            byte[] buffer = new byte[CHUNK];
            int n;
            while ((n = in.read(buffer)) > 0) {
                for (int i = 0; i < n; i++) {
                    int at = (int) total + i;
                    if (at >= expected.length) throw new IOException("the document is longer than the staged file");
                    if (buffer[i] != expected[at]) throw new IOException("the document content differs from the staged file");
                }
                total += n;
            }
        }
        if (total != expected.length) throw new IOException("the document holds " + total + " of " + expected.length + " bytes");
        return total;
    }

    // ---- diagnostics ---------------------------------------------------------------------------------------------

    private static String describeProvider(Uri target) { return "(provider=" + (target != null ? target.getAuthority() : "?") + ")"; }

    /** "Could not write the selected file: mode=wt FileNotFoundException: message (provider=authority)". */
    static String describe(Uri target, Throwable error) {
        return "Could not write the selected file: mode=" + WRITE_MODE + " " + error.getClass().getSimpleName() + ": "
            + error.getMessage() + " " + describeProvider(target);
    }

    // ---- cleaning up the empty document --------------------------------------------------------------------------

    /**
     * Best effort: the SAF grant that came with the picker result may be revoked or insufficient, and not every
     * provider supports deleting. The caller is told which one happened. A failure is remembered and retried on the
     * next start.
     */
    /** Removes the document only when the provider says it is empty (0 B); anything else is left alone. */
    private String cleanUpEmpty(Uri target) {
        return documentIsEmpty(target) ? discard(target) : " [the document was left in place: it is not empty]";
    }

    private boolean documentIsEmpty(Uri target) {
        if (target == null) return false;
        try (Cursor c = context.getContentResolver().query(target, new String[] { OpenableColumns.SIZE }, null, null, null)) {
            return c != null && c.moveToFirst() && !c.isNull(0) && c.getLong(0) == 0L;
        } catch (RuntimeException e) { return false; }
    }

    private String discard(Uri target) {
        if (target == null) return "";
        if (deleteQuietly(target)) return " [the empty document was removed]";
        rememberOrphan(target);
        return " [the empty document could not be removed: delete it manually]";
    }

    private boolean deleteQuietly(Uri target) {
        ContentResolver resolver = context.getContentResolver();
        try {
            if (DocumentsContract.deleteDocument(resolver, target)) return true;
            Log.w(TAG, "provider refused deleteDocument for " + target);
        } catch (Throwable error) {
            Log.w(TAG, "deleteDocument failed for " + target + ": " + error.getClass().getSimpleName() + ": " + error.getMessage());
        }
        try {
            if (resolver.delete(target, null, null) > 0) return true;
        } catch (Throwable error) {
            Log.w(TAG, "delete failed for " + target + ": " + error.getClass().getSimpleName() + ": " + error.getMessage());
        }
        return false;
    }

    private void rememberOrphan(Uri target) {
        synchronized (LOCK) {
            JSONArray kept = new JSONArray();
            try {
                JSONArray old = readArray(ORPHANS);
                int from = Math.max(0, old.length() - (MAX_ORPHANS - 1));
                for (int i = from; i < old.length(); i++) kept.put(old.get(i));
                kept.put(new JSONObject().put("uri", target.toString()).put("at", now()));
            } catch (JSONException ignored) { /* keep what we have */ }
            prefs.edit().putString(ORPHANS, kept.toString()).commit();
        }
    }

    private void retryOrphans() {
        synchronized (LOCK) {
            JSONArray old = readArray(ORPHANS);
            if (old.length() == 0) return;
            JSONArray kept = new JSONArray();
            long now = now();
            for (int i = 0; i < old.length(); i++) {
                JSONObject entry = old.optJSONObject(i);
                if (entry == null || now - entry.optLong("at", 0) > STALE_MS) continue;
                if (!deleteQuietly(Uri.parse(entry.optString("uri")))) kept.put(entry);
            }
            prefs.edit().putString(ORPHANS, kept.toString()).commit();
        }
    }

    // ---- recovery ------------------------------------------------------------------------------------------------

    /**
     * Called when the app process starts (MainActivity.onCreate). Records with a target are exports whose picker had
     * returned but whose write never finished (process killed, crash): the copy is finished from the staged bytes, or
     * the empty document is removed. Records without a target are pickers that may still be open: kept until stale.
     * Also removes legacy cache files of the previous implementation and staged files nobody refers to.
     */
    List<Outcome> recover() {
        List<Outcome> outcomes = new ArrayList<>();
        prefs.edit().remove(LEGACY_KEY).commit();
        File[] legacy = context.getCacheDir().listFiles();
        if (legacy != null) for (File file : legacy) if (LEGACY_CACHE_NAME.matcher(file.getName()).matches()) file.delete();
        for (Pending pending : allPending()) {
            synchronized (ACTIVE) { if (ACTIVE.contains(pending.id)) continue; }
            if (pending.target != null) {
                Outcome outcome = complete(pending.id, Uri.parse(pending.target));
                if (outcome != null) outcomes.add(outcome);
            } else if (now() - pending.createdAt > STALE_MS) {
                Log.w(TAG, "dropping stale export " + pending.id + " (the picker never returned)");
                forget(pending.id);
            }
        }
        sweepUnreferencedFiles();
        retryOrphans();
        return outcomes;
    }

    private void dropStale() {
        for (Pending pending : allPending()) {
            if (pending.target == null && now() - pending.createdAt > STALE_MS) forget(pending.id);
        }
    }

    private void sweepUnreferencedFiles() {
        File[] files = exportDir().listFiles();
        if (files == null) return;
        Set<String> referenced = new HashSet<>();
        for (Pending pending : allPending()) referenced.add(new File(pending.path).getName());
        for (File file : files) {
            if (referenced.contains(file.getName())) continue;
            if (now() - file.lastModified() > ORPHAN_FILE_MS) file.delete();
        }
    }

    // ---- "last export" record for the web layer ------------------------------------------------------------------

    private JSONArray readArray(String key) {
        try { return new JSONArray(prefs.getString(key, "[]")); } catch (JSONException error) { return new JSONArray(); }
    }

    /** Keeps an outcome for JS to read later (used when the PluginCall that started the export is gone). */
    void addLast(Outcome outcome) {
        synchronized (LOCK) {
            JSONArray old = readArray(LAST);
            JSONArray kept = new JSONArray();
            for (int i = Math.max(0, old.length() - (MAX_LAST - 1)); i < old.length(); i++) {
                try { kept.put(old.get(i)); } catch (JSONException ignored) { /* skip */ }
            }
            kept.put(outcome.toJson());
            prefs.edit().putString(LAST, kept.toString()).commit();
        }
    }

    /** Returns and clears the kept outcomes (oldest first). */
    JSONArray takeLast() {
        synchronized (LOCK) {
            JSONArray all = readArray(LAST);
            prefs.edit().remove(LAST).commit();
            return all;
        }
    }
}
