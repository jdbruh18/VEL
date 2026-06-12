# 🔱 VEL: Spatiotemporal Reservoir Cryptography Engine

> **"The Vel (വേൽ) is a divine spear and the ultimate symbol of protection, wisdom, and victory."**

**VEL** is a real-time, physical entropy-harvesting cryptography system based on **Physical Reservoir Computing** (inspired by the classic 2003 paper *"Pattern Recognition in a Bucket"* by Chrisantha Fernando and Sampsa Sojakka). 

Rather than hashing static video frames, VEL harvests spatiotemporal coordinates from physical, environmental dynamics (camera optical flow, CMOS sensor noise, falling rain simulation, or microcontroller analog inputs) and feeds them into a virtual **128-neuron Liquid State Machine (LSM) Neural Reservoir**. The continuous recurrent state updates of the reservoir are focused using SHA-256 to generate One-Time Pad (OTP) key streams.

---

## 🔱 Spiritual and System Anatomy

The architecture of VEL is structurally mapped to the three dimensions of the divine spear of Lord Murugan:

```
           / \         <-- The Sharp Tip (Crypto Engine)
          /   \            - SHA-256 State Focusing
         /     \           - Precise XOR One-Time Pad
        |   🧠  |        <-- The Broad Top (Spearhead Reservoir)
        |  LSM  |          - 128-Neuron Echo State Network (ESN)
         \     /           - Spatiotemporal input harvesting (8x8 Grid)
          \   /
           | |
           | |         <-- The Long Staff (Shaft / Log)
           | |             - Coordinate replay timeline
           | |             - Deterministic Replay (.vel keyfile)
           | |             - Backtracked signature confirmation
```

1. **The Broad Top (Spearhead):** Represents **vast knowledge**. It maps to the 128-neuron Echo State Network (ESN) reservoir. High-dimensional physical coordinates perturb the reservoir state vector $X[t]$ through recurrent connections, creating complex spatiotemporal convolution.
2. **The Sharp Tip (Point):** Represents **sharp intellect and discrimination (*Viveka*)**. It maps to the SHA-256 key extractor and XOR cipher. It compresses the high-dimensional reservoir states into a razor-sharp 256-bit key block to encrypt blocks of plaintext.
3. **The Long Staff (Shaft):** Represents **stability and grounding**. It maps to the coordinate logging and replay framework. Because physical entropy is non-reproducible, the staff records coordinate trajectories to a `.vel` keyfile, allowing the recipient to replay the logs through their identical ESN to decrypt the ciphertext.

---

## 🐙 The "Octopus" Design Pattern

VEL decouples its central cryptographic "Brain" from the physical environment by using pluggable drivers ("Tentacles"). This ensures that the engine is highly modular, pluggable, and easily integrated with future hardware, APIs, or AI platforms:

```
                    🐙 [ The VEL Brain ]
                     /   |    |    \  \
       [Tentacle 1] /    |    |     \  \ [Tentacle 5]
      Camera Vision      |    |      \  Quantum API (ANU)
            [Tentacle 2] /    \       \ [Tentacle 4]
        CMOS Shot Noise    \   Simulation (Rain)
                        [Tentacle 3]
                     USB Web Serial (Arduino)
```

*   **Tentacle 1 (Vision):** Frame-differencing camera driver for optical motion tracking.
*   **Tentacle 2 (Sensor):** CMOS dark frame shot-noise static harvester.
*   **Tentacle 3 (Simulation):** Virtual chaotic raindrop particle emitter.
*   **Tentacle 4 (Hardware):** Web Serial API connector to stream analog noise from microcontrollers.
*   **Tentacle 5 (Quantum API):** True quantum random number client using the Australian National University (ANU) QRNG API.
*   **Tentacle 6 (AI Server):** Model Context Protocol (MCP) server allowing LLM agents to use the ESN reservoir as encryption tools.

---

## 🔬 Mathematical Architecture

### 1. Spatiotemporal Input Mapping
Physical coordinates $(x, y) \in [0, \text{width}] \times [0, \text{height}]$ are mapped to a discretized $8 \times 8$ input grid:
$$U[t] \in \mathbb{R}^{64}$$
where $U_{row \times 8 + col}[t]$ represents the cumulative physical intensity mapped to cell $(row, col)$ at frame $t$.

