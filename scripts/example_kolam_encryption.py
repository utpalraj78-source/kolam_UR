"""
Simple example demonstrating Kolam-based message encryption.
Run this to see how each chunk gets its own unique Kolam pattern!
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.kolam_message_encoder import KolamMessageEncoder
import json


def simple_demo():
    """Simple demonstration of the encryption system."""
    
    print("╔" + "═" * 68 + "╗")
    print("║" + " " * 15 + "KOLAM MESSAGE ENCRYPTION DEMO" + " " * 24 + "║")
    print("╚" + "═" * 68 + "╝")
    
    # Your message
    message = "Hello! This message uses Kolam patterns for encryption."
    
    print(f"\n📝 Original Message:")
    print(f"   {message}")
    print(f"   ({len(message)} characters)")
    
    # Create encoder
    encoder = KolamMessageEncoder(
        master_seed="demo_secret_key",
        channels=64,
        chunk_size=8
    )
    
    # Encrypt
    print(f"\n🔒 Encrypting with unique Kolam patterns...")
    encoded_chunks = encoder.encode_message(message)
    
    print(f"\n✅ Encrypted into {len(encoded_chunks)} chunks:")
    print(f"   Each chunk has its own unique Kolam!\n")
    
    # Show each chunk's Kolam
    for i, chunk_data in enumerate(encoded_chunks):
        params = chunk_data['kolam_params']
        print(f"   Chunk {i+1}:")
        print(f"   ├─ Kolam Pattern: {params['symmetry']}")
        print(f"   ├─ Grid Size: {params['k']}×{params['k']}")
        print(f"   ├─ Randomness: {params['randomness']}")
        print(f"   └─ Unique Channels: {len(chunk_data['channels_used'])} of 64")
        if i < len(encoded_chunks) - 1:
            print()
    
    # Decrypt
    print(f"\n🔓 Decrypting...")
    decoded_message = encoder.decode_message(encoded_chunks)
    
    # Show result
    print(f"\n📨 Decrypted Message:")
    print(f"   {decoded_message}")
    
    # Verify
    if decoded_message == message:
        print(f"\n✅ SUCCESS! Message encrypted and decrypted correctly!")
    else:
        print(f"\n❌ ERROR! Messages don't match!")
    
    # Show encryption details
    print(f"\n📊 Encryption Statistics:")
    all_channels = set()
    all_symmetries = set()
    for chunk in encoded_chunks:
        all_channels.update(chunk['channels_used'])
        all_symmetries.add(chunk['kolam_params']['symmetry'])
    
    print(f"   • Total chunks: {len(encoded_chunks)}")
    print(f"   • Total unique channels used: {len(all_channels)}")
    print(f"   • Different Kolam types: {len(all_symmetries)}")
    print(f"   • Symmetry types: {', '.join(sorted(all_symmetries))}")


if __name__ == "__main__":
    simple_demo()
    
    print("\n" + "─" * 70)
    print("💡 Try editing the 'message' variable to encrypt your own text!")
    print("─" * 70 + "\n")
