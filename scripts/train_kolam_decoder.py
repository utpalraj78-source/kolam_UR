# train_kolam_decoder.py
"""Training script for the KolamDecoder model.
It expects a dataset directory with files:
    *_meta.json   – parameter JSON (used to build conditioning vector)
    *_image.png   – rendered PNG image (target)
Optionally *_matrix.npy can be present but is not used here.

Run after you have generated the dataset with collect_training_data.py:
    python scripts/train_kolam_decoder.py --data_dir data/kolam_ml --out_dir ml_models --epochs 30
"""

import argparse, pathlib, json, os
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from PIL import Image

# Import the model we created earlier
from backend.ml_models.kolam_decoder import KolamDecoder

# ---------- Dataset ----------
class KolamImageDataset(Dataset):
    def __init__(self, root_dir: pathlib.Path, img_size: int = 256):
        self.root = pathlib.Path(root_dir)
        self.samples = sorted([p for p in self.root.glob("*_meta.json")])
        self.img_size = img_size
        # Pre‑compute the list of possible symmetries / layouts for one‑hot encoding
        self.sym_list = ["radial", "square", "diagonal", "hexagonal", "none"]
        self.layout_list = ["Square grid (no rotate)", "Rotated grid", "Diamond grid"]

    def __len__(self):
        return len(self.samples)

    def _hex_to_rgb(self, hex_str: str):
        h = hex_str.lstrip("#")
        return torch.tensor([int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4)], dtype=torch.float32)

    def _build_cond(self, meta: dict):
        # k one‑hot (max 12)
        k_vec = torch.zeros(12)
        if meta.get("k"):
            k_vec[meta["k"] - 1] = 1.0
        # symmetry one‑hot
        sym_vec = torch.zeros(len(self.sym_list))
        sym = meta.get("symmetry")
        if sym in self.sym_list:
            sym_vec[self.sym_list.index(sym)] = 1.0
        # randomness (0‑9) normalized
        rnd = torch.tensor([ (meta.get("randomness", 0) / 9.0) ], dtype=torch.float32)
        # seed → 4 bytes normalized
        seed = meta.get("seed", 0)
        seed_bytes = np.frombuffer(int(seed).to_bytes(4, "little"), dtype=np.uint8) / 255.0
        seed_vec = torch.tensor(seed_bytes.astype(np.float32))
        # colours
        curve_rgb = self._hex_to_rgb(meta.get("curve_color", "#800000"))
        dot_rgb   = self._hex_to_rgb(meta.get("dot_color", "#000000"))
        # layout one‑hot
        layout_vec = torch.zeros(len(self.layout_list))
        layout = meta.get("layout")
        if layout in self.layout_list:
            layout_vec[self.layout_list.index(layout)] = 1.0
        # concatenate
        return torch.cat([k_vec, sym_vec, rnd, seed_vec, curve_rgb, dot_rgb, layout_vec], dim=0)

    def __getitem__(self, idx):
        meta_path = self.samples[idx]
        base = meta_path.stem.split("_")[0]
        # load image
        img_path = self.root / f"{base}_image.png"
        img = Image.open(img_path).convert("RGB").resize((self.img_size, self.img_size))
        img_tensor = torch.from_numpy(np.array(img)).float() / 255.0  # (H,W,3)
        img_tensor = img_tensor.permute(2, 0, 1)  # (3,H,W)
        # load meta and build conditioning vector
        meta = json.loads(meta_path.read_text())
        cond = self._build_cond(meta)
        return cond, img_tensor

# ---------- Training loop ----------
def train(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    dataset = KolamImageDataset(args.data_dir, img_size=args.img_size)
    loader = DataLoader(dataset, batch_size=args.batch, shuffle=True, num_workers=2)

    model = KolamDecoder(cond_dim=dataset[0][0].shape[0], latent_dim=args.latent, img_size=args.img_size).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)

    for epoch in range(1, args.epochs + 1):
        epoch_loss = 0.0
        model.train()
        for cond, target in loader:
            cond = cond.to(device)
            target = target.to(device)
            pred = model(cond)
            loss = torch.nn.functional.binary_cross_entropy(pred, target)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item() * cond.size(0)
        avg = epoch_loss / len(dataset)
        print(f"Epoch {epoch:03d}/{args.epochs} – loss: {avg:.6f}")
        if epoch % args.ckpt_every == 0:
            ckpt_path = pathlib.Path(args.out_dir) / f"decoder_epoch{epoch}.pt"
            torch.save(model.state_dict(), ckpt_path)
    # final model
    torch.save(model.state_dict(), pathlib.Path(args.out_dir) / "decoder_final.pt")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--data_dir", default="data/kolam_ml")
    p.add_argument("--out_dir", default="ml_models")
    p.add_argument("--img_size", type=int, default=256)
    p.add_argument("--latent", type=int, default=64)
    p.add_argument("--batch", type=int, default=32)
    p.add_argument("--epochs", type=int, default=30)
    p.add_argument("--lr", type=float, default=1e-3)
    p.add_argument("--ckpt_every", type=int, default=5)
    args = p.parse_args()
    os.makedirs(args.out_dir, exist_ok=True)
    train(args)
