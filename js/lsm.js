/**
 * LSM.js - The Broad Top (Spearhead) Neural Reservoir Engine
 * Part of VEL Cryptography & Protection Engine
 * 
 * Implements a deterministic, seedable Liquid State Machine (LSM)
 * using an Echo State Network (ESN) architecture.
 */

// Seedable PRNG (SFC32 Algorithm)
function createPRNG(seedString) {
    let h1 = 1779033703, h2 = 3024733165, h3 = 3362453663, h4 = 50249339;
    for (let i = 0; i < seedString.length; i++) {
        let k = seedString.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    
    // sfc32 generator
    return function() {
        h1 >>>= 0; h2 >>>= 0; h3 >>>= 0; h4 >>>= 0;
        let t = (h1 + h2) | 0;
        h1 = h2 ^ (h2 >>> 9);
        h2 = (h3 + (h3 << 3)) | 0;
        h3 = (h3 << 21) | (h3 >>> 11);
        h4 = (h4 + 1) | 0;
        t = (t + h4) | 0;
        h3 = (h3 + t) | 0;
        return (t >>> 0) / 4294967296;
    };
}

class NeuralReservoir {
    constructor(numNeurons = 128, numInputs = 64, seed = "cfe14fe4f35ea43568731e3f59348b8b144878d18dc68e7860613d81a236d02f") {
        this.numNeurons = numNeurons;
        this.numInputs = numInputs;
        this.seed = seed;
        this.alpha = 0.25; // Leaking rate
        
        this.states = new Float32Array(numNeurons);
        this.prevStates = new Float32Array(numNeurons);
        this.bias = new Float32Array(numNeurons);
        
        this.W_in = [];  // Input weight matrix: [numNeurons][numInputs]
        this.W_res = []; // Recurrent weight matrix: [numNeurons][numNeurons]
        
        this.initializeMatrices();
    }
    
    initializeMatrices() {
        const rand = createPRNG(this.seed);
        
        // 1. Initialize input weights W_in (values in [-0.5, 0.5])
        this.W_in = Array.from({ length: this.numNeurons }, () => 
            Float32Array.from({ length: this.numInputs }, () => (rand() - 0.5))
        );
        
        // 2. Initialize bias vector (values in [-0.01, 0.01])
        this.bias = Float32Array.from({ length: this.numNeurons }, () => (rand() - 0.5) * 0.02);
        
        // 3. Initialize sparse recurrent weights W_res
        // Connectivity density: ~10%
        const density = 0.1;
        this.W_res = Array.from({ length: this.numNeurons }, () => new Float32Array(this.numNeurons));
        
        for (let i = 0; i < this.numNeurons; i++) {
            for (let j = 0; j < this.numNeurons; j++) {
                if (rand() < density) {
                    this.W_res[i][j] = (rand() - 0.5) * 2.0; // [-1.0, 1.0]
                }
            }
        }
        
        // 4. Scale W_res to ensure Echo State Property (Spectral Radius < 1.0)
        this.scaleSpectralRadius(0.95);
    }
    
    scaleSpectralRadius(targetRadius) {
        // Power iteration to find the spectral radius (approximate largest eigenvalue magnitude)
        let x = new Array(this.numNeurons).fill(0).map(() => Math.random() - 0.5);
        const l2Norm = vec => Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
        
        let norm = l2Norm(x);
        if (norm === 0) return;
        x = x.map(v => v / norm);
        
        let lastEigenvalue = 0;
        const maxIterations = 25;
        
        for (let iter = 0; iter < maxIterations; iter++) {
            let y = new Array(this.numNeurons).fill(0);
            for (let i = 0; i < this.numNeurons; i++) {
                for (let j = 0; j < this.numNeurons; j++) {
                    y[i] += this.W_res[i][j] * x[j];
                }
            }
            
            let yNorm = l2Norm(y);
            if (yNorm === 0) break;
            
            // Rayleigh quotient approximation
            let dotProduct = 0;
            for (let i = 0; i < this.numNeurons; i++) {
                dotProduct += y[i] * x[i];
            }
            lastEigenvalue = dotProduct;
            
            x = y.map(v => v / yNorm);
        }
        
        const currentRadius = Math.abs(lastEigenvalue);
        
        if (currentRadius > 0) {
            const scalingFactor = targetRadius / currentRadius;
            for (let i = 0; i < this.numNeurons; i++) {
                for (let j = 0; j < this.numNeurons; j++) {
                    this.W_res[i][j] *= scalingFactor;
                }
            }
        }
    }
    
    reset() {
        this.states.fill(0);
        this.prevStates.fill(0);
    }
    
    update(inputs) {
        // Save current states as previous
        this.prevStates.set(this.states);
        
        for (let i = 0; i < this.numNeurons; i++) {
            // Compute input sum
            let inputSum = 0;
            for (let j = 0; j < this.numInputs; j++) {
                inputSum += this.W_in[i][j] * inputs[j];
            }
            
            // Compute recurrent sum
            let recurrentSum = 0;
            for (let j = 0; j < this.numNeurons; j++) {
                recurrentSum += this.W_res[i][j] * this.prevStates[j];
            }
            
            // Leaky integrate-and-fire tanh state update
            const totalExcitation = inputSum + recurrentSum + this.bias[i];
            this.states[i] = (1 - this.alpha) * this.prevStates[i] + this.alpha * Math.tanh(totalExcitation);
        }
        
        return this.states;
    }
    
    getStateBuffer() {
        // Return states as a byte array representation of Float32s (128 floats * 4 bytes = 512 bytes)
        return new Uint8Array(this.states.buffer);
    }
}

// Export for Node.js and Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NeuralReservoir, createPRNG };
} else {
    window.NeuralReservoir = NeuralReservoir;
    window.createPRNG = createPRNG;
}
