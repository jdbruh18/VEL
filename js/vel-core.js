/**
 * vel-core.js - VEL Framework Coordinator
 * Part of VEL Cryptography & Protection Engine
 * 
 * Orchestrates pluggable entropy drivers, controls harvesting and replay lifecycles,
 * feeds processed coordinate states into the LSM, and handles keyfile compilation.
 */

class VelCore {
    constructor(reservoirInstance) {
        this.reservoir = reservoirInstance;
        this.drivers = {};
        this.activeDriver = null;
        
        // Recording states
        this.isHarvesting = false;
        this.recordedFrames = [];
        this.frameIndex = 0;
        
        // Playback/Replay states
        this.isReplaying = false;
        this.replayFrames = [];
        this.replayIndex = 0;
    }
    
    registerDriver(name, driverInstance) {
        this.drivers[name] = driverInstance;
    }
    
    async setDriver(name) {
        if (!this.drivers[name]) {
            throw new Error(`Driver "${name}" is not registered.`);
        }
        
        // Stop current driver
        if (this.activeDriver) {
            this.activeDriver.stop();
        }
        
        // Switch and start new driver
        this.activeDriver = this.drivers[name];
        await this.activeDriver.start();
        return this.activeDriver;
    }
    
    startHarvesting() {
        this.isHarvesting = true;
        this.recordedFrames = [];
        this.frameIndex = 0;
    }
    
    stopHarvesting() {
        this.isHarvesting = false;
        return this.recordedFrames;
    }
    
    setReplayData(recordedFrames) {
        this.isReplaying = true;
        this.replayFrames = recordedFrames;
        this.replayIndex = 0;
        
        // Disable current driver updates
        if (this.activeDriver) {
            this.activeDriver.stop();
        }
    }
    
    stopReplaying() {
        this.isReplaying = false;
        this.replayFrames = [];
        this.replayIndex = 0;
        
        // Restart current driver
        if (this.activeDriver) {
            this.activeDriver.start();
        }
    }
    
    update() {
        let coords = [];
        let gridInputs = new Float32Array(64);
        
        if (this.isReplaying) {
            // Replay Mode: Playback logged frames
            if (this.replayFrames.length > 0) {
                const frameData = this.replayFrames[this.replayIndex];
                if (frameData && frameData.p) {
                    coords = frameData.p.map(c => ({
                        x: c[0],
                        y: c[1],
                        intensity: c[2]
                    }));
                }
                
                this.replayIndex = (this.replayIndex + 1) % this.replayFrames.length;
            }
        } else if (this.activeDriver) {
            // Live Mode: Run the active pluggable driver
            this.activeDriver.update();
            coords = this.activeDriver.getCoordinates();
        }
        
        // Map coordinates to grid inputs
        if (coords.length > 0) {
            const width = this.activeDriver ? this.activeDriver.width : 640;
            const height = this.activeDriver ? this.activeDriver.height : 480;
            
            coords.forEach(p => {
                const col = Math.floor((p.x / width) * 8);
                const row = Math.floor((p.y / height) * 8);
                
                if (col >= 0 && col < 8 && row >= 0 && row < 8) {
                    gridInputs[row * 8 + col] += p.intensity || 1.0;
                    if (gridInputs[row * 8 + col] > 1.0) {
                        gridInputs[row * 8 + col] = 1.0;
                    }
                }
            });
        }
        
        // Feed inputs into LSM neural reservoir
        this.reservoir.update(gridInputs);
        
        // Log coordinates if harvesting
        if (this.isHarvesting && !this.isReplaying) {
            const frameCoords = coords.map(p => [
                parseFloat(p.x.toFixed(3)),
                parseFloat(p.y.toFixed(3)),
                parseFloat((p.intensity || 1.0).toFixed(2))
            ]);
            
            this.recordedFrames.push({
                f: this.frameIndex++,
                p: frameCoords
            });
        }
        
        return {
            coords,
            gridInputs
        };
    }
}

// Export for Node and Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VelCore;
} else {
    window.VelCore = VelCore;
}
