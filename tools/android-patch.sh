#!/usr/bin/env bash
# Run after `npx cap add android`: landscape, full-screen, notch-aware, screen kept on.
set -euo pipefail
M=android/app/src/main/AndroidManifest.xml
S=android/app/src/main/res/values/styles.xml
sed -i 's#<activity#<activity android:screenOrientation="sensorLandscape"#' "$M"
sed -i 's#<style name="AppTheme.NoActionBarLaunch"#<style name="AppTheme.NoActionBarLaunch"#' "$S"
python3 - "$S" <<'PY'
import sys,re
p=sys.argv[1]; s=open(p).read()
extra='''        <item name="android:windowFullscreen">true</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
'''
s=re.sub(r'(<style name="AppTheme.NoActionBar"[^>]*>)',r'\1\n'+extra,s,count=1)
open(p,'w').write(s)
PY
# app icon: the generated launcher PNGs replace Capacitor's default (the adaptive-icon XMLs go so the PNGs are used)
cp -r assets/launcher/mipmap-* android/app/src/main/res/
rm -rf android/app/src/main/res/mipmap-anydpi-v26
grep -q sensorLandscape "$M" && grep -q windowFullscreen "$S"
# sign debug builds with the committed key, named explicitly (the default ~/.android/debug.keystore is not picked up on the CI runner),
# so every APK carries the same certificate and installs over the previous one
cat >> android/app/build.gradle <<'GRADLE'

android {
    signingConfigs {
        debug {
            storeFile file("${rootProject.rootDir}/../assets/viper-sortie-debug.keystore")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }
    }
    buildTypes { debug { signingConfig signingConfigs.debug } }
}
GRADLE
grep -q viper-sortie-debug.keystore android/app/build.gradle
