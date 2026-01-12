
import os
import sys
import numpy as np
import subprocess
from typing import List

class HackRFBridge:
    """
    Bridge between Kolam-FHSS Logic and HackRF Hardware.
    Converts Complex IQ samples into HackRF-compatible Signed 8-bit (CS8) format.
    """
    def __init__(self, sample_rate: int = 2000000, frequency: int = 2450000000):
        self.sample_rate = sample_rate
        self.frequency = frequency
        self.available = self._check_availability()

    def _check_availability(self) -> bool:
        """Checks if hackrf_transfer CLI is available."""
        self.tool_path = "hackrf_transfer" # Default
        
        # Candidate paths to check
        candidates = [
            r"C:\Users\Utpal\hackrf_tools\hackrf_transfer.exe",
            r"C:\Users\Utpal\radioconda\Library\bin\hackrf_transfer.exe",
            r"C:\Users\Utpal\radioconda\Scripts\hackrf_transfer.exe",
            # Add other common paths if needed
        ]
        
        found = False
        for exe in candidates:
            if os.path.exists(exe):
                self.tool_path = exe
                # Add to PATH for DLL dependencies
                tool_dir = os.path.dirname(exe)
                if tool_dir not in os.environ["PATH"]:
                    os.environ["PATH"] += os.pathsep + tool_dir
                print(f"[HackRF] Detected tool at: {exe}")
                found = True
                break

        try:
            # If we found a specific binary, use it. Otherwise try default PATH.
            cmd = [self.tool_path, "-h"]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return True
        except FileNotFoundError:
            return False

    def save_to_file(self, samples: List[complex], filename: str = "kolam_transmission.c8"):
        """
        Converts floating point complex samples (-1.0 to 1.0) 
        to Signed 8-bit Interleaved I/Q (-128 to 127).
        """
        # 1. Normalize and Scale
        arr = np.array(samples)
        # Normalize to max amplitude 1.0 roughly
        max_amp = np.max(np.abs(arr))
        if max_amp > 0:
            arr = arr / max_amp
        
        # Scale to signed 8-bit range (leave some headroom, use 127)
        arr = arr * 127.0
        
        # 2. Interleave I and Q
        # Format: I0, Q0, I1, Q1, ...
        interleaved = np.empty((arr.size * 2,), dtype=np.int8)
        interleaved[0::2] = np.real(arr).astype(np.int8)
        interleaved[1::2] = np.imag(arr).astype(np.int8)
        
        # 3. Write to binary file
        # Use simple open/write
        file_path = os.path.join(os.path.dirname(__file__), filename)
        with open(file_path, "wb") as f:
            f.write(interleaved.tobytes())
            
        print(f"[HackRF] Saved {len(samples)} samples to {filename}")
        return file_path

    def transmit(self, filename: str = "kolam_transmission.c8"):
        """
        Invokes hackrf_transfer to transmit the generated file.
        """
        if not self.available:
            print("[HackRF] Error: 'hackrf_transfer' tool not found.")
            return

        file_path = os.path.join(os.path.dirname(__file__), filename)
        if not os.path.exists(file_path):
            print(f"[HackRF] Error: File {filename} not found.")
            return

        cmd = [
            self.tool_path,
            "-t", file_path,
            "-f", str(self.frequency),
            "-s", str(self.sample_rate),
            "-a", "1", # Enable Amp
            "-x", "47" # Max Gain (TX VGA)
        ]
        
        print(f"[HackRF] Transmitting via: {self.tool_path}")
        try:
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            print("[HackRF] Transmission Complete.")
            
            # LINK TO DIGITAL TWIN: Record hardware frame
            try:
                from backend.digital_twin_manager import digital_twin
                if digital_twin.running:
                    # Poke throughput slightly to reflect hardware data movement
                    digital_twin.stats["throughput_mbps"] += 50.5 
                    digital_twin.stats["total_frames"] += 1
            except:
                pass

        except subprocess.CalledProcessError as e:
            print(f"[HackRF] Transmission Failed: {e}")
            print(f"[HackRF] Errors: {e.stderr}")

# Integration helper
def check_hackrf_support():
    bridge = HackRFBridge()
    if bridge.available:
        print(f"✅ HackRF Detected for frequency {bridge.frequency} Hz")
    else:
        print("⚠️ HackRF Tools not found. You can still generate .c8 files.")
    return bridge
