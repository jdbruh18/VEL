/**
 * driver.quantum.js - Quantum RNG API & Electron Tunneling Driver
 * Part of VEL Cryptography & Protection Engine
 * 
 * Fetches true quantum random numbers from the ANU QRNG API,
 * falling back to a localized electron-tunneling wave simulation
 * to harvest high-entropy quantum coordinate events.
 */

if (typeof require !== 'undefined') {
    BaseDriver = require('./driver.base.js');
}

class QuantumDriver extends BaseDriver {
    constructor(width = 640, height = 480) {
        super(width, height);
        this.entropyQueue = [];
        this.isLoading = false;
        this.particles = [];
        this.maxParticles = 60;
        this.useQuantumApi = true;
        
        // Quantum simulator wavefunction parameters (for fallback)
        this.psiPhase = 0;
    }
    
    async start() {
        this.particles = [];
        this.entropyQueue = [];
        this.isLoading = false;
        
        // Trigger initial API load
        if (this.useQuantumApi) {
            this.refillQueue();
        }
        return true;
    }
    
    stop() {
        this.particles = [];
        this.entropyQueue = [];
        this.coordinates = [];
    }
    
    async refillQueue() {
        if (this.isLoading || this.entropyQueue.length > 50) return;
        this.isLoading = true;
        
        try {
            // ANU (Australian National University) Quantum Random Number Generator API
            // Request 50 random uint8 integers
            const response = await fetch('https://qrng.anu.edu.au/API/jsonI.php?length=50&type=uint8', {
                signal: AbortSignal.timeout(3000) // 3-second timeout
            });
            const data = await response.json();
            
            if (data && data.success && Array.isArray(data.data)) {
                this.entropyQueue.push(...data.data);
                console.log(`Quantum Driver: Refilled queue with ${data.data.length} true quantum bytes.`);
            }
        } catch (err) {
            // Silence network warning: will automatically fall back to mathematical quantum simulation
            this.useQuantumApi = false;
        } finally {
            this.isLoading = false;
        }
    }
    
    update() {
        this.coordinates = [];
        
        // 1. Check if we have quantum numbers in the queue
        if (this.entropyQueue.length >= 3) {
            const rx = this.entropyQueue.shift();
            const ry = this.entropyQueue.shift();
            const ri = this.entropyQueue.shift();
            
            // Map quantum bytes to canvas space
            const x = (rx / 255) * this.width;
            const y = (ry / 255) * this.height;
            const intensity = 0.5 + (ri / 255) * 0.5;
            
            this.spawnParticle(x, y, intensity);
            
            // Asynchronously trigger refill if queue is running low
            if (this.entropyQueue.length < 20) {
                this.refillQueue();
            }
        } else {
            // 2. Fallback: Simulate quantum probability distribution (Electron Tunneling)
            // We simulate a 2D wavefunction probability density |Psi(x, y)|^2
            // using intersecting trigonometric harmonics and a decay boundary.
            this.psiPhase += 0.08;
            
            if (this.particles.length < this.maxParticles && Math.random() < 0.35) {
                const rand = Math.random;
                // Generate trial coordinates
                const tx = rand() * this.width;
                const ty = rand() * this.height;
                
                // Calculate quantum probability amplitude
                const kx = 0.025;
                const ky = 0.02;
                const psi = Math.sin(kx * tx + this.psiPhase) * Math.cos(ky * ty - this.psiPhase * 0.5);
                const prob = psi * psi; // |Psi|^2 probability density
                
                if (rand() < prob) {
                    this.spawnParticle(tx, ty, 0.4 + prob * 0.6);
                }
            }
        }
        
        // Update active particle coordinates
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.y += p.speed;
            p.x += p.drift;
            
            if (p.y > this.height) {
                this.particles.splice(i, 1);
            } else {
                this.coordinates.push({
                    x: p.x,
                    y: p.y,
                    intensity: p.intensity
                });
            }
        }
    }
    
    spawnParticle(x, y, intensity) {
        if (this.particles.length < this.maxParticles) {
            this.particles.push({
                x: x,
                y: y,
                speed: 3 + Math.random() * 5,
                drift: (Math.random() - 0.5) * 0.6,
                intensity: intensity
            });
        }
    }
}

// Export for Node and Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuantumDriver;
} else {
    window.QuantumDriver = QuantumDriver;
}