### 2. Leaky-Integrate Echo State Update
The 128 reservoir neurons maintain a state vector $X[t] \in \mathbb{R}^{128}$ updated at each time step:
$$X[t] = (1 - \alpha) X[t-1] + \alpha \tanh(W_{in} U[t] + W_{res} X[t-1] + b)$$
where:
*   $\alpha = 0.25$ is the leaky integration rate.
*   $W_{in} \in \mathbb{R}^{128 \times 64}$ is the input projection matrix, randomly generated in $[-0.5, 0.5]$ using a seedable PRNG (SFC32).
*   $b \in \mathbb{R}^{128}$ is a deterministic bias vector.
*   $W_{res} \in \mathbb{R}^{128 \times 128}$ is the sparse recurrent connection matrix ($10\%$ density).

### 3. Spectral Radius Normalization (Power Iteration)
To ensure the **Echo State Property** (infinite fading memory without chaotic explosion or decay), the spectral radius $\rho(W_{res})$ must be strictly less than 1. VEL computes this dynamically using an online Power Iteration:
$$x_{k+1} = \frac{W_{res} x_k}{||W_{res} x_k||_2}$$
$$\lambda_{max} \approx |x_k^T W_{res} x_k|$$
$$W_{res} \leftarrow W_{res} \times \left(\frac{0.95}{\lambda_{max}}\right)$$

### 4. Cryptographic Key Focus
Every block of 32 bytes of plaintext is XORed with a hash focused from the 512-byte float representation of the current reservoir state buffer:
$$\text{KeyBlock}[t] = \text{SHA-256}(X[t].\text{buffer})$$
$$\text{CiphertextBlock}[t] = \text{PlaintextBlock}[t] \oplus \text{KeyBlock}[t]$$

### 5. Kottayil Triad (LHF) Integration
Based on the observations of Sajid Haneefa Kassim, physical waves exist in three irreducible positions: peak (Hope), node (Love), and trough (Fear). We map ESN states $X_i[t] \in [-1, 1]$ directly to this tri-axial framework:
*   **Hope (H) - Expansion ($X_i[t] > 0.15$):** Active, excited neurons represented in glowing Cyan.
*   **Love (L) - Information ($|X_i[t]| \le 0.15$):** Equilibrium neurons represented in Peacock Teal.
*   **Fear (F) - Boundary ($X_i[t] < -0.15$):** Bounded, inhibited neurons represented in glowing Purple.

The dashboard calculates the percentage ratios of H, L, and F in real-time, displaying the dynamic state distribution of the ESN.

---

## 🛠️ Verification & Dependent Types

To guarantee absolute type safety and cipher mathematical correctness, we integrated a formal specification written in the **Idris dependently typed programming language** (located in `idris/vel.idr`).

*   **Dimensional Verification:** Enforces that inputs $U$, state $X$, and matrices $W_{in}, W_{res}$ match dimensionally at compile time, eliminating index out-of-bound errors.
*   **Cipher Decryption Theorem:** Formally proves that decryption is the exact structural inverse of encryption:
    ```idris
    otpCorrect : (msg : Vect n Bits8) -> (key : Vect n Bits8) -> decryptOTP (encryptOTP msg key) key = msg
    ```

---

## 🚀 Step-by-Step Execution Guide

### 1. In the Browser (Web App)
Since the app is built on vanilla web standards, it has zero build steps:
1. Open [index.html](index.html) directly in Google Chrome, Microsoft Edge, or Firefox.
2. Select your **Harvesting Driver** (Simulation, Camera, Sensor, USB Serial, or Quantum API).
3. If using **USB Serial Driver**:
   * Flash the Arduino firmware located in [firmware/vel_sensor_node.ino](firmware/vel_sensor_node.ino) to your board.
   * Click **🔌 Link Serial Hardware**, select the COM port, and watch analog noise drive the ESN.
4. Type your message in the **Encryption Workstation**, click **🔱 Harvest & Encrypt**.
5. Move in front of the camera (if using Vision) during the 3-second countdown. A `.vel` keyfile will download and Hex ciphertext will generate.
6. To decrypt: paste the Hex ciphertext, upload the `.vel` keyfile, and click **🔓 Decrypt & Replay**. Watch the exact visual spatiotemporal synapse firing reconstruct the plaintext!

### 2. Node.js Verification Tests
To run automated unit tests:
```bash
node test/test.js
node test/test-modular.js
```

### 3. AI Agent Integration (MCP Server)
To start the Model Context Protocol (MCP) server for external LLM agents:
```bash
node mcp-server.js
```

---

## 🔒 Security Considerations
This project is an **educational exploration of reservoir computing and dynamic entropy ciphers**. While the underlying SHA-256 and One-Time Pad operations are cryptographically secure, custom chaotic protocols and recorded entropy coordinates are subject to side-channel analysis. Do not use this engine for production-level national security ciphers.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
