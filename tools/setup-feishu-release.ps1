param(
    [string]$AppId = "cli_aacc386c09799cb3",
    [string]$Folder = "OPBTfWOgylTFrndwg4dcVSg6nTc",
    [string]$FolderShareUrl = "https://fcn294wj6t7e.feishu.cn/drive/folder/OPBTfWOgylTFrndwg4dcVSg6nTc?from=from_copylink",
    [string]$BotChatId = "oc_af7dec24fd96d971e858dc4f094dee2e",
    [switch]$NoOpenBrowser,
    [switch]$TestUpload
)

$ErrorActionPreference = "Stop"

function Read-Value {
    param(
        [string]$Prompt,
        [string]$DefaultValue = "",
        [switch]$Secret
    )

    $suffix = if ($DefaultValue) { " [$DefaultValue]" } else { "" }
    if ($Secret) {
        $secure = Read-Host "$Prompt$suffix" -AsSecureString
        $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        try {
            $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
        } finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
        }
    } else {
        $value = Read-Host "$Prompt$suffix"
    }

    if ([string]::IsNullOrWhiteSpace($value)) {
        return $DefaultValue
    }
    return $value.Trim()
}

function Get-FolderToken {
    param([string]$Value)

    $trimmed = $Value.Trim()
    $match = [regex]::Match($trimmed, "/drive/folder/([^/?#]+)")
    if ($match.Success) {
        return $match.Groups[1].Value
    }
    return $trimmed
}

function Invoke-Step {
    param(
        [string]$Title,
        [scriptblock]$Script
    )

    Write-Host ""
    Write-Host "==> $Title" -ForegroundColor Cyan
    & $Script
}

function Invoke-External {
    param(
        [string[]]$Command,
        [switch]$AllowAlreadyExists
    )

    $exe = $Command[0]
    $cmdArgs = $Command[1..($Command.Length - 1)]
    $output = & $exe @cmdArgs 2>&1
    $exitCode = $LASTEXITCODE
    if ($output) {
        $output | ForEach-Object { Write-Host $_ }
    }
    if ($exitCode -ne 0) {
        $text = ($output | Out-String)
        if ($AllowAlreadyExists -and ($text -match "already|exist|duplicate")) {
            Write-Host "Permission seems to already exist. Continue." -ForegroundColor Yellow
            return
        }
        throw "Command failed ($exitCode): $($Command -join ' ')"
    }
}

function Get-JsonFromCommand {
    param([string[]]$Command)

    $exe = $Command[0]
    $cmdArgs = $Command[1..($Command.Length - 1)]
    $output = & $exe @cmdArgs 2>&1
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        if ($output) {
            $output | ForEach-Object { Write-Host $_ }
        }
        throw "Command failed ($exitCode): $($Command -join ' ')"
    }
    $text = ($output | Out-String).Trim()
    $start = $text.IndexOf([char]123)
    $end = $text.LastIndexOf([char]125)
    if ($start -ge 0 -and $end -gt $start) {
        $text = $text.Substring($start, $end - $start + 1)
    }
    return $text | ConvertFrom-Json
}

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

Write-Host "CatMusicFree Feishu release setup" -ForegroundColor Green
Write-Host "This wizard configures .env.feishu.local, lark-cli, folder permission, and upload checks."
Write-Host "App Secret is stored only on this machine and must not be committed."
Write-Host ""

$AppId = Read-Value "Feishu App ID" $AppId
$appSecret = Read-Value "Feishu App Secret" "" -Secret
if ([string]::IsNullOrWhiteSpace($appSecret)) {
    throw "App Secret is required."
}

$Folder = Read-Value "Feishu folder token or URL" $Folder
$folderToken = Get-FolderToken $Folder
$FolderShareUrl = Read-Value "Feishu folder share URL" $FolderShareUrl
$deleteOldAnswer = Read-Value "Delete old APKs during release? y or n" "y"
$deleteOld = if ($deleteOldAnswer -match "^(y|yes|true|1)$") { "true" } else { "false" }
$BotChatId = Read-Value "Feishu bot chat ID. Leave empty to disable notification" $BotChatId

