/**
 * driver.sim.js - Mathematical Simulation Entropy Driver
 * Part of VEL Cryptography & Protection Engine
 * 
 * Simulates a continuous physical rainfall particle system.
 */

if (typeof require !== 'undefined') {
    BaseDriver = require('./driver.base.js');
}

class SimulationDriver extends BaseDriver {
    constructor(width = 640, height = 480) {
        super(width, height);
        this.particles = [];
        this.maxParticles = 60;
    }
    
    async start() {
        this.particles = [];
        return true; // Always succeeds
    }
    
    stop() {
        this.particles = [];
        this.coordinates = [];
    }
    
    update() {
        this.coordinates = [];
        
        // Spawn raindrops
        if (this.particles.length < this.maxParticles && Math.random() < 0.3) {
            this.particles.push({
                x: Math.random() * this.width,
                y: 0,
                speed: 3.5 + Math.random() * 5.5,
                drift: (Math.random() - 0.5) * 0.7,
                intensity: 0.6 + Math.random() * 0.4
            });
        }
        
        // Update physics
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
}

// Export for Node and Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimulationDriver;
} else {
    window.SimulationDriver = SimulationDriver;
}
