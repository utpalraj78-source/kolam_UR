# HackRF One Connection & Setup Guide (Windows)

This guide provides step-by-step instructions for connecting your **HackRF One** device and configuring it to work with the **Kolam-FHSS Backend**.

## 1. Prerequisites
*   A HackRF One device.
*   A USB Micro-B data cable.
*   A Windows PC (OS version: Windows 10/11).
*   Administrative privileges.

---

## 2. Driver Installation (Zadig)
Windows does not come with HackRF drivers by default. You must install the generic WinUSB driver.

1.  **Download Zadig**:
    *   Go to [https://zadig.akeo.ie/](https://zadig.akeo.ie/) and download the latest version.
2.  **Connect HackRF**:
    *   Plug the HackRF One into your USB port.
3.  **Run Zadig**:
    *   Open `zadig.exe` as Administrator.
4.  **Select Device**:
    *   Go to **Options > List All Devices**.
    *   In the dropdown, look for **HackRF One**.
    *   (If it's not listed, try a different USB cable/port).
5.  **Install Driver**:
    *   Ensure the target driver (right side) is set to **WinUSB (v6.1...)**.
    *   Click **Install Driver** (or "Replace Driver").
    *   Wait for the "Installation Successful" message.

---

## 3. Tool Installation (HackRF Host Tools)
To communicate with the device, you need the command-line tools.

## 3. Tool Installation (HackRF Host Tools)

### Option A: Use the Auto-Installer Script (Recommended)
We have created a script to automatically download and configure the tools for you.
1.  Open a Terminal in the project folder.
2.  Run:
    ```powershell
    ./scripts/install_hackrf.ps1
    ```
3.  **Restart your Terminal** after it finishes to update your PATH.

### Option B: Manual Download
1.  Go to the [Official Releases Page](https://github.com/greatscottgadgets/hackrf/releases/latest).
2.  Download the latest `.zip` file (e.g., `hackrf-2024.xx.zip`).
3.  Extract it to a folder (e.g., `C:\HackRF`).
4.  Add the `host/hackrf-tools` subfolder to your **Windows Environment Variables -> Path**.

### Verify Installation
1.  Close and reopen your Terminal/PowerShell.
2.  Run:
    ```powershell
    hackrf_info
    ```
3.  **Expected Output**:
    ```text
    Found HackRF
    Index: 0
    Serial number: ...
    Board ID Number: 2 (HackRF One)
    ...
    ```
    *If you see this, your device is ready.*

---

## 4. Connecting to Kolam Backend
We have already integrated the driver logic. Now you just need to verify the link.

1.  **Ensure Backend is Running**:
    ```powershell
    python backend/run_backend.py
    ```
2.  **Watch the Logs**:
    *   On startup, the backend automatically checks for the `hackrf_transfer` tool.
    *   Look for the message:
        > `✅ HackRF Detected for frequency 2450000000 Hz`
    
3.  **Trigger Transmission**:
    *   When the "Radio Unit" in the Kolam simulation runs (e.g., via the Web UI), it will now route data to the HackRF.
    *   **TX LED**: The `TX` LED on your HackRF should light up (Red) briefly during bursts.

---

## 5. Troubleshooting

### "HackRF Tools not found" in Backend
*   **Cause**: The folder containing `hackrf_transfer.exe` is not in your system PATH.
*   **Fix**: Add the folder (e.g., `C:\Program Files\PothosSDR\bin`) to your User Environment Variables -> Path. Restart the backend terminal.

### "HackRF not found" (hackrf_info error)
*   **Cause**: Driver issue or bad cable.
*   **Fix**: Re-run Zadig. Ensure you check "List All Devices". Try a different USB cable (some are power-only).

### Transmission Failures (USB errors)
*   **Fix**: Ensure you are plugged into a USB 2.0 or 3.0 port directly on the motherboard. Avoid unpowered USB hubs.

---

## 6. Safety Warning
*   **Antenna**: ALWAYS connect an antenna before transmitting. Transmitting without a load can damage the amplifier.
*   **Frequency**: The backend defaults to **2.45 GHz** (Wi-Fi band). Ensure you are not jamming legitimate local networks.
