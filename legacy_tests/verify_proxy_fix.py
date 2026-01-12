import requests
import sys

def verify():
    print("Verifying Frontend Assets (CSS)...")
    try:
        # Request a static asset. It should NOT be proxied to backend.
        # If proxied, backend returns 404 JSON -> Content-Type: application/json
        # If served by Vite, it returns CSS -> Content-Type: text/css
        url = "http://localhost:8080/src/index.css"
        r = requests.get(url, timeout=5)
        ct = r.headers.get("Content-Type", "")
        print(f"Asset Status: {r.status_code}")
        print(f"Asset Content-Type: {ct}")
        
        if r.status_code == 200 and "text/css" in ct:
            print("[PASS] Frontend asset served correctly (not proxied).")
        else:
            print(f"[FAIL] Frontend asset check failed. Got {ct} instead of text/css.")
            print(f"Preview: {r.text[:100]}")
    except Exception as e:
        print(f"[FAIL] Asset check error: {e}")

    print("\nVerifying Backend Proxy (API)...")
    try:
        # Request API. Should be proxied.
        payload = {
            "symmetry": "radial",
            "randomness": 2,
            "k": 10,
            "seed": 12345,
            "mod": 256,
            "bits_per_cell": 1
        }
        r_api = requests.post("http://localhost:8080/generate-kolam-key", json=payload, timeout=10)
        if r_api.status_code == 200:
            print("[PASS] Backend API proxy is working correctly.")
        else:
            print(f"[FAIL] Backend API proxy failed. Status: {r_api.status_code}")
            print(f"Response: {r_api.text[:200]}")
    except Exception as e:
        print(f"[FAIL] Backend API proxy error: {e}")

if __name__ == "__main__":
    verify()
