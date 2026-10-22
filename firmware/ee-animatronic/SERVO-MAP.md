# EE Animatronic — Servo Map

Sides are always **EE's own**: "left" = EE's left arm, as if you were EE.
Degrees are servo degrees: 0° = servo centre (1500 µs), 10 µs per degree.

## PCA9685 #1 (I2C 0x40)

| Ch | Joint | Servo | Rest | End | Limits | Status |
|----|-------|-------|------|-----|--------|--------|
| 0 | Head pan | MG996R | 0° | +45° (looks to one side; −45° the other) | −45 … +45 | calibrated |
| 1 | Head tilt | MG996R | 0° | −45° (looks down) | −45 … 0 | calibrated |
| 2 | Left shoulder (raises arm sideways) | MG996R | +20° | −90° (arm out to the side) | −90 … +20 | calibrated |
| 3 | Left arm (bends forward) | MG996R | +30° (straight) | −20° (slightly bent) | −20 … +30 | calibrated |
| 4 | Right shoulder (raises arm sideways) | MG996R | 0° | +90° (arm out to the side) | 0 … +90 | calibrated |
| 5 | Right arm (bends forward) | MG996R | −30° (straight) | +20° (slightly bent) | −30 … +20 | calibrated |
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

To calibrate a new joint (legs, wings):

1. Set its `enabled` to `true` in the `joints[]` table with wide-open limits only while testing.
2. Over serial, send `servo <ch> <deg>` and find rest and end positions.
3. Write rest, end, min and max into `joints[]`, then upload again.

Note: the shoulders are calibrated right at the servo's ±90° travel. If one buzzes or
gets warm at the end position, move its horn 2 teeth (≈29°) away from that end and
recalibrate it.

## Serial commands (115200)

`idle` `wave` `walk` `stop` `rest` `cal` `scan`
`joint <name> <amount>` — e.g. `joint r_shoulder 0.5`
`servo <ch> <deg>` — raw degrees, clamped to that joint's limits

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
| HC-SR04 right (head) | TRIG 42, ECHO 48 |

HC-SR04 ECHO is 5 V: use a divider (e.g. 1 kΩ + 2 kΩ) to bring it to 3.3 V.

## Power

- Servos: 6 V, 20 A supply (or 2S LiPo + 6 V regulators) → V+ terminal of each PCA9685
- 1000 µF capacitor on each PCA9685 V+
- ESP32-S3: its own 5 V; common ground with the servo supply
