/*
 * EE Animatronic — NEEoColorphism Voxel Character
 * ESP32-S3 + PCA9685
 *
 * Patrick Cat / Mixi Art Studio 2026
 *
 * Sides are always EE's own: "left" = EE's left arm, as if you were EE.
 *
 * Hardware (current build):
 *   - ESP32-S3 DevKitC
 *   - PCA9685 #1 (I2C 0x40): head, shoulders/arms, legs, wings — 16 channels
 *   - PCA9685 #2 (I2C 0x41): elbows (MG90S) — not wired yet
 *   - Head: 2× MG996R (pan + tilt)
 *   - Arms: 2× MG996R per side (shoulder raises sideways + arm bends forward)
 *   - Legs: per side DS3218 hip roll + DS3218 hip pitch + RDS3225 knee + RDS3225 ankle
 *   - Wings: 2× SG90
 *   - 1000µF capacitor on each PCA9685 V+ rail
 *
 * Calibration:
 *   Every joint has a REST and an END position stored as the pulse the servo gets
 *   (microseconds, 1500 = servo centre). Animations ask for an "amount":
 *   0 = rest, 1 = end, in between = blend. Each joint is also clamped to
 *   [minUs, maxUs] so no animation can push it past what was tested by hand.
 *   The `servo <ch> <deg>` command uses one scale for every channel:
 *   0° = 1500 µs, 10 µs per degree (so 90° = 2400 µs, -90° = 600 µs). Leg and wing joints stay disabled (no pulse at all)
 *   until they are calibrated and set to enabled = true.
 *
 * Comms:
 *   - Serial (115200) commands — see parseSerial()
 *   - WiFi + OSC for TouchDesigner — see parseOSC()
 */

#include <Wire.h>
#include <WiFi.h>
#include <WiFiUdp.h>

// ══════════════════════════════════════════════
// ── CONFIG ──
// ══════════════════════════════════════════════

const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASS";
const unsigned int OSC_PORT = 9000;
WiFiUDP udp;
bool wifiOk = false;

#define SDA_PIN 8
#define SCL_PIN 9

#define PCA1_ADDR 0x40
#define PCA2_ADDR 0x41
#define PCA_FREQ  50

// `servo <ch> <deg>` scale, the same for every channel: 0° = 1500 µs, 10 µs per degree.
#define CENTER_US   1500.0f
#define US_PER_DEG  10.0f

// Max speed while moving to a target (µs per second; 2400 µs/s ≈ 240°/s).
#define MAX_SPEED_US_S 2400.0f

// ══════════════════════════════════════════════
// ── JOINTS + CALIBRATION ──
// ══════════════════════════════════════════════

struct Joint {
  const char* name;
  uint8_t pca;       // 0 = PCA #1 (0x40), 1 = PCA #2 (0x41)
  uint8_t ch;        // channel on that PCA
  float   restUs;    // pulse at amount 0
  float   endUs;     // pulse at amount 1
  float   minUs;     // hard limits (pulse, µs)
  float   maxUs;
  bool    enabled;   // false = never driven
  float   currentUs;
  float   targetUs;
  bool    started;   // first pulse sent
};

enum JointId {
  HEAD_PAN, HEAD_TILT,
  L_SHOULDER, L_ARM, R_SHOULDER, R_ARM,
  L_HIP_ROLL, R_HIP_ROLL, L_HIP_PITCH, R_HIP_PITCH,
  L_KNEE, R_KNEE, L_ANKLE, R_ANKLE,
  L_WING, R_WING,
  NUM_JOINTS
};

