package com.kcalsync.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import java.util.concurrent.atomic.AtomicReference;

public class MainActivity extends BridgeActivity {
    private static final String PENDING = "pendingWidgetAction";
    private final AtomicReference<String> pending = new AtomicReference<>();

    @Override
    public void onCreate(Bundle state) {
        if (state != null) {
            pending.set(state.getString(PENDING));
            // BridgeActivity delivers its launch intent again while rebuilding the WebView.
            getIntent().removeExtra(JournalWidgetProvider.EXTRA_ACTION);
        }
        registerPlugin(JournalDevicePlugin.class);
        super.onCreate(state);
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
