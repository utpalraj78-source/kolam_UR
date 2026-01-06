# FHSS Visualization

The **FHSS Visualization** component provides a visual representation of the Frequency Hopping Spread Spectrum technique used in the chat.

## The Graph

*   **Y-Axis**: Represents the **Frequency Channels** (0-15).
*   **X-Axis**: Represents **Time** (or chunk index).
*   **Data Points**: Each point on the graph shows which channel was used to transmit a specific chunk of the message.

## Purpose

*   **Verification**: Allows users to visually verify that the hopping sequence is complex and distributed across the spectrum.
*   **Synchronization Check**: Both sender and receiver see the same graph for the same message, confirming they are synchronized.
*   **Education**: Helps users understand how their message is being split and "hopped" across frequencies.
