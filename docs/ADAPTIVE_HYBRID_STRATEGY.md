# Adaptive Hybrid Strategy: Concept & Implementation

## Core Philosophy
We use a **two-layer** approach to achieve the best balance of Security and Reliability.

1.  **Layer 1: Security (Key Generation)**
    -   **Method**: Pure `Kolam XOR Random`.
    -   **Why**: Preserves maximum entropy and cryptographic unpredictability. No patterns are introduced here.

2.  **Layer 2: Reliability (Channel Selection)**
    -   **Method**: Adaptive Frequency Hopping (AFH).
    -   **Why**: To prevent collisions (jamming or self-interference) efficiently.

## The Adaptive Algorithm

The system simulates a "sensing" radio that checks channel availability before hopping.

### 1. Sense (Collision Detection)
Before using a channel derived from the key, the system checks if it is "Occupied".
-   In our simulation, "Occupied" is defined as **"Used within the last 4 time slots"**.
-   This prevents burst errors and self-collisions.

### 2. Adaptation (Collision Avoidance)
If the target channel is Occupied:
-   **Old Way**: Increment +1 (Predictable).
-   **New Way (Your Idea)**: Scan for **ALL** currently free channels.
-   **Selection**: Pick one of these free channels at **RANDOM**.

### Example
-   **Key Output**: Channel 20.
-   **Environment**: Channel 20 is "Occupied" (Time Frame Busy).
-   **Free Channels**: [5, 12, 33, 41, ...].
-   **Action**: System randomly selects **Channel 33**.
-   **Result**: 
    -   Collision at Ch 20 avoided.
    -   Metric records "No Collision".
    -   Attacker cannot predict Ch 33 because the choice was random among free slots.

## Benefits
-   **Zero Self-Collisions**: Mathematically guaranteed by the look-ahead check.
-   **High Entropy**: The "backup" choice is random, not deterministic.
-   **USP Compliance**: Demonstrates a "Smart" Hybrid system that is strictly superior to dumb Random hopping.
