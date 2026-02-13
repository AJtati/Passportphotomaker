# Android App + Play Store Monetization Guide

## What is already done in this project
- Capacitor is installed and configured.
- Native Android project exists at `android/`.
- App identity is configured in `capacitor.config.ts`:
  - `appId`: `com.ajtati.passportphoto`
  - `appName`: `Passport Photo Utility`
- Helpful scripts are added in `package.json`:
  - `npm run android:build` (build web + sync android)
  - `npm run android:sync`
  - `npm run android:open`

## Local setup needed to finish APK/AAB build
1. Install Android Studio (includes SDK tools).
2. Install JDK 17 (recommended for modern Android Gradle plugin).
3. Set environment variables:
   - `JAVA_HOME` -> JDK 17 folder (not `/bin`)
   - `ANDROID_HOME` -> Android SDK folder
4. Ensure these are available in PATH:
   - `%JAVA_HOME%\bin`
   - `%ANDROID_HOME%\platform-tools`

## Build Android app
1. Sync latest web build into native app:
```bash
npm run android:build
```
2. Build installable debug APK and copy into repo:
```bash
npm run android:apk
```
This writes the APK to:
`artifacts/app-debug.apk`
3. Open Android Studio project:
```bash
npm run android:open
```
4. In Android Studio:
- Let Gradle sync complete.
- Run on emulator/device, or
- Build signed App Bundle (`.aab`) for Play Store:
  - `Build > Generate Signed Bundle / APK`
  - Choose `Android App Bundle`

## If Gradle shows TLS handshake errors
This machine has had dead proxy vars set globally (for example `HTTP_PROXY=http://127.0.0.1:9`), which breaks Gradle.

Use the provided script (it clears those vars for the build session):
```bash
npm run android:apk
```

If needed, clear proxy vars in your shell before running Gradle manually:
```powershell
$env:HTTP_PROXY=''
$env:HTTPS_PROXY=''
$env:ALL_PROXY=''
```

If you still get `Received fatal alert: handshake_failure`, this is a system/network TLS interception issue.
- Build on a network without SSL interception, or
- Import your corporate/root CA certificate into the JDK truststore used by Gradle.

## Publish to Google Play
1. Create Google Play Console account (one-time fee).
2. Create a new app listing.
3. Upload signed `.aab` to a testing track first.
4. Complete required sections:
- App content (privacy, ads declaration, etc.)
- Data safety form
- Store listing (title, short description, screenshots, icon)
5. Roll out production release after testing.

## How to earn money (recommended options)
1. AdMob ads (fastest):
- Banner ads in non-editing screens.
- Interstitial ads after export/download actions (moderate frequency).
- Rewarded ads to unlock premium exports temporarily.

2. One-time premium unlock:
- Remove ads.
- Unlock advanced features (custom templates, background tools, bulk export).
- Implement with Google Play Billing.

3. Subscription model:
- Monthly/Yearly plan for pro features (best if frequent users).
- Include cloud backups/templates/ID-country presets updates.

4. Hybrid model (most practical):
- Free with ads.
- Paid one-time purchase to remove ads + unlock pro tools.

## Best monetization plan for this app
1. Start with:
- Free app + Banner ads + Interstitial after successful export.
2. Add a premium one-time purchase:
- "Remove Ads + Pro Tools"
3. Keep ad frequency low to avoid harming user retention.

## Compliance checklist before monetization
- Add a Privacy Policy URL.
- Add consent flow for ads (especially EEA/UK users).
- Do not block core app usability with too many ads.
- Clearly label paid features.
