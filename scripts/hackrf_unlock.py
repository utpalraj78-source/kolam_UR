
import subprocess
import os

print("--- HACKRF EMERGENCY UNLOCKER ---")
print("Attempting to kill ALL competing processes...")

# Kill Python and HackRF tools
os.system("taskkill /F /IM python.exe /T")
os.system("taskkill /F /IM hackrf_transfer.exe /T")
os.system("taskkill /F /IM hackrf_info.exe /T")

print("\nVerifying HackRF state...")
try:
    cmd = [r"C:\Users\Utpal\radioconda\Library\bin\hackrf_info.exe"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print(res.stdout)
    if "Access denied" in res.stdout or "Access denied" in res.stderr:
        print("\n!!! ACCESS DENIED !!!")
        print("Something else is using the HackRF. Please check:")
        print("1. Close all Google Chrome / Edge tabs.")
        print("2. Close any SDR software (SDRSharp, HDSDR).")
        print("3. Unplug the USB cable, wait 5 seconds, and plug it back in.")
    else:
        print("✅ HackRF is UNLOCKED and Ready.")
except Exception as e:
    print(f"Error: {e}")
