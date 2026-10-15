#!/usr/bin/env python3
"""Adds release signing (from env) and a CI-driven versionCode to the generated android/app/build.gradle.
Env: VS_KEYSTORE (path), VS_STORE_PASS, VS_KEY_ALIAS, VS_KEY_PASS, VS_VERSION_CODE, VS_VERSION_NAME."""
import os, re, sys
p = 'android/app/build.gradle'
s = open(p).read()
cfg = '''    signingConfigs {
        release {
            storeFile file(System.getenv("VS_KEYSTORE"))
            storePassword System.getenv("VS_STORE_PASS")
            keyAlias System.getenv("VS_KEY_ALIAS")
            keyPassword System.getenv("VS_KEY_PASS")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release'''
if 'signingConfigs' not in s:
    s = s.replace('    buildTypes {\n        release {', cfg, 1)
s = re.sub(r'versionCode \d+', 'versionCode ' + os.environ.get('VS_VERSION_CODE', '1'), s, count=1)
s = re.sub(r'versionName "[^"]*"', 'versionName "' + os.environ.get('VS_VERSION_NAME', '1.0') + '"', s, count=1)
assert 'signingConfig signingConfigs.release' in s
open(p, 'w').write(s)
print('signing + version applied')
