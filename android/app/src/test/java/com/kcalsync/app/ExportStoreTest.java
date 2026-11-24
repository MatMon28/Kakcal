package com.kcalsync.app;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.net.Uri;
import androidx.test.core.app.ApplicationProvider;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.List;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

/**
 * Runs the real copy loop of the export (ExportStore) against a stub ContentProvider through the real ContentResolver,
 * so the Java cannot ship broken while a mocked JS test stays green (tests/backup-android.test.tsx mocks the plugin).
 */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = 34)
public class ExportStoreTest {
    @Rule public TemporaryFolder temp = new TemporaryFolder();
    private Context context;
    private ExportStore store;

    private static byte[] payload(int size) {
        StringBuilder text = new StringBuilder("{\"version\":\"2.0\",\"x\":\"");
        while (text.length() < size - 2) text.append("kakcal");
        return text.substring(0, size - 2).concat("\"}").getBytes(StandardCharsets.UTF_8);
    }

    @Before
    public void setUp() throws Exception {
        context = ApplicationProvider.getApplicationContext();
        StubDocumentsProvider.reset(temp.newFolder("documents"));
        Robolectric.setupContentProvider(StubDocumentsProvider.class, StubDocumentsProvider.AUTHORITY);
        ExportStore.clock = System::currentTimeMillis;
        store = new ExportStore(context);
    }

    @After
    public void tearDown() { ExportStore.clock = System::currentTimeMillis; }

    @Test
    public void bytesAreStagedInFilesDirNotCacheDir() throws Exception {
        ExportStore.Pending pending = store.stage("json", "backup.json", payload(2048));
        assertTrue(pending.path.startsWith(context.getFilesDir().getAbsolutePath()));
        assertFalse(pending.path.startsWith(context.getCacheDir().getAbsolutePath()));
        assertEquals(2048, new File(pending.path).length());
        // a new store object = a new process: the record (id -> absolute path) is still there
        ExportStore.Pending again = new ExportStore(context).load(pending.id);
        assertNotNull(again);
        assertEquals(pending.path, again.path);
        assertEquals("backup.json", again.filename);
    }

    @Test
    public void emptyAndUnknownPayloadsAreRefusedBeforeAnyPickerExists() {
        try { store.stage("json", "a.json", new byte[0]); throw new AssertionError("empty accepted"); } catch (java.io.IOException expected) { /* ok */ }
        try { store.stage("exe", "a.exe", payload(10)); throw new AssertionError("kind accepted"); } catch (java.io.IOException expected) { /* ok */ }
        assertTrue(store.allPending().isEmpty());
    }

    @Test
    public void successWritesEveryByteInOneOpenAndReportsTheCount() throws Exception {
        byte[] data = payload(300_000);
        ExportStore.Pending pending = store.stage("json", "backup.json", data);
        Uri target = StubDocumentsProvider.createEmptyDocument("backup.json");

        ExportStore.Outcome outcome = store.complete(pending.id, target);

        assertEquals(ExportStore.Outcome.SAVED, outcome.status);
        assertEquals(data.length, outcome.bytes);
        assertArrayEquals(data, Files.readAllBytes(StubDocumentsProvider.fileOf(target).toPath()));
        assertEquals("exactly one open, no mode retry", 1, StubDocumentsProvider.openModes.size());
        assertEquals("wt", StubDocumentsProvider.openModes.get(0));
        assertNull("record is gone", store.load(pending.id));
        assertFalse("staged bytes are gone", new File(pending.path).exists());
    }

