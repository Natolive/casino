import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { colorOf, WHEEL, wheelIndex } from '@casino/shared'
import {
  BALL_R,
  CONE_LIP,
  DIAMOND_HALF,
  DIAMOND_HEIGHT,
  DIAMOND_R,
  DIAMOND_THICK,
  DIAMONDS,
  FRAME,
  FRET_ROUND,
  fretTop,
  N,
  POCKET_FLOOR,
  POCKET_IN,
  pocketShift,
  RING_IN,
  ROTOR_R,
  rotorLaunchSpeed,
  simulateBall,
  STEP,
  surfaceY,
  TRACK_R,
  UNITS_PER_METER,
  type BallRun,
} from './ball-physics'
import { casinoSound } from './casino-sound'

// Cylindre de roulette en 3D, tout en géométrie et textures générées (aucun fichier à charger). Dimensions et profils
// partagés avec la physique de la bille (utils/ball-physics.ts).
// Repère : Y vers le haut, cylindre centré à l'origine, rayon extérieur de la cuvette ≈ 1,6.
// Angles : un point d'angle a est en (cos a · r, y, sin a · r). Le rotor tourne de `rotorAngle` (rotation.y = -rotorAngle),
// la case i est à l'angle i·STEP dans le repère du rotor.
const TAU = Math.PI * 2
const IDLE_SPEED = 0.22
// Geste du croupier avant le lancer (s) : il prend la bille dans sa case, la soulève, la porte au-dessus de la piste, la
// pose contre le mur et la tient un instant. Le coup de doigts lui-même fait partie de la physique (FLICK_TIME).
const PICK = 0.35
const CARRY = 0.9
const SET = 1.15
const LIFT_TIME = 1.45
const FPS = 120
// Ralenti : depuis 0,8 s avant que la bille touche le rotor jusqu'à son arrêt ; à 30 % de la vitesse au début, il ralentit
// progressivement jusqu'à 12 % pour la fin (≈ 15 s à l'écran).
const REPLAY_LEAD = 0.8
const REPLAY_FAST = 0.3
const REPLAY_SLOW = 0.12

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const smooth = (t: number) => t * t * (3 - 2 * t)

function canvasTexture(size: [number, number], draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas')
  ;[canvas.width, canvas.height] = size
  draw(canvas.getContext('2d')!, ...size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

// Placage de bois verni : fond, puis des centaines de veines ondulées (le fil suit u, donc le tour du cylindre).
function drawWood(ctx: CanvasRenderingContext2D, w: number, h: number, base: string, veins: string[]) {
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 260; i++) {
    const y0 = Math.random() * h
    const amp = 1 + Math.random() * 5
    const freq = 0.004 + Math.random() * 0.01
    const phase = Math.random() * TAU
    ctx.strokeStyle = veins[i % veins.length]!
    ctx.globalAlpha = 0.04 + Math.random() * 0.18
    ctx.lineWidth = 0.4 + Math.random() * 2.6
    ctx.beginPath()
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, y0 + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.7) * amp * 0.3)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

// Usure : rayures fines, courtes et un peu courbes, claires sur le vernis. `at` donne la position et la direction de chacune.
function scratches(ctx: CanvasRenderingContext2D, count: number, at: () => [number, number, number], length: [number, number]) {
  ctx.save()
  ctx.lineCap = 'round'
  for (let i = 0; i < count; i++) {
    const [x, y, dir] = at()
    const len = length[0] + Math.random() * (length[1] - length[0])
    const bend = (Math.random() - 0.5) * 0.4
    ctx.strokeStyle = Math.random() < 0.8 ? '#fff6e0' : '#000'
    ctx.globalAlpha = 0.04 + Math.random() * 0.14
    ctx.lineWidth = 0.6 + Math.random() * 1.4
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + Math.cos(dir + bend) * len * 0.5, y + Math.sin(dir + bend) * len * 0.5, x + Math.cos(dir) * len, y + Math.sin(dir) * len)
    ctx.stroke()
  }
  ctx.restore()
}

// Taches douces (patine, zones ternies ou polies par les mains).
function blotches(ctx: CanvasRenderingContext2D, count: number, at: () => [number, number], radius: [number, number], colors: string[]) {
  ctx.save()
  for (let i = 0; i < count; i++) {
    const [x, y] = at()
    const r = radius[0] + Math.random() * (radius[1] - radius[0])
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, colors[i % colors.length]!)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r)
  }
  ctx.restore()
}

// Vernis inégal : carte de rugosité en niveaux de gris (zones mates ou polies, rayures). Elle fait varier les reflets
// d'un endroit à l'autre : c'est elle qui montre que le rotor tourne.
function smudgeTexture() {
  const texture = canvasTexture([1024, 1024], (ctx, w, h) => {
    ctx.fillStyle = 'rgb(90,90,90)'
    ctx.fillRect(0, 0, w, h)
    const anywhere = (): [number, number] => [Math.random() * w, Math.random() * h]
    blotches(ctx, 70, anywhere, [20, 110], ['rgba(230,230,230,.35)', 'rgba(40,40,40,.3)', 'rgba(255,255,255,.25)'])
    scratches(ctx, 400, () => [Math.random() * w, Math.random() * h, Math.random() * TAU], [10, 60])
  })
  texture.colorSpace = THREE.NoColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  return texture
}

