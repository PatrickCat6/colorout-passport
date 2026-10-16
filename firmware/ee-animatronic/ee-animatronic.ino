/*
 * EE Animatronic — NEEoColorphism Voxel Character
 * ESP32-S3 + PCA9685 + TB6612FNG + HC-SR04
 *
 * Translates Three.js gallery animations (walk, wave, crouch, whir)
 * into physical servo movements at 1:2 scale (56cm).
 *
 * Patrick Cat / Mixi Art Studio 2026
 *
 * Hardware:
 *   - ESP32-S3 DevKitC
 *   - PCA9685 16-ch PWM driver (I2C addr 0x40)
 *   - 6× MG996R servos (head, 2× shoulder, waist, 2× hip)
 *   - 5× SG90 micro servos (ankles + spare)
 *   - 2× TB6612FNG motor drivers (3× N20 30RPM motors)
 *   - 5× HC-SR04 ultrasonic sensors
 *   - 1000µF capacitor on servo power rail
 *   - 6V 5A power supply for servos/motors
 *
 * Comms:
 *   - WiFi + OSC for TouchDesigner control
 *   - Serial for debug / direct commands
 */

#include <Wire.h>
#include <WiFi.h>
#include <WiFiUdp.h>

// ══════════════════════════════════════════════
// ── CONFIG ──
// ══════════════════════════════════════════════

// WiFi — set your network
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASS";

// OSC
const unsigned int OSC_PORT = 9000;
WiFiUDP udp;

// I2C pins (ESP32-S3 defaults)
#define SDA_PIN 8
#define SCL_PIN 9

// PCA9685
#define PCA9685_ADDR  0x40
#define PCA9685_FREQ  50       // 50Hz for servos (20ms period)

// ══════════════════════════════════════════════
// ── SERVO CHANNEL MAP ──
// ══════════════════════════════════════════════
// Maps physical joints to PCA9685 channels.
// Three.js character has these animated axes:
//   head:      rotation.x (nod)
//   torso:     rotation.x (lean forward/back)
//   leftArm:   rotation.x (swing forward/back)
//   rightArm:  rotation.x (swing forward/back)
//   leftLeg:   rotation.x (swing forward/back)
//   rightLeg:  rotation.x (swing forward/back)
//   leftWing:  rotation.y (flutter open/close)
//   rightWing: rotation.y (flutter open/close)

enum ServoChannel {
  CH_HEAD        = 0,   // MG996R — nod up/down
  CH_LEFT_ARM    = 1,   // MG996R — shoulder swing
  CH_RIGHT_ARM   = 2,   // MG996R — shoulder swing
  CH_WAIST       = 3,   // MG996R — torso lean
  CH_LEFT_HIP    = 4,   // MG996R — hip swing
  CH_RIGHT_HIP   = 5,   // MG996R — hip swing
  CH_LEFT_WING   = 6,   // SG90  — wing flutter
  CH_RIGHT_WING  = 7,   // SG90  — wing flutter
  CH_LEFT_ANKLE  = 8,   // SG90  — foot compensation
  CH_RIGHT_ANKLE = 9,   // SG90  — foot compensation
  NUM_SERVOS     = 10
};

// Servo calibration: [center_us, min_us, max_us, max_angle_deg]
// MG996R: ~500-2500µs, 180° range
// SG90:   ~500-2400µs, 180° range
// Center = physical 90° (neutral pose)
struct ServoConfig {
  uint16_t centerUs;   // microseconds at neutral
  uint16_t minUs;      // microseconds at min angle
  uint16_t maxUs;      // microseconds at max angle
  float    maxAngle;   // degrees from center (symmetric ±)
  bool     inverted;   // flip direction
};

