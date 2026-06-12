/**
 * crypto.js - The Sharp Tip (Point) Cryptographic Engine
 * Part of VEL Cryptography & Protection Engine
 * 
 * Implements a pure JS SHA-256 hashing algorithm, XOR One-Time Pad
 * block encryption/decryption, and coordinate-frame packaging helpers.
 */

// Pure JavaScript SHA-256 for byte arrays
function sha256(bytes) {
    const K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    let H = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];

    const l = bytes.length;
    const bitLen = l * 8;
    const padLen = ((l + 8) >> 6) + 1;
    const words = new Int32Array(padLen << 4);

    for (let i = 0; i < l; i++) {
        words[i >> 2] |= bytes[i] << (24 - (i & 3) * 8);
    }
    words[l >> 2] |= 0x80 << (24 - (l & 3) * 8);
    
    // Store bit length as 64-bit integer
    words[words.length - 1] = bitLen;

    const S = (x, n) => (x >>> n) | (x << (32 - n));
    const R = (x, n) => x >>> n;

    const Ch = (x, y, z) => (x & y) ^ (~x & z);
    const Maj = (x, y, z) => (x & y) ^ (x & z) ^ (y & z);
    const Sigma0 = x => S(x, 2) ^ S(x, 13) ^ S(x, 22);
    const Sigma1 = x => S(x, 6) ^ S(x, 11) ^ S(x, 25);
    const gamma0 = x => S(x, 7) ^ S(x, 18) ^ R(x, 3);
    const gamma1 = x => S(x, 17) ^ S(x, 19) ^ R(x, 10);

    const W = new Int32Array(64);

    for (let chunk = 0; chunk < words.length; chunk += 16) {
        let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];

        for (let t = 0; t < 64; t++) {
            if (t < 16) {
                W[t] = words[chunk + t];
            } else {
                W[t] = (gamma1(W[t - 2]) + W[t - 7] + gamma0(W[t - 15]) + W[t - 16]) | 0;
            }

            let T1 = (h + Sigma1(e) + Ch(e, f, g) + K[t] + W[t]) | 0;
            let T2 = (Sigma0(a) + Maj(a, b, c)) | 0;

            h = g;
            g = f;
            f = e;
            e = (d + T1) | 0;
            d = c;
            c = b;
            b = a;
            a = (T1 + T2) | 0;
        }

        H[0] = (H[0] + a) | 0;
        H[1] = (H[1] + b) | 0;
        H[2] = (H[2] + c) | 0;
        H[3] = (H[3] + d) | 0;
        H[4] = (H[4] + e) | 0;
        H[5] = (H[5] + f) | 0;
        H[6] = (H[6] + g) | 0;
        H[7] = (H[7] + h) | 0;
    }

    const result = new Uint8Array(32);
    for (let i = 0; i < 8; i++) {
        result[i * 4] = (H[i] >>> 24) & 0xff;
        result[i * 4 + 1] = (H[i] >>> 16) & 0xff;
        result[i * 4 + 2] = (H[i] >>> 8) & 0xff;
        result[i * 4 + 3] = H[i] & 0xff;
    }
    return result;
}

// Helper: Convert string to UTF-8 Uint8Array
function stringToBytes(str) {
    if (typeof TextEncoder !== 'undefined') {
        return new TextEncoder().encode(str);
    }
    // Fallback for environment lacking TextEncoder (Node legacy)
    const utf8 = unescape(encodeURIComponent(str));
    const arr = new Uint8Array(utf8.length);
    for (let i = 0; i < utf8.length; i++) {
        arr[i] = utf8.charCodeAt(i);
    }
    return arr;
}

// Helper: Convert UTF-8 Uint8Array to string
function bytesToString(bytes) {
    if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder().decode(bytes);
    }
    // Fallback
    let str = '';
    for (let i = 0; i < bytes.length; i++) {
        str += String.fromCharCode(bytes[i]);
    }
    return decodeURIComponent(escape(str));
}

