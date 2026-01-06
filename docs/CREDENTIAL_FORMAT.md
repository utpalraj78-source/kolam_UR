# Kolam FHSS Platform - Standardized Credential Format

## Overview
The system now uses a **standardized credential format** for all Kolam-related operations, especially for the secure chat feature. The credential includes both generation parameters AND the generated matrix data.

## Standardized Credential Format

```json
{
  // Core generation parameters (REQUIRED for chat)
  "symmetry": "radial",           // Symmetry pattern
  "randomness": 2,                 // Randomness level (m)
  "k": 4,                          // Grid size
  "seed": 123456789,               // Generation seed
  "mod": 16,                       // Modulo value
  
  // Additional parameters
  "bits_per_cell": 4,              // Bits per cell
  "min_hops": 10,                  // Minimum hops
  "layout": "Square grid (no rotate)",
  "curve_color": "#800000",
  "dot_color": "#000000",
  "bg_color": "#ffffff",
  
  // Matrix data (INCLUDED for complete Kolam representation)
  "matrix": [                      // 4D array: k x k x 4 (per-cell edges)
    [[1,0,1,0], [0,1,0,1], ...],
    ...
  ],
  "allRows": [...],                // Row edge data
  "allCols": [...],                // Column edge data
  
  // Metadata
  "generated_at": "2025-11-23T18:00:00.000Z",
  "version": "1.0"
}
```

## How to Use

### 1. Generate a Kolam with Credential

**Option A: Auto-download (Recommended)**
1. Go to Kolam Generator page
2. Set your parameters (symmetry, randomness, grid size, etc.)
3. Click **"Generate New Kolam Matrix"**
4. A credential file will be **automatically downloaded** to your Downloads folder
5. File name format: `kolam_credential_4x4_<timestamp>.json`

**Option B: Manual download**
1. Generate a Kolam (any method)
2. Click **"Download Credential"** button
3. Save the file for later use

### 2. Use Credential for Secure Chat

1. Navigate to the **Secure Chat** page
2. Click the upload area
3. Select your credential JSON file
4. Click **"Initiate Handshake"**
5. Wait for peer (60 seconds)
6. Both users must upload **IDENTICAL** credential files
7. Once matched, secure chat channel is established

### 3. Test Files Available

- `test_chat_credential.json` - Ready-to-use test credential
- Use this file on TWO browser windows/tabs to test chat locally

## Key Features

✅ **Automatic credential download** when generating matrices
✅ **Standardized format** ensures compatibility across all features
✅ **Chat-ready** - includes all required parameters for FHSS chat
✅ **Version tracking** - future-proof with version field
✅ **Metadata** - includes generation timestamp

## Troubleshooting

### "Failed to connect: Invalid credential file"
- Ensure the JSON file includes `symmetry` and `k` fields
- Use files generated from the Kolam Generator
- Don't use matrix-only JSON files

### "Connection timed out"
- Both users must upload within 60 seconds
- Ensure BOTH users upload IDENTICAL credential files
- Check that backend is running on port 8000

### "Kolam credentials do not match"
- Files must be byte-for-byte identical
- Share the exact same credential file between users
- Don't manually edit the JSON

## Technical Details

### Frontend Changes
- Added `createCredentialObject()` helper function
- Added `downloadCredential()` helper function
- Auto-download on matrix generation
- Simplified "Download Credential" button

### Backend
- WebSocket endpoint: `/ws/chat/{room_id}/{user_id}`
- FHSS encoding using HMAC-SHA256 PRF
- Room-based peer matching
- 60-second timeout for peer connection

## Example Usage Flow

```
1. User A: Generate Kolam → Auto-download credential
2. User A: Share credential file with User B
3. User A: Go to Chat → Upload credential → Initiate Handshake
4. User B: Go to Chat → Upload same credential → Initiate Handshake
5. System: Match credentials → Establish secure channel
6. Both users: Chat securely using FHSS
```

## Security Notes

- The credential file acts as a shared secret
- Room ID is derived from credential hash (SHA-256)
- FHSS hopping sequence is deterministic based on credential
- Messages are chunked and transmitted over pseudo-random channels
- Only users with identical credentials can decrypt messages
