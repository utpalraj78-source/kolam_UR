
import urllib.request
import time
import sys

def check_health():
    url = "http://localhost:8081/"
    for i in range(5):
        try:
            with urllib.request.urlopen(url) as response:
                if response.status == 200:
                    print("Backend is HEALTHY")
                    return
        except Exception as e:
            print(f"Backend not ready yet ({e}). Retrying in 2s...")
            time.sleep(2)
    
    print("Backend failed to respond.")
    sys.exit(1)

if __name__ == "__main__":
    check_health()
