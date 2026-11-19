# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ---- Kakcalculator release (R8) rules ----
# Stack traces stay readable in Play Console / Logcat.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor ships consumer rules for @CapacitorPlugin classes (reached by reflection from the bridge);
# the app's own plugin and the four widget receivers named in AndroidManifest.xml are kept explicitly as well.
-keep class com.kcalsync.app.JournalDevicePlugin { *; }
-keep class com.kcalsync.app.JournalWidgetProvider { *; }
-keep class com.kcalsync.app.JournalWidgetProvider$* { *; }
-keep class com.kcalsync.app.MainActivity { *; }
