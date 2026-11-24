package com.kcalsync.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * A stand-in for a Storage Access Framework provider (Downloads, Drive...). Documents are plain files in a
 * temporary directory; the test decides when opening fails, whether deleting is allowed and what size is reported.
 * It records the open modes and the deleted documents so tests can assert what the export code actually did.
 */
public class StubDocumentsProvider extends ContentProvider {
    static final String AUTHORITY = "com.kcalsync.test.documents";
    static File root;
    /** The next N openFile() calls fail (a provider that cannot open the freshly created document). */
    static int failOpens;
    /** deleteDocument / delete throw SecurityException (the SAF grant does not allow it). */
    static boolean denyDelete;
    /** When >= 0 the size column reports this value instead of the real length. */
    static long reportedSize = -1;
    /** When true the size column is absent from the answer (provider that does not report sizes). */
    static boolean reportNoSize;
    static final List<String> openModes = new ArrayList<>();
    static final List<String> deleted = new ArrayList<>();
    static final Map<String, File> documents = new HashMap<>();

    static void reset(File directory) {
        root = directory;
        failOpens = 0; denyDelete = false; reportedSize = -1; reportNoSize = false;
        openModes.clear(); deleted.clear(); documents.clear();
    }

    /** Creates an empty document the way the picker does (0 B file) and returns its uri. */
    static Uri createEmptyDocument(String name) throws Exception {
        File file = new File(root, name);
        if (!file.createNewFile() && file.length() != 0) throw new IllegalStateException("exists");
        documents.put(name, file);
        return Uri.parse("content://" + AUTHORITY + "/document/" + name);
    }

    static File fileOf(Uri uri) { return documents.get(uri.getLastPathSegment()); }

    @Override public boolean onCreate() { return true; }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        openModes.add(mode);
        if (failOpens > 0) { failOpens--; throw new FileNotFoundException("simulated provider failure"); }
        File file = fileOf(uri);
        if (file == null || !file.exists()) throw new FileNotFoundException("no such document " + uri);
        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.parseMode(mode));
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        File file = fileOf(uri);
        if (file == null) return null;
        if (reportNoSize) { MatrixCursor none = new MatrixCursor(new String[] { OpenableColumns.DISPLAY_NAME }); none.addRow(new Object[] { file.getName() }); return none; }
        MatrixCursor cursor = new MatrixCursor(new String[] { OpenableColumns.SIZE });
        cursor.addRow(new Object[] { reportedSize >= 0 ? reportedSize : file.length() });
        return cursor;
    }

    @Override
    public Bundle call(String method, String arg, Bundle extras) {
        if ("android:deleteDocument".equals(method)) {
            Uri uri = extras.getParcelable("uri");
            if (denyDelete) throw new SecurityException("grant does not allow delete");
            removeDocument(uri);
            return Bundle.EMPTY;
        }
        return super.call(method, arg, extras);
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        if (denyDelete) throw new SecurityException("grant does not allow delete");
        return removeDocument(uri) ? 1 : 0;
    }

    private boolean removeDocument(Uri uri) {
        File file = documents.remove(uri.getLastPathSegment());
        if (file == null) return false;
        deleted.add(uri.getLastPathSegment());
        return file.delete();
    }

    @Override public String getType(Uri uri) { return "application/octet-stream"; }
    @Override public Uri insert(Uri uri, ContentValues values) { return null; }
    @Override public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) { return 0; }
}
