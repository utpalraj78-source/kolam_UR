"""
Test the Kolam encryption with visual Kolam images.
This demonstrates how each chunk gets its own unique Kolam pattern.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.kolam_message_encoder import KolamMessageEncoder
import json


def test_with_images():
    """Test encryption with Kolam image generation."""
    
    print("=" * 80)
    print("KOLAM ENCRYPTION WITH VISUAL PATTERNS")
    print("=" * 80)
    
    # Create encoder
    encoder = KolamMessageEncoder(
        master_seed="visual_test_2024",
        channels=64,
        chunk_size=8
    )
    
    # Test message
    message = "This message uses unique Kolam patterns for each chunk!"
    
    print(f"\n📝 Original Message:")
    print(f"   \"{message}\"")
    print(f"   Length: {len(message)} characters")
    
    # Encode WITH images
    print(f"\n🎨 Generating unique Kolam patterns for each chunk...")
    encoded_chunks = encoder.encode_message(message, generate_images=True)
    
    print(f"\n✅ Generated {len(encoded_chunks)} chunks with unique Kolam patterns:\n")
    
    # Display details for each chunk
    for i, chunk_data in enumerate(encoded_chunks):
        params = chunk_data['kolam_params']
        chunk_text = chunk_data.get('chunk_text', '')
        has_image = bool(chunk_data.get('kolam_image'))
        
        print(f"╔{'═' * 76}╗")
        print(f"║ CHUNK {i + 1:2d} of {len(encoded_chunks)}".ljust(77) + "║")
        print(f"╠{'═' * 76}╣")
        print(f"║ Text: \"{chunk_text}\"".ljust(77) + "║")
        print(f" ║")
        print(f"║ 🎨 Kolam Pattern:".ljust(77) + "║")
        print(f"║    • Type: {params['symmetry']}".ljust(77) + "║")
        print(f"║    • Grid Size: {params['k']}×{params['k']}".ljust(77) + "║")
        print(f"║    • Randomness Level: {params['randomness']}".ljust(77) + "║")
        print(f"║    • Seed: {params['seed']}".ljust(77) + "║")
        print(f"║")
        print(f"║ 📡 Frequency Hopping:".ljust(77) + "║")
        print(f"║    • Total Hops: {len(chunk_data['hopping_sequence'])}".ljust(77) + "║")
        print(f"║    • Unique Channels: {len(chunk_data['channels_used'])} of 64".ljust(77) + "║")
        print(f"║    • First 10 Hops: {str(chunk_data['hopping_sequence'][:10])}...".ljust(77) + "║")
        print(f"║")
        print(f"║ 🔐 Encryption:".ljust(77) + "║")
        print(f"║    • Encrypted Bytes: {chunk_data['encrypted_data'][:8]}...".ljust(77) + "║")
        print(f"║    • Image Generated: {'✅ Yes' if has_image else '❌ No'}".ljust(77) + "║")
        if has_image:
            img_size = len(chunk_data['kolam_image'])
            print(f"║    • Image Size: {img_size:,} bytes (base64)".ljust(77) + "║")
        print(f"╚{'═' * 76}╝\n")
    
    # Verify decryption
    print("🔓 Decrypting message...")
    decoded = encoder.decode_message(encoded_chunks)
    
    print(f"\n✅ Decrypted: \"{decoded}\"")
    print(f"{'✅ SUCCESS' if decoded == message else '❌ FAILED'}: Message matches original\n")
    
    # Statistics
    print("=" * 80)
    print("📊 STATISTICS")
    print("=" * 80)
    
    all_symmetries = set()
    all_grid_sizes = set()
    total_channels = set()
    total_image_size = 0
    
    for chunk in encoded_chunks:
        all_symmetries.add(chunk['kolam_params']['symmetry'])
        all_grid_sizes.add(chunk['kolam_params']['k'])
        total_channels.update(chunk['channels_used'])
        if chunk.get('kolam_image'):
            total_image_size += len(chunk['kolam_image'])
    
    print(f"\n• Total Chunks: {len(encoded_chunks)}")
    print(f"• Unique Symmetry Types: {len(all_symmetries)}")
    print(f"• Symmetries Used: {', '.join(sorted(all_symmetries))}")
    print(f"• Grid Sizes Used: {sorted(all_grid_sizes)}")
    print(f"• Total Unique Channels: {len(total_channels)} of 64")
    print(f"• Total Images Size: {total_image_size:,} bytes")
    print(f"• Average Image Size: {total_image_size // len(encoded_chunks):,} bytes/chunk\n")
    
    print("=" * 80)
    print("💡 TIP: Each Kolam pattern can be displayed as an image in the frontend!")
    print("=" * 80)
    print()
    
    return encoded_chunks


def save_sample_json():
    """Save a sample encrypted message with images to JSON file."""
    
    print("\n📄 Saving sample encrypted message to JSON...")
    
    encoder = KolamMessageEncoder(master_seed="json_sample", channels=64, chunk_size=8)
    message = "Sample message"
    
    encoded = encoder.encode_message(message, generate_images=True)
    
    # Create compact payload
    from kolam_message_encoder import create_compact_payload
    payload = create_compact_payload(encoded)
    
    # Save to file
    filename = "sample_kolam_encryption_with_images.json"
    with open(filename, 'w') as f:
        json.dump(payload, f, indent=2)
    
    print(f"✅ Saved to: {filename}")
    print(f"   Contains {len(payload['chunks'])} chunks with Kolam images")
    
    # Show structure
    print(f"\n📋 JSON Structure:")
    print(f"   • type: {payload['type']}")
    print(f"   • version: {payload['version']}")
    print(f"   • chunks: array of {len(payload['chunks'])} items")
    print(f"     - Each chunk contains:")
    print(f"       • i: chunk index")
    print(f"       • t: original chunk text")
    print(f"       • d: encrypted data")
    print(f"       • h: hopping sequence")
    print(f"       • p: kolam parameters")
    print(f"       • c: channels used")
    print(f"       • img: base64 Kolam image 🎨")


if __name__ == "__main__":
    print("\n" + "🎨" * 40)
    print("   KOLAM ENCRYPTION - VISUAL DEMONSTRATION")
    print("   Each chunk gets a unique, visually distinct Kolam pattern")
    print("🎨" * 40 + "\n")
    
    try:
        encoded = test_with_images()
        save_sample_json()
        
        print("\n" + "=" * 80)
        print("✅ DEMONSTRATION COMPLETE")
        print("=" * 80)
        print("\nKey Features Demonstrated:")
        print("  ✅ Each chunk has a unique Kolam pattern")
        print("  ✅ Kolam images are generated for visualization")
        print("  ✅ Different symmetries and grid sizes provide diversity")
        print("  ✅ Each chunk uses different frequency channels")
        print("  ✅ Images can be displayed in a frontend UI")
        print("\nNext Steps:")
        print("  • Use the encryption API to generate Kolams dynamically")
        print("  • Display Kolam images in your frontend")
        print("  • Show which chunk is being transmitted with its Kolam")
        print()
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