ServoConfig servoConfigs[NUM_SERVOS] = {
  // ch  center  min   max   range  inv
  { 1500,  600, 2400,  60, false },  // 0: head nod
  { 1500,  600, 2400,  90, false },  // 1: left arm
  { 1500,  600, 2400,  90, true  },  // 2: right arm (mirrored)
  { 1500,  800, 2200,  45, false },  // 3: waist lean
  { 1500,  600, 2400,  60, false },  // 4: left hip
  { 1500,  600, 2400,  60, true  },  // 5: right hip (mirrored)
  { 1500,  800, 2200,  45, false },  // 6: left wing
  { 1500,  800, 2200,  45, true  },  // 7: right wing (mirrored)
  { 1500, 1000, 2000,  30, false },  // 8: left ankle
  { 1500, 1000, 2000,  30, true  },  // 9: right ankle
};

// Current servo positions (microseconds)
uint16_t servoCurrentUs[NUM_SERVOS];

// ══════════════════════════════════════════════
// ── MOTOR PINS (TB6612FNG) ──
// ══════════════════════════════════════════════
// Motor A = left wheels, Motor B = right wheels
// Using two TB6612FNG boards for 3 motors total
// Board 1: left motor + right motor (differential drive)
// Board 2: rear/center motor (optional extra traction)

#define MOTOR_STBY_1  4    // Standby pin board 1
#define MOTOR_AIN1    5    // Left motor direction
#define MOTOR_AIN2    6    // Left motor direction
#define MOTOR_PWMA    7    // Left motor speed (PWM)
#define MOTOR_BIN1   15    // Right motor direction
#define MOTOR_BIN2   16    // Right motor direction
#define MOTOR_PWMB   17    // Right motor speed (PWM)

#define MOTOR_STBY_2 18    // Standby pin board 2
#define MOTOR_CIN1   10    // Center motor direction
#define MOTOR_CIN2   11    // Center motor direction
#define MOTOR_PWMC   12    // Center motor speed (PWM)

// PWM channels for motors (ESP32 LEDC)
#define LEDC_CH_A  0
#define LEDC_CH_B  1
#define LEDC_CH_C  2
#define LEDC_FREQ  1000    // 1kHz PWM for motors
#define LEDC_RES   8       // 8-bit resolution (0-255)

// ══════════════════════════════════════════════
// ── ULTRASONIC SENSORS ──
// ══════════════════════════════════════════════
// 5× HC-SR04: front, left-front, right-front, left, right

struct UltrasonicSensor {
  uint8_t trigPin;
  uint8_t echoPin;
  float   distanceCm;
};

#define NUM_SENSORS 5
UltrasonicSensor sensors[NUM_SENSORS] = {
  { 35, 36, 999.0 },   // front
  { 37, 38, 999.0 },   // left-front
  { 39, 40, 999.0 },   // right-front
  { 41, 42, 999.0 },   // left
  { 47, 48, 999.0 },   // right
};

#define OBSTACLE_DIST_CM  15.0  // stop/avoid threshold

// ══════════════════════════════════════════════
// ── ANIMATION STATE ──
// ══════════════════════════════════════════════
// Translated from Three.js:
//   walkPhase += dt * WALK_SPEED_ANIM (8)
//   legSwing = sin(walkPhase) * 0.5   → ±28.6°
//   armSwing = sin(walkPhase) * 0.35  → ±20°
//   walkBob  = |sin(walkPhase)| * 0.025 (vertical — no servo for this)
//   headBob  = sin(walkPhase*2) * 0.02 → ±1.15°
//
// Radian-to-degree conversion for servo angles:
//   0.5 rad  = 28.6°   (leg swing amplitude)
//   0.35 rad = 20.1°   (arm swing amplitude)
//   0.8 rad  = 45.8°   (wave arm raise)
//   0.18 rad = 10.3°   (crouch torso tilt)
//   0.25 rad = 14.3°   (crouch leg flex)
//   0.35 rad = 20.1°   (whir arm swing)
//   0.12 rad = 6.9°    (whir torso lean)
//   wing flutter ±0.22 rad = ±12.6° walking, ±0.1 rad = ±5.7° idle

enum AnimState {
  ANIM_IDLE,
  ANIM_WALK,
  ANIM_WAVE,
  ANIM_CROUCH,
  ANIM_WHIR,      // "mine" in Three.js, renamed to whir
  ANIM_OSC_CONTROL // direct control from TouchDesigner
};

