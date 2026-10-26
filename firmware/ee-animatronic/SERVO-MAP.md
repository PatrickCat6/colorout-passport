# EE Animatronic — Servo Map

Sides are always **EE's own**: "left" = EE's left arm, as if you were EE.
Calibration is stored as the pulse each servo receives (µs, 1500 = centre).
The `servo <ch> <deg>` command uses one scale for every channel: 0° = 1500 µs, 10 µs per degree.

## PCA9685 #1 (I2C 0x40)

Head and arms measured by hand on 2026-10-21 with the previous firmware, converted to the pulse each servo actually got
(that firmware scaled and inverted each channel differently, and clamped ch4 to ±60).

| Ch | Joint | Servo | Rest | End | Limits | Status |
|----|-------|-------|------|-----|--------|--------|
| 0 | Head pan | MG996R | 1500 µs | 2175 µs (looks to one side; 825 µs the other) | 825 … 2175 | calibrated |
| 1 | Head tilt | MG996R | 1500 µs | 1050 µs (looks down) | 1050 … 1500 | calibrated |
| 2 | Left shoulder (raises arm sideways) | MG996R | 1300 µs | 2400 µs (arm out to the side) | 1300 … 2400 | calibrated |
| 3 | Left arm (bends forward) | MG996R | 1950 µs (straight) | 1200 µs (slightly bent) | 1200 … 1950 | calibrated |
| 4 | Right shoulder (raises arm sideways) | MG996R | 1600 µs (moved 10° in) | 600 µs (arm out to the side) | 600 … 1700 | calibrated |
| 5 | Right arm (bends forward) | MG996R | 1033 µs (straight) | 1811 µs (slightly bent) | 1033 … 1811 | calibrated |
| 6 | Left hip roll | DS3218 | — | — | — | to calibrate |
| 7 | Right hip roll | DS3218 | — | — | — | to calibrate |
| 8 | Left hip pitch | DS3218 | — | — | — | to calibrate |
| 9 | Right hip pitch | DS3218 | — | — | — | to calibrate |
| 10 | Left knee | RDS3225 | — | — | — | to calibrate |
| 11 | Right knee | RDS3225 | — | — | — | to calibrate |
| 12 | Left ankle | RDS3225 | — | — | — | to calibrate |
| 13 | Right ankle | RDS3225 | — | — | — | to calibrate |
| 14 | Left wing | SG90 | — | — | — | to calibrate |
| 15 | Right wing | SG90 | — | — | — | to calibrate |

## PCA9685 #2 (I2C 0x41, solder jumper A0)

Reserved for the elbows (2× MG90S) and anything added later.

## How calibration works

Each joint has a **rest** and an **end** position. Animations ask for an *amount*:
0 = rest, 1 = end, 0.5 = halfway. Every command is clamped to the joint's limits,
so no animation can push a joint past what was tested by hand.

To calibrate a new joint (legs, wings) — no code changes, everything over serial:

1. Hang EE so the feet are off the table (the first pulse moves the servo at once).
2. `enable l_knee 1500` starts driving the joint at 1500 µs (or any pulse you give).
3. Move it with `us l_knee 1450` or `step l_knee -20` until it is in the rest pose.
4. `setrest l_knee`, then move to the other end and `setend l_knee`.
   Optional hard limits: move to each safe extreme and `setmin` / `setmax`.
5. `save` writes everything to flash; it survives resets and new uploads.
   `off l_knee` makes a joint limp again; `forget` clears flash.

Leg order in the current build (top to bottom): hip pitch (DS3218, ch 8/9) → hip roll
(DS3218, ch 6/7) → knee (RDS3225, ch 10/11) → ankle (RDS3225, ch 12/13).

Leg directions (what +µs does, measured 2026-10-24): left hip pitch forward / right backward ·
left hip roll foot out / right foot in · both knees bend · left ankle toe up / right toe down.
The firmware turns these into one meaning per joint (hip + = forward, roll + = foot out,
knee + = bend, ankle + = toe up) with a sign per servo.

## Walking

`lean <deg>` tilts the pelvis to shift weight (+ = onto the right foot). On its own both feet stay down and roll onto their edges.
`shift <lean> <knee>` holds one step: lean plus the other knee bending (feet kept flat in pitch), e.g. `shift 6 15` = stand on the right foot, left foot up. `shift 0 0` or `rest` to return.
`walk` = sway gait: the pelvis leans over one foot, the other leg bends its knee and swings.
`gait sway|step|lift|hz <value>` tunes it (defaults 12°, 8°, 20°, 0.35 Hz). `stop` or `idle` returns to the standing pose.

Note: both shoulders end right at 600 / 2400 µs, the end of the servo's travel. If one buzzes or
gets warm at the end position, move its horn 2 teeth (≈29°) away from that end and
recalibrate it.

## Serial commands (115200)

`idle` `wave` `walk` `stop` `rest` `cal` `scan` `save` `forget` `imu [on|off|zero|clear]` `lean <deg>` `gait sway|step|lift|hz <v>`
`joint <name> <amount>` — e.g. `joint r_shoulder 0.5`
`servo <ch> <deg>` — raw degrees on the common scale, clamped to that joint's limits
`us <name|ch> <µs>` — raw pulse, clamped · `step <name> <±µs>` — nudge
`enable <name> [µs]` · `off <name>` · `setrest|setend|setmin|setmax <name>`

## IMU (tilt)

GY-521 upright on the front of the pelvis: chip facing forward, X arrow up (Y then points to EE's right) (axes remapped in `imuRead`). EE must stay still for half a second at boot (gyro bias).
`imu` prints the tilt once · `imu on` / `imu off` streams it 5×/s · `imu zero` takes the current pose as level (saved in flash) · `imu clear` removes that offset.
pitch + = leans forward, roll + = leans to EE's right. If a direction reads reversed, flip `IMU_PITCH_SIGN` / `IMU_ROLL_SIGN`.
`scan` now also lists the I2C devices: expect 0x40 (PCA) and 0x68 (IMU).

## OSC (UDP 9000, TouchDesigner)

- `/ee/anim <string>` — idle, wave, walk, stop
- `/ee/joint <string name> <float amount>`
- `/ee/servo <int ch> <float deg>`

## Other pins

| Function | Pins |
|----------|------|
| I2C (both PCA9685) | SDA GPIO 8, SCL GPIO 9 |
| HC-SR04 front (belly) | TRIG 38, ECHO 39 |
| HC-SR04 left (head) | TRIG 40, ECHO 41 |
| HC-SR04 right (head) | TRIG 42, ECHO 47 (not 48: the board's RGB LED) |
| IMU GY-521 / MPU6050 (0x68) | same I2C bus: from the PCA9685's spare header (GND, SCL, SDA, VCC); never V+ |

HC-SR04 ECHO is 5 V: use a divider (e.g. 1 kΩ + 2 kΩ) to bring it to 3.3 V.

## Power

- Servos: 6 V, 20 A supply (or 2S LiPo + 6 V regulators) → V+ terminal of each PCA9685
- 1000 µF capacitor on each PCA9685 V+
- ESP32-S3: its own 5 V; common ground with the servo supply
