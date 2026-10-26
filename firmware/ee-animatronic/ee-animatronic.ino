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
#include <Preferences.h>

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
  { "r_shoulder",    0,  4, 1600,   600,   600,  1700,  true  },  // end = brazo de lado; rest 10° más adentro
  { "r_arm",         0,  5, 1033,  1811,  1033,  1811,  true  },  // rest = recto, end = doblado
  // Legs: rest measured by hand on 2026-10-25 (backup; values saved with `save` in flash override this table).
  // Wings: off until calibrated over serial (enable / us / setrest / setend / save).
  { "l_hip_roll",    0,  6, 1300,  1300,   500,  2400,  true  },
  { "r_hip_roll",    0,  7, 1250,  1250,   600,  2500,  true  },
  { "l_hip_pitch",   0,  8, 1040,  1040,   600,  2400,  true  },
  { "r_hip_pitch",   0,  9, 1710,  1710,   600,  2400,  true  },
  { "l_knee",        0, 10, 1535,  1535,   600,  2400,  true  },
  { "r_knee",        0, 11,  910,   910,   600,  2400,  true  },
  { "l_ankle",       0, 12, 1755,  1755,   600,  2400,  true  },
  { "r_ankle",       0, 13,  730,   730,   600,  2400,  true  },
  { "l_wing",        0, 14, 1500,  1500,   600,  2400,  false },
  { "r_wing",        0, 15, 1500,  1500,   600,  2400,  false },
};

// ══════════════════════════════════════════════
// ── ULTRASONIC SENSORS (3× HC-SR04, ECHO through 5V→3.3V divider) ──
// ══════════════════════════════════════════════