AnimState currentAnim = ANIM_IDLE;
float walkPhase = 0.0;
float actionTimer = 0.0;
bool isWalking = false;
unsigned long lastUpdateUs = 0;

// Motor state
int16_t motorSpeedLeft  = 0;  // -255 to 255
int16_t motorSpeedRight = 0;
bool motorsEnabled = false;

// ══════════════════════════════════════════════
// ── PCA9685 DRIVER ──
// ══════════════════════════════════════════════

void pca9685Write(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(PCA9685_ADDR);
  Wire.write(reg);
  Wire.write(val);
  Wire.endTransmission();
}

void pca9685Init() {
  // Reset
  pca9685Write(0x00, 0x10);  // sleep mode
  delay(5);

  // Set frequency: prescale = round(25MHz / (4096 * freq)) - 1
  // For 50Hz: round(25000000 / (4096 * 50)) - 1 = 121
  uint8_t prescale = 121;
  pca9685Write(0xFE, prescale);

  // Wake up
  pca9685Write(0x00, 0x20);  // auto-increment enabled
  delay(5);
  pca9685Write(0x00, 0x20 | 0x80);  // restart + auto-increment
  delay(5);

  Serial.println("[PCA9685] Initialized at 50Hz");
}

void pca9685SetPWM(uint8_t channel, uint16_t onTime, uint16_t offTime) {
  uint8_t reg = 0x06 + (channel * 4);
  Wire.beginTransmission(PCA9685_ADDR);
  Wire.write(reg);
  Wire.write(onTime & 0xFF);
  Wire.write(onTime >> 8);
  Wire.write(offTime & 0xFF);
  Wire.write(offTime >> 8);
  Wire.endTransmission();
}

// Set servo position in microseconds
void setServoUs(uint8_t channel, uint16_t us) {
  // PCA9685 at 50Hz: 20ms period = 4096 ticks
  // 1µs = 4096/20000 = 0.2048 ticks
  uint16_t ticks = (uint16_t)((float)us * 4096.0 / 20000.0);
  pca9685SetPWM(channel, 0, ticks);
  if (channel < NUM_SERVOS) {
    servoCurrentUs[channel] = us;
  }
}

// Set servo by angle in degrees (0 = center, positive/negative from center)
void setServoAngle(uint8_t channel, float angleDeg) {
  if (channel >= NUM_SERVOS) return;

  ServoConfig& cfg = servoConfigs[channel];

  // Clamp angle
  if (angleDeg > cfg.maxAngle)  angleDeg = cfg.maxAngle;
  if (angleDeg < -cfg.maxAngle) angleDeg = -cfg.maxAngle;

  // Invert if needed
  if (cfg.inverted) angleDeg = -angleDeg;

  // Map angle to microseconds
  // center ± (angle/maxAngle) * (max-center or center-min)
  uint16_t us;
  if (angleDeg >= 0) {
    us = cfg.centerUs + (uint16_t)(angleDeg / cfg.maxAngle * (cfg.maxUs - cfg.centerUs));
  } else {
    us = cfg.centerUs - (uint16_t)(-angleDeg / cfg.maxAngle * (cfg.centerUs - cfg.minUs));
  }

  setServoUs(channel, us);
}

// Set servo from Three.js radians (direct translation)
void setServoRad(uint8_t channel, float rad) {
  setServoAngle(channel, rad * 57.2958);  // rad to deg
}

// ══════════════════════════════════════════════
// ── MOTOR CONTROL ──
// ══════════════════════════════════════════════

