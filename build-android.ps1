<#
.SYNOPSIS
    CatMusicFree Android Build Script

.DESCRIPTION
    Complete build process from code compilation to generating installable APK.
    Supports configuring version number, app name, and other key information.

.PARAMETER Version
    App version number (e.g., 0.6.3)

.PARAMETER VersionCode
    App version code (e.g., 400012, must be greater than previous)

.PARAMETER AppName
    App display name

.PARAMETER BuildType
    Build type: release (default) or debug

.PARAMETER OutputDir
    APK output directory (relative or absolute path)

.PARAMETER Clean
    Execute clean before build

.PARAMETER SkipVersionUpdate
    Skip version update, use existing version config

.PARAMETER ShowHelp
    Show help information

.EXAMPLE
    .\build-android.ps1 -Version "0.6.3" -VersionCode 400012

.EXAMPLE
    .\build-android.ps1 -Version "0.6.3" -VersionCode 400012 -Clean

.EXAMPLE
    .\build-android.ps1 -BuildType debug
#>

param(
    [Parameter(Mandatory = $false, HelpMessage = "App version number")]
    [string]$Version,

    [Parameter(Mandatory = $false, HelpMessage = "App version code")]
    [int]$VersionCode = 0,

    [Parameter(Mandatory = $false, HelpMessage = "App display name")]
    [string]$AppName,

    [Parameter(Mandatory = $false, HelpMessage = "Build type: release or debug")]
    [ValidateSet("release", "debug")]
    [string]$BuildType = "release",

    [Parameter(Mandatory = $false, HelpMessage = "APK output directory")]
    [string]$OutputDir = "",

    [Parameter(Mandatory = $false, HelpMessage = "Execute clean before build")]
    [switch]$Clean,

    [Parameter(Mandatory = $false, HelpMessage = "Skip version update")]
    [switch]$SkipVersionUpdate,

    [Parameter(Mandatory = $false, HelpMessage = "Show help information")]
    [switch]$ShowHelp
)

