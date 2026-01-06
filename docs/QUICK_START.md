# 🚀 Quick Start Guide - Kolam Message Encryption

## ⚡ Servers Running

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🎯 Quick Test (30 seconds)

### 1. Run the Example
```bash
python example_kolam_encryption.py
```

You'll see:
```
Original Message: Hello! This message uses Kolam patterns for encryption.

Encrypting with unique Kolam patterns...

Encrypted into 7 chunks:
Each chunk has its own unique Kolam!

Chunk 1:
├─ Kolam Pattern: radial
├─ Grid Size: 7×7
├─ Randomness: 5
└─ Unique Channels: 42 of 64

[... more chunks ...]

✅ SUCCESS! Message encrypted and decrypted correctly!
```

### 2. Test via API (PowerShell)
```powershell
# Encrypt
$encrypted = Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8000/encrypt-with-kolam" `
  -Body '{"message":"Test message!","master_seed":"test"}' `
  -ContentType "application/json"

# View result
$encrypted | ConvertTo-Json -Depth 10

# Decrypt
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8000/decrypt-with-kolam" `
  -Body ($encrypted | ConvertTo-Json -Depth 10) `
  -ContentType "application/json"
```

## 🎨 What Makes This Unique

**Each chunk gets its own Kolam:**
```
Message: "Hello World!"
    ↓
Chunk 1: "Hello Wo" → radial Kolam (7×7)    → 42 channels
Chunk 2: "rld!"     → diagonal Kolam (9×9)  → 38 channels
```

## 📊 Key Files

| File | Purpose |
|------|---------|
| `backend/kolam_message_encoder.py` | Core encryption engine |
| `backend/main.py` | API endpoints |
| `example_kolam_encryption.py` | Simple demo |
| `test_kolam_encryption.py` | Full test suite |
| `SETUP_COMPLETE.md` | Detailed documentation |

## 🔥 Most Important Concept

**Traditional Encryption:**
```
One Key → Entire Message
```

**Kolam Encryption:**
```
Message Chunk 1 → Unique Kolam 1 → Encrypted 1
Message Chunk 2 → Unique Kolam 2 → Encrypted 2
Message Chunk 3 → Unique Kolam 3 → Encrypted 3
```

## ✅ Ready to Use!

Everything is set up and running. Try the example script now!