void motorsInit() {
  pinMode(MOTOR_STBY_1, OUTPUT);
  pinMode(MOTOR_AIN1, OUTPUT);
  pinMode(MOTOR_AIN2, OUTPUT);
  pinMode(MOTOR_BIN1, OUTPUT);
  pinMode(MOTOR_BIN2, OUTPUT);

  pinMode(MOTOR_STBY_2, OUTPUT);
  pinMode(MOTOR_CIN1, OUTPUT);
  pinMode(MOTOR_CIN2, OUTPUT);

  // Setup LEDC PWM for motor speed
  ledcAttach(MOTOR_PWMA, LEDC_FREQ, LEDC_RES);
  ledcAttach(MOTOR_PWMB, LEDC_FREQ, LEDC_RES);
  ledcAttach(MOTOR_PWMC, LEDC_FREQ, LEDC_RES);

  // Enable motor drivers
  digitalWrite(MOTOR_STBY_1, HIGH);
  digitalWrite(MOTOR_STBY_2, HIGH);

  Serial.println("[MOTORS] Initialized");
}

void setMotor(uint8_t in1, uint8_t in2, uint8_t pwmPin, int16_t speed) {
  if (speed > 0) {
    digitalWrite(in1, HIGH);
    digitalWrite(in2, LOW);
    ledcWrite(pwmPin, min(speed, 255));
  } else if (speed < 0) {
    digitalWrite(in1, LOW);
    digitalWrite(in2, HIGH);
    ledcWrite(pwmPin, min(-speed, 255));
  } else {
    digitalWrite(in1, LOW);
    digitalWrite(in2, LOW);
    ledcWrite(pwmPin, 0);
  }
}

void setMotors(int16_t left, int16_t right) {
  motorSpeedLeft = left;
  motorSpeedRight = right;
  setMotor(MOTOR_AIN1, MOTOR_AIN2, MOTOR_PWMA, left);
  setMotor(MOTOR_BIN1, MOTOR_BIN2, MOTOR_PWMB, right);
  // Center motor gets average for extra traction
  setMotor(MOTOR_CIN1, MOTOR_CIN2, MOTOR_PWMC, (left + right) / 2);
}

void motorsStop() {
  setMotors(0, 0);
}

// ══════════════════════════════════════════════
// ── ULTRASONIC SENSORS ──
// ══════════════════════════════════════════════

float readUltrasonic(uint8_t trigPin, uint8_t echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000);  // 30ms timeout (~5m max)
  if (duration == 0) return 999.0;
  return duration * 0.0343 / 2.0;  // cm
}

void sensorsInit() {
  for (int i = 0; i < NUM_SENSORS; i++) {
    pinMode(sensors[i].trigPin, OUTPUT);
    pinMode(sensors[i].echoPin, INPUT);
  }
  Serial.println("[SENSORS] Initialized");
}

// Read one sensor per call (non-blocking rotation)
uint8_t currentSensor = 0;
void sensorsUpdate() {
  sensors[currentSensor].distanceCm =
    readUltrasonic(sensors[currentSensor].trigPin, sensors[currentSensor].echoPin);
  currentSensor = (currentSensor + 1) % NUM_SENSORS;
}

bool obstacleAhead() {
  return sensors[0].distanceCm < OBSTACLE_DIST_CM;  // front sensor
}

bool obstacleLeft() {
  return sensors[1].distanceCm < OBSTACLE_DIST_CM || sensors[3].distanceCm < OBSTACLE_DIST_CM;
}

bool obstacleRight() {
  return sensors[2].distanceCm < OBSTACLE_DIST_CM || sensors[4].distanceCm < OBSTACLE_DIST_CM;
}

// ══════════════════════════════════════════════
// ── ANIMATION ENGINE ──
// ══════════════════════════════════════════════
// Direct translation from viewingroom.html animations.
// All angles in radians to match Three.js source.

void animIdle(float dt) {
  // Gentle decay of walk phase
  walkPhase *= 0.9;

  float legSwing = sin(walkPhase) * 0.5 * 0.05;   // tiny residual
  float armSwing = sin(walkPhase) * 0.35 * 0.05;
  float headBob  = sin(walkPhase * 2) * 0.02 * 0.15;

  setServoRad(CH_HEAD,      headBob);
  setServoRad(CH_WAIST,     0);
  setServoRad(CH_LEFT_ARM,  -armSwing);   // opposite to legs
  setServoRad(CH_RIGHT_ARM,  armSwing);
  setServoRad(CH_LEFT_HIP,   legSwing);
  setServoRad(CH_RIGHT_HIP, -legSwing);

  // Wing flutter — slow idle
  float wingFlutter = sin(millis() * 0.006) * 0.1;
  setServoRad(CH_LEFT_WING,   wingFlutter - 0.12);
  setServoRad(CH_RIGHT_WING, -wingFlutter + 0.12);

  // Ankles neutral
  setServoRad(CH_LEFT_ANKLE,  0);
  setServoRad(CH_RIGHT_ANKLE, 0);
}

