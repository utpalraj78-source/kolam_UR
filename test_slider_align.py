import requests
import sys

try:
    r = requests.get('http://localhost:8080/api/captcha/generate-slider')
    data = r.json()
    print(f"Start: {data['start']}")
    print(f"Target: {data['target_hint']}")
    
    if data['start']['y'] == data['target_hint']['y']:
        print("SUCCESS: Y-Alignment CONFIRMED")
    else:
        print(f"FAILURE: Y-Mismatch! Start Y: {data['start']['y']}, Target Y: {data['target_hint']['y']}")
        sys.exit(1)

    if data['start']['x'] == 10:
        print("SUCCESS: Start X is 10 (Left)")
    else:
         print(f"FAILURE: Start X is {data['start']['x']}")

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