// Head and arms: measured by hand on 2026-10-21 (converted from the old firmware's
// per-channel scales to the pulse each servo actually received).
Joint joints[NUM_JOINTS] = {
  //  name          pca ch  rest    end    min    max   enabled
  { "head_pan",      0,  0, 1500,  2175,   825,  2175,  true  },  // end = mira a un lado, amount -1 = al otro
  { "head_tilt",     0,  1, 1500,  1050,  1050,  1500,  true  },  // end = mira abajo
  { "l_shoulder",    0,  2, 1300,  2400,  1300,  2400,  true  },  // end = brazo de lado
  { "l_arm",         0,  3, 1950,  1200,  1200,  1950,  true  },  // rest = recto, end = doblado
  { "r_shoulder",    0,  4, 1500,   600,   600,  1500,  true  },  // end = brazo de lado
  { "r_arm",         0,  5, 1033,  1811,  1033,  1811,  true  },  // rest = recto, end = doblado
  // Legs and wings: placeholders until calibrated by hand (same method as above)
  { "l_hip_roll",    0,  6, 1500,  1500,  1500,  1500,  false },
  { "r_hip_roll",    0,  7, 1500,  1500,  1500,  1500,  false },
  { "l_hip_pitch",   0,  8, 1500,  1500,  1500,  1500,  false },
  { "r_hip_pitch",   0,  9, 1500,  1500,  1500,  1500,  false },
  { "l_knee",        0, 10, 1500,  1500,  1500,  1500,  false },
  { "r_knee",        0, 11, 1500,  1500,  1500,  1500,  false },
  { "l_ankle",       0, 12, 1500,  1500,  1500,  1500,  false },
  { "r_ankle",       0, 13, 1500,  1500,  1500,  1500,  false },
  { "l_wing",        0, 14, 1500,  1500,  1500,  1500,  false },
  { "r_wing",        0, 15, 1500,  1500,  1500,  1500,  false },
};

// ══════════════════════════════════════════════
// ── ULTRASONIC SENSORS (3× HC-SR04, ECHO through 5V→3.3V divider) ──
// ══════════════════════════════════════════════

struct UltrasonicSensor { uint8_t trigPin, echoPin; float distanceCm; };
#define NUM_SENSORS 3
UltrasonicSensor sensors[NUM_SENSORS] = {
  { 38, 39, 999.0 },   // front (belly)
  { 40, 41, 999.0 },   // left (head side)
  { 42, 48, 999.0 },   // right (head side)
};

// ══════════════════════════════════════════════
// ── PCA9685 ──
// ══════════════════════════════════════════════

const uint8_t pcaAddr[2] = { PCA1_ADDR, PCA2_ADDR };
bool pcaPresent[2] = { false, false };

void pcaWrite(uint8_t a, uint8_t reg, uint8_t val) {
  Wire.beginTransmission(a); Wire.write(reg); Wire.write(val); Wire.endTransmission();
}

bool pcaInit(uint8_t idx) {
  uint8_t a = pcaAddr[idx];
  Wire.beginTransmission(a);
  if (Wire.endTransmission() != 0) return false;
  pcaWrite(a, 0x00, 0x10);                         // sleep
  delay(5);
  uint8_t prescale = (uint8_t)(25000000.0 / (4096.0 * PCA_FREQ) + 0.5) - 1;  // 121 @ 50 Hz
  pcaWrite(a, 0xFE, prescale);
  pcaWrite(a, 0x00, 0x20);                         // wake, auto-increment
  delay(5);
  pcaWrite(a, 0x00, 0xA0);                         // restart
  delay(5);
  for (uint8_t ch = 0; ch < 16; ch++) {            // all outputs off (no pulse)
    Wire.beginTransmission(a);
    Wire.write(0x06 + ch * 4);
    Wire.write(0); Wire.write(0); Wire.write(0); Wire.write(0x10);  // full OFF
    Wire.endTransmission();
  }
  return true;
}

void pcaSetUs(uint8_t idx, uint8_t ch, float us) {
  if (!pcaPresent[idx]) return;
  uint16_t ticks = (uint16_t)(us * 4096.0f / 20000.0f + 0.5f);
  Wire.beginTransmission(pcaAddr[idx]);
  Wire.write(0x06 + ch * 4);
  Wire.write(0); Wire.write(0);
  Wire.write(ticks & 0xFF); Wire.write(ticks >> 8);
  Wire.endTransmission();
}

// ══════════════════════════════════════════════
// ── JOINT CONTROL ──
// ══════════════════════════════════════════════

float clampf(float v, float lo, float hi) { return v < lo ? lo : (v > hi ? hi : v); }

// Raw pulse (still clamped to the joint's tested limits)
void setJointUs(uint8_t j, float us) {
  if (j >= NUM_JOINTS || !joints[j].enabled) return;
  joints[j].targetUs = clampf(us, joints[j].minUs, joints[j].maxUs);
}

