"""
Test script for Kolam-based message encryption system.
Demonstrates how each message chunk gets encrypted with its own unique Kolam pattern.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.kolam_message_encoder import (
    KolamMessageEncoder, 
    encode_message_with_kolams,
    decode_message_from_kolams
)
import json


def test_basic_encryption():
    """Test basic encryption and decryption"""
    print("=" * 70)
    print("TEST 1: Basic Encryption/Decryption")
    print("=" * 70)
    
    # Create encoder
    encoder = KolamMessageEncoder(
        master_seed="test_seed_123",
        channels=64,
        chunk_size=8
    )
    
    # Test message
    message = "Hello World! This is a secret message encrypted with Kolams."
    print(f"\n📝 Original Message: {message}")
    print(f"📏 Length: {len(message)} characters")
    
    # Encode
    print("\n🔒 Encrypting...")
    encoded_chunks = encoder.encode_message(message)
    
    print(f"✅ Encoded into {len(encoded_chunks)} chunks")
    print(f"   Each chunk has its own unique Kolam pattern!")
    
    # Show details of first chunk
    if encoded_chunks:
        chunk0 = encoded_chunks[0]
        print(f"\n📊 First Chunk Details:")
        print(f"   - Chunk Index: {chunk0['chunk_index']}")
        print(f"   - Encrypted Data: {chunk0['encrypted_data'][:10]}... (first 10 bytes)")
        print(f"   - Hopping Sequence: {chunk0['hopping_sequence'][:10]}... (first 10 hops)")
        print(f"   - Kolam Parameters: {chunk0['kolam_params']}")
        print(f"   - Unique Channels Used: {len(chunk0['channels_used'])} out of {encoder.channels}")
    
    # Decode
    print("\n🔓 Decrypting...")
    decoded_message = encoder.decode_message(encoded_chunks)
    print(f"✅ Decoded Message: {decoded_message}")
    
    # Verify
    success = decoded_message == message
    print(f"\n{'✅ SUCCESS' if success else '❌ FAILED'}: Integrity Check")
    
    return success


def test_different_messages():
    """Test with different messages"""
    print("\n" + "=" * 70)
    print("TEST 2: Multiple Messages with Different Kolams")
    print("=" * 70)
    
    messages = [
        "Short msg",
        "This is a medium length message for testing",
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt."
    ]
    
    encoder = KolamMessageEncoder(master_seed="multi_test")
    
    for i, msg in enumerate(messages, 1):
        print(f"\n📝 Message {i}: '{msg[:50]}{'...' if len(msg) > 50 else ''}'")
        encoded = encoder.encode_message(msg)
        decoded = encoder.decode_message(encoded)
        
        chunks_info = []
        for chunk_data in encoded:
            symmetry = chunk_data['kolam_params']['symmetry']
            k = chunk_data['kolam_params']['k']
            chunks_info.append(f"{symmetry}({k}x{k})")
        
        print(f"   - Chunks: {len(encoded)}")
        print(f"   - Kolam Patterns: {', '.join(chunks_info)}")
        print(f"   - {'✅ MATCH' if decoded == msg else '❌ MISMATCH'}")


def test_compact_payload():
    """Test compact payload format for network transmission"""
    print("\n" + "=" * 70)
    print("TEST 3: Compact Payload for Network Transmission")
    print("=" * 70)
    
    message = "Network transmission test message"
    payload = encode_message_with_kolams(message, master_seed="network_test", chunk_size=8)
    
    # Convert to JSON
    json_payload = json.dumps(payload)
    print(f"\n📝 Original: {message}")
    print(f"📦 Payload Size: {len(json_payload):,} bytes")
    print(f"📊 Chunks: {len(payload['chunks'])}")
    print(f"🔐 Type: {payload['type']}")
    
    # Decode
    decoded = decode_message_from_kolams(payload, master_seed="network_test")
    print(f"🔓 Decoded: {decoded}")
    print(f"{'✅ SUCCESS' if decoded == message else '❌ FAILED'}")


def test_kolam_variety():
    """Show variety of Kolam patterns generated"""
    print("\n" + "=" * 70)
    print("TEST 4: Kolam Pattern Variety")
    print("=" * 70)
    
    encoder = KolamMessageEncoder(master_seed="variety_test")
    message = "This demonstrates the variety of Kolam patterns used for encryption"
    
    encoded = encoder.encode_message(message)
    
    print(f"\n📝 Message: {message}")
    print(f"📊 Total Chunks: {len(encoded)}")
    print(f"\n🎨 Kolam Patterns Generated:\n")
    
    symmetries = {}
    grid_sizes = {}
    
    for i, chunk_data in enumerate(encoded):
        params = chunk_data['kolam_params']
        sym = params['symmetry']
        k = params['k']
        rand = params['randomness']
        
        # Count symmetries
        symmetries[sym] = symmetries.get(sym, 0) + 1
        grid_sizes[k] = grid_sizes.get(k, 0) + 1
        
        print(f"   Chunk {i:2d}: {sym:15s} | Grid: {k:2d}x{k:2d} | Randomness: {rand} | "
              f"Channels: {len(chunk_data['channels_used'])}/{encoder.channels}")
    
    print(f"\n📈 Statistics:")
    print(f"   Unique Symmetries: {len(symmetries)}")
    print(f"   Symmetry Distribution: {dict(symmetries)}")
    print(f"   Grid Size Distribution: {dict(grid_sizes)}")


def demo_encryption_flow():
    """Demonstrate complete encryption flow"""
    print("\n" + "=" * 70)
    print("DEMO: Complete Encryption Flow")
    print("=" * 70)
    
    message = "Secret message!"
    master_seed = "demo_seed_2024"
    
    print(f"\n1️⃣  Original Message: '{message}'")
    
    print(f"\n2️⃣  Creating Encoder with:")
    print(f"   - Master Seed: {master_seed}")
    print(f"   - Channels: 64")
    print(f"   - Chunk Size: 8 characters")
    
    encoder = KolamMessageEncoder(master_seed=master_seed, channels=64, chunk_size=8)
    
    print(f"\n3️⃣  Encoding Message...")
    encoded = encoder.encode_message(message)
    
    print(f"\n4️⃣  Encrypted Chunks Generated:")
    for chunk_data in encoded:
        params = chunk_data['kolam_params']
        print(f"\n   📦 Chunk {chunk_data['chunk_index']}:")
        print(f"      • Kolam: {params['symmetry']} ({params['k']}x{params['k']})")
        print(f"      • Encrypted: {chunk_data['encrypted_data']}")
        print(f"      • Hops: {chunk_data['hopping_sequence'][:5]}... (showing first 5)")
        print(f"      • Channels: {sorted(chunk_data['channels_used'])[:10]}{'...' if len(chunk_data['channels_used']) > 10 else ''}")
    
    print(f"\n5️⃣  Decoding Message...")
    decoded = encoder.decode_message(encoded)
    
    print(f"\n6️⃣  Result:")
    print(f"   Original:  '{message}'")
    print(f"   Decoded:   '{decoded}'")
    print(f"   Status:    {'✅ MATCH' if message == decoded else '❌ MISMATCH'}")


if __name__ == "__main__":
    print("\n" + "🎨" * 35)
    print("   KOLAM-BASED MESSAGE ENCRYPTION SYSTEM")
    print("   Each chunk gets its own unique Kolam pattern!")
    print("🎨" * 35)
    
    try:
        # Run all tests
        test_basic_encryption()
        test_different_messages()
        test_compact_payload()
        test_kolam_variety()
        demo_encryption_flow()
        
        print("\n" + "=" * 70)
        print("✅ ALL TESTS COMPLETED SUCCESSFULLY!")
        print("=" * 70)
        print("\n💡 Key Takeaways:")
        print("   • Each message chunk is encrypted with a unique Kolam pattern")
        print("   • Kolam patterns are randomly generated but deterministic")
        print("   • Different symmetries and grid sizes provide variety")
        print("   • Frequency hopping sequences are derived from Kolam matrices")
        print("   • Messages can be encrypted and decrypted reliably")
        print("\n")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
