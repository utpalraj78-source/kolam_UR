import torch
import torch.nn as nn
import torch.nn.functional as F

class KolamDecoder(nn.Module):
    """Conditional image generator that maps a low‑dimensional conditioning vector
    (parameters of the Kolam) to a PNG‑size RGB image.

    The architecture is deliberately lightweight so it can run on CPU in a FastAPI
    request. It starts from a latent vector, expands it with a series of
    transposed convolutions, and finally upsamples to the exact size expected by the
    front‑end (default 512×512).
    """

    def __init__(self, cond_dim: int = 40, latent_dim: int = 64, img_size: int = 512):
        super().__init__()
        self.cond_dim = cond_dim
        self.latent_dim = latent_dim
        self.img_size = img_size

        # 1️⃣  Conditioning → latent vector (fully‑connected)
        self.fc = nn.Sequential(
            nn.Linear(cond_dim, 128),
            nn.ReLU(inplace=True),
            nn.Linear(128, latent_dim)
        )

        # 2️⃣  Upsample from (latent_dim, 1, 1) to an image.
        # We start from a 4×4 feature map for a smoother up‑sampling chain.
        self.deconv = nn.Sequential(
            nn.ConvTranspose2d(latent_dim, 128, kernel_size=4, stride=1),   # 1→4
            nn.ReLU(inplace=True),
            nn.ConvTranspose2d(128, 64, kernel_size=4, stride=2, padding=1),  # 4→8
            nn.ReLU(inplace=True),
            nn.ConvTranspose2d(64, 32, kernel_size=4, stride=2, padding=1),   # 8→16
            nn.ReLU(inplace=True),
            nn.ConvTranspose2d(32, 16, kernel_size=4, stride=2, padding=1),   # 16→32
            nn.ReLU(inplace=True),
            nn.ConvTranspose2d(16, 8, kernel_size=4, stride=2, padding=1),    # 32→64
            nn.ReLU(inplace=True),
            nn.ConvTranspose2d(8, 3, kernel_size=4, stride=2, padding=1),     # 64→128
            nn.Sigmoid()  # output in [0,1]
        )

    def forward(self, cond: torch.Tensor):
        """cond shape: (B, cond_dim)"""
        # Map conditioning to latent vector
        z = self.fc(cond)                     # (B, latent_dim)
        # Reshape to (B, latent_dim, 1, 1) for ConvTranspose2d
        z = z.unsqueeze(-1).unsqueeze(-1)     # (B, latent_dim, 1, 1)
        img = self.deconv(z)                  # (B, 3, H, W) where H=W≈128
        # Final upscale to the exact UI size
        img = F.interpolate(img, size=(self.img_size, self.img_size), mode='bilinear', align_corners=False)
        return img