if ($ShowHelp) {
    Get-Help $MyInvocation.MyCommand.Path -Detailed
    exit 0
}

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Banner {
    param([string]$Message)
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARNING] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Error-Message {
    param([string]$Message)
    Write-Host "[ERROR] " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Write-Step {
    param([string]$Message)
    Write-Host "[STEP] " -ForegroundColor Magenta -NoNewline
    Write-Host $Message
}

function Exit-With-Error {
    param([string]$Message, [int]$ExitCode = 1)
    Write-Error-Message $Message
    Write-Host ""
    Write-Host "Build failed, process terminated." -ForegroundColor Red
    exit $ExitCode
}

function Check-Command-Result {
    param(
        [int]$ExitCode,
        [string]$ErrorMessage,
        [int]$ErrorExitCode = 1
    )
    if ($ExitCode -ne 0) {
        Exit-With-Error $ErrorMessage $ErrorExitCode
    }
}

$ProjectRoot = $PSScriptRoot
$AndroidDir = Join-Path $ProjectRoot "android"
$Gradlew = Join-Path $AndroidDir "gradlew.bat"

Write-Banner "CatMusicFree Android Build Script"

Write-Step "Checking project structure..."
if (-not (Test-Path $ProjectRoot)) {
    Exit-With-Error "Project root not found: $ProjectRoot"
}

if (-not (Test-Path $AndroidDir)) {
    Exit-With-Error "Android directory not found: $AndroidDir"
}

if (-not (Test-Path $Gradlew)) {
    Exit-With-Error "Gradle wrapper not found: $Gradlew"
}

Write-Success "Project structure check passed"

$defenderPaths = @($ProjectRoot, $AndroidDir)
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = $null
if ($nodeCommand) {
    $nodePath = $nodeCommand.Source
}
if ($nodePath) {
    $defenderPaths += $nodePath
}
$mpPreference = Get-MpPreference -ErrorAction SilentlyContinue
$existingExclusions = @()
if ($mpPreference) {
    $existingExclusions = $mpPreference.ExclusionPath
}
foreach ($path in $defenderPaths) {
    if ($existingExclusions -notcontains $path) {
        try {
            Add-MpPreference -ExclusionPath $path -ErrorAction Stop
            Write-Success "Added Windows Defender exclusion: $path"
        } catch {
            Write-Host "[WARN] Could not add Defender exclusion for $path (may need admin rights)" -ForegroundColor Yellow
        }
    }
}

# Auto-detect and set JAVA_HOME if not set
if (-not $env:JAVA_HOME) {
    Write-Step "JAVA_HOME not set, auto-detecting JDK..."
    $JavaCmd = Get-Command java -ErrorAction SilentlyContinue
    if ($JavaCmd) {
        $JavaBinDir = Split-Path $JavaCmd.Path
        $JavaHomeDir = Split-Path $JavaBinDir
        if (Test-Path (Join-Path $JavaHomeDir "bin\java.exe")) {
            $env:JAVA_HOME = $JavaHomeDir
            Write-Success "JAVA_HOME set to: $JavaHomeDir"
        }
        else {
            Exit-With-Error "Cannot detect JDK installation. Please set JAVA_HOME environment variable."
        }
    }
    else {
        Exit-With-Error "Java not found. Please install JDK 17 and set JAVA_HOME."
    }
}
else {
    Write-Success "JAVA_HOME: $env:JAVA_HOME"
}

$ConfigFile = Join-Path $PSScriptRoot "build-config.json"
$DefaultConfig = @{
    version         = ""
    versionCode     = 0
    appName         = "CatMusicFree"
    outputDir       = "release"
    applicationId   = "fun.upup.catmusicfree"
}

if (Test-Path $ConfigFile) {
    try {
        $ConfigContent = Get-Content $ConfigFile -Raw -Encoding UTF8
        $LoadedConfig = $ConfigContent | ConvertFrom-Json
        Write-Success "Loaded build config: build-config.json"

        if ($LoadedConfig.version) { $DefaultConfig.version = $LoadedConfig.version }
        if ($LoadedConfig.versionCode) { $DefaultConfig.versionCode = $LoadedConfig.versionCode }
        if ($LoadedConfig.appName) { $DefaultConfig.appName = $LoadedConfig.appName }
        if ($LoadedConfig.outputDir) { $DefaultConfig.outputDir = $LoadedConfig.outputDir }
        if ($LoadedConfig.applicationId) { $DefaultConfig.applicationId = $LoadedConfig.applicationId }
    }
    catch {
        Write-Warn "Build config format error, using defaults"
    }
}

if (-not $SkipVersionUpdate) {
    if (-not $Version) {
        if ($DefaultConfig.version) {
            $Version = $DefaultConfig.version
            Write-Success "Using version from config: $Version"
        }
        else {
            $PackageJson = Join-Path $ProjectRoot "package.json"
            if (Test-Path $PackageJson) {
                $PackageContent = Get-Content $PackageJson -Raw -Encoding UTF8
                $PackageData = $PackageContent | ConvertFrom-Json
                $Version = $PackageData.version
                Write-Warn "No version specified, using version from package.json: $Version"
            }
            else {
                Exit-With-Error "Cannot read package.json, please specify -Version"
            }
        }
    }
    else {
        Write-Success "Using version from command line: $Version"
    }
}
else {
    $BuildGradle = Join-Path $AndroidDir "app\build.gradle"
    if (Test-Path $BuildGradle) {
        $GradleContent = Get-Content $BuildGradle -Raw
        if ($GradleContent -match 'def appVersion = "([^"]+)"') {
            $Version = $Matches[1]
            Write-Warn "Skipping version update, using existing: $Version"
        }
    }
}

if ($VersionCode -eq 0) {
    if ($DefaultConfig.versionCode -gt 0) {
        $VersionCode = $DefaultConfig.versionCode
        Write-Success "Using version code from config: $VersionCode"
    }
    else {
        $BuildGradle = Join-Path $AndroidDir "app\build.gradle"
        if (Test-Path $BuildGradle) {
            $GradleContent = Get-Content $BuildGradle -Raw
            if ($GradleContent -match 'def appVersionCode = (\d+)') {
                $VersionCode = [int]$Matches[1]
                Write-Warn "No version code specified, using existing: $VersionCode"
            }
        }

        if ($VersionCode -eq 0) {
            $VersionCode = 400011
            Write-Warn "Using default version code: $VersionCode"
        }
    }
}
else {
    Write-Success "Using version code from command line: $VersionCode"
}

if (-not $AppName) {
    $AppName = $DefaultConfig.appName
    Write-Success "Using app name: $AppName"
}
else {
    Write-Success "Using app name from command line: $AppName"
}

if (-not $OutputDir) {
    if ($DefaultConfig.outputDir) {
        $OutputDir = $DefaultConfig.outputDir
    }
    else {
        $OutputDir = "release"
    }
}

if (-not [System.IO.Path]::IsPathRooted($OutputDir)) {
    $OutputDir = Join-Path $ProjectRoot $OutputDir
}

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    Write-Success "Created output directory: $OutputDir"
}

