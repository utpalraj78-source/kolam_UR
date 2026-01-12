import requests
import json

# Test the simulate endpoint
url = "http://localhost:8081/simulate"

# Sample data matching what the frontend sends
data = {
    "pure_key": [1, 0, 1, 0] * 100,  # Sample key
    "csprng_key": [0, 1, 0, 1] * 100,
    "hybrid_key": [1, 1, 0, 0] * 100,
    "shape": [10, 10],  # Grid shape
    "channels": 100,
    "snr_db_list": [0, 5, 10, 15, 20],
    "num_bits_per_trial": 1000,
    "num_trials": 5,
    "jammer_fraction": 0.2,
    "bits_per_cell": 1,
    "num_users": 20
}

try:
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Success!")
        print(json.dumps(response.json(), indent=2)[:500])
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Exception: {e}")
