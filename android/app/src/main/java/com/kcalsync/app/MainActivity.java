package com.kcalsync.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.health.connect.client.PermissionController;
import com.getcapacitor.BridgeActivity;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

public class MainActivity extends BridgeActivity {
    private static final String PENDING = "pendingWidgetAction";
    /** Fixed key: after process death Android hands an undelivered picker result to the launcher registered under it. */
    private static final String EXPORT_PICKER_KEY = "kakcal-export-picker";
    private static final String HEALTH_PERMISSIONS_KEY = "kakcal-hc-permissions";
    private final AtomicReference<String> pending = new AtomicReference<>();
    private ActivityResultLauncher<Intent> exportPicker;
    private ActivityResultLauncher<Set<String>> healthPermissionsLauncher;

    @Override
    public void onCreate(Bundle state) {
        if (state != null) {
            pending.set(state.getString(PENDING));
            // BridgeActivity delivers its launch intent again while rebuilding the WebView.
            getIntent().removeExtra(JournalWidgetProvider.EXTRA_ACTION);
        }
        registerPlugin(JournalDevicePlugin.class);
        // Window and WebView use the saved app background from the first frame (no cream flash before a dark theme).
        LaunchBackground.applyToWindow(this);
        // Only matters for the next cold start: done when the main thread is idle, not during onCreate.
        LaunchBackground.applySplashThemeWhenIdle(this);
        super.onCreate(state);
        if (getBridge() != null) LaunchBackground.applyToWebView(this, getBridge().getWebView());
        // The export picker lives here, not in the plugin: this registration is made on every start, so a result that
        // arrives after the activity (or the whole process) was re-created is still delivered and the copy still runs.
        exportPicker = getActivityResultRegistry().register(
            EXPORT_PICKER_KEY, this, new ActivityResultContracts.StartActivityForResult(), this::onExportPicked);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            healthPermissionsLauncher = getActivityResultRegistry().register(
                HEALTH_PERMISSIONS_KEY, this,
                PermissionController.createRequestPermissionResultContract(),
                this::onHealthPermissionsResult);
        }
        // Resume on create: finish, or clean up, every export the previous process left half done.
        ExportStore.IO.execute(() -> {
            try {
                List<ExportStore.Outcome> outcomes = new ExportStore(getApplicationContext()).recover();
                for (ExportStore.Outcome outcome : outcomes) JournalDevicePlugin.deliver(getApplicationContext(), getBridge(), outcome);
            } catch (RuntimeException error) {
                Log.e(ExportStore.TAG, "recovery failed", error);
            }
        });
    }

    /** Opens the Health Connect permission sheet (any thread). `onError` runs when it cannot be launched. */
    void launchHealthPermissions(Set<String> permissions, Consumer<RuntimeException> onError) {
        runOnUiThread(() -> {
            if (healthPermissionsLauncher == null) {
                onError.accept(new IllegalStateException("Health Connect is not supported on this Android version"));
                return;
            }
            try { healthPermissionsLauncher.launch(permissions); }
            catch (RuntimeException error) { onError.accept(error); }
        });
    }

    private void onHealthPermissionsResult(Set<String> granted) {
        JournalDevicePlugin.deliverHealthPermissions(granted);
    }

    /** Opens the system "save as" picker (any thread). `onError` runs when it cannot be launched. */
    void launchExportPicker(Intent intent, Consumer<RuntimeException> onError) {
        runOnUiThread(() -> {
            try { exportPicker.launch(intent); }
            catch (RuntimeException error) { onError.accept(error); }
        });
    }

    private void onExportPicked(ActivityResult result) {
        final ExportStore store = new ExportStore(getApplicationContext());
        final String id = store.takeInflight();
        final Uri target = result.getData() != null ? result.getData().getData() : null;
        if (id == null) {
            Log.w(ExportStore.TAG, "picker result without a pending export (target=" + target + ")");
            return;
        }
        if (result.getResultCode() != Activity.RESULT_OK || target == null) {
            JournalDevicePlugin.deliver(getApplicationContext(), getBridge(), store.cancelled(id));
            return;
        }
        // The write happens off the UI thread; the target was only just created by the picker, so go straight to it.
        ExportStore.IO.execute(() -> JournalDevicePlugin.deliver(getApplicationContext(), getBridge(), store.complete(id, target)));
    }

    @Override
    protected void onNewIntent(Intent intent) {
        String action = JournalWidgetProvider.actionFrom(intent);
        if (action != null) {
            pending.set(action);
            intent.removeExtra(JournalWidgetProvider.EXTRA_ACTION);
        }
        super.onNewIntent(intent);
        setIntent(intent);
    }

    @Override
    public void onSaveInstanceState(Bundle state) {
        state.putString(PENDING, pending.get());
        super.onSaveInstanceState(state);
    }

    String takeWidgetAction() {
        return pending.getAndSet(null);
    }
}