Write-Banner "Build Configuration"
Write-Host "  App Name:       $AppName" -ForegroundColor White
Write-Host "  Version:        $Version" -ForegroundColor White
Write-Host "  Version Code:   $VersionCode" -ForegroundColor White
Write-Host "  Build Type:     $BuildType" -ForegroundColor White
Write-Host "  Output Dir:     $OutputDir" -ForegroundColor White
Write-Host ""

Write-Host ""
Write-Host "Starting build process..." -ForegroundColor Yellow
Write-Host ""

$StepNumber = 1

if (-not $SkipVersionUpdate) {
    Write-Banner "Step ${StepNumber}: Update Version Config"

    Write-Step "Updating build.gradle version info..."
    $BuildGradle = Join-Path $AndroidDir "app\build.gradle"

    try {
        $GradleContent = Get-Content $BuildGradle -Raw

        $GradleContent = $GradleContent -replace 'def appVersion = "[^"]+"', "def appVersion = `"$Version`""
        $GradleContent = $GradleContent -replace 'def appVersionCode = \d+', "def appVersionCode = $VersionCode"

        [System.IO.File]::WriteAllText($BuildGradle, $GradleContent, (New-Object System.Text.UTF8Encoding $false))

        Write-Success "Version config updated"
        Write-Host "    appVersion = `"$Version`"" -ForegroundColor Gray
        Write-Host "    appVersionCode = $VersionCode" -ForegroundColor Gray
    }
    catch {
        Exit-With-Error "Failed to update build.gradle: $_"
    }

    Write-Step "Updating app display name..."
    $StringsXml = Join-Path $AndroidDir "app\src\main\res\values\strings.xml"

    if (Test-Path $StringsXml) {
        try {
            $StringsContent = Get-Content $StringsXml -Raw
            $StringsContent = $StringsContent -replace '(<string name="app_name">)[^<]+(</string>)', "`${1}$AppName`${2}"
            [System.IO.File]::WriteAllText($StringsXml, $StringsContent, (New-Object System.Text.UTF8Encoding $false))
            Write-Success "App name updated: $AppName"
        }
        catch {
            Write-Warn "Failed to update strings.xml: $_"
        }
    }

    Write-Step "Updating package.json version..."
    $PackageJson = Join-Path $ProjectRoot "package.json"

    if (Test-Path $PackageJson) {
        try {
            $PackageContent = Get-Content $PackageJson -Raw
            $PackageContent = $PackageContent -replace '"version"\s*:\s*"[^"]+"', "`"version`": `"$Version`""
            [System.IO.File]::WriteAllText($PackageJson, $PackageContent, (New-Object System.Text.UTF8Encoding $false))
            Write-Success "package.json version updated"
        }
        catch {
            Write-Warn "Failed to update package.json: $_"
        }
    }
}

$StepNumber++