// Raw degrees on the common scale (0° = 1500 µs, 10 µs/°)
void setJointDeg(uint8_t j, float deg) { setJointUs(j, CENTER_US + deg * US_PER_DEG); }

// Amount: 0 = rest, 1 = end. Negative values only matter for two-sided joints (head pan).
void setJoint(uint8_t j, float amount) {
  if (j >= NUM_JOINTS) return;
  Joint& J = joints[j];
  setJointUs(j, J.restUs + amount * (J.endUs - J.restUs));
}

void allToRest() { for (uint8_t j = 0; j < NUM_JOINTS; j++) setJoint(j, 0); }

// Called every loop: moves each joint toward its target at MAX_SPEED_US_S
void updateJoints(float dt) {
  float step = MAX_SPEED_US_S * dt;
  for (uint8_t j = 0; j < NUM_JOINTS; j++) {
    Joint& J = joints[j];
    if (!J.enabled) continue;
    if (!J.started) {                 // first pulse: go straight to target (position unknown)
      J.currentUs = J.targetUs;
      J.started = true;
    } else {
      float d = J.targetUs - J.currentUs;
      J.currentUs += clampf(d, -step, step);
    }
    pcaSetUs(J.pca, J.ch, J.currentUs);
  }
}

int findJoint(const char* name) {
  for (uint8_t j = 0; j < NUM_JOINTS; j++) if (strcmp(joints[j].name, name) == 0) return j;
  return -1;
}

int jointForChannel(uint8_t pca, uint8_t ch) {
  for (uint8_t j = 0; j < NUM_JOINTS; j++) if (joints[j].pca == pca && joints[j].ch == ch) return j;
  return -1;
}

// ══════════════════════════════════════════════
// ── SENSORS ──
// ══════════════════════════════════════════════

float readUltrasonic(uint8_t trig, uint8_t echo) {
  digitalWrite(trig, LOW);  delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long d = pulseIn(echo, HIGH, 25000);
  return d == 0 ? 999.0 : d * 0.0343 / 2.0;
}

void sensorsInit() {
  for (int i = 0; i < NUM_SENSORS; i++) { pinMode(sensors[i].trigPin, OUTPUT); pinMode(sensors[i].echoPin, INPUT); }
}

uint8_t currentSensor = 0;
unsigned long lastSensorMs = 0;
void sensorsUpdate() {                       // one sensor every 40 ms
  if (millis() - lastSensorMs < 40) return;
  lastSensorMs = millis();
  sensors[currentSensor].distanceCm = readUltrasonic(sensors[currentSensor].trigPin, sensors[currentSensor].echoPin);
  currentSensor = (currentSensor + 1) % NUM_SENSORS;
}

// ══════════════════════════════════════════════
// ── ANIMATIONS (upper body; legs join when calibrated) ──
// ══════════════════════════════════════════════

enum AnimState { ANIM_IDLE, ANIM_WAVE, ANIM_WALK, ANIM_MANUAL };
AnimState currentAnim = ANIM_IDLE;
float animT = 0;

void animIdle(float t) {
  // slow look-around + breathing in the arms
  setJoint(HEAD_PAN,  0.45f * sinf(t * 0.35f) + 0.15f * sinf(t * 0.9f));
  setJoint(HEAD_TILT, 0.12f + 0.08f * sinf(t * 0.5f));
  float breath = 0.04f + 0.04f * sinf(t * 1.2f);
  setJoint(L_SHOULDER, breath);
  setJoint(R_SHOULDER, breath);
  setJoint(L_ARM, 0.1f);
  setJoint(R_ARM, 0.1f);
}

// Right arm (EE's right) raises sideways and the arm waves 3 times
void animWave(float t) {
  const float up = 0.8f, hold = 2.4f, down = 0.8f;
  float raise;
  if (t < up)               raise = t / up;
  else if (t < up + hold)   raise = 1.0f;
  else if (t < up + hold + down) raise = 1.0f - (t - up - hold) / down;
  else { currentAnim = ANIM_IDLE; animT = 0; return; }
  setJoint(R_SHOULDER, 0.85f * raise);
  float wave = (t > up && t < up + hold) ? 0.5f + 0.5f * sinf((t - up) * 2.0f * PI * 1.25f) : 0.3f;
  setJoint(R_ARM, wave * raise);
  setJoint(HEAD_PAN, -0.3f * raise);         // looks toward the waving arm
  setJoint(HEAD_TILT, 0.0f);
  setJoint(L_SHOULDER, 0.05f);
  setJoint(L_ARM, 0.1f);
}

