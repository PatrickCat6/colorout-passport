# EE Animatronic — Servo & Motor Mapping

## Physical Scale
- Three.js character: voxel scale 0.035m/unit
- Animatronic: 1:2 scale → 56cm total height
- Spine (2020 extrusion): ~24cm
- Shoulders (2020): ~12cm
- Hips (2020): ~7cm

## PCA9685 Channel Map

| Ch | Joint        | Servo  | Axis          | Three.js Source          | Range (deg) |
|----|-------------|--------|---------------|--------------------------|-------------|
| 0  | Head        | MG996R | nod (pitch)   | head.rotation.x          | ±60        |
| 1  | Left Arm    | MG996R | swing (pitch) | leftArm.rotation.x       | ±90        |
| 2  | Right Arm   | MG996R | swing (pitch) | rightArm.rotation.x      | ±90 (inv)  |
| 3  | Waist       | MG996R | lean (pitch)  | torso.rotation.x         | ±45        |
| 4  | Left Hip    | MG996R | swing (pitch) | leftLeg.rotation.x       | ±60        |
| 5  | Right Hip   | MG996R | swing (pitch) | rightLeg.rotation.x      | ±60 (inv)  |
| 6  | Left Wing   | SG90   | flutter (yaw) | leftWing.rotation.y      | ±45        |
| 7  | Right Wing  | SG90   | flutter (yaw) | rightWing.rotation.y     | ±45 (inv)  |
| 8  | Left Ankle  | SG90   | comp (pitch)  | (derived from leg swing) | ±30        |
| 9  | Right Ankle | SG90   | comp (pitch)  | (derived from leg swing) | ±30 (inv)  |

## Animation Angles (from Three.js radians → degrees)

### Walk
- Leg swing: sin(phase) * 0.5 rad = **±28.6 deg**
- Arm swing: sin(phase) * 0.35 rad = **±20.1 deg** (opposite to legs)
- Head bob: sin(phase*2) * 0.02 rad = **±1.15 deg**
- Wing flutter: sin(t * 0.012) * 0.22 rad = **±12.6 deg**
- Walk speed: phase += dt * 8

### Wave
- Right arm raise: -0.8 rad = **-45.8 deg** (peak, sin envelope 0→1→0)
- Duration: 0.8s (physical) / 0.4s (Three.js)
- All other joints neutral

### Crouch
- Torso tilt: 0.18 rad = **10.3 deg** forward
- Head tilt: 0.09 rad = **5.2 deg** forward (half of torso)
- Leg flex: -0.25 rad = **-14.3 deg** backward
- Duration: 0.8s (physical) / 0.4s (Three.js)

### Idle
- All joints near zero with micro-movement
- Wing flutter: sin(t * 0.006) * 0.1 rad = **±5.7 deg** (slow breathing)

## Motor Wiring (TB6612FNG)

### Board 1 — Differential Drive
| Function    | ESP32 Pin | TB6612 Pin |
|-------------|-----------|------------|
| Standby     | GPIO 4    | STBY       |
| Left Dir A  | GPIO 5    | AIN1       |
| Left Dir B  | GPIO 6    | AIN2       |
| Left PWM    | GPIO 7    | PWMA       |
| Right Dir A | GPIO 15   | BIN1       |
| Right Dir B | GPIO 16   | BIN2       |
| Right PWM   | GPIO 17   | PWMB       |

### Board 2 — Center Motor
| Function    | ESP32 Pin | TB6612 Pin |
|-------------|-----------|------------|
| Standby     | GPIO 18   | STBY       |
| Center Dir A| GPIO 10   | AIN1       |
| Center Dir B| GPIO 11   | AIN2       |
| Center PWM  | GPIO 12   | PWMA       |

### N20 Motors
- 3× N20 30RPM 6V with metal gearbox
- Wheels: micro N20 D-shaft rubber wheels
- Caster balls for passive stability
- Differential steering: left/right speed difference = turn

## Ultrasonic Sensors (HC-SR04)

| Sensor       | Trig Pin | Echo Pin |
|-------------|----------|----------|
| Front       | GPIO 35  | GPIO 36  |
| Left-Front  | GPIO 37  | GPIO 38  |
| Right-Front | GPIO 39  | GPIO 40  |
| Left        | GPIO 41  | GPIO 42  |
| Right       | GPIO 47  | GPIO 48  |

Obstacle threshold: 15cm

## I2C (PCA9685)
- SDA: GPIO 8
- SCL: GPIO 9
- Address: 0x40
- Clock: 400kHz

## Power
- Servos + Motors: 6V 5A external supply → PCA9685 V+ and TB6612 VM
- ESP32-S3: USB-C (5V) or 3.3V from regulator
- 1000µF capacitor on servo power rail
- **Important**: Common ground between ESP32, PCA9685, and TB6612

## OSC Control (from TouchDesigner)
- Port: 9000 (UDP)
- `/ee/anim <string>` — idle, walk, wave, crouch, osc
- `/ee/walk <0|1>` — toggle walking + motors
- `/ee/servo <ch> <angle>` — direct joint control (degrees)
- `/ee/motor <left> <right>` — direct motor control (-255 to 255)
- `/ee/stop` — emergency stop all

## Serial Commands (USB debug)
`idle` `walk` `wave` `crouch` `stop` `center` `scan` `servo <ch> <deg>` `motor <L> <R>`

## Assembly Notes
1. Build spine first (24cm 2020 extrusion vertical)
2. Mount shoulder bar (12cm) with corner brackets at armPivotY
3. Mount hip bar (7cm) with corner brackets at legPivotY
4. Attach MG996R servos using servo mount brackets
5. Wire PCA9685 → servos with Dupont cables
6. Test each servo individually with `servo <ch> <angle>` command
7. Wire TB6612FNG → N20 motors
8. Mount wheels and casters on hidden base platform
9. Attach SG90 ankle servos last
10. Calibrate center positions — adjust `centerUs` values in firmware