if ($Clean) {
    Write-Banner "Step ${StepNumber}: Clean Build Cache"

    Write-Step "Cleaning Metro / React Native bundler cache..."
    $metroCachePatterns = @("metro-*", "react-*", "haste-map-*")
    foreach ($pattern in $metroCachePatterns) {
        $items = Get-ChildItem -Path $env:TEMP -Filter $pattern -Directory -ErrorAction SilentlyContinue
        foreach ($item in $items) {
            Remove-Item -Path $item.FullName -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "    Removed: $($item.Name)" -ForegroundColor Gray
        }
    }

    $rnCacheDir = Join-Path $ProjectRoot "node_modules\.cache"
    if (Test-Path $rnCacheDir) {
        Remove-Item -Path $rnCacheDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "    Removed: node_modules\.cache" -ForegroundColor Gray
    }

    $watchmanCmd = Get-Command watchman -ErrorAction SilentlyContinue
    if ($watchmanCmd) {
        Write-Step "Cleaning Watchman watches..."
        & watchman watch-del-all 2>&1 | ForEach-Object { Write-Host $_ }
    }

    Write-Success "Metro / React Native cache cleaned"

    Write-Step "Executing Gradle Clean..."

    Push-Location $AndroidDir
    try {
        & $Gradlew clean 2>&1 | ForEach-Object { Write-Host $_ }
        $cleanExitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    Check-Command-Result $cleanExitCode "Gradle Clean failed"

    Write-Success "Gradle build cache cleaned"
}

$StepNumber++

Write-Banner "Step ${StepNumber}: Check Dependencies"

Write-Step "Checking node_modules..."
if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
    Write-Step "Installing npm dependencies..."
    Push-Location $ProjectRoot
    try {
        & npm install 2>&1 | ForEach-Object { Write-Host $_ }
        $npmExitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }
    Check-Command-Result $npmExitCode "npm install failed"
    Write-Success "Dependencies installed"
}
else {
    Write-Success "node_modules already exists"
}

$StepNumber++

Write-Banner "Step ${StepNumber}: Build APK"

$BuildTask = if ($BuildType -eq "release") { "assembleRelease" } else { "assembleDebug" }

Write-Step "Stopping Gradle daemon to ensure clean environment..."
Push-Location $AndroidDir
try {
    & $Gradlew --stop 2>&1 | ForEach-Object { Write-Host $_ }
}
finally {
    Pop-Location
}

Write-Step "Executing Gradle build: $BuildTask"

$StartTime = Get-Date

Push-Location $AndroidDir
try {
    & $Gradlew $BuildTask --no-daemon 2>&1 | ForEach-Object { Write-Host $_ }
    $gradleExitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

$EndTime = Get-Date
$BuildDuration = ($EndTime - $StartTime).TotalSeconds

Check-Command-Result $gradleExitCode "Gradle build failed, check error messages above"

Write-Success "APK build completed (duration: $([math]::Round($BuildDuration, 2)) seconds)"

$StepNumber++

Write-Banner "Step ${StepNumber}: Collect APK Files"

$ApkSourceDir = Join-Path $AndroidDir "app\build\outputs\apk\$BuildType"

if (-not (Test-Path $ApkSourceDir)) {
    Exit-With-Error "APK output directory not found: $ApkSourceDir"
}

$ApkFiles = Get-ChildItem -Path $ApkSourceDir -Filter "*.apk" -Recurse

if ($ApkFiles.Count -eq 0) {
    Exit-With-Error "No APK files found"
}

Write-Success "Found $($ApkFiles.Count) APK file(s)"

$VersionOutputDir = Join-Path $OutputDir "v$Version"
if (-not (Test-Path $VersionOutputDir)) {
    New-Item -ItemType Directory -Path $VersionOutputDir -Force | Out-Null
}

$CopiedFiles = @()

foreach ($ApkFile in $ApkFiles) {
    $DestFile = Join-Path $VersionOutputDir $ApkFile.Name
    Copy-Item -Path $ApkFile.FullName -Destination $DestFile -Force
    $CopiedFiles += $DestFile

    $FileSize = [math]::Round($ApkFile.Length / 1MB, 2)
    Write-Host "  - $($ApkFile.Name) ($FileSize MB)" -ForegroundColor Gray
}

Write-Success "APK files copied to: $VersionOutputDir"

Write-Banner "Build Complete"

$BuildReport = @{
    timestamp    = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    version      = $Version
    versionCode  = $VersionCode
    appName      = $AppName
    buildType    = $BuildType
    apkFiles     = $CopiedFiles
    outputDir    = $VersionOutputDir
    duration     = "$([math]::Round($BuildDuration, 2)) seconds"
}

$ReportJson = $BuildReport | ConvertTo-Json
$ReportFile = Join-Path $VersionOutputDir "build-report.json"
$ReportJson | Set-Content -Path $ReportFile -Encoding UTF8

Write-Host ""
Write-Host "Build report saved to: $ReportFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "APK File List:" -ForegroundColor Cyan

foreach ($File in $CopiedFiles) {
    Write-Host "  -> $File" -ForegroundColor Green
}

Write-Host ""
Write-Banner "Build Completed Successfully!"