// Arm swing while walking (legs added once calibrated)
void animWalk(float t) {
  float s = sinf(t * 2.0f * PI * 0.8f);
  setJoint(L_ARM, 0.5f + 0.5f * s);
  setJoint(R_ARM, 0.5f - 0.5f * s);
  setJoint(L_SHOULDER, 0.08f);
  setJoint(R_SHOULDER, 0.08f);
  setJoint(HEAD_PAN, 0.1f * s);
  setJoint(HEAD_TILT, 0.1f);
}

// ══════════════════════════════════════════════
// ── SERIAL COMMANDS ──
// ══════════════════════════════════════════════
//   idle | wave | walk | stop       animations (stop = everything to rest)
//   rest                            all joints to rest, manual mode
//   joint <name> <amount>           e.g. joint r_shoulder 0.5   (0 = rest, 1 = end)
//   servo <ch> <deg>                raw degrees on PCA #1 (0° = 1500 µs, 10 µs/°), clamped
//   us <ch> <microseconds>          raw pulse on PCA #1, clamped
//   cal                             print the calibration table
//   scan                            read the ultrasonic sensors

void printCal() {
  Serial.println("joint         pca ch  rest   end   min   max  on    now   (µs; deg = (us-1500)/10)");
  for (uint8_t j = 0; j < NUM_JOINTS; j++) {
    Joint& J = joints[j];
    Serial.printf("%-13s %3d %2d %5.0f %5.0f %5.0f %5.0f  %s %6.0f\n", J.name, J.pca + 1, J.ch,
                  J.restUs, J.endUs, J.minUs, J.maxUs, J.enabled ? "y" : "-", J.currentUs);
  }
}

void parseSerial(String cmd) {
  cmd.trim();
  char name[24]; float a; int ch;
  if (cmd == "idle")      { currentAnim = ANIM_IDLE; animT = 0; }
  else if (cmd == "wave") { currentAnim = ANIM_WAVE; animT = 0; }
  else if (cmd == "walk") { currentAnim = ANIM_WALK; animT = 0; }
  else if (cmd == "stop" || cmd == "rest") { currentAnim = ANIM_MANUAL; allToRest(); }
  else if (cmd == "cal")  printCal();
  else if (cmd == "scan") {
    for (int i = 0; i < NUM_SENSORS; i++) {
      sensors[i].distanceCm = readUltrasonic(sensors[i].trigPin, sensors[i].echoPin);
      Serial.printf("  sensor %d: %.1f cm\n", i, sensors[i].distanceCm);
    }
  }
  else if (sscanf(cmd.c_str(), "joint %23s %f", name, &a) == 2) {
    int j = findJoint(name);
    if (j < 0) { Serial.println("unknown joint (type 'cal' for names)"); return; }
    currentAnim = ANIM_MANUAL;
    setJoint(j, a);
    Serial.printf("%s → amount %.2f (%.0f µs)\n", name, a, joints[j].targetUs);
  }
  else if (sscanf(cmd.c_str(), "us %d %f", &ch, &a) == 2) {
    int j = jointForChannel(0, ch);
    if (j < 0 || !joints[j].enabled) { Serial.println("channel not enabled"); return; }
    currentAnim = ANIM_MANUAL;
    setJointUs(j, a);
    Serial.printf("ch%d (%s) → %.0f µs\n", ch, joints[j].name, joints[j].targetUs);
  }
  else if (sscanf(cmd.c_str(), "servo %d %f", &ch, &a) == 2) {
    int j = jointForChannel(0, ch);
    if (j < 0 || !joints[j].enabled) { Serial.println("channel not enabled"); return; }
    currentAnim = ANIM_MANUAL;
    setJointDeg(j, a);
    Serial.printf("ch%d (%s) → %.0f µs\n", ch, joints[j].name, joints[j].targetUs);
  }
  else Serial.println("commands: idle wave walk stop rest cal scan | joint <name> <0..1> | servo <ch> <deg> | us <ch> <us>");
}