struct UltrasonicSensor { uint8_t trigPin, echoPin; float distanceCm; };
#define NUM_SENSORS 3
UltrasonicSensor sensors[NUM_SENSORS] = {
  { 38, 39, 999.0 },   // front (belly)
  { 40, 41, 999.0 },   // left (head side)
  { 42, 47, 999.0 },   // right (head side) — not 48: the board's RGB LED is there
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

void pcaOff(uint8_t idx, uint8_t ch) {            // no pulse: the servo goes limp
  if (!pcaPresent[idx]) return;
  Wire.beginTransmission(pcaAddr[idx]);
  Wire.write(0x06 + ch * 4);
  Wire.write(0); Wire.write(0); Wire.write(0); Wire.write(0x10);
  Wire.endTransmission();
}

#define PULSE_MIN 500.0f   // no servo ever gets a pulse outside 500..2500 µs
#define PULSE_MAX 2500.0f

void pcaSetUs(uint8_t idx, uint8_t ch, float us) {
  if (!pcaPresent[idx] || us < PULSE_MIN - 1) return;   // never send a bad pulse
  if (us > PULSE_MAX) us = PULSE_MAX;
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
    if (J.targetUs < PULSE_MIN) continue;   // no valid target yet
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
// ── IMU (GY-521 / MPU6050 on the same I2C bus, 0x68) ──
// ══════════════════════════════════════════════
// Mounted upright on the front of the pelvis: board X arrow points UP, Y arrow to EE's LEFT,
// so the board's Z axis points to EE's back. imuRead() turns that into EE's own axes
// (forward, left, up). For a flat mount (X forward, Y left) use ax=X, ay=Y, az=Z, gx=GX, gy=GY.
// pitch + = EE leans forward · roll + = EE leans to its right.
// If a direction comes out reversed, flip its sign here.
#define IMU_ADDR 0x68
const int8_t IMU_PITCH_SIGN = +1;
const int8_t IMU_ROLL_SIGN  = +1;

bool imuOk = false, imuStream = false;
float imuPitch = 0, imuRoll = 0;          // filtered, degrees, after zero offset
float imuPitchRaw = 0, imuRollRaw = 0;    // filtered, before zero offset
float imuZeroPitch = 0, imuZeroRoll = 0;  // set with 'imu zero', saved in flash
float gyroBiasX = 0, gyroBiasY = 0;
unsigned long imuLastUs = 0, imuLastPrintMs = 0;
Preferences imuPrefs;
void imuPrint();

void imuWrite(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(IMU_ADDR); Wire.write(reg); Wire.write(val); Wire.endTransmission();
}

bool imuRead(float& ax, float& ay, float& az, float& gx, float& gy) {
  Wire.beginTransmission(IMU_ADDR); Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom((uint8_t)IMU_ADDR, (uint8_t)14) != 14) return false;
  int16_t v[7];
  for (int i = 0; i < 7; i++) v[i] = (int16_t)((Wire.read() << 8) | Wire.read());
  float bX = v[0] / 16384.0f, bY = v[1] / 16384.0f, bZ = v[2] / 16384.0f;   // board axes, ±2 g
  float gX = v[4] / 65.5f,    gY = v[5] / 65.5f,    gZ = v[6] / 65.5f;      // board axes, ±500 °/s
  // board → EE: forward = −Z, left = +Y, up = +X
  ax = -bZ; ay = bY; az = bX;
  gx = -gZ; gy = gY;   // gx = turn about EE's forward axis, gy = about its left axis
  (void)gX;
  return true;
}

void accelAngles(float ax, float ay, float az, float& pitch, float& roll) {
  pitch = IMU_PITCH_SIGN * atan2f(-ax, sqrtf(ay * ay + az * az)) * 57.2958f;
  roll  = IMU_ROLL_SIGN  * atan2f(ay, az) * 57.2958f;
}

void imuInit() {
  Wire.beginTransmission(IMU_ADDR);
  imuOk = Wire.endTransmission() == 0;
  if (!imuOk) { Serial.println("[IMU] not found at 0x68 — check SDA/SCL/VCC/GND"); return; }
  imuWrite(0x6B, 0x00);   // wake up
  delay(50);
  imuWrite(0x1A, 0x03);   // low-pass ~44 Hz
  imuWrite(0x1B, 0x08);   // gyro ±500 °/s
  imuWrite(0x1C, 0x00);   // accel ±2 g
  delay(50);
  // gyro bias: EE must be still for this half second
  float ax, ay, az, gx, gy, sx = 0, sy = 0; int n = 0;
  for (int i = 0; i < 200; i++) { if (imuRead(ax, ay, az, gx, gy)) { sx += gx; sy += gy; n++; } delay(2); }
  if (n) { gyroBiasX = sx / n; gyroBiasY = sy / n; }
  if (imuRead(ax, ay, az, gx, gy)) accelAngles(ax, ay, az, imuPitchRaw, imuRollRaw);
  imuPrefs.begin("eeimu", true);
  imuZeroPitch = imuPrefs.getFloat("zp", 0); imuZeroRoll = imuPrefs.getFloat("zr", 0);
  imuPrefs.end();
  imuLastUs = micros();
  Serial.printf("[IMU] ok — zero offset pitch %.1f° roll %.1f°\n", imuZeroPitch, imuZeroRoll);
}

void imuUpdate() {                           // complementary filter: gyro for speed, accel for drift
  if (!imuOk) return;
  float ax, ay, az, gx, gy;
  if (!imuRead(ax, ay, az, gx, gy)) return;
  unsigned long now = micros();
  float dt = (now - imuLastUs) / 1e6f; imuLastUs = now;
  if (dt > 0.1f) dt = 0.1f;
  float ap, ar; accelAngles(ax, ay, az, ap, ar);
  // gyro Y turns the top toward the front (pitch), gyro X lowers the right side (roll)
  imuPitchRaw = 0.98f * (imuPitchRaw + IMU_PITCH_SIGN * (gy - gyroBiasY) * dt) + 0.02f * ap;
  imuRollRaw  = 0.98f * (imuRollRaw  + IMU_ROLL_SIGN  * (gx - gyroBiasX) * dt) + 0.02f * ar;
  imuPitch = imuPitchRaw - imuZeroPitch;
  imuRoll  = imuRollRaw  - imuZeroRoll;
  if (imuStream && millis() - imuLastPrintMs >= 200) { imuLastPrintMs = millis(); imuPrint(); }
}

void imuPrint() {
  if (!imuOk) { Serial.println("[IMU] not found"); return; }
  Serial.printf("[IMU] pitch %+5.1f° (%s)   roll %+5.1f° (%s)\n",
    imuPitch, fabsf(imuPitch) < 1 ? "level" : imuPitch > 0 ? "leans forward" : "leans back",
    imuRoll,  fabsf(imuRoll)  < 1 ? "level" : imuRoll  > 0 ? "leans right"   : "leans left");
}

void imuSetZero(bool clear) {
  imuZeroPitch = clear ? 0 : imuPitchRaw; imuZeroRoll = clear ? 0 : imuRollRaw;
  imuPrefs.begin("eeimu", false);
  imuPrefs.putFloat("zp", imuZeroPitch); imuPrefs.putFloat("zr", imuZeroRoll);
  imuPrefs.end();
  Serial.printf("[IMU] zero %s (pitch %.1f° roll %.1f°)\n", clear ? "cleared" : "set to current pose", imuZeroPitch, imuZeroRoll);
}

void i2cScan() {
  Serial.printf("  I2C:");
  int n = 0;
  for (uint8_t a = 1; a < 127; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) {
      Serial.printf(" 0x%02X%s", a, a == 0x40 ? " (PCA #1)" : a == 0x41 ? " (PCA #2)" : a == IMU_ADDR ? " (IMU)" : a == 0x70 ? " (PCA all-call)" : "");
      n++;
    }
  }
  Serial.println(n ? "" : " nothing found");
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
// ── LEGS ──
// Leg joints move by degrees away from their calibrated rest pose (the standing pose).
// Positive meanings: hip pitch + = leg forward, hip roll + = foot outward,
// knee + = bends more, ankle + = toe up. SIGN = which way +µs goes on each servo
// (measured 2026-10-24 with `step <joint> 100`).
#define LEG_US_PER_DEG 7.4f      // 270° servos: 2000 µs / 270°. If the RDS3225 are 180°, motion is 2/3 of what's asked (safe side).
const int8_t SIGN_HP_L = +1, SIGN_HP_R = -1;
const int8_t SIGN_HR_L = +1, SIGN_HR_R = -1;
const int8_t SIGN_K_L  = +1, SIGN_K_R  = +1;
const int8_t SIGN_A_L  = +1, SIGN_A_R  = -1;

void legDeg(uint8_t j, int8_t sign, float deg) {
  if (!joints[j].enabled) return;
  setJointUs(j, joints[j].restUs + sign * deg * LEG_US_PER_DEG);
}

// One leg: hip forward h, knee bend b. The ankle keeps the foot flat: ankle = b - h.
void legPose(bool left, float hipFwd, float knee) {
  float ankle = knee - hipFwd;
  if (left) { legDeg(L_HIP_PITCH, SIGN_HP_L, hipFwd); legDeg(L_KNEE, SIGN_K_L, knee); legDeg(L_ANKLE, SIGN_A_L, ankle); }
  else      { legDeg(R_HIP_PITCH, SIGN_HP_R, hipFwd); legDeg(R_KNEE, SIGN_K_R, knee); legDeg(R_ANKLE, SIGN_A_R, ankle); }
}

// Pelvis lean (deg). + = right side down: weight onto the right foot, the left foot lifts.
// Both legs stay vertical, so the feet stay flat: left foot turns inward, right outward by the same angle.
void pelvisLean(float a) {
  legDeg(L_HIP_ROLL, SIGN_HR_L, -a);
  legDeg(R_HIP_ROLL, SIGN_HR_R, +a);
}

// Gait settings, tunable over serial: gait sway|step|lift|hz <value>
float GAIT_SWAY = 12.0f;   // pelvis lean, deg
float GAIT_STEP = 8.0f;    // hip swing forward/back, deg
float GAIT_LIFT = 20.0f;   // knee bend of the swinging leg, deg
float GAIT_HZ   = 0.35f;   // steps per second (one full cycle = left + right step)
float leanNow = 0;

void animWalk(float t) {
  float ph = t * 2.0f * PI * GAIT_HZ;
  float S = sinf(ph), C = cosf(ph);
  float ramp = t < 2.0f ? t / 2.0f : 1.0f;             // ease in over 2 s
  float lean = GAIT_SWAY * S * ramp;                    // + = weight on the right foot
  float liftL = S > 0 ? S : 0, liftR = S < 0 ? -S : 0;  // the unloaded leg bends
  float kL = GAIT_LIFT * liftL * ramp, kR = GAIT_LIFT * liftR * ramp;
  pelvisLean(lean);
  legPose(true,  -GAIT_STEP * C * ramp + kL / 2, kL);
  legPose(false,  GAIT_STEP * C * ramp + kR / 2, kR);
  // arms swing against the legs, head follows a little
  setJoint(L_ARM, 0.3f + 0.3f * C);
  setJoint(R_ARM, 0.3f - 0.3f * C);
  setJoint(L_SHOULDER, 0.06f);
  setJoint(R_SHOULDER, 0.06f);
  setJoint(HEAD_PAN, 0.08f * S);
  setJoint(HEAD_TILT, 0.08f);
}

// ══════════════════════════════════════════════
// ── CALIBRATION IN FLASH ──
// ══════════════════════════════════════════════
Preferences prefs;
struct CalRec { float rest, end, mn, mx; uint8_t en; };

void loadCal() {
  prefs.begin("eecal", true);
  int n = 0;
  for (uint8_t j = 0; j < NUM_JOINTS; j++) {
    CalRec r;
    if (prefs.getBytesLength(joints[j].name) == sizeof(r) && prefs.getBytes(joints[j].name, &r, sizeof(r)) == sizeof(r)) {
      joints[j].restUs = r.rest; joints[j].endUs = r.end; joints[j].minUs = r.mn; joints[j].maxUs = r.mx; joints[j].enabled = r.en;
      n++;
    }
  }
  prefs.end();
  if (n) Serial.printf("[CAL] %d joints loaded from flash\n", n);
}

void saveCal() {
  prefs.begin("eecal", false);
  for (uint8_t j = 0; j < NUM_JOINTS; j++) {
    CalRec r = { joints[j].restUs, joints[j].endUs, joints[j].minUs, joints[j].maxUs, (uint8_t)joints[j].enabled };
    prefs.putBytes(joints[j].name, &r, sizeof(r));
  }
  prefs.end();
  Serial.println("[CAL] saved to flash");
}

void forgetCal() {
  prefs.begin("eecal", false); prefs.clear(); prefs.end();
  Serial.println("[CAL] flash cleared: the table in the code applies after a reset");
}

// joint by name or by PCA #1 channel number
int jointArg(const char* t) {
  if (t[0] >= '0' && t[0] <= '9') return jointForChannel(0, atoi(t));
  return findJoint(t);
}

// ══════════════════════════════════════════════
// ── SERIAL COMMANDS ──
// ══════════════════════════════════════════════
//   idle | wave | walk | stop       animations (stop = everything to rest)
//   rest                            all joints to rest, manual mode
//   joint <name> <amount>           e.g. joint r_shoulder 0.5   (0 = rest, 1 = end)
//   servo <ch> <deg>                raw degrees on PCA #1 (0° = 1500 µs, 10 µs/°), clamped
//   us <name|ch> <microseconds>     raw pulse, clamped to the joint's limits
//   step <name|ch> <+-microseconds> nudge a joint
//   lean <deg>                      pelvis lean to test balance (+ = weight on right foot)
//   gait sway|step|lift|hz <value>  tune the walk (defaults 12°, 8°, 20°, 0.35 Hz)
//   cal                             print the calibration table
//   scan                            read the ultrasonic sensors
// Calibrating a new joint (hang EE so the feet are off the table first):
//   enable <name> [us]              start driving it (at [us], default its rest)
//   off <name>                      stop driving it: no pulse, the servo goes limp
//   setrest / setend / setmin / setmax <name>   store the joint's current pulse
//   save                            write all calibration to flash (survives resets)
//   forget                          clear flash, back to the table in the code

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
  if (cmd == "idle")      { currentAnim = ANIM_IDLE; animT = 0; for (uint8_t j = L_HIP_ROLL; j <= R_ANKLE; j++) setJoint(j, 0); }
  else if (cmd == "wave") { currentAnim = ANIM_WAVE; animT = 0; }
  else if (cmd == "walk") { currentAnim = ANIM_WALK; animT = 0; }
  else if (sscanf(cmd.c_str(), "lean %f", &a) == 1) {   // test weight shift: lean 5, lean -5, lean 0
    currentAnim = ANIM_MANUAL; leanNow = clampf(a, -20, 20); pelvisLean(leanNow);
    Serial.printf("pelvis lean %.1f° (%s)\n", leanNow, leanNow > 0 ? "weight on right foot" : leanNow < 0 ? "weight on left foot" : "centre");
  }
  else if (sscanf(cmd.c_str(), "gait %7s %f", name, &a) == 2) {
    if (!strcmp(name, "sway")) GAIT_SWAY = clampf(a, 0, 20);
    else if (!strcmp(name, "step")) GAIT_STEP = clampf(a, 0, 20);
    else if (!strcmp(name, "lift")) GAIT_LIFT = clampf(a, 0, 40);
    else if (!strcmp(name, "hz")) GAIT_HZ = clampf(a, 0.1f, 1.0f);
    Serial.printf("gait: sway %.1f° step %.1f° lift %.1f° %.2f Hz\n", GAIT_SWAY, GAIT_STEP, GAIT_LIFT, GAIT_HZ);
  }
  else if (cmd == "stop" || cmd == "rest") { currentAnim = ANIM_MANUAL; allToRest(); }
  else if (cmd == "cal")  printCal();
  else if (cmd == "imu")      imuPrint();
  else if (cmd == "imu on")   { imuStream = true;  Serial.println("[IMU] streaming 5×/s — 'imu off' to stop"); }
  else if (cmd == "imu off")  { imuStream = false; Serial.println("[IMU] stream off"); }
  else if (cmd == "imu zero") imuSetZero(false);
  else if (cmd == "imu clear") imuSetZero(true);
  else if (cmd == "scan") {
    i2cScan();
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
  else if (sscanf(cmd.c_str(), "us %23s %f", name, &a) == 2 || sscanf(cmd.c_str(), "step %23s %f", name, &a) == 2) {
    int j = jointArg(name);
    if (j < 0 || !joints[j].enabled) { Serial.println("joint not enabled (use: enable <name>)"); return; }
    currentAnim = ANIM_MANUAL;
    setJointUs(j, cmd.startsWith("step") ? joints[j].targetUs + a : a);
    Serial.printf("%s → %.0f µs\n", joints[j].name, joints[j].targetUs);
  }
  else if (sscanf(cmd.c_str(), "enable %23s", name) == 1) {
    int j = jointArg(name);
    if (j < 0) { Serial.println("unknown joint"); return; }
    bool hasUs = sscanf(cmd.c_str(), "enable %23s %f", name, &a) == 2;
    Joint& J = joints[j];
    J.enabled = true; J.started = false;
    J.targetUs = clampf(hasUs ? a : J.restUs, J.minUs, J.maxUs);
    currentAnim = ANIM_MANUAL;
    Serial.printf("%s enabled at %.0f µs (limits %.0f..%.0f)\n", J.name, J.targetUs, J.minUs, J.maxUs);
  }
  else if (sscanf(cmd.c_str(), "off %23s", name) == 1) {
    int j = jointArg(name);
    if (j < 0) { Serial.println("unknown joint"); return; }
    joints[j].enabled = false; joints[j].started = false;
    pcaOff(joints[j].pca, joints[j].ch);
    Serial.printf("%s off (limp)\n", joints[j].name);
  }
  else if (cmd.startsWith("set") && sscanf(cmd.c_str() + 3, "%7s %15s", name, name + 8) == 2) {
    const char* what = name; const char* nm = name + 8;
    int j = jointArg(nm);
    if (j < 0) { Serial.println("unknown joint"); return; }
    Joint& J = joints[j]; float v = clampf(J.targetUs, PULSE_MIN, PULSE_MAX);
    if (!strcmp(what, "rest")) J.restUs = v;
    else if (!strcmp(what, "end")) J.endUs = v;
    else if (!strcmp(what, "min")) J.minUs = v;
    else if (!strcmp(what, "max")) J.maxUs = v;
    else { Serial.println("use setrest / setend / setmin / setmax"); return; }
    Serial.printf("%s %s = %.0f µs (type 'save' to keep it)\n", J.name, what, v);
  }
  else if (cmd == "save")   saveCal();
  else if (cmd == "forget") forgetCal();
  else if (sscanf(cmd.c_str(), "servo %d %f", &ch, &a) == 2) {
    int j = jointForChannel(0, ch);
    if (j < 0 || !joints[j].enabled) { Serial.println("channel not enabled"); return; }
    currentAnim = ANIM_MANUAL;
    setJointDeg(j, a);
    Serial.printf("ch%d (%s) → %.0f µs\n", ch, joints[j].name, joints[j].targetUs);
  }
  else Serial.println("commands: idle wave walk stop rest cal scan save forget | imu [on|off|zero|clear] | lean <deg> | gait sway|step|lift|hz <v> | joint <name> <0..1> | us/step <name> <us> | enable/off <name> [us] | setrest/setend/setmin/setmax <name>");
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

  loadCal();

  // Rest pose, one joint at a time to avoid a current spike
  for (uint8_t j = 0; j < NUM_JOINTS; j++) {        // every target set before any pulse goes out
    Joint& J = joints[j];
    J.minUs = clampf(J.minUs, PULSE_MIN, PULSE_MAX); J.maxUs = clampf(J.maxUs, PULSE_MIN, PULSE_MAX);
    J.targetUs = J.currentUs = clampf(J.restUs, J.minUs, J.maxUs);
    J.started = false;
  }
  for (uint8_t j = 0; j < NUM_JOINTS; j++) {        // then each joint to rest, one at a time
    Joint& J = joints[j];
    if (!J.enabled) continue;
    pcaSetUs(J.pca, J.ch, J.targetUs);
    J.started = true;
    delay(150);
  }

  sensorsInit();
  delay(300);       // let the frame settle before the IMU measures its gyro bias
  imuInit();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  for (int i = 0; i < 20 && WiFi.status() != WL_CONNECTED; i++) delay(250);
  wifiOk = WiFi.status() == WL_CONNECTED;
  if (wifiOk) { udp.begin(OSC_PORT); Serial.printf("[WIFI] %s  OSC :%d\n", WiFi.localIP().toString().c_str(), OSC_PORT); }
  else Serial.println("[WIFI] not connected — serial only");

  printCal();
  Serial.println("ready — type 'help' for commands");
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
  imuUpdate();

  switch (currentAnim) {
    case ANIM_IDLE:   animIdle(animT); break;
    case ANIM_WAVE:   animWave(animT); break;
    case ANIM_WALK:   animWalk(animT); break;
    case ANIM_MANUAL: break;
  }

  updateJoints(dt);
  delay(10);
}
