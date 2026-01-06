import torch
import torch.optim as optim
import numpy as np
import os
import traceback
from kolam_generator import generate_kolam
from model import KolamVAE, loss_function

# Configuration
K_SIZE = 15
LATENT_DIM = 32
BATCH_SIZE = 2
EPOCHS = 5
DATASET_SIZE = 10
MODEL_PATH = "kolam_vae.pth"

def generate_dataset(size, k):
    print(f"Generating dataset of {size} Kolams (k={k})...")
    data = []
    for i in range(size):
        try:
            sym = "random"
            M, _, _, _, _, _ = generate_kolam(sym, 4, k, seed=i+1000, analyze=False, return_preview=False)
            
            if not isinstance(M, np.ndarray):
                print(f"Index {i}: M is not array: {type(M)}")
                continue
                
            if M.shape != (k, k, 4):
                print(f"Index {i}: Shape mismatch {M.shape}")
                continue
                
            # Convert to tensor immediately
            t = torch.from_numpy(M).float()
            data.append(t)
            print(f"Generated {i}: {t.shape}")
        except Exception as e:
            print(f"Error generating index {i}: {e}")
            traceback.print_exc()
            continue
    
    if not data:
        print("No data generated.")
        return None
        
    try:
        return torch.stack(data)
    except Exception as e:
        print(f"Error stacking: {e}")
        traceback.print_exc()
        return None

def train():
    # 1. Prepare Data
    tensor_data = generate_dataset(DATASET_SIZE, K_SIZE)
    if tensor_data is None:
        print("No data generated. Exiting.")
        return

    dataset = torch.utils.data.TensorDataset(tensor_data)
    dataloader = torch.utils.data.DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

    # 2. Initialize Model
    model = KolamVAE(k=K_SIZE, latent_dim=LATENT_DIM)
    optimizer = optim.Adam(model.parameters(), lr=1e-3)

    print(f"Starting training VAE on {len(tensor_data)} samples...")
    print("Concept: Variational Autoencoder (VAE) learning latent geometric manifold.")

    model.train()
    for epoch in range(EPOCHS):
        total_loss = 0
        for batch_idx, (data,) in enumerate(dataloader):
            optimizer.zero_grad()
            
            recon_batch, mu, logvar = model(data)
            loss = loss_function(recon_batch, data, mu, logvar)
            
            loss.backward()
            total_loss += loss.item()
            optimizer.step()
        
        print(f"Epoch {epoch}: Average Loss {total_loss / len(dataloader.dataset):.4f}")

    # 3. Save Model
    torch.save(model.state_dict(), MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

if __name__ == "__main__":
    train()
