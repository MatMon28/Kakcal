package com.kcalsync.app;

import static org.junit.Assert.*;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.HashSet;
import java.util.Set;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class WidgetIntegrationTest {
    private final Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();

    @Test public void threeDistinctProvidersAreInstalled() {
        assertEquals("com.kcalsync.app", context.getPackageName());
        Set<ComponentName> visible = new HashSet<>();
        for (AppWidgetProviderInfo p : AppWidgetManager.getInstance(context).getInstalledProviders()) {
            if (p.provider.getPackageName().equals(context.getPackageName())) visible.add(p.provider);
        }
        for (Class<?> provider : new Class<?>[] { JournalWidgetProvider.Small.class,
                JournalWidgetProvider.Essential.class, JournalWidgetProvider.Large.class }) {
            assertTrue(visible.contains(new ComponentName(context, provider)));
        }
        assertEquals(3, visible.size());
    }

    @Test public void widgetIntentsOnlyOpenKnownLoggingActions() {
        Intent intent = new Intent(context, MainActivity.class).setAction(JournalWidgetProvider.OPEN_ACTION);
        for (String id : new String[] { "food", "movement", "water", "poop", "weight" }) {
            intent.putExtra(JournalWidgetProvider.EXTRA_ACTION, id);
            assertEquals(id, JournalWidgetProvider.actionFrom(intent));
        }
        intent.putExtra(JournalWidgetProvider.EXTRA_ACTION, "unknown");
        assertNull(JournalWidgetProvider.actionFrom(intent));
        assertNull(JournalWidgetProvider.actionFrom(new Intent(Intent.ACTION_MAIN)));
    }
}