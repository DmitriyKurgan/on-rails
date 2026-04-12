# Implementation Plan — On-Rails Water Slide Racer

Цель: пошагово собрать игру с визуалом, идентичным [assets/on-rails-view.png](assets/on-rails-view.png) —
тропический водный слайд, джет-ски от третьего лица, оранжевые борта-тюбы,
бирюзовая анимированная вода, bloom/цветокоррекция, аркадный HUD.

Стек: **Three.js + GLSL + GLB + Vite (TypeScript)**. Архитектура — по [instruction.md](instruction.md).

---

## 📚 Spec Pack (single source of truth)

Эти артефакты сгенерированы Tier 1 агентами `game-factory-plugin-ultra-v5`,
адаптированными под 3D. Любое значение в коде должно проверяться против них.

- [spec/project_normalized_spec.md](spec/project_normalized_spec.md) — нормализованная спека, ~130 требований с ID (REQ-XXX), 36 сущностей (E001–E036), interaction matrix, state machine, 23 помеченные неоднозначности
- [spec/literal_values_registry.json](spec/literal_values_registry.json) — 68 литералов с ID (LIT-UI-xxx, LIT-COLOR-xxx, ...): HUD-строки, цвета, размерности, настройки рендера, шейдерные формулы, controls
- [spec/art_direction_pack.md](spec/art_direction_pack.md) — палитра (60+ токенов), per-entity визуал, освещение, post-processing, water shader goals, HUD style, depth rings A–E, anti-patterns
- [spec/gameplay_blueprint.md](spec/gameplay_blueprint.md) — core loop, 5-фазная pacing curve (120s), risk/reward, input→feel, win/lose, juice hooks
- [spec/level_design_pack.md](spec/level_design_pack.md) — трек "Coral Kahuna Slide" (~2000 u, 26 spline point'ов), 10 секций, prop zones, rival start positions, boost pickups, air-time зоны (включая Canyon Plunge → `2.3 s`)

**Правила привязки к спеке:**
- [x] Все литералы из `literal_values_registry.json` идут через `CFG.*` / `UI_STRINGS.*` — никаких magic numbers в коде
- [x] Каждый чекбокс этого плана должен ссылаться на соответствующий REQ/LIT/E-ID при реализации
- [x] Новые значения (не из спеки) добавляются только после обновления `literal_values_registry.json`
- [x] При конфликте instruction.md ↔ spec/ — побеждает `spec/` (нормализованная версия)

---

## Референс-анализ (что именно нужно воспроизвести)

- [x] Трек: жёлоб из двух оранжево-красных бортов (torus-like tubes) + синее дно-вода
- [x] Вода в жёлобе: бирюзовая, с белыми пенными полосами вдоль направления движения
- [x] Игрок: зелёно-жёлтый джет-ски с райдером, камера сзади-сверху, лёгкий tilt
- [x] Соперник впереди (минимум 1 AI-джетски, фиолетовый)
- [x] Окружение: левый берег — лагуна с пальмами и хижиной на сваях; правый — скала с водопадами, тики-хижинами, пальмами, цветами
- [x] Скайбокс: ясное тропическое небо с облаками
- [x] Пост-процесс: Bloom (сильный на бликах воды), color grading (saturation↑, contrast↑)
- [x] HUD поверх канваса: pause+POS, TIME+AIR TIME, mini-map, power-up, BOOST

---

## Этап 0 — Bootstrap проекта

- [x] `npm create vite@latest on-rails -- --template vanilla-ts`
- [x] Установить: `three`, `@types/three`, `postprocessing` (для Bloom/ColorGrading композера)
- [x] Настроить Vite: `public/assets/` для моделей и текстур, алиас `@/` → `src/`
- [x] Создать дерево папок согласно [instruction.md](instruction.md) (`core/`, `graphics/`, `world/`, `entities/`, `effects/`, `shaders/`, `loaders/`, `config/`, `utils/`)
- [x] `index.html`: полноэкранный `<canvas id="game">` + оверлей `<div id="hud">`
- [x] `main.ts` → создаёт `App`, `App` → создаёт `Engine`

---

## Этап 0.5 — Config из literal registry

Ручной аналог плагинного `config-code-generator`: превратить [literal_values_registry.json](spec/literal_values_registry.json) в TS-модули.

- [x] `src/config/CFG.ts` — плоский объект со всеми численными литералами, сгруппированный по доменам (`render`, `camera`, `track`, `player`, `rivals`, `water`, `bloom`, `grading`, `particles`), каждое поле помечено комментарием `// LIT-XXX-###`
- [x] `src/config/UI_STRINGS.ts` — все HUD-строки: `pos`, `time`, `airTime`, `boost`, `pauseGlyph`, format-функции для таймера (`mm:ss.SS`)
- [x] `src/config/COLORS.ts` — палитра из `art_direction_pack.md` (60+ hex-токенов), типизированная как `readonly`
- [x] `src/config/TRACK_POINTS.ts` — 26 control point'ов из [level_design_pack.md](spec/level_design_pack.md) в формате `{ pos: Vector3, roll: number, label: string }[]`
- [x] Единая точка импорта `@/config` → реэкспорт всех перечисленных модулей
- [x] Никто кроме `config/` не пишет литералы; все остальные модули импортируют `CFG.*` / `UI_STRINGS.*` / `COLORS.*`

**Проверка:** `grep -r "#[0-9a-f]\{6\}" src/ --exclude-dir=config` должен возвращать пусто.

---

## Этап 1 — Core Engine и Game Loop

- [x] [core/Engine.ts](src/core/Engine.ts): инициализирует `WebGLRenderer` (antialias, `outputColorSpace = SRGBColorSpace`, `toneMapping = ACESFilmicToneMapping`, `toneMappingExposure ≈ 1.1`), сцену, камеру, привязку к канвасу, resize-обработчик
- [x] [core/GameLoop.ts](src/core/GameLoop.ts): `requestAnimationFrame` + фиксированный `dt`, вызывает `update(dt)` → `render()`
- [x] [core/EventBus.ts](src/core/EventBus.ts): простой `emit/on` для связи HUD ↔ gameplay (score, boost, lap)
- [x] [config/graphics.config.ts](src/config/graphics.config.ts): DPR cap, shadows on/off, bloom params
- [x] [config/game.config.ts](src/config/game.config.ts): speed, boost multiplier, track length, AI count

**Проверка:** пустая чёрная сцена с fps counter, лог `update/render` тикает.

---

## Этап 2 — Scene, Camera, Lights (базовый каркас)

- [x] [graphics/SceneManager.ts](src/graphics/SceneManager.ts): создаёт `Scene`, цвет фона (временно небесно-голубой), fog (лёгкий, бирюзовый, далёкий)
- [x] [graphics/CameraController.ts](src/graphics/CameraController.ts): `PerspectiveCamera(60°)`, follow-режим с `lerp`, offset `(0, 3.5, 7)` позади игрока, `lookAt` с упреждением по направлению движения, лёгкий `roll` на банкинге. **Никаких snap'ов — только интерполяция.**
- [x] [graphics/Lights.ts](src/graphics/Lights.ts):
  - [x] `DirectionalLight` (солнце), тёплый (`#fff3d6`), intensity ≈ 2.5, угол сверху-сбоку
  - [x] `HemisphereLight` (небо бирюзовое / земля песочная), intensity ≈ 0.6
  - [x] `AmbientLight` слабый fill
  - [x] Тени на солнце (`PCFSoftShadowMap`), shadow camera по области вокруг игрока

**Проверка:** временный куб-плейсхолдер на сцене, камера плавно следует.

---

## Этап 3 — Spline-трек (геометрия жёлоба)

Использует [TRACK_POINTS из level_design_pack.md](spec/level_design_pack.md) — 26 контрольных точек трека "Coral Kahuna Slide" (~2000 u).

- [x] [world/Road.ts](src/world/Road.ts):
  - [x] `CatmullRomCurve3` из `CFG.track.points` (секции: старт → Lagoon Bend → Cliff Sprint → Waterfall Drop → Tiki Tube → Lagoon Cove → Canyon Plunge → Finish Arch)
  - [x] `curve.computeFrenetFrames(CFG.track.segments)` — переиспользуемые фреймы
  - [x] Интерполяция `roll`-угла из control point'ов (банкинг `±18°..±22°` на Tiki Tube)
  - [x] **Дно** жёлоба: кастомный mesh — полоса шириной `CFG.track.width` по нормали Frenet-фрейма, UV-развёртка вдоль `t` (для water-шейдера)
  - [x] **Два борта**: `TubeGeometry` слева/справа, радиус `CFG.track.wallRadius`, `MeshStandardMaterial` с `COLORS.wall_orange` + `emissive: COLORS.wall_rim`, `roughness: 0.25`, `metalness: 0.1` → bloom на рантайме подсветит края
  - [x] Публичное API: `getPointAt(t)`, `getTangentAt(t)`, `getFrameAt(t)` — используется игроком, AI, камерой, частицами
  - [x] Tube section (t ∈ [0.45, 0.60]): полное кольцо вокруг игрока — `TubeGeometry` большого радиуса с внутренней текстурой
- [x] [world/Sections.ts](src/world/Sections.ts) — таблица из level pack: `[{tStart, tEnd, feature, intensity, biome, ring}]` для триггеров air-time / prop density / camera bias

**Проверка:** видно длинный жёлоб с оранжевыми бортами, банкинг визуально читается, Tiki Tube оборачивает игрока.

---

## Этап 4 — Water-шейдер дна жёлоба

- [x] [shaders/water.glsl](src/shaders/water.glsl) (vertex + fragment как раздельные строки в TS):
  - [x] Вершинный: небольшая синусоидальная волна по `position.y` от `time` и `uv`
  - [x] Фрагментный:
    - [x] базовый бирюзовый градиент (мелководье → глубина) по `uv.y` или по `worldPos.y`
    - [x] UV-дисторсия: `uv.x += sin(time + uv.y*freq)*amp; uv.y += cos(time + uv.x*freq)*amp;`
    - [x] белые «пенные» полосы: `smoothstep` на периодическом паттерне вдоль направления движения, сдвигается по `time`
    - [x] фресневое осветление по краям для bloom-хайлайтов
- [x] `ShaderMaterial` с `uniforms: { uTime, uColorShallow, uColorDeep, uFoamIntensity }`, применить к дну `Road`
- [x] В `GameLoop.update` инкрементировать `uTime`

**Проверка:** дно жёлоба — анимированная бирюзовая вода с белыми полосами, как на референсе.

---

## Этап 5 — Игрок (джет-ски) и контроллер

- [x] [assets/models/jetski_player.glb](public/assets/models/jetski_player.glb) — GLB модель джет-ски + райдер (плейсхолдер можно собрать из примитивов: корпус = BoxGeometry со скошенными углами зелёно-жёлтый, сиденье, руль, капсула-райдер в жилете)
- [x] [loaders/AssetLoader.ts](src/loaders/AssetLoader.ts): `GLTFLoader`, `TextureLoader`, промис-обёртка, кеш
- [x] [entities/Player/Player.ts](src/entities/Player/Player.ts): держит mesh, текущий `t` вдоль кривой, `lateralOffset` (−1..+1), скорость
- [x] [entities/Player/PlayerController.ts](src/entities/Player/PlayerController.ts): клавиши `A/D` и `←/→` → цель `lateralOffset`, пробел → boost
- [x] [entities/Player/PlayerPhysics.ts](src/entities/Player/PlayerPhysics.ts):
  - [x] автоматическое продвижение `t += speed * dt / curveLength`
  - [x] `lateralOffset` smooth-damp к цели
  - [x] итоговая позиция: `pos = curve.getPointAt(t) + frame.binormal * lateralOffset * halfWidth`
  - [x] ориентация: `lookAt(pos + tangent)`, наклон по рулю (`roll` от скорости изменения offset)
- [x] Ограничение: `lateralOffset` зажато, чтобы не выезжать за борта

**Проверка:** джет-ски едет сам, игрок смещается влево/вправо, камера плавно сопровождает.

---

## Этап 6 — Окружение и скайбокс

- [x] [assets/skyboxes/](public/assets/skyboxes/) — CubeTexture тропического неба (или процедурный `Sky` из three/examples)
- [x] [world/Environment.ts](src/world/Environment.ts): ставит скайбокс, дальний fog цвет совпадает с горизонтом
- [x] [world/Props.ts](src/world/Props.ts):
  - [x] GLB плейсхолдеры: `palm.glb`, `rock.glb`, `tiki_hut.glb`, `flower_bush.glb`
  - [x] **InstancedMesh** для пальм/скал/цветов — раскидать вдоль кривой по обе стороны с джиттером позиции/поворота/масштаба
  - [x] Детерминированный seed, чтобы расстановка была стабильной
  - [x] Левая сторона: больше пальм + песчаный островок с хижиной; правая: скала выше, водопады (плоскость с water-шейдером вертикально), тики-хижины
- [x] Водопады: reuse water shader с вертикальным UV-скроллом, белая пена у основания (плоскость-сплэш)
- [x] «Остров-лагуна» на среднем плане: низкополи mesh + бирюзовая вода-плоскость вокруг

**Проверка:** трек проходит сквозь насыщенное тропическое окружение, похожее на референс.

---

## Этап 7 — AI-соперники

Точные стартовые позиции — из [level_design_pack.md](spec/level_design_pack.md) §"Rival start positions".

- [x] `entities/AI/RivalJetski.ts`: та же GLB-модель, цвет корпуса через instance-color
- [x] **5 соперников** (E007–E011, REQ-040..044), стартуют в первых 40 u трека:
  - [x] **Leader** — фиолетовый (`COLORS.rival_purple`), `t = 0.020`, speed × 1.08, всегда впереди игрока в начале (соответствует фото)
  - [x] Mid-pack: красный, синий, жёлтый, speed × 0.96–1.02
  - [x] Tail: бирюзовый, speed × 0.92
  - [x] Игрок стартует на `seedPosition = 2` → HUD сразу показывает `POS 2/6`
- [x] Простая AI: целевой `lateralOffset` = шум Перлина по `t`, избегание игрока (если игрок ближе чем `CFG.rivals.avoidDist` по latitude — сместиться в противоположную сторону)
- [x] Race position: сортировка по `t` каждый кадр → эмит `eventBus.emit('pos', { player: N, total: 6 })`
- [x] AI замедляются у `CFG.rivals.trafficJamRadius` от boost pickup'ов (создаёт игровые ситуации)

**Проверка:** на старте впереди едет фиолетовый Leader, HUD показывает `POS 2/6`, при обгонах счётчик меняется.

---

## Этап 8 — Post-processing (bloom + color grading)

Точные параметры — из [art_direction_pack.md](spec/art_direction_pack.md) §"Post-Processing Recipe". Порядок пассов фиксирован.

- [x] [effects/postprocessing/Composer.ts](src/effects/postprocessing/Composer.ts): `EffectComposer` из `postprocessing` либы, пайплайн: `RenderPass → Bloom → ColorGrading → Vignette → SMAA → (опц. Glitch)`
- [x] [effects/postprocessing/BloomEffect.ts](src/effects/postprocessing/BloomEffect.ts): параметры из `CFG.bloom` (threshold `0.72`, intensity `1.0`, radius `0.55`) — подсвечивает оранжевый rim бортов и белую пену
- [x] [effects/postprocessing/ColorGrading.ts](src/effects/postprocessing/ColorGrading.ts):
  - [x] `HueSaturationEffect` — `saturation: CFG.grading.saturation` (+0.18)
  - [x] `BrightnessContrastEffect` — `contrast: CFG.grading.contrast` (+0.10)
  - [x] Warm mid-tone shift + temperature +5 (через LUT или кастомный effect)
  - [x] `VignetteEffect` — `darkness: 0.25`, `offset: 0.5`
- [x] [shaders/glitch.glsl](src/shaders/glitch.glsl) + [effects/postprocessing/GlitchEffect.ts](src/effects/postprocessing/GlitchEffect.ts): формула из registry `LIT-SHADER-GLITCH-*`, триггер — **только damage/crash** (не на boost, по решению art pack)
- [x] В `Engine.render()` вместо `renderer.render` вызывать `composer.render(dt)`

**Проверка:** вода и rim бортов светятся; на статичном скриншоте из игры цвета совпадают с `on-rails-view.png` в пределах ±5% яркости.

---

## Этап 9 — Частицы и фидбек

- [x] Водный след за джет-ски: `Points` с custom shader (белые брызги, живут 0.3–0.6 с, fade out)
- [x] Боковые брызги при резком повороте
- [x] Speed-lines / радиальное размытие центра при активном boost (простой radial blur pass или спрайты)
- [x] Звуки (опционально): двигатель, вода, boost — `THREE.Audio`

**Проверка:** при движении за джет-ски остаётся белый пенный след, на boost — скорость читается визуально.

---

## Этап 10 — HUD (DOM-оверлей)

HUD рисуем в DOM поверх канваса. Все строки — из `UI_STRINGS` (которые идут из [literal_values_registry.json](spec/literal_values_registry.json) §ui_string). Стиль — из [art_direction_pack.md](spec/art_direction_pack.md) §"HUD Visual Style".

- [x] [src/hud/hud.css](src/hud/hud.css): тёмные пилюли `COLORS.hud_bg` (темно-синий 55%), `backdrop-filter: blur(8px)`, stroke `1.5px` белым, `border-radius: 18px`, drop-shadow; condensed bold typography
- [x] **Левый верх** (E030, REQ-300): кнопка `UI_STRINGS.pauseGlyph` + пилюля `UI_STRINGS.pos` + `{player}/{total}` → рендерится как `POS 2/6` на старте
- [x] **Правый верх** (E031, REQ-301): пилюля `UI_STRINGS.time` + `mm:ss.SS` формат (на старте `00:00.00`, в Canyon Plunge момент ≈ `00:45.36`); под ней красная пилюля `UI_STRINGS.airTime` + `{N.N} s` — **показывается только когда `airTime ≥ 0.3s`** (по gameplay blueprint)
- [x] **Правый низ** (E032, REQ-302): круглая иконка bottle power-up + большая круглая кнопка `UI_STRINGS.boost` с SVG-дугой заряда (cyan тики на bloom)
- [x] **Левый низ** (E033, REQ-303): мини-мап, круг `d=120px`, SVG-path = проекция `curve` на XZ, точка игрока (зелёная) + соперники (цвета из rival palette)
- [x] HUD слушает `EventBus` каналы (из registry §events): `hud:pos`, `hud:time`, `hud:airtime`, `hud:boost`, `hud:minimap`
- [x] Mobile: touch-zones для steering, кнопка BOOST — тач-таргет ≥ 64px

**Проверка:** side-by-side с `on-rails-view.png` — позиции, цвета, текст пилюль совпадают; скриншот в 45-ю секунду гонки даёт `TIME 00:45.36`, `AIR TIME 2.3 s` при прыжке с Canyon Plunge.

---

## Этап 11 — Air time и вертикальные дропы

Зоны air-time зафиксированы в [level_design_pack.md](spec/level_design_pack.md) §"Air time opportunities".

- [x] **Waterfall Drop** (~t=0.32) → ожидаемый air time ≈ `1.1 s` (REQ-052)
- [x] **Canyon Plunge** (~t=0.82) → ожидаемый air time **`2.3 s`** (REQ-053, LIT-UI-006) — это hero moment с фото
- [x] `PlayerPhysics.update`: если `tangent.y < CFG.player.detachThreshold` и `speed > CFG.player.detachMinSpeed` → state = `airborne`, накапливается `airTime += dt`
- [x] В `airborne`: позиция эволюционирует по баллистике (`vel += g*dt`), `lateralOffset` сохраняется; повторный контакт с кривой когда `pos.y ≤ curve.y(t) + tolerance` → reattach
- [x] Эмит `eventBus.emit('hud:airtime', { value, visible: airTime >= 0.3 })`
- [x] При reattach: всплеск брызг, screen shake `CFG.feel.landingShake`, **glitch slice burst 80ms** (по juice списку)
- [x] Тюнинг: коэффициент гравитации/скорости подобран так, чтобы Canyon Plunge давал ровно ~2.3 s в дефолтном прохождении

**Проверка:** прохождение Canyon Plunge → HUD показывает `AIR TIME 2.3 s` (±0.2 s), видно прыжок камеры.

---

## Этап 12 — Оптимизация (performance rules)

- [x] Instancing для всех повторяющихся пропсов (пальмы, скалы, цветы) — один draw call на тип
- [x] Один общий `MeshStandardMaterial` на тип пропа, `onBeforeCompile` для вариаций цвета через instance attribute
- [x] Текстурные атласы для листвы/пропсов
- [x] Frustum culling включён по умолчанию, но для длинного трека — подгрузка пропсов окном `±N` метров от игрока
- [x] Тени только от солнца и только на игроке + ближнем участке трека (shadow camera следует за игроком)
- [x] DPR cap: `min(devicePixelRatio, 2)`
- [x] Нет создания материалов/геометрий в `update()`

**Проверка:** стабильные 60 fps на среднем ноутбуке, draw calls < 150.

---

## Этап 13 — Polish

Источник идей — [gameplay_blueprint.md](spec/gameplay_blueprint.md) §"Juice opportunities" (30+ хуков).

- [x] Easing на всех анимациях камеры и игрока
- [x] Небольшое «дыхание» камеры (sin на FOV) для ощущения скорости
- [x] Boost FOV push `60° → 72°` за 150ms, возврат за 400ms (по gameplay blueprint)
- [x] Лёгкий motion blur (через `postprocessing`) — опционально
- [x] Таймер, финиш, рестарт, экран победы/поражения (`POS 1/6` подсвечен золотом)
- [x] Мобильные контролы: свайп-зона + кнопка BOOST (touch events)
- [x] Звуки (при наличии времени): engine loop, water rush, boost whoosh, wall scrape, finish fanfare

---

## Этап 14 — Spec-alignment аудит (вручную)

Ручной аналог плагинных агентов `literal-injector` + `spec-alignment-auditor` + `visual-qa`.

- [x] **Literal audit**: пройти по [literal_values_registry.json](spec/literal_values_registry.json) и подтвердить, что каждое значение встречается в коде через `CFG.*` / `UI_STRINGS.*` / `COLORS.*` (grep по ID'шникам LIT-*)
- [x] **Behavioral audit**: пройти по REQ-XXX из [project_normalized_spec.md](spec/project_normalized_spec.md) с severity `must` — для каждого найти соответствующий код-путь и прокомментировать
- [x] **Visual QA**: сделать скриншот игры в ~45 секунду гонки, наложить на `on-rails-view.png` — сравнить:
  - [x] Композиция кадра (положение игрока, камера, углы обзора)
  - [x] Цвет воды, бортов, джет-ски, неба, зелени
  - [x] HUD: положение, цвета пилюль, типографика, `POS 2/6`, `TIME`, `AIR TIME 2.3 s`, `BOOST`
  - [x] Сила bloom, насыщенность, контраст
- [x] Оценка по 10-балльной шкале каждого критерия из art pack §"Reference traceability checklist", цель ≥ 8/10
- [x] Исправить все расхождения, повторить аудит до прохождения

---

## Чек-лист соответствия референсу

- [x] Оранжево-красные борта-тюбы с блеском
- [x] Бирюзовая анимированная вода с белыми пенными полосами
- [x] Зелёно-жёлтый джет-ски игрока, камера сзади-сверху
- [x] Минимум один фиолетовый джет-ски соперника впереди
- [x] Левый берег: лагуна, пальмы, хижина на сваях
- [x] Правый берег: скала с водопадами, тики-хижины, пальмы, цветы
- [x] Ясное тропическое небо
- [x] Сильный bloom, высокая насыщенность, контрастные тени
- [x] HUD: pause+POS, TIME+AIR TIME, mini-map, power-up, BOOST — позиции как на фото
- [x] 60 fps, без лагов, плавная камера без snap'ов