    @Test
    public void firstOpenFailsThenDeleteAndRecreateSucceeds() throws Exception {
        byte[] data = payload(20_000);
        StubDocumentsProvider.failOpens = 1;
        ExportStore.Pending first = store.stage("json", "backup.json", data);
        Uri broken = StubDocumentsProvider.createEmptyDocument("backup.json");

        ExportStore.Outcome failed = store.complete(first.id, broken);

        assertEquals(ExportStore.Outcome.FAILED, failed.status);
        assertTrue(failed.detail, failed.detail.contains("mode=wt FileNotFoundException: simulated provider failure"));
        assertTrue(failed.detail, failed.detail.contains("provider=" + StubDocumentsProvider.AUTHORITY));
        assertTrue(failed.detail, failed.detail.contains("[the empty document was removed]"));
        assertEquals("the empty document is gone, no 0 B file survives", 1, StubDocumentsProvider.deleted.size());
        assertNull(StubDocumentsProvider.fileOf(broken));
        assertEquals("a failed open is not retried with another mode", 1, StubDocumentsProvider.openModes.size());
        assertNull(store.load(first.id));

        // the user presses Export again: new stage, new document from the picker
        ExportStore.Pending second = store.stage("json", "backup.json", data);
        Uri fresh = StubDocumentsProvider.createEmptyDocument("backup (1).json");
        ExportStore.Outcome saved = store.complete(second.id, fresh);

        assertEquals(ExportStore.Outcome.SAVED, saved.status);
        assertEquals(data.length, saved.bytes);
        assertEquals(data.length, StubDocumentsProvider.fileOf(fresh).length());
    }

    @Test
    public void deleteBeingDeniedIsSaidSoAndRetriedOnNextStart() throws Exception {
        StubDocumentsProvider.failOpens = 1;
        StubDocumentsProvider.denyDelete = true;
        ExportStore.Pending pending = store.stage("xlsx", "data.xlsx", payload(5000));
        Uri target = StubDocumentsProvider.createEmptyDocument("data.xlsx");

        ExportStore.Outcome failed = store.complete(pending.id, target);

        assertEquals(ExportStore.Outcome.FAILED, failed.status);
        assertTrue(failed.detail, failed.detail.contains("could not be removed: delete it manually"));
        assertNotNull("0 B document still there (grant refused)", StubDocumentsProvider.fileOf(target));

        StubDocumentsProvider.denyDelete = false; // e.g. the next start has a working grant
        new ExportStore(context).recover();
        assertNull("orphaned empty document is removed on the next start", StubDocumentsProvider.fileOf(target));
    }

    @Test
    public void providerThatKeepsFewerBytesThanWrittenIsAFailure() throws Exception {
        StubDocumentsProvider.reportedSize = 0; // provider says 0 B although the stream accepted everything
        ExportStore.Pending pending = store.stage("zip", "pictures.zip", payload(4096));
        Uri target = StubDocumentsProvider.createEmptyDocument("pictures.zip");

        ExportStore.Outcome outcome = store.complete(pending.id, target);

        assertEquals(ExportStore.Outcome.FAILED, outcome.status);
        assertTrue(outcome.detail, outcome.detail.contains("the provider reports 0 bytes, expected 4096"));
        assertNull(StubDocumentsProvider.fileOf(target));
    }

    @Test
    public void providerThatReportsNoSizeIsAccepted() throws Exception {
        StubDocumentsProvider.reportNoSize = true;
        byte[] data = payload(4096);
        ExportStore.Pending pending = store.stage("zip", "pictures.zip", data);
        Uri target = StubDocumentsProvider.createEmptyDocument("pictures.zip");
        ExportStore.Outcome outcome = store.complete(pending.id, target);
        assertEquals(ExportStore.Outcome.SAVED, outcome.status);
        assertEquals(data.length, outcome.bytes);
    }

    @Test
    public void staleCacheLikeEvictionOfTheStagedFileIsReportedNotWrittenAsZeroBytes() throws Exception {
        ExportStore.Pending pending = store.stage("json", "backup.json", payload(1000));
        Uri target = StubDocumentsProvider.createEmptyDocument("backup.json");
        assertTrue(new File(pending.path).delete()); // the staged bytes vanished

        ExportStore.Outcome outcome = store.complete(pending.id, target);

        assertEquals(ExportStore.Outcome.FAILED, outcome.status);
        assertTrue(outcome.detail, outcome.detail.contains("Staged file is missing or truncated"));
        assertEquals("the target was never opened", 0, StubDocumentsProvider.openModes.size());
        assertNull("and the empty document was removed", StubDocumentsProvider.fileOf(target));
    }

