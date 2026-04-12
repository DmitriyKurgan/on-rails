
The result must feel like a premium mobile/arcade racing game.

---

## 🧠 GAME CONCEPT

Game Type:
- Arcade Racing
- Endless / On-rails hybrid
- Water slide / tropical theme

Core Gameplay:
- automatic forward movement
- player controls horizontal movement
- optional boost system
- obstacle avoidance

---

## 🏗️ PROJECT ARCHITECTURE


src/

core/
Engine.ts
GameLoop.ts
EventBus.ts

graphics/
Renderer.ts
SceneManager.ts
CameraController.ts
Lights.ts

world/
Environment.ts
Road.ts
Props.ts

entities/
Player/
Player.ts
PlayerController.ts
PlayerPhysics.ts

effects/
postprocessing/
Composer.ts
BloomEffect.ts
GlitchEffect.ts
ColorGrading.ts

shaders/
glitch.glsl
water.glsl

assets/
models/
textures/
skyboxes/

loaders/
AssetLoader.ts

config/
graphics.config.ts
game.config.ts

utils/
math.ts
helpers.ts

main.ts
App.ts


---

## ⚙️ TECHNOLOGY STACK

Use:

- Three.js (WebGL renderer)
- GLSL shaders
- GLTF/GLB models

Optional:
- React Three Fiber (if using React)

---

## 🧱 CORE ENGINE

### Engine Responsibilities

- initialize renderer
- initialize scene
- initialize camera
- start game loop

---

### Game Loop


update():
update player
update camera
update world
update shaders

render():
render scene with postprocessing


---

## 🎥 CAMERA SYSTEM

- third-person follow camera
- smooth lerp movement
- slight tilt on turns
- always look at player

Key requirement:
- NO snapping (only smooth interpolation)

---

## 🚤 PLAYER SYSTEM

Player:
- jet ski model (GLB)
- speed parameter
- position bound to track

Controls:
- left / right movement
- boost (optional)

Movement logic:
- forward movement is automatic
- horizontal offset inside track

---

## 🛣️ TRACK SYSTEM

Use spline-based track:

- CatmullRomCurve3
- generate mesh along spline

Track features:
- smooth curves
- vertical drops
- banking (tilted turns)
- tube sections

---

## 🌴 ENVIRONMENT

Assets:
- tropical island
- palm trees
- rocks
- vegetation
- skybox

Techniques:
- instancing for repeated objects
- stylized shading
- strong color palette

---

## 🌊 WATER SYSTEM

### Shader-based water

Core behavior:


uv.x += sin(time + uv.y * frequency) * amplitude
uv.y += cos(time + uv.x * frequency) * amplitude


Visual goals:
- turquoise color
- smooth waves
- animated distortion

Optional:
- reflections
- foam particles

---

## 💡 LIGHTING

Use combination:

- Directional Light (sun)
- Ambient Light
- Hemisphere Light

Optional:
- shadows
- ambient occlusion

Goal:
- bright tropical look
- strong highlights

---

## 💥 POST-PROCESSING (CRITICAL)

Must include:

### 1. Bloom
- glow on highlights

### 2. Color Grading
- increase saturation
- adjust contrast

### 3. Glitch Effect (optional stylistic)

---

## 🔥 GLITCH SHADER

Core idea:


slice = floor(uv.y * N)
offset = sin(slice + time) * intensity
uv.x += offset


Effect:
- horizontal distortion
- screen slicing
- dynamic shifts

---

## 🎨 VISUAL STYLE RULES

To achieve premium look:

### DO:
- use gradients (not flat colors)
- bright tropical palette (turquoise, green, orange)
- particles (water splash, speed effects)
- smooth animations with easing

### DO NOT:
- too many materials
- too many textures
- dynamic shader creation per frame

---

## 📦 ASSETS REQUIREMENTS

### Models:
- jet ski (player)
- track segments
- environment props

### Format:
- GLB

### Textures:
- albedo
- normal
- roughness

---

## ⚡ PERFORMANCE RULES

- use instancing (trees, props)
- reuse materials
- limit draw calls
- use texture atlases
- avoid unnecessary shaders

---

## 🧪 MVP DEVELOPMENT PLAN

Day 1:
- scene + camera
- player (simple mesh)

Day 2:
- movement system

Day 3:
- spline track

Day 4:
- environment

Day 5:
- water + lighting

Day 6:
- post-processing

Day 7:
- polish

---

## 🎯 FINAL REQUIREMENTS

The game must:

- run in browser (HTML + JS)
- use Three.js
- be modular and scalable
- look visually polished
- feel smooth and responsive

---

## 🚀 TASK FOR CLAUDE

Using this specification:

1. Generate full step-by-step implementation plan
2. Create complete code structure
3. Implement systems incrementally
4. Provide shaders and configurations
5. Optimize performance
6. Ensure production-quality result

The output must NOT be a prototype.
It must be structured, clean, and extensible.