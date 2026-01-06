import torch
import numpy as np
import json
import base64
from kolam_generator import generate_kolam, generate_from_model
from model import KolamVAE

def numpy_to_json(M):
    """Standard JSON: Stores the full Matrix."""
    return json.dumps({"matrix": M.tolist(), "type": "full"})

def vae_encode_to_json(M, model_path="backend/kolam_vae.pth"):
    """Optimized JSON: Stores only the Latent Vector."""
    # Load model
    k = M.shape[0]
    model = KolamVAE(k=k, latent_dim=32)
    model.load_state_dict(torch.load(model_path))
    model.eval()
    
    # Preprocess M
    x = torch.from_numpy(M).float().unsqueeze(0) # (1, K, K, 4)
    
    with torch.no_grad():
        # Encode
        x_perm = x.permute(0, 3, 1, 2) # (1, 4, K, K)
        encoded = model.encoder(x_perm)
        mu = model.fc_mu(encoded)
        # We use mu as the deterministic encoding
        latent_vector = mu.numpy().flatten().tolist()
        
    return json.dumps({"latent_vector": latent_vector, "type": "compressed_vae"})

def decode_json_to_kolam(json_str, model_path="backend/kolam_vae.pth", k=15):
    """Decodes JSON (Full or Compressed) back to Kolam."""
    data = json.loads(json_str)
    
    if data["type"] == "full":
        print("Decoding FULL JSON (Standard)...")
        return np.array(data["matrix"])
        
    elif data["type"] == "compressed_vae":
        print("Decoding COMPRESSED JSON (VAE Latent)...")
        latent = data["latent_vector"]
        # Use the generator function we added to kolam_generator
        M_recon, _, _ = generate_from_model(model_path, latent_vector=latent, k=k)
        return M_recon

def main():
    print("--- 1. Generating Original Kolam ---")
    k = 15
    M_orig, _, _, _, _, _ = generate_kolam("square", 4, k, seed=42, analyze=False, return_preview=False)
    print(f"Original Shape: {M_orig.shape}")
    
    print("\n--- 2. Standard JSON Generation (Current Way) ---")
    json_full = numpy_to_json(M_orig)
    print(f"Full JSON Length: {len(json_full)} characters")
    
    print("\n--- 3. Optimized JSON Generation (VAE Concept) ---")
    # Note: We need a trained model for this. Using the one we just trained.
    json_compressed = vae_encode_to_json(M_orig)
    print(f"Compressed JSON Length: {len(json_compressed)} characters")
    print(f"Compression Ratio: {len(json_full)/len(json_compressed):.2f}x")
    
    # Save to file for user to test
    with open("kolam_vae_compressed.json", "w") as f:
        f.write(json_compressed)
    print("Saved compressed JSON to kolam_vae_compressed.json")
    
    print("\n--- 4. Decoding Compressed JSON back to Kolam ---")
    M_recon = decode_json_to_kolam(json_compressed, k=k)
    print(f"Reconstructed Shape: {M_recon.shape}")
    
    # Compare
    match = np.sum(M_orig == M_recon)
    total = M_orig.size
    print(f"Reconstruction Accuracy: {match}/{total} elements ({match/total*100:.2f}%)")
    print("(Note: Accuracy depends on model training duration. 10 samples is not enough for high accuracy, but demonstrates the concept.)")

if __name__ == "__main__":
    main()
