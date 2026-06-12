/**
 * driver.serial.js - USB Serial (Arduino/Raspberry Pi) Entropy Driver
 * Part of VEL Cryptography & Protection Engine
 * 
 * Interfaces with external USB microcontrollers via the browser Web Serial API.
 * Reads coordinates or raw sensor metrics, translating them into spatiotemporal inputs.
 */

if (typeof require !== 'undefined') {
    BaseDriver = require('./driver.base.js');
}

class SerialDriver extends BaseDriver {
    constructor(width = 640, height = 480) {
        super(width, height);
        this.port = null;
        this.reader = null;
        this.keepReading = false;
        this.incomingBuffer = "";
        
        this.particles = [];
        this.maxParticles = 60;
        
        // Chaotic Map registers (seeds coordinate generation if serial only sends single readings)
        this.chaosX = 0.523;
        this.chaosY = 0.289;
    }
    
    async start() {
        if (!navigator.serial) {
            throw new Error("Web Serial API is not supported in this browser. Use Chrome, Edge, or Opera.");
        }
        
        try {
            // Prompt user to select a serial port
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: 9600 });
            
            this.keepReading = true;
            this.particles = [];
            this.readLoop();
            
            console.log("Web Serial connected successfully.");
            return true;
        } catch (err) {
            console.error("Web Serial connection failed.", err);
            this.stop();
            throw err;
        }
    }
    
    stop() {
        this.keepReading = false;
        if (this.reader) {
            this.reader.cancel().catch(() => {});
            this.reader = null;
        }
        if (this.port) {
            this.port.close().catch(() => {});
            this.port = null;
        }
        this.particles = [];
        this.coordinates = [];
    }
    
    async readLoop() {
        while (this.port && this.port.readable && this.keepReading) {
            try {
                this.reader = this.port.readable.getReader();
                const decoder = new TextDecoder();
                
                while (this.keepReading) {
                    const { value, done } = await this.reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    this.incomingBuffer += chunk;
                    this.processBuffer();
                }
            } catch (err) {
                console.error("Error reading serial data stream.", err);
                break;
            } finally {
                if (this.reader) {
                    this.reader.releaseLock();
                    this.reader = null;
                }
            }
        }
    }
    
    processBuffer() {
        // Split buffer by newlines
        const lines = this.incomingBuffer.split(/\r?\n/);
        // Save the last incomplete line back to the buffer
        this.incomingBuffer = lines.pop();
        
        lines.forEach(line => {
            const data = line.trim();
            if (!data) return;
            
            // Parse CSV format: e.g. "x,y"
            const parts = data.split(',');
            if (parts.length >= 2) {
                const px = parseFloat(parts[0]);
                const py = parseFloat(parts[1]);
                if (!isNaN(px) && !isNaN(py)) {
                    // Spawn particle at matching coordinates
                    this.spawnParticle(
                        Math.max(0, Math.min(px, this.width)),
                        Math.max(0, Math.min(py, this.height)),
                        1.0
                    );
                }
            } else {
                // Parse single sensor value (e.g. ultrasonic distance or thermistor reading)
                const val = parseFloat(data);
                if (!isNaN(val)) {
                    // Feed value into a chaotic Logistic Map to generate coordinates
                    // Equation: x_{k+1} = r * x_k * (1 - x_k)
                    const r = 3.99 + (Math.sin(val) * 0.009); // Chaotic parameter close to 4.0
                    this.chaosX = r * this.chaosX * (1 - this.chaosX);
                    this.chaosY = r * this.chaosY * (1 - this.chaosY);
                    
                    this.spawnParticle(
                        this.chaosX * this.width,
                        this.chaosY * this.height,
                        0.8
                    );
                }
            }
        });
    }
    
    spawnParticle(x, y, intensity) {
        if (this.particles.length < this.maxParticles) {
            this.particles.push({
                x: x,
                y: y,
                speed: 3 + Math.random() * 4,
                drift: (Math.random() - 0.5) * 0.5,
                intensity: intensity
            });
        }
    }
    
    update() {
        this.coordinates = [];
        
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
    module.exports = SerialDriver;
} else {
    window.SerialDriver = SerialDriver;
}
