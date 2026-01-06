import torch
from model import KolamVAE

print("Testing model...")
model = KolamVAE(k=15, latent_dim=32)
x = torch.randn(1, 15, 15, 4)
y, mu, logvar = model(x)
print(f"Output shape: {y.shape}")
