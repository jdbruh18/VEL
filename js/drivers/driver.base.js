/**
 * driver.base.js - Abstract Base Driver for Pluggable Entropy Sources
 * Part of VEL Cryptography & Protection Engine
 * 
 * Defines the standard lifecycle and grid mapping methods for all drivers.
 */

class BaseDriver {
    constructor(width = 640, height = 480) {
        this.width = width;
        this.height = height;
        this.coordinates = []; // Expected format: [{ x, y, intensity }]
    }
    
    /**
     * Initializes the driver (e.g. opens camera stream, serial port, etc.)
     * Returns a Promise resolving to a boolean indicating success.
     */
    async start() {
        throw new Error("start() method must be implemented by subclass.");
    }
    
    /**
     * Stops the driver, releasing any hardware resources.
     */
    stop() {
        throw new Error("stop() method must be implemented by subclass.");
    }
    
    /**
     * Updates the driver's internal state (typically called on requestAnimationFrame).
     */
    update() {
        throw new Error("update() method must be implemented by subclass.");
    }
    
    /**
     * Returns the current coordinate events.
     */
    getCoordinates() {
        return this.coordinates;
    }
    
    /**
     * Maps current coordinate events to an 8x8 normalized input grid (64 elements)
     * representing the reservoir's spatiotemporal input space.
     */
    getGridInputs() {
        const grid = new Float32Array(64);
        const coords = this.getCoordinates();
        
        coords.forEach(p => {
            const col = Math.floor((p.x / this.width) * 8);
            const row = Math.floor((p.y / this.height) * 8);
            
            if (col >= 0 && col < 8 && row >= 0 && row < 8) {
                grid[row * 8 + col] += p.intensity || 1.0;
                if (grid[row * 8 + col] > 1.0) {
                    grid[row * 8 + col] = 1.0;
                }
            }
        });
        
        return grid;
    }
}

// Export for Node and Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseDriver;
} else {
    window.BaseDriver = BaseDriver;
}
