/**
 * mcp-server.js - Model Context Protocol (MCP) Server wrapper
 * Part of VEL Cryptography & Protection Engine
 * 
 * Exposes VEL Cryptography as an MCP Server over stdin/stdout.
 * Enables AI agents to run localized encryption/decryption tasks using the ESN.
 */

const readline = require('readline');
const { NeuralReservoir } = require('./js/lsm.js');
const { encryptVEL, decryptVEL } = require('./js/crypto.js');

// Create console interface listening on stdin/stdout
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

// Write JSON-RPC response to stdout
function sendResponse(id, result, error = null) {
    const response = {
        jsonrpc: "2.0",
        id: id
    };
    if (error) {
        response.error = error;
    } else {
        response.result = result;
    }
    process.stdout.write(JSON.stringify(response) + "\n");
}

// Write JSON-RPC notification to stdout
function sendNotification(method, params) {
    const notification = {
        jsonrpc: "2.0",
        method: method,
        params: params
    };
    process.stdout.write(JSON.stringify(notification) + "\n");
}

rl.on('line', (line) => {
    try {
        const request = JSON.parse(line.trim());
        if (request.jsonrpc !== "2.0") return;
        
        handleRequest(request);
    } catch (err) {
        sendResponse(null, null, {
            code: -32700,
            message: "Parse error: " + err.message
        });
    }
});

function handleRequest(req) {
    const { id, method, params } = req;
    
    switch (method) {
        case 'initialize':
            sendResponse(id, {
                protocolVersion: "2024-11-05",
                capabilities: {
                    tools: {}
                },
                serverInfo: {
                    name: "vel-cryptography-server",
                    version: "1.0.0"
                }
            });
            break;
            
        case 'notifications/initialized':
            // Client acknowledgment, no response needed
            break;
            
        case 'tools/list':
            sendResponse(id, {
                tools: [
                    {
                        name: "vel_encrypt",
                        description: "Encrypts plaintext using the VEL Echo State Network (ESN) reservoir and spatiotemporal coordinates.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                plaintext: { type: "string", description: "The message to encrypt" },
                                seed: { type: "string", description: "Initial reservoir seed string" },
                                recordedFrames: { 
                                    type: "array", 
                                    description: "Frame-by-frame coordinate log array representing physical entropy: [{f: frameIndex, p: [[x,y,intensity],...]}]" 
                                }
                            },
                            required: ["plaintext", "seed", "recordedFrames"]
                        }
                    },
                    {
                        name: "vel_decrypt",
                        description: "Decrypts hex ciphertext using the VEL ESN reservoir by replaying spatiotemporal coordinates.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                ciphertextHex: { type: "string", description: "The hexadecimal ciphertext to decrypt" },
                                seed: { type: "string", description: "Initial reservoir seed string matching the encryption seed" },
                                recordedFrames: { 
                                    type: "array", 
                                    description: "The identical spatiotemporal keyfile coordinate timeline used for encryption" 
                                }
                            },
                            required: ["ciphertextHex", "seed", "recordedFrames"]
                        }
                    }
                ]
            });
            break;
            
        case 'tools/call':
            handleToolCall(id, params);
            break;
            
        default:
            sendResponse(id, null, {
                code: -32601,
                message: `Method not found: ${method}`
            });
    }
}

function handleToolCall(id, params) {
    const { name, arguments: args } = params;
    
    if (!args) {
        return sendResponse(id, null, {
            code: -32602,
            message: "Missing arguments object."
        });
    }
    
    try {
        if (name === 'vel_encrypt') {
            const { plaintext, seed, recordedFrames } = args;
            
            if (!plaintext || !seed || !Array.isArray(recordedFrames)) {
                throw new Error("Missing required arguments: 'plaintext', 'seed', or 'recordedFrames' array.");
            }
            
            // Create virtual reservoir and encrypt
            const reservoir = new NeuralReservoir(128, 64, seed);
            const ciphertextHex = encryptVEL(plaintext, reservoir, recordedFrames);
            
            sendResponse(id, {
                content: [
                    {
                        type: "text",
                        text: ciphertextHex
                    }
                ]
            });
        } else if (name === 'vel_decrypt') {
            const { ciphertextHex, seed, recordedFrames } = args;
            
            if (!ciphertextHex || !seed || !Array.isArray(recordedFrames)) {
                throw new Error("Missing required arguments: 'ciphertextHex', 'seed', or 'recordedFrames' array.");
            }
            
            // Create virtual reservoir and decrypt
            const reservoir = new NeuralReservoir(128, 64, seed);
            const decryptedPlaintext = decryptVEL(ciphertextHex, reservoir, recordedFrames);
            
            sendResponse(id, {
                content: [
                    {
                        type: "text",
                        text: decryptedPlaintext
                    }
                ]
            });
        } else {
            sendResponse(id, null, {
                code: -32601,
                message: `Unknown tool name: ${name}`
            });
        }
    } catch (err) {
        sendResponse(id, null, {
            code: -32000,
            message: err.message
        });
    }
}
