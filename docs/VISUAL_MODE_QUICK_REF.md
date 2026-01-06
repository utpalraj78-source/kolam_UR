# 🎨 Kolam Encryption - Visual Mode ✨

## 🚀 Quick Start (30 seconds)

### Open the Visualizer
**File**: `kolam_visualizer.html`  
**Action**: Double-click or drag to browser

### See It Work!
1. Enter a message (or use the pre-filled example)
2. Click "🔒 Encrypt & Visualize Kolams"
3. **See the magic**: Each chunk shows its unique Kolam pattern! 🎨

---

## 📸 What You'll See

```
┌─────────────────────────────────────────┐
│  Chunk 1: "Hello Wo"                    │
│  ┌───────────────────────────┐          │
│  │  [Beautiful Kolam Image]  │          │
│  │  Radial pattern, 7×7 grid │          │
│  └───────────────────────────┘          │
│  Pattern: radial                        │
│  Channels: 42 of 64                     │
└─────────────────────────────────────────┘
```

**Every chunk gets a different Kolam!**

---

## 🎯 Key Features

✅ **Visual Patterns**: See actual Kolam images  
✅ **Chunk Details**: View text + encryption info  
✅ **Statistics**: Total chunks, channels, patterns  
✅ **Responsive**: Beautiful on any screen  

---

## 💡 Behind the Scenes

```
Message: "Hello World!"
    ↓
Chunk 0: "Hello Wo" → 🎨 Radial Kolam (7×7)
Chunk 1: "rld!"     → 🎨 Diagonal Kolam (9×9)
    ↓
Each Kolam creates unique frequency hopping sequence
    ↓
Encrypted with chunk-specific pattern
```

---

## 🔗 API Usage

```javascript
POST http://localhost:8000/encrypt-with-kolam

{
  "message": "Your text",
  "generate_images": true  // ← Get Kolam images!
}
```

**Response includes base64 images** for each chunk's Kolam!

---

## 📱 Integration Ready

Use the returned images in your frontend:

```html
<img src="data:image/png;base64,{chunk.img}" />
```

---

## 🎨 Pattern Types You'll See

- **Radial** - Circular patterns
- **Diagonal** - Mirror symmetry
- **Square** - 4-fold symmetry
- **180°/90°** - Rotational patterns
- And more!

---

## ⚡ Performance

- Chunk encryption: < 50ms
- Image generation: ~100ms per Kolam
- Total: ~300-500ms for 3-5 chunks

---

## 🎉 The Big Idea

**Traditional**: One key → entire message  
**Kolam**: Each chunk → unique geometric key 🎨

**Result**: Multi-layered encryption with beautiful math!

---

**Try it now**: Open `kolam_visualizer.html` 🚀