void animWalk(float dt) {
  // walkPhase += dt * 8
  walkPhase += dt * 8.0;

  float legSwing = sin(walkPhase) * 0.5;     // ±28.6°
  float armSwing = sin(walkPhase) * 0.35;    // ±20°
  float headBob  = sin(walkPhase * 2) * 0.02; // ±1.15°

  setServoRad(CH_HEAD,      headBob);
  setServoRad(CH_WAIST,     0);
  setServoRad(CH_LEFT_ARM,  -armSwing);   // arms opposite to legs
  setServoRad(CH_RIGHT_ARM,  armSwing);
  setServoRad(CH_LEFT_HIP,   legSwing);
  setServoRad(CH_RIGHT_HIP, -legSwing);

  // Wing flutter — faster while walking
  float wingFlutter = sin(millis() * 0.012) * 0.22;
  setServoRad(CH_LEFT_WING,   wingFlutter - 0.12);
  setServoRad(CH_RIGHT_WING, -wingFlutter + 0.12);

  // Ankle compensation: tilt opposite to leg swing for foot contact
  float ankleComp = -legSwing * 0.4;  // partial compensation
  setServoRad(CH_LEFT_ANKLE,   ankleComp);
  setServoRad(CH_RIGHT_ANKLE, -ankleComp);

  // Sync wheels with walk — move forward at walking pace
  if (motorsEnabled && !obstacleAhead()) {
    int16_t walkSpeed = 100;  // moderate speed to match leg cadence
    setMotors(walkSpeed, walkSpeed);
  } else {
    motorsStop();
  }
}

void animWave(float dt) {
  actionTimer += dt;
  float t = actionTimer;
  float waveDur = 0.8;  // slower than Three.js (0.4s) for physical servo travel
  float waveT = min(t / waveDur, 1.0f);
  float waveUp = sin(waveT * PI);   // 0→1→0 smooth

  // Right arm raises
  setServoRad(CH_RIGHT_ARM, -0.8 * waveUp);  // -45.8° at peak
  setServoRad(CH_LEFT_ARM,   0);
  setServoRad(CH_LEFT_HIP,   0);
  setServoRad(CH_RIGHT_HIP,  0);
  setServoRad(CH_WAIST,      0);
  setServoRad(CH_HEAD,        0);

  // Wings neutral during wave
  setServoRad(CH_LEFT_WING,  -0.12);
  setServoRad(CH_RIGHT_WING,  0.12);

  setServoRad(CH_LEFT_ANKLE,  0);
  setServoRad(CH_RIGHT_ANKLE, 0);

  if (t > waveDur) {
    currentAnim = isWalking ? ANIM_WALK : ANIM_IDLE;
    actionTimer = 0;
  }
}

