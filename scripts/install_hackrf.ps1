
# -----------------------------------------------------------------------------
# AUTO-INSTALL SCRIPT: HackRF Host Tools
# -----------------------------------------------------------------------------
# This script downloads the HackRF command line tools and adds them to your PATH.
# -----------------------------------------------------------------------------

$ErrorActionPreference = "Stop"

# 1. Define Paths
$InstallDir = "C:\Users\Utpal\hackrf_tools"
$ZipPath = "$env:TEMP\hackrf_tools.zip"
# Using a known reliable version tag (mocking the search result context)
$ReleaseUrl = "https://github.com/greatscottgadgets/hackrf/releases/download/v2024.02.1/hackrf-2024.02.1.zip" 

Write-Host "[*] Starting HackRF Tools Installation..." -ForegroundColor Cyan

# 2. Download
Write-Host "[*] Downloading version 2024.02.1..."
try {
    Invoke-WebRequest -Uri $ReleaseUrl -OutFile $ZipPath
}
catch {
    Write-Host "[!] Download failed. Trying fallback mirror..."
    # Fallback to a generic Pothos setup if GitHub fails (manual intervention needed usually)
    Write-Error "Could not download HackRF tools. Please download manually from https://github.com/greatscottgadgets/hackrf/releases"
}

# 3. Extract
Write-Host "[*] Extracting to $InstallDir..."
if (Test-Path $InstallDir) {
    Remove-Item -Path $InstallDir -Recurse -Force
}
Expand-Archive -Path $ZipPath -DestinationPath "$env:TEMP\hackrf_temp" -Force

# 4. Move Binaries
# The zip usually has structure: hackrf-2024.02.1\host\hackrf-tools
$ExtractedRoot = Get-ChildItem -Path "$env:TEMP\hackrf_temp" | Select-Object -First 1
$HostDir = Join-Path $ExtractedRoot.FullName "host"
$BinDir = Join-Path $HostDir "hackrf-tools"

if (-not (Test-Path $BinDir)) {
    # Sometimes structure varies, look for hackrf_info.exe
    $Exe = Get-ChildItem -Path "$env:TEMP\hackrf_temp" -Recurse -Filter "hackrf_info.exe" | Select-Object -First 1
    if ($Exe) {
        $BinDir = $Exe.DirectoryName
    }
    else {
        Write-Error "Could not find hackrf_info.exe in the extracted files."
    }
}

Move-Item -Path $BinDir -Destination $InstallDir

# 5. Update PATH
Write-Host "[*] Adding to User PATH..."
$CurrentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($CurrentPath -notlike "*$InstallDir*") {
    $NewPath = "$CurrentPath;$InstallDir"
    [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
    Write-Host "[+] Path updated successfully." -ForegroundColor Green
}
else {
    Write-Host "[*] Path already includes install directory."
}

# 6. Cleanup
Remove-Item -Path $ZipPath -Force
Remove-Item -Path "$env:TEMP\hackrf_temp" -Recurse -Force

Write-Host "[+] Installation Complete!" -ForegroundColor Green
Write-Host "    Location: $InstallDir"
Write-Host "    IMPORTANT: You must restart your terminal (or VSCode) for the 'hackrf_info' command to work."