    @Test
    public void twoExportsInARowDoNotDeleteEachOther() throws Exception {
        ExportStore.Pending json = store.stage("json", "backup.json", payload(1000));
        ExportStore.Pending excel = store.stage("xlsx", "data.xlsx", payload(2000));
        assertTrue(new File(json.path).isFile());
        assertTrue(new File(excel.path).isFile());
        assertEquals(2, store.allPending().size());

        Uri excelTarget = StubDocumentsProvider.createEmptyDocument("data.xlsx");
        assertEquals(2000, store.complete(excel.id, excelTarget).bytes);
        assertTrue("the JSON payload is untouched", new File(json.path).isFile());
        assertNotNull(store.load(json.id));
    }

    @Test
    public void processDeathBetweenPickerAndWriteIsFinishedOnNextStart() throws Exception {
        byte[] data = payload(50_000);
        ExportStore.Pending pending = store.stage("json", "backup.json", data);
        store.beginPicker(pending.id);
        Uri target = StubDocumentsProvider.createEmptyDocument("backup.json");
        assertTrue(store.markTarget(pending.id, target)); // ...and then the process is killed before writing

        List<ExportStore.Outcome> outcomes = new ExportStore(context).recover(); // MainActivity.onCreate

        assertEquals(1, outcomes.size());
        assertEquals(ExportStore.Outcome.SAVED, outcomes.get(0).status);
        assertEquals(data.length, outcomes.get(0).bytes);
        assertEquals("no 0 B document survives", data.length, StubDocumentsProvider.fileOf(target).length());
        assertTrue(store.allPending().isEmpty());
    }

    @Test
    public void processDeathWithAnUnusableStagedFileRemovesTheEmptyDocument() throws Exception {
        ExportStore.Pending pending = store.stage("json", "backup.json", payload(1000));
        Uri target = StubDocumentsProvider.createEmptyDocument("backup.json");
        store.markTarget(pending.id, target);
        assertTrue(new File(pending.path).delete());

        List<ExportStore.Outcome> outcomes = new ExportStore(context).recover();

        assertEquals(ExportStore.Outcome.FAILED, outcomes.get(0).status);
        assertNull(StubDocumentsProvider.fileOf(target));
    }

    @Test
    public void anExportWhoseRecordIsMissingStillRemovesTheEmptyDocument() throws Exception {
        Uri target = StubDocumentsProvider.createEmptyDocument("backup.json");
        ExportStore.Outcome outcome = store.complete("00000000-0000-0000-0000-000000000000", target);
        assertEquals(ExportStore.Outcome.FAILED, outcome.status);
        assertNull(StubDocumentsProvider.fileOf(target));
    }

    @Test
    public void anOpenPickerIsKeptUntilItIsStaleThenDropped() throws Exception {
        ExportStore.Pending pending = store.stage("json", "backup.json", payload(1000));
        new ExportStore(context).recover();
        assertNotNull("the picker may still be open", store.load(pending.id));
        assertTrue(new File(pending.path).isFile());

        long later = System.currentTimeMillis() + ExportStore.STALE_MS + 1000;
        ExportStore.clock = () -> later;
        new ExportStore(context).recover();
        assertNull(store.load(pending.id));
        assertFalse(new File(pending.path).exists());
    }

    @Test
    public void cancelRemovesTheStagedBytes() throws Exception {
        ExportStore.Pending pending = store.stage("json", "backup.json", payload(1000));
        ExportStore.Outcome outcome = store.cancelled(pending.id);
        assertEquals(ExportStore.Outcome.CANCELLED, outcome.status);
        assertNull(store.load(pending.id));
        assertFalse(new File(pending.path).exists());
    }

    @Test
    public void lastExportOutcomesAreReadOnce() {
        store.addLast(new ExportStore.Outcome("id-1", ExportStore.Outcome.SAVED, "backup.json", 12_700, null));
        assertEquals(1, new ExportStore(context).takeLast().length());
        assertEquals(0, new ExportStore(context).takeLast().length());
    }

    @Test
    public void legacyCacheFilesOfTheOldImplementationAreRemoved() throws Exception {
        File legacy = new File(context.getCacheDir(), "journal-backup-123.json");
        assertTrue(legacy.createNewFile());
        new ExportStore(context).recover();
        assertFalse(legacy.exists());
    }
}
