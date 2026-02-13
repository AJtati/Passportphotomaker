param(
  [string]$JavaHome = "",
  [string]$AndroidHome = "$env:LOCALAPPDATA\Android\Sdk"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($JavaHome)) {
  $adoptiumRoot = "C:\Program Files\Eclipse Adoptium"
  if (Test-Path $adoptiumRoot) {
    $detectedJdk = Get-ChildItem $adoptiumRoot -Directory |
      Where-Object { $_.Name -like "jdk-17*" } |
      Sort-Object Name -Descending |
      Select-Object -First 1
    if ($detectedJdk) {
      $JavaHome = $detectedJdk.FullName
    }
  }
}

if (!(Test-Path $JavaHome)) {
  throw "JAVA_HOME path not found: $JavaHome. Pass -JavaHome or install JDK 17."
}

if (!(Test-Path $AndroidHome)) {
  throw "ANDROID_HOME path not found: $AndroidHome"
}

$env:JAVA_HOME = $JavaHome
$env:ANDROID_HOME = $AndroidHome
$env:ANDROID_SDK_ROOT = $AndroidHome

# Clear dead proxy env vars that break Gradle dependency resolution.
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""
$env:ALL_PROXY = ""
$env:GIT_HTTP_PROXY = ""
$env:GIT_HTTPS_PROXY = ""
$env:http_proxy = ""
$env:https_proxy = ""
$env:all_proxy = ""

Write-Host "Building web assets..."
npm run build

Write-Host "Syncing Capacitor Android..."
npx cap sync android

# Persist Android SDK path for Gradle/Android plugin.
$localPropsPath = "android\local.properties"
$sdkDirEscaped = $AndroidHome.Replace("\", "\\")
Set-Content -Path $localPropsPath -Value "sdk.dir=$sdkDirEscaped"

Write-Host "Building debug APK..."
Push-Location android
try {
  .\gradlew.bat assembleDebug
} finally {
  Pop-Location
}

$sourceApk = "android\app\build\outputs\apk\debug\app-debug.apk"
if (!(Test-Path $sourceApk)) {
  throw "APK not found at: $sourceApk"
}

New-Item -ItemType Directory -Force -Path "artifacts" | Out-Null
$targetApk = "artifacts\app-debug.apk"
Copy-Item $sourceApk $targetApk -Force

Write-Host "APK ready: $targetApk"