// ══════════════════════════════════════════════
// ── OSC (TouchDesigner) ──
// ══════════════════════════════════════════════
//   /ee/anim  <string>              idle | wave | walk | stop
//   /ee/joint <string> <float>      joint name + amount
//   /ee/servo <int> <float>         channel + raw degrees (clamped)

static int oscPad(int n) { return (n + 3) & ~3; }
static int32_t be32(const uint8_t* p) { return (int32_t)((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]); }
static float beF(const uint8_t* p) { uint32_t u = (uint32_t)be32(p); float f; memcpy(&f, &u, 4); return f; }

void parseOSC(uint8_t* buf, int len) {
  if (len < 8) return;
  const char* addr = (const char*)buf;
  int p = oscPad(strnlen(addr, len) + 1);
  if (p >= len || buf[p] != ',') return;
  const char* tags = (const char*)&buf[p];
  p += oscPad(strnlen(tags, len - p) + 1);

  if (strcmp(addr, "/ee/anim") == 0 && tags[1] == 's') {
    String s((const char*)&buf[p]);
    parseSerial(s);
  } else if (strcmp(addr, "/ee/joint") == 0 && tags[1] == 's' && tags[2] == 'f') {
    const char* nm = (const char*)&buf[p];
    int q = p + oscPad(strnlen(nm, len - p) + 1);
    if (q + 4 > len) return;
    int j = findJoint(nm);
    if (j >= 0) { currentAnim = ANIM_MANUAL; setJoint(j, beF(&buf[q])); }
  } else if (strcmp(addr, "/ee/servo") == 0 && tags[1] == 'i' && tags[2] == 'f') {
    if (p + 8 > len) return;
    int j = jointForChannel(0, be32(&buf[p]));
    if (j >= 0) { currentAnim = ANIM_MANUAL; setJointDeg(j, beF(&buf[p + 4])); }
  }
}

// ══════════════════════════════════════════════
// ── SETUP / LOOP ──
// ══════════════════════════════════════════════

unsigned long lastUs = 0;

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\nEE Animatronic — NEEoColorphism");

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);
  pcaPresent[0] = pcaInit(0);
  pcaPresent[1] = pcaInit(1);
  Serial.printf("[PCA9685] #1 0x40: %s   #2 0x41: %s\n", pcaPresent[0] ? "ok" : "MISSING", pcaPresent[1] ? "ok" : "not found");

  // Rest pose, one joint at a time to avoid a current spike
  for (uint8_t j = 0; j < NUM_JOINTS; j++) {
    joints[j].targetUs = joints[j].restUs;
    if (joints[j].enabled) { updateJoints(0); delay(150); }
  }

  sensorsInit();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  for (int i = 0; i < 20 && WiFi.status() != WL_CONNECTED; i++) delay(250);
  wifiOk = WiFi.status() == WL_CONNECTED;
  if (wifiOk) { udp.begin(OSC_PORT); Serial.printf("[WIFI] %s  OSC :%d\n", WiFi.localIP().toString().c_str(), OSC_PORT); }
  else Serial.println("[WIFI] not connected — serial only");

  printCal();
  Serial.println("ready: idle wave walk stop rest cal scan | joint <name> <0..1> | servo <ch> <deg> | us <ch> <us>");
  lastUs = micros();
}

void loop() {
  unsigned long now = micros();
  float dt = (now - lastUs) / 1e6f;
  lastUs = now;
  if (dt > 0.1f) dt = 0.1f;
  animT += dt;

  if (Serial.available()) parseSerial(Serial.readStringUntil('\n'));
  if (wifiOk) {
    int n = udp.parsePacket();
    if (n > 0) { uint8_t buf[256]; int len = udp.read(buf, sizeof(buf)); parseOSC(buf, len); }
  }

  sensorsUpdate();

  switch (currentAnim) {
    case ANIM_IDLE:   animIdle(animT); break;
    case ANIM_WAVE:   animWave(animT); break;
    case ANIM_WALK:   animWalk(animT); break;
    case ANIM_MANUAL: break;
  }

  updateJoints(dt);
  delay(10);
}