const woodTexture = (base: string, veins: string[], trackWear = false) => {
  const texture = canvasTexture([2048, 256], (ctx, w, h) => {
    drawWood(ctx, w, h, base, veins)
    // Piste (bas du canvas = bord intérieur de la cuvette) : rayée dans le sens où tourne la bille.
    if (trackWear) scratches(ctx, 900, () => [Math.random() * w, h * (0.72 + Math.random() * 0.28), (Math.random() - 0.5) * 0.06], [30, 160])
    else scratches(ctx, 150, () => [Math.random() * w, Math.random() * h, Math.random() * TAU], [8, 40])
  })
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  return texture
}

// Aplats des vraies roues : rouge, noir, vert francs (un peu plus sombres au fond des cases).
const RING_COLORS = { red: '#b3121f', black: '#141414', green: '#0a7a3d' } as const
const POCKET_COLORS = { red: '#951019', black: '#0f0f0f', green: '#086633' } as const

// Couronne des numéros (vue de dessus, plaquée sur un anneau : le canvas couvre le carré du rayon extérieur). Chiffres
// blancs en gras, à chasse et hauteur régulières (Manrope), filets dorés, usure discrète.
function numberRingTexture(outer: number, inner: number) {
  return canvasTexture([2048, 2048], (ctx, size) => {
    const c = size / 2
    const k = c / outer
    ctx.translate(c, c)
    WHEEL.forEach((n, i) => {
      ctx.beginPath()
      ctx.arc(0, 0, outer * k, (i - 0.5) * STEP, (i + 0.5) * STEP)
      ctx.arc(0, 0, inner * k, (i + 0.5) * STEP, (i - 0.5) * STEP, true)
      ctx.closePath()
      ctx.fillStyle = RING_COLORS[colorOf(n)]
      ctx.fill()
      // Numéro debout pour qui regarde depuis l'extérieur : le haut des chiffres vers le centre.
      ctx.save()
      ctx.rotate(i * STEP)
      ctx.translate(((inner + outer) / 2) * k, 0)
      ctx.rotate(-Math.PI / 2)
      ctx.font = `800 ${Math.round(0.072 * k)}px Manrope, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0,0,0,.45)'
      ctx.shadowBlur = 4
      ctx.fillStyle = '#f6f0e2'
      ctx.fillText(String(n), 0, 0)
      ctx.restore()
    })
    // Léger relief : plus sombre côté cases, plus clair côté extérieur.
    const relief = ctx.createRadialGradient(0, 0, inner * k, 0, 0, outer * k)
    relief.addColorStop(0, 'rgba(0,0,0,.28)')
    relief.addColorStop(0.25, 'rgba(0,0,0,0)')
    relief.addColorStop(0.85, 'rgba(255,255,255,0)')
    relief.addColorStop(1, 'rgba(255,255,255,.08)')
    ctx.fillStyle = relief
    ctx.beginPath()
    ctx.arc(0, 0, outer * k, 0, TAU)
    ctx.arc(0, 0, inner * k, 0, TAU, true)
    ctx.fill()
    // Filets dorés entre les numéros, et sur les deux bords.
    ctx.strokeStyle = '#e3bd62'
    ctx.lineWidth = 2.5
    for (let i = 0; i < N; i++) {
      const a = (i + 0.5) * STEP
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * inner * k, Math.sin(a) * inner * k)
      ctx.lineTo(Math.cos(a) * outer * k, Math.sin(a) * outer * k)
      ctx.stroke()
    }
    ctx.lineWidth = 5
    for (const r of [inner + 0.003, outer - 0.003]) {
      ctx.beginPath()
      ctx.arc(0, 0, r * k, 0, TAU)
      ctx.stroke()
    }
    // Usure discrète : quelques rayures dans le sens du tour, surtout côté cases où la bille tombe.
    const inRing = (): [number, number, number] => {
      const a = Math.random() * TAU
      const r = (inner + (outer - inner) * Math.random() ** 2.5) * k
      return [Math.cos(a) * r, Math.sin(a) * r, a + Math.PI / 2 + (Math.random() - 0.5) * 0.6]
    }
    scratches(ctx, 220, inRing, [6, 30])
  })
}

function pocketFloorTexture(outer: number) {
  return canvasTexture([1024, 1024], (ctx, size) => {
    const c = size / 2
    const k = c / outer
    ctx.translate(c, c)
    WHEEL.forEach((n, i) => {
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, outer * k, (i - 0.5) * STEP, (i + 0.5) * STEP)
      ctx.closePath()
      ctx.fillStyle = POCKET_COLORS[colorOf(n)]
      ctx.fill()
    })
    // Ombre légère au fond des cases, côté centre.
    const g = ctx.createRadialGradient(0, 0, 0.6 * k, 0, 0, outer * k)
    g.addColorStop(0, 'rgba(0,0,0,.25)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(-c, -c, size, size)
    // Traces de la bille au fond des cases, et crasse contre le rebord.
    const inPocket = (): [number, number, number] => {
      const a = Math.random() * TAU
      const r = (0.62 + Math.random() * 0.17) * k
      return [Math.cos(a) * r, Math.sin(a) * r, a + Math.PI / 2 + (Math.random() - 0.5) * 1.2]
    }
    scratches(ctx, 250, inPocket, [3, 14])
    blotches(ctx, 30, () => inPocket().slice(0, 2) as [number, number], [6, 22], ['rgba(255,255,255,.05)', 'rgba(0,0,0,.12)'])
  })
}

// Plateau central : placage d'un seul tenant, verni, usé, avec la plaque du fabricant.
function coneTexture() {
  return canvasTexture([2048, 256], (ctx, w, h) => {
    drawWood(ctx, w, h, '#7a4320', ['#4a2410', '#a8683a', '#2e1508'])
    scratches(ctx, 220, () => [Math.random() * w, Math.random() * h, (Math.random() - 0.5) * 0.5], [10, 60])
    blotches(ctx, 25, () => [Math.random() * w, Math.random() * h], [15, 60], ['rgba(255,230,190,.08)', 'rgba(0,0,0,.15)'])
    // Plaque du fabricant, en laiton, d'un seul côté : on voit le plateau tourner.
    const px = w * 0.31
    const py = h * 0.45
    ctx.fillStyle = '#c99a3c'
    ctx.beginPath()
    ctx.ellipse(px, py, 70, 26, 0, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = '#f2dc95'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#5f381e'
    ctx.beginPath()
    ctx.moveTo(px, py - 15)
    ctx.lineTo(px + 11, py)
    ctx.lineTo(px, py + 15)
    ctx.lineTo(px - 11, py)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(px - 52, py - 1.5, 34, 3)
    ctx.fillRect(px + 18, py - 1.5, 34, 3)
  })
}

function feltTexture() {
  const texture = canvasTexture([512, 512], (ctx, w, h) => {
    ctx.fillStyle = '#0a4529'
    ctx.fillRect(0, 0, w, h)
    const img = ctx.getImageData(0, 0, w, h)
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 22
      img.data[i] = img.data[i]! + n * 0.4
      img.data[i + 1] = img.data[i + 1]! + n
      img.data[i + 2] = img.data[i + 2]! + n * 0.6
    }
    ctx.putImageData(img, 0, 0)
  })
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 3)
  return texture
}

const lathe = (points: [number, number][], material: THREE.Material, segments = 160) =>
  new THREE.Mesh(new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments), material)

// Anneau dans le plan XZ, à la hauteur `height(x, z)` (repère du rotor) ; ses UV couvrent le carré du rayon extérieur,
// comme les textures ci-dessus.
const flatRing = (inner: number, outer: number, height: (x: number, z: number) => number, material: THREE.Material) => {
  const geometry = new THREE.RingGeometry(inner, outer, N * 8, 6)
  const pos = geometry.attributes.position!
  // Après la rotation de −90° autour de x, le y de l'anneau devient −z.
  for (let i = 0; i < pos.count; i++) pos.setZ(i, height(pos.getX(i), -pos.getY(i)))
  geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(geometry, material)
  // Face vers le haut ; le haut du canvas va vers -z : x et z du monde suivent x et y du canvas, sans miroir.
  mesh.rotation.x = -Math.PI / 2
  return mesh
}

function shadows(object: THREE.Object3D, cast: boolean, receive = true) {
  object.traverse((o) => {
    o.castShadow = cast
    o.receiveShadow = receive
  })
  return object
}

export type WheelScene = {
  spinTo: (n: number) => Promise<void>
  place: (n: number) => void
  resize: (width: number, height: number) => void
  dispose: () => void
}

// Plans de la réalisation, comme sur les roulettes filmées des casinos en ligne : plusieurs caméras en direct pendant le
// lancer, puis un ralenti au plus près de la bille quand le numéro est tombé.
export type Shot = 'large' | 'table' | 'dessus' | 'bille' | 'ralenti'

// `onShot` : prévient à chaque changement de plan (bandeau « en direct » ou « ralenti », effet de coupe).
export async function createWheelScene(canvas: HTMLCanvasElement, onShot: (shot: Shot) => void): Promise<WheelScene> {
  await document.fonts.load('800 64px Manrope').catch(() => undefined)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  // Le tapis se fond dans la pénombre de la salle (le fond de la page).
  scene.fog = new THREE.Fog(0x09090b, 5.5, 12)
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.55

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60)
  const lookAt = new THREE.Vector3(0, 0.05, 0.08)

  // Lumières : un plafonnier chaud qui porte les ombres, un contre-jour froid pour détacher le laiton.
  const key = new THREE.SpotLight(0xffe7c2, 70, 0, 0.55, 0.65, 1.6)
  key.position.set(1.2, 6, 2.2)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.015
  key.shadow.radius = 4
  scene.add(key, key.target)
  const rim = new THREE.DirectionalLight(0x9fc4ff, 0.7)
  rim.position.set(-3, 2.5, -4)
  scene.add(rim, new THREE.HemisphereLight(0xfff2dd, 0x0b2a18, 0.35))

  // Matériaux.
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xe2b85c, metalness: 1, roughness: 0.22, clearcoat: 0.4, side: THREE.DoubleSide })
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xf2f2f2, metalness: 1, roughness: 0.08, side: THREE.DoubleSide })
  // Vernis : rugosité modulée par la carte d'usure (valeur de base ≈ 0,35 ; le vernis brillant ≈ 0,09).
  const smudges = smudgeTexture()
  const lacquer = { clearcoat: 1, clearcoatRoughness: 0.25, clearcoatRoughnessMap: smudges, roughness: 1.25, roughnessMap: smudges }
  const bowlWood = new THREE.MeshPhysicalMaterial({ map: woodTexture('#4a220d', ['#220d04', '#7b3f1a', '#160803'], true), ...lacquer, side: THREE.DoubleSide })
  const statorWood = new THREE.MeshPhysicalMaterial({ map: woodTexture('#2b1307', ['#120602', '#5b2c12']), ...lacquer, side: THREE.DoubleSide })
  const coneWood = new THREE.MeshPhysicalMaterial({ map: coneTexture(), ...lacquer, side: THREE.DoubleSide })
  const darkWood = new THREE.MeshPhysicalMaterial({ color: 0x1a0c05, ...lacquer, side: THREE.DoubleSide })

  // Tapis de la table, sous la roue : un cercle de feutre qui s'efface en douceur vers ses bords (le fond de la page prend
  // le relais), quelle que soit la caméra.
  const feltFade = canvasTexture([256, 256], (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2)
    // Plein sous la roue (rayon ≈ 1,66 sur 2,2), puis fondu jusqu'au bord.
    g.addColorStop(0.72, '#fff')
    g.addColorStop(1, '#000')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, w)
  })
  feltFade.colorSpace = THREE.NoColorSpace
  const felt = new THREE.Mesh(
    new THREE.CircleGeometry(2.2, 96),
    new THREE.MeshStandardMaterial({ map: feltTexture(), alphaMap: feltFade, transparent: true, depthWrite: false, roughness: 1 }),
  )
  felt.rotation.x = -Math.PI / 2
  felt.position.y = -0.002
  felt.receiveShadow = true
  scene.add(felt)

  // Cuvette fixe : piste de la bille, bord, flanc ; puis la pente des losanges.
  scene.add(
    shadows(
      lathe([[1.28, surfaceY(1.28)], [1.31, surfaceY(1.31)], [TRACK_R, surfaceY(TRACK_R)], [1.36, surfaceY(1.36)], [1.385, 0.377], [1.4, 0.417], [1.42, 0.452], [1.52, 0.459], [1.575, 0.432], [1.6, 0.347], [1.63, 0.02], [1.66, 0]], bowlWood),
      true,
    ),
    shadows(lathe([[ROTOR_R, 0.08], [ROTOR_R + 0.002, surfaceY(ROTOR_R)], [1.04, surfaceY(1.04)], [1.28, surfaceY(1.28)]], statorWood), false),
    shadows(lathe([[1.4, 0.417], [1.415, 0.447]], brass), false),
  )
  // Losanges déflecteurs, alternés en long et en travers.
  DIAMONDS.forEach((a, i) => {
    const r = DIAMOND_R
    const d = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), brass)
    // Mêmes dimensions que dans la physique ; la moitié basse est dans la pente.
    d.scale.set(i % 2 ? DIAMOND_HALF : DIAMOND_THICK, DIAMOND_HEIGHT, i % 2 ? DIAMOND_THICK : DIAMOND_HALF)
    d.position.set(Math.cos(a) * r, surfaceY(r), Math.sin(a) * r)
    d.rotation.y = -a
    // Couché sur la pente, qui monte vers l'extérieur.
    d.rotateZ(0.43)
    d.castShadow = true
    scene.add(d)
  })

  // Rotor : couronne des numéros, cases, séparateurs, cône, tourelle.
  const rotor = new THREE.Group()
  const ringMat = new THREE.MeshPhysicalMaterial({ map: numberRingTexture(0.98, 0.8), ...lacquer, roughness: 1 })
  const floorMat = new THREE.MeshPhysicalMaterial({ map: pocketFloorTexture(0.8), roughness: 1.5, roughnessMap: smudges, clearcoat: 0.6, clearcoatRoughness: 0.4, clearcoatRoughnessMap: smudges })
  rotor.add(
    shadows(flatRing(RING_IN, 0.98, (x, z) => surfaceY(Math.hypot(x, z)), ringMat), false),
    // Fond des cases plat à l'image : la cuvette de 2 mm (dans la physique) ne se verrait pas, mais ses arêtes feraient des
    // dents de scie en vue rasante.
    shadows(flatRing(POCKET_IN, RING_IN, () => POCKET_FLOOR, floorMat), false),
    shadows(lathe([[0.98, surfaceY(0.98)], [ROTOR_R, surfaceY(ROTOR_R)], [ROTOR_R, 0.0]], darkWood), false),
    shadows(new THREE.Mesh(new THREE.CylinderGeometry(RING_IN, RING_IN, surfaceY(RING_IN) - POCKET_FLOOR, 180, 1, true), darkWood).translateY((surfaceY(RING_IN) + POCKET_FLOOR) / 2), false),
    // Plateau central presque plat, à peine au-dessus des cases (même profil que la physique).
    shadows(lathe([[POCKET_IN, POCKET_FLOOR], [POCKET_IN, CONE_LIP], [0.55, surfaceY(0.55)], [0.4, surfaceY(0.4)], [0.25, surfaceY(0.25)], [0.16, surfaceY(0.16)]], coneWood), false),
  )
  for (const r of [RING_IN, 0.98]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 8, 180), brass)
    t.rotation.x = Math.PI / 2
    t.position.y = surfaceY(r) + 0.002
    rotor.add(t)
  }
  // Séparateurs des cases (les « frettes ») : lames de laiton de 3 mm, basses côté centre, plus hautes vers le bord extérieur
  // (le dessus suit fretTop, comme dans la physique).
  const fretMid = (POCKET_IN + RING_IN) / 2
  const fretBase = POCKET_FLOOR - 0.003
  const fretGeometry = new THREE.BoxGeometry(RING_IN - POCKET_IN, 1, 2 * FRET_ROUND, 16, 1, 1)
  const fretPos = fretGeometry.attributes.position!
  for (let i = 0; i < fretPos.count; i++) fretPos.setY(i, fretPos.getY(i) > 0 ? fretTop(fretMid + fretPos.getX(i)) - fretBase : 0)
  fretGeometry.computeVertexNormals()
  for (let i = 0; i < N; i++) {
    const a = (i + 0.5) * STEP
    const fret = new THREE.Mesh(fretGeometry, brass)
    fret.position.set(Math.cos(a) * fretMid, fretBase, Math.sin(a) * fretMid)
    fret.rotation.y = -a
    fret.castShadow = true
    rotor.add(fret)
  }
  // Tourelle chromée élancée (base étagée sur le plateau, fût, moyeu des bras, pointe) et sa croix.
  const turret = lathe(
    [[0.16, surfaceY(0.16)], [0.15, 0.085], [0.11, 0.094], [0.075, 0.104], [0.055, 0.12], [0.05, 0.16], [0.065, 0.172], [0.065, 0.186], [0.042, 0.198], [0.036, 0.28], [0.052, 0.296], [0.052, 0.316], [0.032, 0.33], [0.028, 0.4], [0.04, 0.418], [0.035, 0.448], [0.013, 0.463], [0, 0.465]],
    chrome,
    96,
  )
  rotor.add(shadows(turret, true))
  for (let i = 0; i < 2; i++) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.42, 24), chrome)
    arm.rotation.z = Math.PI / 2
    arm.rotation.y = (i * Math.PI) / 2
    arm.position.y = 0.306
    arm.castShadow = true
    rotor.add(arm)
    for (const s of [-1, 1]) {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.026, 24, 16), chrome)
      knob.position.set(i ? 0 : s * 0.21, 0.306, i ? s * 0.21 : 0)
      knob.castShadow = true
      rotor.add(knob)
    }
  }
  scene.add(rotor)

  // La bille : résine phénolique blanc ivoire, polie et laquée (reflets nets), comme les vraies. Seule marque : le petit
  // logo gravé du fabricant, à peine plus terne que le reste ; il suffit à la voir tourner en gros plan.
  const ballTexture = canvasTexture([1024, 512], (ctx, w, h) => {
    ctx.fillStyle = '#f4f1ea'
    ctx.fillRect(0, 0, w, h)
    // Teinte légèrement irrégulière de la résine.
    blotches(ctx, 40, () => [Math.random() * w, Math.random() * h], [20, 90], ['rgba(230,222,205,.25)', 'rgba(255,255,255,.3)'])
    // Logo gravé : un petit anneau et un trait, gris très clair, sur une seule face.
    ctx.strokeStyle = 'rgba(150,140,120,.45)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(w * 0.25, h * 0.5, 16, 30, 0, 0, TAU)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(w * 0.25 - 6, h * 0.5)
    ctx.lineTo(w * 0.25 + 6, h * 0.5)
    ctx.stroke()
  })
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_R, 64, 48),
    new THREE.MeshPhysicalMaterial({
      map: ballTexture,
      roughness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      sheen: 0.4,
      sheenColor: new THREE.Color(0xfff6e6),
      envMapIntensity: 1.4,
    }),
  )
  ball.castShadow = true
  scene.add(ball)

  // État au repos : angle et vitesse du rotor, bille posée dans une case (angle `phi` et rayon dans le repère du rotor).
  let rotorAngle = Math.random() * TAU
  let rotorSpeed = IDLE_SPEED
  let phi = 0
  let restR = (POCKET_IN + RING_IN) / 2
  // Orientation de la bille au repos, et angle du rotor à ce moment-là : posée dans sa case, elle tourne avec lui.
  const restQ = new THREE.Quaternion()
  let restRotor = rotorAngle
  const yTurn = new THREE.Quaternion()
  const Y = new THREE.Vector3(0, 1, 0)
  // Lancer en cours : la course simulée, rejouée image par image, et le décalage du rotor qui l'amène sur le bon numéro.
  // `angle` : où le croupier pose la bille sur la piste ; `from` : où il l'a prise.
  // `rotor0`, `speed0`, `launch` : le rotor au début du geste, et la vitesse que le croupier lui donne pendant le geste.
  let spin: {
    start: number
    run: BallRun
    shift: number
    ramp: number
    angle: number
    from: THREE.Vector3
    held: THREE.Quaternion
    rotor0: number
    speed0: number
    launch: number
    resolve: () => void
  } | null = null
  // Ralenti : la fin de la course, rejouée une fois la bille arrêtée (`from` : début de la séquence dans la course ; `rt` :
  // où en est la lecture ; `speed` : vitesse de lecture du moment).
  let replay: { run: BallRun; shift: number; held: THREE.Quaternion; from: number; rt: number; speed: number } | null = null
  // Après le ralenti, la caméra bille reste sur la case jusqu'à `holdUntil`, puis retour au plan large.
  let holdUntil = -1
  let shot: Shot = 'large'
  // Rayon suivi par les caméras proches (amorti, pour ne pas reprendre chaque écart de la bille).
  let followR = (POCKET_IN + RING_IN) / 2
  // Ralenti : angle de la caméra dans le repère du rotor (panoramique doux ; null au début de chaque ralenti).
  let replayAim: number | null = null
  // Son : prochain choc à jouer (dans la course en direct, puis dans le ralenti) ; position précédente de la bille.
  let nextHit = 0
  const lastBall = new THREE.Vector3()

  const restY = () => POCKET_FLOOR + BALL_R
  function placeBall(r: number, y: number) {
    const a = rotorAngle + phi
    ball.position.set(Math.cos(a) * r, y, Math.sin(a) * r)
  }

  // Une image de la course (interpolée entre deux enregistrements) : position de la bille, angle du rotor, et rotation de
  // la bille depuis le lancer (dans `turned`).
  const turned = new THREE.Quaternion()
  const turnedArray = [0, 0, 0, 1]
  const at = (run: BallRun, t: number) => {
    const last = run.frames.length / FRAME - 1
    const f = Math.min(t * FPS, last)
    const i = Math.min(Math.floor(f), last - 1)
    const k = f - i
    const v = (j: number) => lerp(run.frames[i * FRAME + j]!, run.frames[(i + 1) * FRAME + j]!, k)
    const frames = run.frames as unknown as number[]
    THREE.Quaternion.slerpFlat(turnedArray, 0, frames, i * FRAME + 4, frames, (i + 1) * FRAME + 4, k)
    turned.fromArray(turnedArray)
    // Vitesse du rotor tirée de la course elle-même (pas d'une différence entre deux images affichées, nulle une fois la
    // dernière image atteinte).
    const speed = (run.frames[(i + 1) * FRAME + 3]! - run.frames[i * FRAME + 3]!) * FPS
    return { x: v(0), y: v(1), z: v(2), rotor: v(3), speed }
  }

  const clock = new THREE.Clock()
  let frame = 0
  function tick() {
    frame = requestAnimationFrame(tick)
    const dt = Math.min(clock.getDelta(), 0.05)
    const now = clock.elapsedTime
    // Temps de la course rejouée (négatif pendant le geste du croupier).
    const flight = spin ? now - spin.start - LIFT_TIME : 0

    if (!spin) {
      // Entre deux tours, le rotor ralentit progressivement jusqu'à son régime de repos (moitié de sa vitesse en ~4 s),
      // sans jamais s'arrêter net.
      rotorSpeed += (IDLE_SPEED - rotorSpeed) * (1 - Math.exp(-dt / 6))
      rotorAngle += rotorSpeed * dt
      placeBall(restR, restY())
      ball.quaternion.copy(yTurn.setFromAxisAngle(Y, -(rotorAngle - restRotor))).multiply(restQ)
    } else {
      const g = now - spin.start
      const t = flight
      if (t < 0) {
        // Geste du croupier : il prend la bille, la soulève (4 cm), la porte au-dessus de la piste, la pose contre le mur
        // et la tient avant le coup de doigts. Elle ne tourne pas dans ses doigts. Pendant ce temps, il relance le rotor :
        // la vitesse monte en douceur (courbe en S sur tout le geste) jusqu'à celle du jeu.
        const u = g / LIFT_TIME
        rotorSpeed = lerp(spin.speed0, spin.launch, smooth(u))
        rotorAngle = spin.rotor0 + spin.speed0 * g + (spin.launch - spin.speed0) * LIFT_TIME * (u ** 3 - u ** 4 / 2)
        const onTrack = new THREE.Vector3(Math.cos(spin.angle) * TRACK_R, surfaceY(TRACK_R) + BALL_R, Math.sin(spin.angle) * TRACK_R)
        const lift = 0.14 // ≈ 4 cm
        if (g < PICK) {
          const k = smooth(g / PICK)
          ball.position.copy(spin.from).setY(spin.from.y + lift * k)
        } else if (g < CARRY) {
          const k = smooth((g - PICK) / (CARRY - PICK))
          ball.position.lerpVectors(spin.from, onTrack, k).setY(lerp(spin.from.y, onTrack.y, k) + lift)
        } else if (g < SET) {
          const k = smooth((g - CARRY) / (SET - CARRY))
          ball.position.copy(onTrack).setY(onTrack.y + lift * (1 - k))
        } else {
          ball.position.copy(onTrack)
        }
        ball.quaternion.copy(spin.held)
      } else {
        const p = at(spin.run, t)
        // Rotation calculée par la physique, à partir de l'orientation qu'avait la bille dans les doigts.
        ball.quaternion.copy(turned).multiply(spin.held)
        // Le décalage s'ajoute pendant que la bille tourne sur la piste, loin du rotor.
        const u = clamp01(t / spin.ramp)
        rotorAngle = p.rotor + spin.shift * smooth(u)
        // Dérivée du décalage : 6u(1 − u) / durée.
        rotorSpeed = p.speed + (spin.shift * 6 * u * (1 - u)) / spin.ramp
        ball.position.set(p.x, p.y, p.z)
        if (t >= spin.run.duration) {
          phi = spin.run.restAngle - spin.shift
          restR = Math.hypot(p.x, p.z)
          restQ.copy(ball.quaternion)
          restRotor = rotorAngle
          replayAim = null
          const from = Math.max(0, spin.run.rotorContact - REPLAY_LEAD)
          nextHit = spin.run.hits.findIndex((h) => h.t >= from)
          replay = { run: spin.run, shift: spin.shift, held: spin.held, from, rt: from, speed: REPLAY_FAST }
          const done = spin.resolve
          spin = null
          done()
        }
      }
    }
    rotor.rotation.y = -rotorAngle

    // Ralenti : la scène affiche la course rejouée, pendant que l'état réel (rotor, bille au repos) continue en dessous.
    if (replay) {
      const progress = (replay.rt - replay.from) / (replay.run.duration - replay.from)
      replay.speed = lerp(REPLAY_FAST, REPLAY_SLOW, smooth(clamp01(progress)))
      replay.rt += replay.speed * dt
      const rt = replay.rt
      if (rt >= replay.run.duration) {
        replay = null
        holdUntil = now + 1.5
      } else {
        const p = at(replay.run, rt)
        ball.position.set(p.x, p.y, p.z)
        ball.quaternion.copy(turned).multiply(replay.held)
        rotor.rotation.y = -(p.rotor + replay.shift)
      }
    }

    // Réalisation : quel plan, selon l'avancée de la course.
    const contact = spin?.run.rotorContact ?? 0
    const next: Shot = replay
      ? 'ralenti'
      : spin
        ? flight < 0.45 * contact
          ? 'large'
          : flight < contact - 1.6
            ? 'table'
            : flight < contact
              ? 'dessus'
              : 'bille'
        : now < holdUntil
          ? 'bille'
          : 'large'
    if (next !== shot) {
      shot = next
      onShot(shot)
    }
    frameShot(dt)
    renderer.render(scene, camera)
    playSound(flight, dt)
  }

  // Son : les chocs de la course au moment où ils arrivent (plus graves et plus lents au ralenti), et le roulement, selon
  // la vitesse de la bille quand elle touche la surface.
  function playSound(flight: number, dt: number) {
    const slow = replay ? replay.speed : 1
    const run = replay?.run ?? spin?.run
    const now = replay ? replay.rt : flight
    if (run && now >= 0) {
      if (nextHit < 0) nextHit = run.hits.length
      while (nextHit < run.hits.length && run.hits[nextHit]!.t <= now) {
        const hit = run.hits[nextHit++]!
        casinoSound.hit(hit.material, hit.speed, slow === 1 ? 1 : 0.6)
      }
    }
    const r = Math.hypot(ball.position.x, ball.position.z)
    const onSurface = ball.position.y - surfaceY(r) - BALL_R < 0.012
    const speed = run && now > 0 && onSurface && dt > 0 ? ball.position.distanceTo(lastBall) / dt / UNITS_PER_METER : 0
    casinoSound.roll(Math.min(speed / slow, 6), slow === 1 ? 1 : 0.6)
    lastBall.copy(ball.position)
  }

  // Place la caméra pour le plan en cours. Plans fixes (large, table, dessus) cadrés selon le format de l'écran ; plans
  // proches (bille, ralenti) centrés sur la bille, de biais depuis l'extérieur pour voir la hauteur des sauts et leur ombre.
  const target = new THREE.Vector3()
  function frameShot(dt: number) {
    const a = Math.atan2(ball.position.z, ball.position.x)
    // Rayon suivi : du bord du plateau central jusqu'au bas de la pente (le ralenti commence quand la bille arrive du stator).
    const r = Math.min(1.12, Math.max(0.58, Math.hypot(ball.position.x, ball.position.z)))
    followR += (r - followR) * (1 - Math.exp(-dt * 8))
    const ox = Math.cos(a)
    const oz = Math.sin(a)
    if (shot === 'large') {
      camera.fov = 32
      camera.position.copy(cameraHome)
      camera.lookAt(lookAt)
    } else if (shot === 'table') {
      // Bas sur la table, de côté (≈ 25°) : juste au-dessus du bord de la cuvette, la bille file sur la piste.
      camera.fov = 30
      camera.position.set(0.7 * fit, 1.2, 2.45 * fit)
      camera.lookAt(0, 0.18, 0.1)
    } else if (shot === 'dessus') {
      // À la verticale : toute la roue, la bille qui descend en spirale.
      camera.fov = 32
      camera.position.set(0, 3.9 * fit, 0.35)
      camera.lookAt(0, 0, 0)
    } else if (shot === 'bille') {
      camera.fov = 30
      camera.position.set(ox * (followR + 0.4), POCKET_FLOOR + 1.1, oz * (followR + 0.4))
      camera.lookAt(target.set(ox * followR, POCKET_FLOOR + 0.02, oz * followR))
    } else {
      // Ralenti : la caméra tourne avec le rotor (les cases restent immobiles à l'image, seule la bille bouge) et suit la
      // bille par un panoramique doux ; plus basse que la caméra bille, pour voir les sauts.
      const shown = -rotor.rotation.y
      const local = a - shown
      // Sur la pente, la bille tourne à contresens du rotor : la caméra la suit exactement ; dans les cases, panoramique
      // rapide mais amorti (≈ une case de retard au plus), pour garder la bille dans le champ sans reprendre chaque rebond.
      const onStator = replay !== null && replay.rt < replay.run.rotorContact
      replayAim =
        replayAim === null || onStator
          ? local
          : replayAim + Math.atan2(Math.sin(local - replayAim), Math.cos(local - replayAim)) * (1 - Math.exp(-dt * 10))
      const c = shown + replayAim
      // Tant que la bille est sur la pente, la caméra monte pour regarder par-dessus le bord de la cuvette, puis redescend
      // quand elle arrive dans les cases.
      const rise = Math.max(0, followR - 0.85) * 2.4
      camera.fov = 30
      camera.position.set(Math.cos(c + 0.12) * (followR + 0.75 - rise * 0.25), POCKET_FLOOR + 0.55 + rise, Math.sin(c + 0.12) * (followR + 0.75 - rise * 0.25))
      camera.lookAt(target.set(Math.cos(c) * followR, POCKET_FLOOR + 0.03, Math.sin(c) * followR))
    }
    camera.updateProjectionMatrix()
  }

  const cameraHome = new THREE.Vector3()
  // Recul des plans fixes rapprochés sur un écran étroit.
  let fit = 1
  function resize(width: number, height: number) {
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    // Recul selon le cadre, pour garder toute la cuvette (plus loin sur un cadre étroit) ; le brouillard suit.
    const distance = Math.max(1.2, 1.5 / camera.aspect)
    cameraHome.set(0, 3.55, 2.75).multiplyScalar(distance)
    fit = Math.max(1, 1.2 / camera.aspect)
    const fog = scene.fog as THREE.Fog
    fog.near = cameraHome.length() + 1
    fog.far = cameraHome.length() + 7
    camera.updateProjectionMatrix()
  }

  resize(canvas.clientWidth || 1, canvas.clientHeight || 1)
  tick()

  return {
    resize,
    spinTo(n) {
      // Le croupier reprend la bille là où elle est, et la pose sur la piste au même angle ; le rotor continue sur son
      // élan pendant le geste.
      const angle = rotorAngle + phi
      const launch = rotorLaunchSpeed(rotorSpeed)
      // Angle du rotor à la fin du geste : intégrale de la montée en vitesse (courbe en S → vitesse moyenne).
      const rotorAtLaunch = rotorAngle + ((rotorSpeed + launch) / 2) * LIFT_TIME
      const run = simulateBall({ ballAngle: angle, rotorAngle: rotorAtLaunch, rotorSpeed: launch })
      const shift = pocketShift(run.restAngle, wheelIndex(n)) * STEP
      // Décalage étalé sur tout le temps où la bille est sur la piste (~10 s) : au plus ~0,5 rad/s de plus ou de moins, ce
      // qu'on prend pour un lancer de rotor plus ou moins fort.
      // ponytail: une course qui n'atteint pas le rotor (jamais vu sur 600 essais) garde un décalage instantané.
      const ramp = Math.max(0.1, run.rotorContact - 0.5)
      // Un nouveau lancer coupe le ralenti du précédent.
      replay = null
      holdUntil = -1
      nextHit = 0
      return new Promise((resolve) => {
        spin = {
          start: clock.elapsedTime,
          run,
          shift,
          ramp,
          angle,
          from: ball.position.clone(),
          held: ball.quaternion.clone(),
          rotor0: rotorAngle,
          speed0: rotorSpeed,
          launch,
          resolve,
        }
      })
    },
    // La bille posée dans la case de n, sans lancer (tirage déjà fait) ; un lancer en cours n'est pas interrompu.
    place(n) {
      if (!spin) phi = wheelIndex(n) * STEP
    },
    dispose() {
      cancelAnimationFrame(frame)
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          for (const m of [o.material].flat()) {
            ;(m as THREE.MeshStandardMaterial).map?.dispose()
            m.dispose()
          }
        }
      })
      smudges.dispose()
      feltFade.dispose()
      pmrem.dispose()
      renderer.dispose()
    },
  }
}
