
import requests
import json

url = "http://localhost:8000/generate-kolam-key"
payload = {
  "symmetry": "square",
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
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    if response.status_code != 200:
        print(f"Response: {response.text}")
    else:
        print("Success!")
except Exception as e:
    print(f"Request failed: {e}")
