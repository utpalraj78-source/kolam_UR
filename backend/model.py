import torch
import torch.nn as nn
import torch.nn.functional as F

class KolamVAE(nn.Module):
    def __init__(self, k=15, latent_dim=32):
        super(KolamVAE, self).__init__()
        self.k = k
        self.latent_dim = latent_dim

        # Encoder
        # Input: (Batch, 4, K, K) -> 4 channels for T, B, L, R
        self.encoder = nn.Sequential(
            nn.Conv2d(4, 32, kernel_size=3, stride=1, padding=1),
            nn.ReLU(),
            nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1), # K/2
            nn.ReLU(),
            nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1), # K/4
            nn.ReLU(),
            nn.Flatten()
        )

        # Calculate flattened size
        # If K=15:
        # L1: 15x15
        # L2: 8x8 (ceil)
        # L3: 4x4
        # Flat: 128 * 4 * 4 = 2048
        self.flat_size = 128 * 4 * 4 
        
        self.fc_mu = nn.Linear(self.flat_size, latent_dim)
        self.fc_logvar = nn.Linear(self.flat_size, latent_dim)

        # Decoder
        self.decoder_input = nn.Linear(latent_dim, self.flat_size)
        
        self.decoder = nn.Sequential(
            nn.ConvTranspose2d(128, 64, kernel_size=3, stride=2, padding=1, output_padding=1), # 8x8
            nn.ReLU(),
            nn.ConvTranspose2d(64, 32, kernel_size=3, stride=2, padding=1, output_padding=1), # 16x16 (target 15)
            nn.ReLU(),
            nn.Conv2d(32, 4, kernel_size=3, stride=1, padding=1), # 16x16
            nn.Sigmoid() # Output probabilities for edges
        )

    def reparameterize(self, mu, logvar):
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std

    def forward(self, x):
        # x: (B, K, K, 4) -> (B, 4, K, K)
        x = x.permute(0, 3, 1, 2).float()
        
        encoded = self.encoder(x)
        mu = self.fc_mu(encoded)
        logvar = self.fc_logvar(encoded)
        
        z = self.reparameterize(mu, logvar)
        
        decoded = self.decoder_input(z)
        decoded = decoded.view(-1, 128, 4, 4)
        decoded = self.decoder(decoded)
        
        # Crop to KxK if needed (since we used padding)
        # Decoder output is 16x16 due to strides
        decoded = decoded[:, :, :self.k, :self.k]
        
        # (B, 4, K, K) -> (B, K, K, 4)
        return decoded.permute(0, 2, 3, 1), mu, logvar

def loss_function(recon_x, x, mu, logvar):
    # Binary Cross Entropy
    # recon_x and x must have same shape
    BCE = F.binary_cross_entropy(recon_x, x, reduction='sum')
    # KL Divergence
    KLD = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
    return BCE + KLD
