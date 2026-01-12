import requests
import json
import traceback

url = "http://localhost:8081/simulate"
payload = {
    'pure_key': [1]*16, 
    'csprng_key': [2]*16, 
    'hybrid_key': [3]*16, 
    'shape': [4,4], 
    'channels': 16,
    'snr_db_list': [0, 5, 10], 
    'num_trials': 2,
    'num_bits_per_trial': 100
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
        print(f"Keys: {list(data.keys())}")
except Exception:
    traceback.print_exc()
