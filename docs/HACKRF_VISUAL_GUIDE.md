# 📟 HackRF Visual Verification Guide

Since the standard **HackRF One** does not have a screen (unless you added a PortaPack), you verify activity using its **LED Indicators** and **External Receivers**.

## 1. The LEDs (Your Primary Monitor)
Look at the cluster of small lights near the **USB Connector** and the **Buttons**.

| LED Label | Color | Function | **What to Watch For** |
| :--- | :--- | :--- | :--- |
| **TX** | 🔴 **RED** | **Transmit** | **THIS IS IT.** It lights up when sending data. |
| **RX** | 🟢 **GREEN** | Receive | Lights up when listening/receiving. |
| **USB** | 🟢 **GREEN** | Power/Data | Lights up when USB is connected. |
| **3V3** | 🟠 **ORANGE**| Power | Always On (if valid power). |
| **1V8** | 🟠 **ORANGE**| Power | Always On (if valid power). |

### **Test Behavior**
When you click **Play** in the Hop Comparison tool:
*   The **Red TX LED** will blink rapidly.
*   **1 Blink = 1 Frequency Hop**.
*   If you set the speed to **4x**, it will look like a solid red light or a fast strobe.

---

## 2. Using a "PortaPack" (If you have a screen)
If your HackRF has a screen attached (PortaPack):
1.  When the computer takes control, the PortaPack screen typically **Frozen** or switches to **"HackRF Mode"**.
2.  You generally **cannot** see the signal on the PortaPack screen *while* you are transmitting from the computer (it can't do both).
3.  **Solution**: You must trust the **TX LED** (which is usually visible on the side or top of the PortaPack case).

---

## 3. The "Spectral View" (Phone App)
To actually *see* the signal, use a receiver:
1.  Install **"WiFi Analyzer"** (Android) or use another SDR.
2.  Open the **2.4 GHz Spectrum View**.
3.  Click **Play** on the website.
4.  **Look for**:
    *   Brief "hills" or "bumps" appearing on different channels.
    *   They will jump around: Channel 1 -> Channel 11 -> Channel 6...
