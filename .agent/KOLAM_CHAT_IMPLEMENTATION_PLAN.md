# Kolam Secure Chat - Complete Implementation Plan

## Overview
Implement a complete user authentication system with real-time encrypted chat using Kolam-based encryption with detailed process visualization.

## Phase 1: User Authentication & Database

### 1.1 Database Schema
```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kolam history table
CREATE TABLE kolam_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    kolam_params JSONB NOT NULL,
    kolam_image_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat sessions table
CREATE TABLE chat_sessions (
    id SERIAL PRIMARY KEY,
    user_a_id INTEGER REFERENCES users(id),
    user_b_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages table
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES chat_sessions(id),
    sender_id INTEGER REFERENCES users(id),
    encrypted_payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2 Backend API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `GET /api/kolams/my-history` - Get user's Kolam history
- `POST /api/kolams/save` - Save generated Kolam to history

### 1.3 Frontend Components
- Login/Register page
- Protected routes
- "My Kolams" page with history

## Phase 2: Real-time Encrypted Chat Pipeline

### 2.1 Message Encoding Pipeline
```
Message → Chunks → Hash → Kolam Generation → Binary Matrix → Channel Selection → Transfer
```

**Step-by-step:**
1. **Chunking**: Split message into chunks (max 32 chars per chunk)
2. **Hashing**: SHA-256 hash each chunk
3. **Kolam Generation**: 
   - Grid size: Random (4-6)
   - Randomness: Random (0-2)
   - Use hash as seed
4. **Matrix Extraction**: Extract binary matrix (4-bit per cell)
5. **Index Selection**: Randomly select from 16 possible indices
6. **Channel Mapping**: Map to channels based on grid size

### 2.2 Message Decoding Pipeline
```
Received Data → Channel Extraction → Matrix Reconstruction → Kolam Pattern → Hash → Chunks → Message
```

### 2.3 Backend Implementation
- WebSocket message handler for encrypted chat
- Encryption/decryption utilities
- Kolam generation for message chunks

### 2.4 Frontend Implementation
- Real-time chat interface
- Message encryption/decryption
- Process visualization panel

## Phase 3: Process Visualization

### 3.1 Visualization Components
- **Chunk Display**: Show message broken into chunks
- **Hash Display**: Show hash values for each chunk
- **Kolam Preview**: Show generated Kolam for each chunk
- **Matrix Display**: Show binary matrix (4-bit cells)
- **Index Selection**: Highlight selected indices (out of 16)
- **Channel Mapping**: Show channel assignments
- **Reverse Process**: Mirror display for decoding

### 3.2 UI Layout
```
┌─────────────────────────────────────────┐
│ Chat Messages                           │
│ ┌─────────────────────────────────────┐ │
│ │ User A: Hello                       │ │
│ │ [Show Process ▼]                    │ │
│ │   ├─ Chunks: ["Hell", "o"]          │ │
│ │   ├─ Hashes: [0x1a2b..., 0x3c4d...] │ │
│ │   ├─ Kolams: [🔷, 🔶]               │ │
│ │   ├─ Matrices: [[0,1,0,1]...]       │ │
│ │   ├─ Indices: [3, 7, 12, ...]       │ │
│ │   └─ Channels: [5, 12, 23, ...]     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Type message...] [Send]                │
└─────────────────────────────────────────┘
```

## Implementation Order

### Week 1: Authentication
1. Set up PostgreSQL database
2. Create user authentication backend
3. Implement JWT token system
4. Create login/register UI
5. Add protected routes

### Week 2: Kolam History
1. Create Kolam history backend
2. Save Kolam on generation
3. Build "My Kolams" page
4. Add pagination and filtering

### Week 3: Chat Encryption Pipeline
1. Implement message chunking
2. Add hashing utilities
3. Create Kolam-based encryption
4. Build matrix conversion
5. Implement channel mapping

### Week 4: Real-time Chat & Visualization
1. Enhance WebSocket for encrypted messages
2. Build chat UI
3. Create process visualization components
4. Add expand/collapse for process details
5. Testing and refinement

## Technical Stack
- **Database**: PostgreSQL
- **Backend**: FastAPI + SQLAlchemy
- **Auth**: JWT tokens
- **Real-time**: WebSockets
- **Frontend**: React + TypeScript
- **State**: Zustand
- **Crypto**: hashlib (Python), crypto-js (JS)

## Security Considerations
- Password hashing with bcrypt
- JWT token expiration
- WebSocket authentication
- Rate limiting on chat
- Input sanitization

## Next Steps
1. Install PostgreSQL
2. Set up database connection
3. Create authentication backend
4. Build login/register UI
5. Proceed with remaining phases
