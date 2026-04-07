# ============================================================
# install-wsl.ps1 -- Run once ever on this Windows machine
# Sets up WSL2 with Ubuntu and installs all required software.
# Run this from PowerShell as Administrator.
# ============================================================

$ErrorActionPreference = "Stop"

function Print-Header { param($msg) Write-Host "`n-- $msg" -ForegroundColor Blue }
function Print-Ok     { param($msg) Write-Host "  [ok] $msg" -ForegroundColor Green }
function Print-Miss   { param($msg) Write-Host "  [x]  $msg" -ForegroundColor Red }
function Print-Info   { param($msg) Write-Host "       $msg" }
function Die          { param($msg) Write-Host "`n  Error: $msg`n" -ForegroundColor Red; exit 1 }

# -- Check running as Administrator ----------------------------

if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")) {
    Die "Please run this script as Administrator. Right-click PowerShell and choose 'Run as Administrator'."
}

Print-Header "Checking your system"
Write-Host ""

$actions = @()

# -- WSL2 ------------------------------------------------------

$wslInstalled = (Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux).State -eq "Enabled"
$vmInstalled  = (Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform).State -eq "Enabled"

if ($wslInstalled -and $vmInstalled) {
    Print-Ok "WSL2 enabled"
} else {
    Print-Miss "WSL2 -- not enabled"
    $actions += "install_wsl"
}

# -- Ubuntu ----------------------------------------------------

$prevEncoding = [Console]::OutputEncoding
[Console]::OutputEncoding = [System.Text.Encoding]::Unicode
$ubuntu = wsl --list --quiet 2>$null | Where-Object { $_ -match "Ubuntu" }
[Console]::OutputEncoding = $prevEncoding
if ($ubuntu) {
    Print-Ok "Ubuntu (WSL2)"
} else {
    Print-Miss "Ubuntu -- not installed"
    $actions += "install_ubuntu"
}

# -- Windows Terminal ------------------------------------------

$wt = Get-Command wt -ErrorAction SilentlyContinue
if ($wt) {
    Print-Ok "Windows Terminal"
} else {
    Print-Miss "Windows Terminal -- not installed"
    $actions += "install_wt"
}

# -- Nothing to do? --------------------------------------------

Write-Host ""
if ($actions.Count -eq 0) {
    Print-Header "Everything is set up"
    Write-Host ""
    Print-Info "Next step: open Ubuntu from the Start menu and run:"
    Print-Info "  bash bin/install.sh"
    Write-Host ""
    exit 0
}

# -- Show plan -------------------------------------------------

Print-Header "Here's what needs to happen"
Write-Host ""

foreach ($action in $actions) {
    switch ($action) {
        "install_wsl"    { Print-Info "* Enable WSL2 (requires restart)" }
        "install_ubuntu" { Print-Info "* Install Ubuntu from Microsoft Store" }
        "install_wt"     { Print-Info "* Install Windows Terminal" }
    }
}

Write-Host ""
$confirm = Read-Host "Proceed with all of the above? [y/N]"
if ($confirm -notmatch "^[Yy]$") {
    Write-Host "`nAborted. Nothing was changed."
    exit 0
}

# -- Do the work -----------------------------------------------

Write-Host ""

foreach ($action in $actions) {
    switch ($action) {

        "install_wsl" {
            Print-Header "Enabling WSL2..."
            Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -NoRestart
            Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart
            wsl --set-default-version 2
            Print-Ok "WSL2 enabled"
            Write-Host ""
            Print-Info "WARNING: Your computer needs to restart to finish WSL2 setup."
            Print-Info "  After restarting, run this script again."
            Write-Host ""
            $restart = Read-Host "Restart now? [y/N]"
            if ($restart -match "^[Yy]$") { Restart-Computer }
            exit 0
        }

        "install_ubuntu" {
            Print-Header "Installing Ubuntu..."
            winget install -e --id Canonical.Ubuntu.2404 --accept-source-agreements --accept-package-agreements
            Print-Ok "Ubuntu installed"
            Print-Info "Open Ubuntu from the Start menu to finish setup, then run this script again."
        }

        "install_wt" {
            Print-Header "Installing Windows Terminal..."
            winget install -e --id Microsoft.WindowsTerminal --accept-source-agreements --accept-package-agreements
            Print-Ok "Windows Terminal installed"
        }
    }
}

# -- Done ------------------------------------------------------

Write-Host ""
Print-Header "Windows setup complete"
Write-Host ""
Print-Info "Next steps:"
Print-Info "  1. Open Ubuntu from the Start menu"
Print-Info "  2. Navigate to your project:"
Print-Info "     cd /mnt/c/Users/YOUR_NAME/Documents/agentic-app"
Print-Info "  3. Run the installer:"
Print-Info "     bash bin/install.sh"
Write-Host ""
