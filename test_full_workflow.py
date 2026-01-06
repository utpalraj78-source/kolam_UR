import requests
import json

# First generate keys
gen_url = "http://localhost:8081/generate-kolam-key"
gen_payload = {
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

print("Step 1: Generating keys...")
gen_response = requests.post(gen_url, json=gen_payload)
if gen_response.status_code != 200:
    print(f"Failed to generate keys: {gen_response.status_code}")
    print(gen_response.text)
    exit(1)

gen_data = gen_response.json()
print(f"✓ Keys generated")

# Now test simulate
sim_url = "http://localhost:8081/simulate"
sim_payload = {
    "pure_key": gen_data["pure_key"],
    "csprng_key": gen_data["csprng_key"],
    "hybrid_key": gen_data["hybrid_key"],
    "shape": gen_data["shape"],
    "channels": 64,
    "snr_db_list": [0, 5, 10, 15, 20],
    "num_bits_per_trial": 1000,
    "num_trials": 5,
    "jammer_fraction": 0.2,
    "bits_per_cell": gen_data["bits_per_cell"],
    "num_users": 20
}

print("\nStep 2: Running simulation...")
print(f"Payload keys: {list(sim_payload.keys())}")
print(f"Shape: {sim_payload['shape']}")
print(f"Channels: {sim_payload['channels']}")

sim_response = requests.post(sim_url, json=sim_payload)
print(f"\nStatus: {sim_response.status_code}")
if sim_response.status_code == 200:
    print("✓ Simulation successful!")
else:
    print(f"✗ Simulation failed")
    print("Response:", sim_response.text)
