/**
 * vel_sensor_node.ino - Microcontroller Firmware for VEL Entropy Node
 * Target Hardware: Arduino, Raspberry Pi Pico, or BigTreeTech Octopus (STM32)
 * 
 * Reads analog sensor noise (floating pins, temperature, or ultrasonic distances),
 * runs a localized chaotic attractor, and streams the outputs over USB Serial
 * to seed the VEL Pluggable Serial Driver.
 */

// Define analog input pins to harvest environmental noise
#define NOISE_PIN_1 A0
#define NOISE_PIN_2 A1

// Chaotic Tent Map parameters for local hardware entropy expansion
// Equation: x_{n+1} = 1.99 * min(x_n, 1.0 - x_n)
double chaosX = 0.1523;
double chaosY = 0.7289;

void setup() {
  // Initialize USB Serial communication at 9600 baud rate
  Serial.begin(9600);
  
  // Seed the chaotic registers with initial analog white noise
  pinMode(NOISE_PIN_1, INPUT);
  pinMode(NOISE_PIN_2, INPUT);
  
  int seed1 = analogRead(NOISE_PIN_1);
  int seed2 = analogRead(NOISE_PIN_2);
  
  chaosX = (double)(seed1 + 1) / 1024.0;
  chaosY = (double)(seed2 + 1) / 1024.0;
}

void loop() {
  // 1. Read raw sensor values
  int val1 = analogRead(NOISE_PIN_1);
  int val2 = analogRead(NOISE_PIN_2);
  
  // 2. Iterate the chaotic Tent Map perturbed by the raw sensor readings
  // This amplifies minor environmental thermal fluctuations into macroscopic chaos.
  double perturb1 = (double)val1 / 1023.0;
  double perturb2 = (double)val2 / 1023.0;
  
  chaosX = 1.99 * min(chaosX, 1.0 - chaosX) + (perturb1 * 0.001);
  chaosY = 1.99 * min(chaosY, 1.0 - chaosY) + (perturb2 * 0.001);
  
  // Clip bounds to prevent escaping [0, 1]
  if (chaosX >= 1.0 || chaosX <= 0.0) chaosX = 0.1523;
  if (chaosY >= 1.0 || chaosY <= 0.0) chaosY = 0.7289;
  
  // 3. Map values to visual coordinate frame bounds (640x480 resolution)
  int coordX = (int)(chaosX * 640.0);
  int coordY = (int)(chaosY * 480.0);
  
  // 4. Output the coordinate stream over Serial in CSV format
  // The VEL Web Serial Driver will parse this stream frame-by-frame.
  Serial.print(coordX);
  Serial.print(",");
  Serial.println(coordY);
  
  // Delay to maintain ~30 Hz frame rate, matching video processing speed
  delay(33);
}

// Helper math min function
double min(double a, double b) {
  return (a < b) ? a : b;
}