// Helper: Convert byte array to Hex string
function bytesToHex(bytes) {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Helper: Convert Hex string to byte array
function hexToBytes(hex) {
    hex = hex.replace(/[^0-9a-fA-F]/g, '');
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

/**
 * Encrypts a plaintext string using the LSM neural states perturbed by a coordinate log.
 * Processes data in 32-byte blocks.
 */
function encryptVEL(plaintext, reservoir, recordedFrames, width = 640, height = 480) {
    if (recordedFrames.length === 0) {
        throw new Error("No harvested entropy frames available. Record camera activity first.");
    }
    
    const plainBytes = stringToBytes(plaintext);
    const cipherBytes = new Uint8Array(plainBytes.length);
    
    reservoir.reset();
    
    let frameIdx = 0;
    const numInputs = reservoir.numInputs; // 64
    const gridInputs = new Float32Array(numInputs);
    
    // Process in blocks of 32 bytes (256 bits)
    for (let blockStart = 0; blockStart < plainBytes.length; blockStart += 32) {
        // Step 1: Map the recorded frame coordinates to reservoir input
        gridInputs.fill(0);
        const frameData = recordedFrames[frameIdx];
        if (frameData && frameData.p) {
            frameData.p.forEach(coords => {
                const px = coords[0];
                const py = coords[1];
                const col = Math.floor((px / width) * 8);
                const row = Math.floor((py / height) * 8);
                if (col >= 0 && col < 8 && row >= 0 && row < 8) {
                    gridInputs[row * 8 + col] = 1.0;
                }
            });
        }
        
        // Loop frame indexing if plaintext exceeds recorded duration
        frameIdx = (frameIdx + 1) % recordedFrames.length;
        
        // Step 2: Feed inputs into LSM and update states
        reservoir.update(gridInputs);
        
        // Step 3: Hash current LSM states to get a 32-byte key block
        const stateBuffer = reservoir.getStateBuffer();
        const keyBlock = sha256(stateBuffer);
        
        // Step 4: XOR encrypt up to 32 bytes of plaintext
        const blockSize = Math.min(32, plainBytes.length - blockStart);
        for (let i = 0; i < blockSize; i++) {
            cipherBytes[blockStart + i] = plainBytes[blockStart + i] ^ keyBlock[i];
        }
    }
    
    return bytesToHex(cipherBytes);
}

/**
 * Decrypts a hex ciphertext using the LSM and replayed coordinate log.
 * Reconstructs identical neural states by feeding matching inputs.
 */
function decryptVEL(ciphertextHex, reservoir, recordedFrames, width = 640, height = 480) {
    if (recordedFrames.length === 0) {
        throw new Error("No .vel keyfile frames loaded for decryption.");
    }
    
    const cipherBytes = hexToBytes(ciphertextHex);
    const plainBytes = new Uint8Array(cipherBytes.length);
    
    reservoir.reset();
    
    let frameIdx = 0;
    const numInputs = reservoir.numInputs;
    const gridInputs = new Float32Array(numInputs);
    
    // Process in blocks of 32 bytes
    for (let blockStart = 0; blockStart < cipherBytes.length; blockStart += 32) {
        // Step 1: Map the replayed frame coordinates to reservoir input
        gridInputs.fill(0);
        const frameData = recordedFrames[frameIdx];
        if (frameData && frameData.p) {
            frameData.p.forEach(coords => {
                const px = coords[0];
                const py = coords[1];
                const col = Math.floor((px / width) * 8);
                const row = Math.floor((py / height) * 8);
                if (col >= 0 && col < 8 && row >= 0 && row < 8) {
                    gridInputs[row * 8 + col] = 1.0;
                }
            });
        }
        
        frameIdx = (frameIdx + 1) % recordedFrames.length;
        
        // Step 2: Feed inputs into LSM and update states
        reservoir.update(gridInputs);
        
        // Step 3: Hash current LSM states to get the identical 32-byte key block
        const stateBuffer = reservoir.getStateBuffer();
        const keyBlock = sha256(stateBuffer);
        
        // Step 4: XOR decrypt up to 32 bytes of ciphertext
        const blockSize = Math.min(32, cipherBytes.length - blockStart);
        for (let i = 0; i < blockSize; i++) {
            plainBytes[blockStart + i] = cipherBytes[blockStart + i] ^ keyBlock[i];
        }
    }
    
    return bytesToString(plainBytes);
}

/**
 * Compiles recording data and reservoir configs into a .vel keyfile object
 */
function packageKeyfile(recordedFrames, seed, reservoirSize = 128) {
    return {
        projectName: "VEL",
        version: "1.0",
        seed: seed,
        neuralReservoirSize: reservoirSize,
        frameCount: recordedFrames.length,
        recordedFrames: recordedFrames,
        timestamp: new Date().toISOString()
    };
}

// Export for Node and Browser
const exportsObject = {
    sha256,
    stringToBytes,
    bytesToString,
    bytesToHex,
    hexToBytes,
    encryptVEL,
    decryptVEL,
    packageKeyfile
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObject;
} else {
    Object.keys(exportsObject).forEach(key => {
        window[key] = exportsObject[key];
    });
}