void animCrouch(float dt) {
  actionTimer += dt;
  float t = actionTimer;
  float crouchDur = 0.8;  // slower for physical movement
  float crouchT = min(t / crouchDur, 1.0f);
  float crouchAmt = sin(crouchT * PI);

  // Torso leans forward
  float tiltX = crouchAmt * 0.18;    // 10.3°
  float legFlex = crouchAmt * 0.25;  // 14.3°

  setServoRad(CH_WAIST,      tiltX);
  setServoRad(CH_HEAD,       tiltX * 0.5);
  setServoRad(CH_LEFT_ARM,   0);
  setServoRad(CH_RIGHT_ARM,  0);
  setServoRad(CH_LEFT_HIP,  -legFlex);   // legs flex backward
  setServoRad(CH_RIGHT_HIP, -legFlex);

  // Wings follow torso (flutter paused)
  setServoRad(CH_LEFT_WING,  -0.12);
  setServoRad(CH_RIGHT_WING,  0.12);

  // Ankles compensate for the crouch
  setServoRad(CH_LEFT_ANKLE,   legFlex * 0.5);
  setServoRad(CH_RIGHT_ANKLE,  legFlex * 0.5);

  if (t > crouchDur) {
    currentAnim = isWalking ? ANIM_WALK : ANIM_IDLE;
    actionTimer = 0;
    // Reset
    setServoRad(CH_WAIST, 0);
    setServoRad(CH_HEAD, 0);
    setServoRad(CH_LEFT_HIP, 0);
    setServoRad(CH_RIGHT_HIP, 0);
    setServoRad(CH_LEFT_ANKLE, 0);
    setServoRad(CH_RIGHT_ANKLE, 0);
  }
}

void animWhir(float dt) {
  // "mine" in Three.js — now "whir"
  // Torso leans, arms swing rhythmically, wings flutter fast
  actionTimer += dt;
  float t = actionTimer;

  float mineT = min(t / 0.4f, 1.0f);   // slower ramp for physical
  float mineLean = mineT * 0.12;        // 6.9° lean
  float mineSwing = sin(t * 6.0) * 0.35;  // ±20° arm oscillation

  setServoRad(CH_WAIST,      mineLean);
  setServoRad(CH_HEAD,       mineLean * 0.5);
  setServoRad(CH_LEFT_ARM,   mineSwing);     // arms swing together
  setServoRad(CH_RIGHT_ARM,  mineSwing);
  setServoRad(CH_LEFT_HIP,   mineT * 0.15); // slight leg spread
  setServoRad(CH_RIGHT_HIP,  mineT * 0.15);

  // Wings flutter fast during whir
  float wingFlutter = sin(millis() * 0.024) * 0.35;
  setServoRad(CH_LEFT_WING,   wingFlutter - 0.12);
  setServoRad(CH_RIGHT_WING, -wingFlutter + 0.12);

  setServoRad(CH_LEFT_ANKLE,  0);
  setServoRad(CH_RIGHT_ANKLE, 0);

  if (t > 3.0) {  // 3 seconds (longer than Three.js 2s for showmanship)
    currentAnim = isWalking ? ANIM_WALK : ANIM_IDLE;
    actionTimer = 0;
    setServoRad(CH_WAIST, 0);
    setServoRad(CH_HEAD, 0);
  }
}

// ══════════════════════════════════════════════
// ── OSC PARSER (minimal, no library needed) ──
// ══════════════════════════════════════════════
// Handles:
//   /ee/anim  <string>    — set animation (idle/walk/wave/crouch/whir)
//   /ee/walk  <int 0|1>   — walk on/off (enables motors)
//   /ee/servo <int ch> <float angle_deg> — direct servo control
//   /ee/motor <int left> <int right>     — direct motor control
//   /ee/stop                              — emergency stop

