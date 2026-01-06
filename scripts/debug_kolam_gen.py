
import sys
import os

# Add the parent directory to sys.path so we can import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from backend.kolam_generator import generate_kolam
    print("Successfully imported generate_kolam")
except ImportError as e:
    print(f"Failed to import generate_kolam: {e}")
    sys.exit(1)

try:
    print("Attempting to generate kolam...")
    # Simulate a typical request
    # symmetry="square", m=2, k=10
    result = generate_kolam(
        symmetry="square",
        m=2,
        k=10,
        seed=12345,
        analyze=True,
        return_preview=True
    )
    print("Generation successful!")
    print(f"Result length: {len(result)}")
    # Check if we got image bytes
    if result[5]:
        print(f"Got PNG bytes: {len(result[5])} bytes")
    else:
        print("No PNG bytes returned")

except Exception as e:
    print(f"Generation failed with error: {e}")
    import traceback
    traceback.print_exc()