Invoke-Step "Write .env.feishu.local" {
    $envLines = @(
        "FEISHU_APP_ID=$AppId",
        "FEISHU_APP_SECRET=$appSecret",
        "FEISHU_FOLDER=$folderToken",
        "FEISHU_FOLDER_SHARE_URL=$FolderShareUrl",
        "FEISHU_DELETE_OLD=$deleteOld"
    )
    if (-not [string]::IsNullOrWhiteSpace($BotChatId)) {
        $envLines += ""
        $envLines += "FEISHU_BOT_RECEIVE_ID_TYPE=chat_id"
        $envLines += "FEISHU_BOT_RECEIVE_ID=$BotChatId"
    }
    Set-Content -LiteralPath ".env.feishu.local" -Value $envLines -Encoding UTF8
    Write-Host ".env.feishu.local created."
}

Invoke-Step "Initialize lark-cli app config" {
    $appSecret | & npx "@larksuite/cli@latest" config init --force-init --app-id $AppId --app-secret-stdin --brand feishu --lang zh
    if ($LASTEXITCODE -ne 0) {
        throw "lark-cli config init failed."
    }
}

Invoke-Step "Check lark-cli auth status" {
    $status = Get-JsonFromCommand @("npx", "@larksuite/cli@latest", "auth", "status")
    $userReady = $false
    if ($status.identities -and $status.identities.user -and $status.identities.user.available) {
        $userReady = $true
    }

    if ($userReady) {
        Write-Host "User identity is ready: $($status.identities.user.userName)"
        return
    }

    Write-Host "User authorization is required to add the app as a folder collaborator."
    $login = Get-JsonFromCommand @("npx", "@larksuite/cli@latest", "auth", "login", "--domain", "drive", "--no-wait", "--json")
    $verificationUrl = $login.verification_url
    $deviceCode = $login.device_code
    if (-not $verificationUrl -or -not $deviceCode) {
        throw "lark-cli did not return verification_url or device_code."
    }

    Write-Host ""
    Write-Host "Open this URL to authorize:" -ForegroundColor Yellow
    Write-Host $verificationUrl

    $qrPath = "feishu-auth-qr.png"
    Invoke-External @("npx", "@larksuite/cli@latest", "auth", "qrcode", $verificationUrl, "--output", $qrPath, "--size", "320")
    Write-Host "QR code generated: $repoRoot\$qrPath"

    if (-not $NoOpenBrowser) {
        Start-Process $verificationUrl
    }

    Read-Host "Press Enter after authorization is completed"
    Invoke-External @("npx", "@larksuite/cli@latest", "auth", "login", "--device-code", $deviceCode)

    if (Test-Path -LiteralPath $qrPath) {
        Remove-Item -LiteralPath $qrPath -Force
        Write-Host "Temporary QR code deleted: $qrPath"
    }
}

Invoke-Step "Grant app edit permission on Feishu folder" {
    Invoke-External @(
        "npx", "@larksuite/cli@latest", "drive", "+member-add",
        "--dry-run",
        "--as", "user",
        "--token", $folderToken,
        "--type", "folder",
        "--member-type", "appid",
        "--member-id", $AppId,
        "--perm", "edit"
    )

    Invoke-External @(
        "npx", "@larksuite/cli@latest", "drive", "+member-add",
        "--as", "user",
        "--token", $folderToken,
        "--type", "folder",
        "--member-type", "appid",
        "--member-id", $AppId,
        "--perm", "edit",
        "--yes"
    ) -AllowAlreadyExists
}

Invoke-Step "Verify Feishu folder read access" {
    Invoke-External @("npm", "run", "release:feishu", "--", "--dry-run")
}

if ($TestUpload) {
    Invoke-Step "Test real upload without deleting old APKs" {
        Invoke-External @("npm", "run", "release:feishu", "--", "--deleteOld=false")
    }
}

Write-Host ""
Write-Host "Feishu release setup completed." -ForegroundColor Green
Write-Host 'Next release command: npm run release:app -- --version 0.6.11 --changelog "update one|update two"'
