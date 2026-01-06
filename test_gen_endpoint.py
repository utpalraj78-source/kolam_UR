import requests
import json
import traceback

url = "http://localhost:8081/generate-kolam-key"
payload = {
    "symmetry": "radial",
    "randomness": 2,
    "k": 10,
    "seed": 12345,
    "mod": 256,
    "bits_per_cell": 4,
    "min_hops": 10,
    "layout": "Square grid (no rotate)",
    "curve_color": "#800000",
    "dot_color": "#000000"
}

try:
    print(f"Sending request to {url}...")
    resp = requests.post(url, json=payload, timeout=10)
    print(f"Status Code: {resp.status_code}")
    if resp.status_code != 200:
        print("Error Response:")
        print(resp.text)
    else:
        data = resp.json()
        print("Success!")
        print(f"Keys keys available: {list(data.keys())}")
        if data.get('kolam_image_base64'):
             print("Has Image Base64")
        else:
             print("Missing Image Base64")
except Exception:
    traceback.print_exc()
