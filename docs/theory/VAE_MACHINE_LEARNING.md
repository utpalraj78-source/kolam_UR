# Variational Autoencoder (VAE) & Machine Learning

## 1. The Theory
A **Variational Autoencoder (VAE)** is a type of generative artificial neural network. It learns to map complex input data into a lower-dimensional "latent space" and then reconstruct it.
- **Encoder**: Compresses the input ($x$) into a probability distribution (mean $\mu$ and variance $\sigma$) in the latent space.
- **Latent Space**: A continuous vector space where similar data points are close together.
- **Decoder**: Samples from the latent space ($z$) and reconstructs the original input ($\hat{x}$).
- **Loss Function**: Combines reconstruction error (how close $\hat{x}$ is to $x$) and KL-divergence (regularizing the latent space to be normal).

## 2. Where it is Used
This is the advanced "AI" component for optimizing storage and generation:
- **Backend**: `backend/model.py` (The PyTorch Model Architecture), `backend/train_kolam_model.py` (Training script), `backend/kolam_generator.py` (Generation logic).
- **Usage**: Compressing Kolam grids and generating new ones from the latent space.

## 3. Methodology
1.  **Input**: The Kolam is treated as a 4-channel image ($K \times K \times 4$), where channels represent Top, Bottom, Left, Right edges.
2.  **Architecture**:
    - **Encoder**: Convolutional layers (`Conv2d`) extract geometric features (loops, corners).
    - **Bottleneck**: A dense layer maps features to a 32-dimensional latent vector.
    - **Decoder**: Transposed Convolutional layers (`ConvTranspose2d`) upsample the vector back to a grid.
3.  **Training**: The model is trained on thousands of procedurally generated Kolams to learn the "grammar" of valid patterns.

## 4. Observation
- **Compression**: A $15 \times 15 \times 4$ grid (900 integers) is compressed to just **32 floating-point numbers**. This is a massive reduction in data size.
- **Generative Capability**: By sampling random points in the latent space, the Decoder produces *new*, valid Kolam patterns that were never explicitly programmed.
- **Interpolation**: We can smoothly "morph" one Kolam into another by sliding between their latent vectors.

## 5. Purpose in Project
The VAE serves two purposes:
1.  **Optimization**: Drastically reduces the database storage requirements for saving user Kolams.
2.  **Innovation**: Moves beyond simple procedural generation (randomizing edges) to **AI-driven design**, allowing the system to "dream" new patterns and potentially discover novel symmetries.
