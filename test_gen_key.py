import requests
import json

url = "http://localhost:8081/generate-kolam-key"

# Exact payload that frontend would send
payload = {
    "symmetry": "radial",
    "randomness": 0.0,
    "k": 8,
    "seed": 12345,
    "mod": 2,
    "bits_per_cell": 1,
    "min_hops": 100,
    "layout": "Square grid (no rotate)",
    "curve_color": "#800000",
    "dot_color": "#000000",
    "key": None,
    "ctr": 0,
    "t": 0
}

print("Testing /generate-kolam-key endpoint")
print("Payload:", json.dumps(payload, indent=2))

try:
    response = requests.post(url, json=payload)
    print(f"\nStatus: {response.status_code}")
    if response.status_code == 200:
        print("✓ Success!")
        data = response.json()
        print(f"Got keys - pure: {len(data.get('pure_key', []))} bits")
    else:
        print(f"✗ Error: {response.status_code}")
        print("Response:", response.text)
except Exception as e:
    print(f"✗ Exception: {e}")
