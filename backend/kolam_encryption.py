"""
Message Encryption/Decryption using Kolam-based encoding
Implements the full pipeline: Message → Chunks → Hash → Kolam → Matrix → Channels
"""
import hashlib
import random
import json
from typing import List, Dict, Tuple
import numpy as np


MAX_HISTORY = 16

class KolamMessageEncryption:
    """Handles message encryption and decryption using Kolam patterns"""
    
    def __init__(self, max_chunk_size: int = 32):
        self.max_chunk_size = max_chunk_size
        self.min_grid_size = 4
        self.max_grid_size = 6
        self.index_history = []
        self.channel_history = []

    
    def chunk_message(self, message: str) -> List[str]:
        """Split message into chunks of max_chunk_size characters"""
        chunks = []
        for i in range(0, len(message), self.max_chunk_size):
            chunks.append(message[i:i + self.max_chunk_size])
        return chunks
    
    def hash_chunk(self, chunk: str) -> str:
        """Generate SHA-256 hash for a chunk"""
        return hashlib.sha256(chunk.encode()).hexdigest()
    
    def hash_to_seed(self, hash_value: str) -> int:
        """Convert hash to integer seed for Kolam generation"""
        # Use first 8 characters of hash and convert to int
        return int(hash_value[:8], 16)
    
    def generate_kolam_params(self, seed: int) -> Dict:
        """Generate random Kolam parameters based on seed"""
        # Use a local Random instance for thread safety and reproducibility
        rng = random.Random(seed)
        
        # Random grid size (4-6)
        k = rng.randint(self.min_grid_size, self.max_grid_size)
        
        # Random randomness (0.0 - 10.0) as requested
        randomness = round(rng.uniform(0.0, 10.0), 2)
        
        # Random other parameters
        params = {
            "symmetry": rng.choice(["radial", "bilateral", "none"]),
            "randomness": randomness,
            "k": k,
            "seed": seed % 10000,  # Keep seed manageable
            "mod": 2,
            "bits_per_cell": 4,  # 4 bits per cell for matrix
            "min_hops": 100,
            "layout": "Square grid (no rotate)",
            "curve_color": "#800000",
            "dot_color": "#000000"
        }
        
        return params
    
    def matrix_to_binary(self, matrix: List[List[int]], bits_per_cell: int = 4) -> List[int]:
        """Convert matrix to binary representation (4-bit per cell)"""
        binary_data = []
        for row in matrix:
            for cell in row:
                # Convert each cell to 4-bit binary
                binary_data.append(cell & 0xF)  # Ensure 4 bits
        return binary_data
    
    def select_random_indices(self, total_cells: int, num_indices: int = 16) -> List[int]:
        """Randomly select indices from matrix (Fallback)"""
        num_indices = min(num_indices, total_cells)
        return sorted(random.sample(range(total_cells), num_indices))

    def select_indices_from_key(self, total_cells: int, key_config: Dict, current_offset: int, num_indices: int = 16) -> List[int]:
        """Select indices derived from the User's uploaded JSON Key values"""
        if not key_config:
            return self.select_random_indices(total_cells, num_indices)

        # Extract numerical stream from JSON (support latent_vector or key array)
        key_stream = []
        if 'latent_vector' in key_config and isinstance(key_config['latent_vector'], list):
             key_stream = key_config['latent_vector']
        elif 'key' in key_config and isinstance(key_config['key'], list):
             key_stream = key_config['key']
        
        if not key_stream:
             return self.select_random_indices(total_cells, num_indices)

        indices = []
        stream_len = len(key_stream)
        
        # Calculate indices based on key values
        for i in range(num_indices):
             # Cycle through key stream
             val = key_stream[(current_offset + i) % stream_len]
             
             # Convert decimal/float to usable integer index
             if isinstance(val, (float, int)):
                 # Scale floats (e.g. 0.123 -> 123)
                 int_val = int(abs(val * 1000)) if isinstance(val, float) else abs(int(val))
                 idx = int_val % total_cells
                 indices.append(idx)
             else:
                 indices.append(i % total_cells) # Fallback
        
        return indices

    def map_to_channels(self, binary_data: List[int], grid_size: int) -> List[int]:
        """Map binary data to frequency channels"""
        # Number of channels based on grid size
        num_channels = grid_size * grid_size
        
        channels = []
        for value in binary_data:
            # Map 4-bit value (0-15) to channel (0 to num_channels-1)
            channel = value % num_channels
            channels.append(channel)
        
        return channels
    
    def encrypt_message(self, message: str, kolam_generator_func=None, key_config: Dict = None) -> Dict:
        """
        Encrypt a message using Kolam-based encoding.
        Uses key_config (User JSON) to deterministically select matrix indices.
        """
        chunks = self.chunk_message(message)
        chunk_details = []
        
        # Generate a random message salt to ensure unique Kolams even for identical content
        # This acts as an Initialization Vector (IV)
        import uuid
        message_salt = str(uuid.uuid4())[:8]
        
        # Track offset for reading from the key stream
        key_stream_offset = 0
        
        for i, chunk in enumerate(chunks):
            # Step 1: Hash the chunk with Salt and Index
            # We combine Chunk Content + Salt + Index to guarantee a unique Seed
            unique_input = f"{chunk}_{message_salt}_{i}"
            chunk_hash = hashlib.sha256(unique_input.encode()).hexdigest()
            
            # Step 2: Convert hash to seed
            seed = self.hash_to_seed(chunk_hash)
            
            # Step 3: Generate Kolam parameters
            kolam_params = self.generate_kolam_params(seed)
            
            # Step 4: Generate Kolam matrix (if generator function provided)
            if kolam_generator_func:
                matrix = kolam_generator_func(kolam_params)
            else:
                # Generate a simple random matrix for testing
                k = kolam_params['k']
                matrix = [[random.randint(0, 15) for _ in range(k)] for _ in range(k)]
            
            # Step 5: Convert matrix to binary
            binary_data = self.matrix_to_binary(matrix, kolam_params['bits_per_cell'])
            
            # Step 6: Select indices using User Key (Hybrid Mode)
            total_cells = len(binary_data)
            num_to_select = min(16, total_cells)
            
            if key_config:
                selected_indices = self.select_indices_from_key(total_cells, key_config, key_stream_offset, num_to_select)
                # Advance offset for next chunk to use different parts of the key
                key_stream_offset += num_to_select
            else:
                selected_indices = self.select_random_indices(total_cells, num_to_select)
            
            # Step 7: Process each character with Dual Adaptive Hopping (Index + Channel)
            # Channel Space must be defined by the AUTH KEY GRID (if available), not the random chunk grid
            auth_k = kolam_params['k']
            if key_config:
                 if 'k' in key_config: auth_k = int(key_config['k'])
                 elif 'grid_size' in key_config: auth_k = int(key_config['grid_size'])
            
            total_available_channels = auth_k * auth_k
            
            # Initialize Histories if needed
            final_channels = []
            character_map = []
            
            for i, char in enumerate(chunk):
                # --- LEVEL 1: INDEX SELECTION ---
                # 1. Determine intended index from Key/Random
                seq_idx = i % len(selected_indices)
                raw_matrix_idx = selected_indices[seq_idx]
                
                # 2. Adaptive Index Hopping
                busy_indices = set(self.index_history)
                final_matrix_idx = raw_matrix_idx
                # idx_status = "OK" 
                
                if raw_matrix_idx in busy_indices:
                    # Collision: Hop to find a free index
                    found_free_index = False
                    # Linear scan for a free slot
                    for offset in range(1, total_cells):
                        chk = (raw_matrix_idx + offset) % total_cells
                        if chk not in busy_indices:
                            final_matrix_idx = chk
                            found_free_index = True
                            # idx_status = "HOP"
                            break
                    
                    if not found_free_index and self.index_history:
                        # "if all the indexed are fulll then wait and use the least recently used"
                        # LRU is the oldest element in our history buffer
                        final_matrix_idx = self.index_history[0]
                        # idx_status = "LRU"

                # 3. Update Index History
                self.index_history.append(final_matrix_idx)
                if len(self.index_history) > MAX_HISTORY:
                    self.index_history.pop(0)

                # --- LEVEL 2: CHANNEL SELECTION ---
                # 4. Resolve Channel from the (potentially hopped) Matrix Index
                binary_val = binary_data[final_matrix_idx]
                raw_channel = binary_val % total_available_channels
                
                # 5. Adaptive Channel Hopping
                busy_channels = set(self.channel_history)
                final_channel = raw_channel
                status_code = "OK"
                
                if raw_channel in busy_channels:
                    status_code = "COLLISION"
                    # Find ALL currently free channels
                    all_channels = set(range(total_available_channels))
                    free_channels = list(all_channels - busy_channels)
                    
                    if free_channels:
                        # Select a random channel from those NOT in use
                        final_channel = random.choice(free_channels)
                    else:
                        # All channels busy? Use LRU (oldest in history) to minimize impact
                        if self.channel_history:
                             final_channel = self.channel_history[0]
                        else:
                             # Should not happen if history is full but just in case
                             final_channel = random.randint(0, total_available_channels - 1)
                
                # 6. Update Channel History
                self.channel_history.append(final_channel)
                if len(self.channel_history) > MAX_HISTORY:
                     self.channel_history.pop(0)
                
                final_channels.append(final_channel)
                
                character_map.append({
                    "char": char,
                    "channel": final_channel,
                    "original_channel": raw_channel,
                    "matrix_index": final_matrix_idx, # Store the FINAL index used
                    "status": status_code
                })
            
            chunk_details.append({
                'chunk': chunk,
                'hash': chunk_hash,
                'seed': seed,
                'kolam_params': kolam_params,
                'matrix': matrix,
                'binary_data': binary_data,
                'selected_indices': selected_indices, # Keep record of intended ones
                'channels': final_channels,
                'character_map': character_map
            })
        
        return {
            'original_message': message,
            'chunks': chunks,
            'chunk_details': chunk_details
        }
    
    def decrypt_message(self, encrypted_data: Dict) -> str:
        """
        Decrypt a message from encrypted data
        Reverses the encryption process
        """
        decrypted_chunks = []
        
        for detail in encrypted_data['chunk_details']:
            # In a real implementation, we would:
            # 1. Receive channels
            # 2. Reverse map to binary data
            # 3. Reconstruct matrix
            # 4. Generate Kolam from matrix
            # 5. Verify hash
            # 6. Retrieve original chunk
            
            # For now, we simply retrieve the stored chunk
            decrypted_chunks.append(detail['chunk'])
        
        return ''.join(decrypted_chunks)


# Helper function to integrate with existing Kolam generator
def generate_kolam_matrix_from_params(params: Dict) -> List[List[int]]:
    """
    Generate Kolam matrix using existing Kolam generation logic
    This should call the actual Kolam generation algorithm
    """
    # Import the actual Kolam generation function
    try:
        from features.KolamGenerator.backend.algo import generate_kolam_pattern
        
        # Generate the pattern
        pattern = generate_kolam_pattern(
            k=params['k'],
            symmetry=params['symmetry'],
            randomness=params['randomness'],
            seed=params['seed'],
            mod=params['mod']
        )
        
        # Extract matrix from pattern
        if 'matrix' in pattern:
            return pattern['matrix']
        else:
            # Fallback to random matrix
            k = params['k']
            return [[random.randint(0, 15) for _ in range(k)] for _ in range(k)]
    except Exception as e:
        print(f"Error generating Kolam matrix: {e}")
        # Fallback to random matrix
        k = params['k']
        return [[random.randint(0, 15) for _ in range(k)] for _ in range(k)]
