import requests
import json

url = "http://localhost:8000/matrix-to-hops"
payload = {
    "matrix_nibble": [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
        [8, 9, 10, 11],
        [12, 13, 14, 15]
    ],
    "channels": 16
}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, json=payload, timeout=5)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Response JSON:")
        print(json.dumps(response.json(), indent=2))
    else:
        print("Error Response:")
        print(response.text)
except Exception as e:
    print(f"Request failed: {e}")
