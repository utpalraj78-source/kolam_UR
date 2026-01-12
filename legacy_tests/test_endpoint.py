import requests, json, sys
url='http://localhost:8080/generate-kolam-key'
payload={
    "symmetry":"radial",
    "randomness":2,
    "k":10,
    "seed":12345,
    "mod":256,
    "bits_per_cell":1
}
try:
    r=requests.post(url, json=payload, timeout=10)
    print('Status:', r.status_code)
    print('Response:', r.text[:500])
except Exception as e:
    print('Error:', e)
    sys.exit(1)
