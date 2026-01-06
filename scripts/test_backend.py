import requests
import json
import os

def test_backend():
    print("Checking connectivity...")
    try:
        r = requests.get("http://127.0.0.1:8081/docs", timeout=5)
        print(f"GET /docs status: {r.status_code}")
    except Exception as e:
        print(f"GET /docs failed: {e}")

    url = "http://127.0.0.1:8081/generate-from-json"
    
    # Read sample_upload.json
    with open("backend/sample_upload.json", "r") as f:
        data = json.load(f)
        
    print(f"Sending request to {url}...")
    try:
        response = requests.post(url, json=data, timeout=10)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Success!")
            # print(json.dumps(response.json(), indent=2))
            print("Response received (truncated).")
        else:
            print("Failed!")
            print(response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_backend()