void parseOSC(uint8_t* buf, int len) {
  if (len < 4) return;

  // Extract address pattern (null-terminated, padded to 4 bytes)
  char addr[64] = {0};
  int i = 0;
  while (i < len && i < 63 && buf[i] != 0) {
    addr[i] = buf[i];
    i++;
  }
  addr[i] = 0;

  // Skip to type tag string (aligned to 4 bytes)
  int addrEnd = ((i + 1) + 3) & ~3;

  // Parse known addresses
  if (strcmp(addr, "/ee/anim") == 0) {
    // Find string argument
    int argStart = addrEnd;
    // Skip type tag ",s\0\0"
    argStart = ((argStart + 4) + 3) & ~3;
    if (argStart < len) {
      char* animName = (char*)&buf[argStart];
      if (strcmp(animName, "idle") == 0)        currentAnim = ANIM_IDLE;
      else if (strcmp(animName, "walk") == 0)   { currentAnim = ANIM_WALK; isWalking = true; motorsEnabled = true; }
      else if (strcmp(animName, "wave") == 0)   { currentAnim = ANIM_WAVE; actionTimer = 0; }
      else if (strcmp(animName, "crouch") == 0) { currentAnim = ANIM_CROUCH; actionTimer = 0; }
      else if (strcmp(animName, "whir") == 0)   { currentAnim = ANIM_WHIR; actionTimer = 0; }
      else if (strcmp(animName, "osc") == 0)    currentAnim = ANIM_OSC_CONTROL;
      Serial.printf("[OSC] anim → %s\n", animName);
    }
  }
  else if (strcmp(addr, "/ee/walk") == 0) {
    int argStart = ((addrEnd + 4) + 3) & ~3;
    if (argStart + 4 <= len) {
      // Big-endian int32
      int32_t val = (buf[argStart] << 24) | (buf[argStart+1] << 16) |
                    (buf[argStart+2] << 8) | buf[argStart+3];
      isWalking = val != 0;
      motorsEnabled = isWalking;
      currentAnim = isWalking ? ANIM_WALK : ANIM_IDLE;
      Serial.printf("[OSC] walk → %d\n", val);
    }
  }
  else if (strcmp(addr, "/ee/servo") == 0) {
    // Direct servo: channel (int) + angle (float)
    int argStart = ((addrEnd + 4) + 3) & ~3;
    if (argStart + 8 <= len) {
      int32_t ch = (buf[argStart] << 24) | (buf[argStart+1] << 16) |
                   (buf[argStart+2] << 8) | buf[argStart+3];
      // Float is big-endian
      uint32_t fb = (buf[argStart+4] << 24) | (buf[argStart+5] << 16) |
                    (buf[argStart+6] << 8) | buf[argStart+7];
      float angle;
      memcpy(&angle, &fb, 4);
      if (ch >= 0 && ch < NUM_SERVOS) {
        currentAnim = ANIM_OSC_CONTROL;
        setServoAngle(ch, angle);
        Serial.printf("[OSC] servo ch%d → %.1f°\n", ch, angle);
      }
    }
  }
  else if (strcmp(addr, "/ee/motor") == 0) {
    int argStart = ((addrEnd + 4) + 3) & ~3;
    if (argStart + 8 <= len) {
      int32_t left = (buf[argStart] << 24) | (buf[argStart+1] << 16) |
                     (buf[argStart+2] << 8) | buf[argStart+3];
      int32_t right = (buf[argStart+4] << 24) | (buf[argStart+5] << 16) |
                      (buf[argStart+6] << 8) | buf[argStart+7];
      setMotors(left, right);
      Serial.printf("[OSC] motor L:%d R:%d\n", left, right);
    }
  }
  else if (strcmp(addr, "/ee/stop") == 0) {
    currentAnim = ANIM_IDLE;
    isWalking = false;
    motorsEnabled = false;
    motorsStop();
    Serial.println("[OSC] STOP");
  }
}

// ══════════════════════════════════════════════
// ── SERIAL COMMAND PARSER ──
// ══════════════════════════════════════════════
// Simple text commands for testing without WiFi:
//   idle / walk / wave / crouch / whir / stop
//   servo <ch> <angle_deg>
//   motor <left> <right>
//   center  — all servos to center
//   scan    — read all ultrasonic sensors

void parseSerial(String cmd) {
  cmd.trim();

  if (cmd == "idle")         { currentAnim = ANIM_IDLE; isWalking = false; motorsEnabled = false; motorsStop(); }
  else if (cmd == "walk")    { currentAnim = ANIM_WALK; isWalking = true; motorsEnabled = true; }
  else if (cmd == "wave")    { currentAnim = ANIM_WAVE; actionTimer = 0; }
  else if (cmd == "crouch")  { currentAnim = ANIM_CROUCH; actionTimer = 0; }
  else if (cmd == "whir")    { currentAnim = ANIM_WHIR; actionTimer = 0; }
  else if (cmd == "stop")    { currentAnim = ANIM_IDLE; isWalking = false; motorsEnabled = false; motorsStop(); }
  else if (cmd == "center")  {
    for (int i = 0; i < NUM_SERVOS; i++) setServoAngle(i, 0);
    Serial.println("All servos centered");
  }
  else if (cmd == "scan") {
    for (int i = 0; i < NUM_SENSORS; i++) {
      sensors[i].distanceCm = readUltrasonic(sensors[i].trigPin, sensors[i].echoPin);
      Serial.printf("  Sensor %d: %.1f cm\n", i, sensors[i].distanceCm);
    }
  }
  else if (cmd.startsWith("servo ")) {
    int ch; float angle;
    if (sscanf(cmd.c_str(), "servo %d %f", &ch, &angle) == 2) {
      currentAnim = ANIM_OSC_CONTROL;
      setServoAngle(ch, angle);
      Serial.printf("Servo %d → %.1f°\n", ch, angle);
    }
  }
  else if (cmd.startsWith("motor ")) {
    int l, r;
    if (sscanf(cmd.c_str(), "motor %d %d", &l, &r) == 2) {
      setMotors(l, r);
      Serial.printf("Motors L:%d R:%d\n", l, r);
    }
  }
  else {
    Serial.println("Commands: idle walk wave crouch whir stop center scan servo<ch><deg> motor<L><R>");
  }
}

// ══════════════════════════════════════════════
// ── SETUP ──
// ══════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n╔══════════════════════════════════╗");
  Serial.println("║  EE Animatronic — NEEoColorphism ║");
  Serial.println("║  ESP32-S3 + PCA9685 + TB6612FNG  ║");
  Serial.println("╚══════════════════════════════════╝\n");

  // I2C
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);  // 400kHz fast mode

  // PCA9685
  pca9685Init();

  // Center all servos on startup (safe position)
  Serial.println("[BOOT] Centering servos...");
  for (int i = 0; i < NUM_SERVOS; i++) {
    setServoAngle(i, 0);
    delay(50);  // stagger to avoid current spike
  }

  // Motors
  motorsInit();

  // Ultrasonic sensors
  sensorsInit();

  // WiFi
  Serial.printf("[WIFI] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WIFI] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[OSC]  Listening on port %d\n", OSC_PORT);
    udp.begin(OSC_PORT);
  } else {
    Serial.println("\n[WIFI] Not connected — running in serial-only mode");
  }

  Serial.println("\n[READY] Type 'walk', 'wave', 'crouch', 'whir', 'stop'");
  Serial.println("        Or send OSC to /ee/anim, /ee/servo, /ee/motor\n");

  lastUpdateUs = micros();
}

// ══════════════════════════════════════════════
// ── MAIN LOOP ──
// ══════════════════════════════════════════════

void loop() {
  // Delta time
  unsigned long now = micros();
  float dt = (now - lastUpdateUs) / 1000000.0;
  lastUpdateUs = now;

  // Clamp dt to avoid jumps
  if (dt > 0.1) dt = 0.1;

  // ── Read sensors (one per loop, ~200Hz rotation) ──
  sensorsUpdate();

  // ── Check OSC ──
  int packetSize = udp.parsePacket();
  if (packetSize > 0) {
    uint8_t buf[256];
    int len = udp.read(buf, sizeof(buf));
    parseOSC(buf, len);
  }

  // ── Check Serial ──
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    parseSerial(cmd);
  }

  // ── Obstacle avoidance (interrupt walk if obstacle detected) ──
  if (isWalking && currentAnim == ANIM_WALK) {
    if (obstacleAhead()) {
      motorsStop();
      // Could add turn logic here
    }
  }

  // ── Run animation ──
  switch (currentAnim) {
    case ANIM_IDLE:    animIdle(dt);    break;
    case ANIM_WALK:    animWalk(dt);    break;
    case ANIM_WAVE:    animWave(dt);    break;
    case ANIM_CROUCH:  animCrouch(dt);  break;
    case ANIM_WHIR:    animWhir(dt);    break;
    case ANIM_OSC_CONTROL: break;  // servos set directly via OSC
  }

  // ── Loop timing: ~100Hz update rate ──
  delay(10);
}
