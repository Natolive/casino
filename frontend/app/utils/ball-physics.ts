// Physique de la bille, simulée d'avance à chaque lancer (pas fixe de 1/600 s), puis rejouée par la scène 3D.
// Repère du monde : Y vers le haut, (x, z) dans le plan, angle a = atan2(z, x).
//
// Tout part des mesures d'une vraie roulette européenne, converties dans les unités de la scène (M unités par mètre).
// Publiées : roue de 830 mm de diamètre, bille de 18 mm et 9 g (non métallique, 17 à 23 mm selon les réglementations).
// Estimées, faute de cotes publiées : frettes basses montant vers l'extérieur, losanges de 3,4 cm à faces inclinées,
// couronne à 20°, rotor lancé à 11–17 tr/min, frottements et rebonds d'une bille en résine sur du bois verni et du laiton.
// Gravité terrestre et traînée de l'air d'une sphère. Chaque choc est un rebond sur la normale du contact (flanc ou arête),
// avec le coefficient de restitution du matériau et un frottement couplé à la rotation de la bille. Le hasard vient du
// lancer (vitesse de la bille, élan du rotor) et des petites variations de chaque choc.
//
// Simplifications assumées : les collisions se font contre des formes analytiques (profil de révolution, losanges en
// gélule, frettes à dessus rond, arêtes circulaires) construites avec les mêmes cotes que la 3D, pas contre son maillage ;
// sur une surface, la bille en suit la hauteur ; après un choc, elle est repoussée hors de l'obstacle.
//
// Le numéro, lui, vient de l'API : les frettes se répètent tous les STEP, donc décaler le rotor d'un nombre entier de cases
// ne change rien à la trajectoire, seulement la case d'arrivée. Ce décalage est ajouté au rotor pendant que la bille est
// encore sur la piste (le croupier lance la roue plus ou moins fort), là où il ne la touche pas.

const TAU = Math.PI * 2
// Unités de la scène par mètre : roue de 830 mm de diamètre hors tout (roue de casino TCSJohnHuxley Saturn), soit une
// cuvette de 1,63 unité de rayon ; la piste fait alors ≈ 34 cm de rayon.
const M = 1.63 / 0.415
export const UNITS_PER_METER = M

export const N = 37
export const STEP = TAU / N
// Bille de 18 mm.
export const BALL_R = 0.009 * M
export const TRACK_R = 1.335
export const RING_IN = 0.8
export const ROTOR_R = 1.02
export const POCKET_IN = 0.6
export const POCKET_FLOOR = 0.04
// Bord du plateau central, côté cases.
export const CONE_LIP = POCKET_FLOOR + 0.006 * M
// Fond des cases creusé en cuvette : 2 mm plus bas au centre que contre les frettes.
const POCKET_DISH = 0.002 * M
// Frettes : lames de 3 mm à dessus rond, basses côté cône et qui montent vers le bord extérieur des cases (là où la bille
// est plaquée) : de 1 mm à 3,5 mm au-dessus du fond, mesurés contre la frette.
export const FRET_ROUND = 0.0015 * M
const FRET_IN = 0.001 * M
const FRET_OUT = 0.0035 * M
export const fretTop = (r: number) => {
  const t = (Math.min(Math.max(r, POCKET_IN), RING_IN) - POCKET_IN) / (RING_IN - POCKET_IN)
  return POCKET_FLOOR + POCKET_DISH + FRET_IN + t * (FRET_OUT - FRET_IN)
}
// Huit losanges en laiton, 3,4 cm de long, 1,1 cm de large, 5 mm de haut, faces inclinées à 25°.
export const DIAMOND_R = 1.15
export const DIAMONDS = Array.from({ length: 8 }, (_, i) => (i / 8) * TAU + 0.2)
export const DIAMOND_HALF = 0.017 * M
export const DIAMOND_THICK = 0.0055 * M
export const DIAMOND_HEIGHT = 0.005 * M
const DIAMOND_FACE = (25 * Math.PI) / 180

// Hauteur de la surface (sans la bille) selon le rayon, du centre vers le bord :
// - plateau central presque plat, qui descend doucement vers les cases ; son bord (CONE_LIP) domine les cases de 6 mm ;
// - cases, 11 mm sous le bord de la couronne ;
// - couronne inclinée à ≈ 20° vers les cases (moins pentue, la bille y tournerait longtemps, retenue par la force
//   centrifuge) ;
// - pente des losanges (≈ 23°), puis la piste qui remonte, de plus en plus raide, jusqu'au mur.
const SURFACE: [number, number][] = [
  [0, 0.079], [0.16, 0.076], [0.4, 0.07], [0.55, 0.064], [POCKET_IN - 0.001, CONE_LIP],
  [POCKET_IN, POCKET_FLOOR], [RING_IN - 0.001, POCKET_FLOOR],
  [RING_IN, POCKET_FLOOR + 0.011 * M], [ROTOR_R, 0.159],
  [1.04, 0.165], [1.28, 0.265], [1.31, 0.283], [TRACK_R, 0.305], [1.36, 0.337],
]
export function surfaceY(r: number) {
  for (let i = 1; i < SURFACE.length; i++) {
    const [r1, y1] = SURFACE[i]!
    const [r0, y0] = SURFACE[i - 1]!
    if (r <= r1) return y0 + ((Math.max(r, r0) - r0) / (r1 - r0)) * (y1 - y0)
  }
  return SURFACE.at(-1)![1]
}
// Pente au rayon r. Près d'une marche (bord du plateau central, bord de la couronne), mesurée seulement du côté où se trouve
// la bille : une mesure à cheval sur la marche inventerait une pente énorme qui la tiendrait en équilibre sur l'arête.
const slopeAt = (r: number) =>
  r >= RING_IN && r < RING_IN + 0.004
    ? (surfaceY(r + 0.004) - surfaceY(r)) / 0.004
    : r < POCKET_IN && r > POCKET_IN - 0.004
      ? (surfaceY(r) - surfaceY(r - 0.004)) / 0.004
      : (surfaceY(r + 0.002) - surfaceY(r - 0.002)) / 0.004
// Haut du rebord extérieur des cases (bord intérieur de la couronne).
const RIM_TOP = surfaceY(RING_IN)

const G = 9.81 * M
// Traînée de l'air : ½·ρ·Cd·A / m pour une sphère de 18 mm et 9 g (ρ = 1,2 kg/m³, Cd = 0,47), en 1/unité.
const AIR = (0.5 * 1.2 * 0.47 * Math.PI * 0.009 ** 2) / 0.009 / M
// Résistance au roulement (× g). Sur la piste, constante, comme dans le modèle de Small & Tse (« Predicting the outcome
// of roulette », mesuré sur une vraie roue) ; le frottement contre le mur s'y ajoute (voir le mur de la piste). Ailleurs,
// roulement sur le bois verni. Dans une case, la bille frotte aussi contre le rebord où la plaque la rotation du rotor (glissement résine sur bois,
// × la force centrifuge) : c'est ce qui amortit son balancement.
const MU_TRACK = 0.028
const MU_ROLL = 0.006
const MU_RIM = 0.15
// Frottement de glissement au contact (résine sur bois verni, sur laiton) : il fait tourner la bille sur elle-même, la
// fait rouler après un glissement, et couple sa rotation à chaque choc.
const SLIDE_WOOD = 0.12
const SLIDE_BRASS = 0.1
// Le croupier tient la bille contre le mur et la lance d'un coup de doigts : vitesse atteinte en 0,1 s, sans rotation.
const FLICK_TIME = 0.1
// Coefficients de restitution d'une bille dure (résine phénolique ou céramique) sur du laiton et sur du bois verni.
const E_BRASS: [number, number] = [0.7, 0.8]
const E_WOOD: [number, number] = [0.6, 0.7]

const DT = 1 / 600
// Une image enregistrée toutes les 5 étapes : 120 par seconde.
const RECORD_EVERY = 5
// Garde-fou : une course qui ne s'arrêterait pas (aucune sur des milliers d'essais) est coupée là.
const MAX_TIME = 40

const rand = ([a, b]: [number, number]) => a + Math.random() * (b - a)
const angleDiff = (a: number, b: number) => ((((a - b) % TAU) + TAU + Math.PI) % TAU) - Math.PI

// Dans la zone des cases : écart de la bille au centre de sa case, le long de la tangente (sens des angles croissants),
// et demi-largeur de la case à ce rayon.
function pocketOffset(x: number, z: number, rotor: number) {
  const r = Math.hypot(x, z)
  const local = Math.atan2(z, x) - rotor
  return { d: angleDiff(local, Math.round(local / STEP) * STEP) * r, half: (STEP * r) / 2 }
}
const inPockets = (r: number) => r < RING_IN && r > POCKET_IN

// Hauteur de la surface sous la bille, cuvette des cases comprise.
function floorAt(x: number, z: number, rotor: number) {
  const r = Math.hypot(x, z)
  if (!inPockets(r)) return surfaceY(r)
  const { d, half } = pocketOffset(x, z, rotor)
  return POCKET_FLOOR + POCKET_DISH * (d / half) ** 2
}

export const FRAME = 8
export type Material = 'brass' | 'wood'
// Un choc de la bille : instant dans la course, matière heurtée, vitesse d'impact (m/s).
export type Hit = { t: number; material: Material; speed: number }
export type BallRun = {
  // Images à 120 par seconde : position de la bille, angle du rotor (sans le décalage), orientation de la bille
  // (quaternion).
  frames: Float32Array // x, y, z, rotor, qx, qy, qz, qw
  // Chocs, dans l'ordre (pour le son).
  hits: Hit[]
  duration: number
  // Instant où la bille touche le rotor pour la première fois (le décalage doit être fini avant).
  rotorContact: number
  // Angle de la bille dans le repère du rotor à l'arrêt (case = round(angle / STEP)).
  restAngle: number
}

export function simulateBall(start: { ballAngle: number; rotorAngle: number; rotorSpeed: number }): BallRun {
  // Lancer : 3,8 à 4,8 m/s sur la piste (un peu plus de 2 tours par seconde), sens inverse du rotor.
  let x = Math.cos(start.ballAngle) * TRACK_R
  let z = Math.sin(start.ballAngle) * TRACK_R
  let y = surfaceY(TRACK_R) + BALL_R
  const v0 = rand([3.8, 4.8]) * M
  const launchX = Math.sin(start.ballAngle)
  const launchZ = -Math.cos(start.ballAngle)
  let vx = 0
  let vz = 0
  let vy = 0
  let airborne = false
  // Rotation propre de la bille (rad/s, vecteur) et son orientation (quaternion), pour la voir rouler.
  let wx = 0
  let wy = 0
  let wz = 0
  let qx = 0
  let qy = 0
  let qz = 0
  let qw = 1

  // Rotor : déjà relancé par le croupier (rotorLaunchSpeed) ; bien équilibré, il ne perd presque rien en un tour de jeu.
  const launched = start.rotorSpeed
  let rotor = start.rotorAngle
  let rotorSpeed = launched

  // Contact de la bille avec une surface de normale unitaire n qui se déplace à (ox, 0, oz), par unité de masse. Le point
  // de contact glisse à la vitesse relative plus celle due à la rotation de la bille ; le frottement s'y oppose, au plus
  // `limit` (Coulomb), au mieux jusqu'à rouler sans glisser (2/7 pour une sphère pleine). Il change la vitesse et la
  // rotation.
  function friction(nx: number, ny: number, nz: number, ox: number, oz: number, limit: number) {
    // Vitesse du point de contact : v − v_surface + ω × (−R n).
    const cx = vx - ox - BALL_R * (wy * nz - wz * ny)
    const cy = vy - BALL_R * (wz * nx - wx * nz)
    const cz = vz - oz - BALL_R * (wx * ny - wy * nx)
    const cn = cx * nx + cy * ny + cz * nz
    const tx = cx - cn * nx
    const ty = cy - cn * ny
    const tz = cz - cn * nz
    const slip = Math.hypot(tx, ty, tz)
    if (slip < 1e-9) return
    const j = Math.min(limit, (2 / 7) * slip) / slip
    const jx = -tx * j
    const jy = -ty * j
    const jz = -tz * j
    vx += jx
    vy += jy
    vz += jz
    // Couple du frottement : Δω = 5/(2R) · (−n × J).
    const k = 5 / (2 * BALL_R)
    wx += k * -(ny * jz - nz * jy)
    wy += k * -(nz * jx - nx * jz)
    wz += k * -(nx * jy - ny * jx)
  }

  // Choc : la vitesse normale relative s'inverse, réduite par le coefficient de restitution ; le frottement pendant le
  // choc (au plus µ fois la poussée normale) fait tourner la bille, ou transforme sa rotation en saut.
  function bounce(nx: number, ny: number, nz: number, ox: number, oz: number, material: Material) {
    const vn = (vx - ox) * nx + vy * ny + (vz - oz) * nz
    if (vn >= 0) return
    // Choc audible (au-delà de 5 cm/s) : gardé pour le son.
    if (-vn > 0.05 * M) hits.push({ t, material, speed: -vn / M })
    const e = rand(material === 'brass' ? E_BRASS : E_WOOD)
    const mu = material === 'brass' ? SLIDE_BRASS : SLIDE_WOOD
    const jn = -(1 + e) * vn
    vx += jn * nx
    vy += jn * ny
    vz += jn * nz
    friction(nx, ny, nz, ox, oz, mu * jn)
    if (vy > 0.3) airborne = true
  }

  // Arête circulaire au rayon `edgeR`, à la hauteur `edgeY`, côté extérieur (`side` = 1) ou côté centre (−1) de la case :
  // flanc vertical en dessous, arête vive au-dessus. Une bille posée sur l'arête, centre déjà au-dessus de la case, pivote
  // autour d'elle et bascule dedans (la gravité tire le long du cercle de pivot ; une arête vive ne la retient pas).
  function edge(edgeR: number, edgeY: number, side: 1 | -1, ox: number, oz: number) {
    const r = Math.hypot(x, z)
    const nx = x / r
    const nz = z / r
    // Distance horizontale à l'arête, positive côté case ; hauteur au-dessus de l'arête.
    const dR = (edgeR - r) * side
    const dy = Math.max(0, y - edgeY)
    const dist = Math.hypot(dR, dy)
    if (dist >= BALL_R || dist === 0) return
    bounce((-side * nx * dR) / dist, dy / dist, (-side * nz * dR) / dist, ox, oz, 'wood')
    if (dy > 0 && dR > 0) {
      const pivot = G * (dR / dist) * (dy / dist) * DT
      vx -= side * nx * pivot
      vz -= side * nz * pivot
    }
    const push = BALL_R - dist
    x -= side * nx * (dR / dist) * push
    z -= side * nz * (dR / dist) * push
    y += (dy / dist) * push
  }

  const frames: number[] = []
  const hits: Hit[] = []
  let rotorContact = -1
  let still = 0
  let t = 0

  for (let step = 0; t < MAX_TIME; step++, t += DT) {
    rotorSpeed = launched * Math.exp(-t / 60)
    rotor += rotorSpeed * DT

    const r = Math.hypot(x, z)
    const ux = x / r
    const uz = z / r
    const onRotor = r < ROTOR_R
    if (onRotor && rotorContact < 0) rotorContact = t
    // Vitesse de la surface sous la bille (le rotor l'entraîne, la cuvette est fixe).
    const sx = onRotor ? -z * rotorSpeed : 0
    const sz = onRotor ? x * rotorSpeed : 0

    if (t < FLICK_TIME) {
      // Coup de doigts : la bille, tenue contre le mur, prend sa vitesse sans tourner ; elle glissera avant de rouler.
      vx = launchX * v0 * (t / FLICK_TIME)
      vz = launchZ * v0 * (t / FLICK_TIME)
    }

    // Air, sur la vitesse absolue.
    const speed = Math.hypot(vx, vy, vz)
    vx -= AIR * speed * vx * DT
    vy -= AIR * speed * vy * DT
    vz -= AIR * speed * vz * DT

    if (airborne) {
      vy -= G * DT
    } else {
      // Sur la surface : la pente pousse vers le centre ; le frottement au contact fait rouler la bille (elle n'accélère
      // alors qu'aux 5/7, le reste part dans sa rotation). Pendant le coup de doigts, les doigts la tiennent contre le mur.
      const s = slopeAt(r)
      const inward = t < FLICK_TIME ? 0 : (G * s) / (1 + s * s)
      vx -= ux * inward * DT
      vz -= uz * inward * DT
      let rim = 0
      if (inPockets(r)) {
        // Cuvette : la pente ramène la bille vers le centre de sa case, elle s'y balance.
        const { d, half } = pocketOffset(x, z, rotor)
        const back = (G * 2 * POCKET_DISH * d) / (half * half)
        vx += -uz * -back * DT
        vz += ux * -back * DT
        if (RING_IN - r < BALL_R + 0.003) rim = MU_RIM * rotorSpeed * rotorSpeed * r
      }
      // Résistance au roulement.
      const rx = vx - sx
      const rz = vz - sz
      const rel = Math.hypot(rx, rz)
      if (rel > 1e-6) {
        const mu = r > 1.3 ? MU_TRACK : MU_ROLL
        const decel = Math.min(rel / DT, mu * G + rim)
        const dvx = -(rx / rel) * decel * DT
        const dvz = -(rz / rel) * decel * DT
        vx += dvx
        vz += dvz
        // …et la rotation propre de la bille ralentit d'autant (elle roule toujours sans glisser) : sinon elle relancerait
        // la bille par frottement.
        wx += dvz / BALL_R
        wz -= dvx / BALL_R
      }
      // Frottement de glissement au contact du sol (normale de la pente).
      const n = Math.hypot(s, 1)
      if (t >= FLICK_TIME) friction((-s * ux) / n, 1 / n, (-s * uz) / n, sx, sz, (SLIDE_WOOD * G * DT) / n)
    }

    x += vx * DT
    z += vz * DT
    y += vy * DT

    let nr = Math.hypot(x, z)

    // Mur extérieur de la piste : la bille y reste plaquée tant qu'elle va vite ; un choc franc la renvoie.
    if (nr > TRACK_R) {
      const nx = x / nr
      const nz = z / nr
      const radial = vx * nx + vz * nz
      x = nx * TRACK_R
      z = nz * TRACK_R
      if (radial > 0.6) bounce(-nx, 0, -nz, 0, 0, 'wood')
      else if (radial > 0) {
        // Plaquée contre le mur : le mur retire la vitesse vers l'extérieur (c'est sa poussée), et frotte au point de
        // contact en proportion. La bille touche aussi le sol de la piste : elle ne peut pas rouler sans glisser sur les
        // deux à la fois, et ce glissement la freine.
        vx -= radial * nx
        vz -= radial * nz
        friction(-nx, 0, -nz, 0, 0, SLIDE_WOOD * radial)
      }
      nr = TRACK_R
    }

    // Losanges : segment épais (en long ou en travers, comme dans la scène), faces inclinées. La normale du contact
    // pointe vers le haut : la bille qui les heurte monte, saute et perd de la vitesse, sans être arrêtée net.
    if (y - BALL_R < surfaceY(nr) + DIAMOND_HEIGHT && Math.abs(nr - DIAMOND_R) < DIAMOND_HALF + BALL_R + DIAMOND_THICK) {
      for (const [i, a] of DIAMONDS.entries()) {
        const cx = Math.cos(a) * DIAMOND_R
        const cz = Math.sin(a) * DIAMOND_R
        const ax = i % 2 ? Math.cos(a) : -Math.sin(a)
        const az = i % 2 ? Math.sin(a) : Math.cos(a)
        const along = Math.max(-DIAMOND_HALF, Math.min(DIAMOND_HALF, (x - cx) * ax + (z - cz) * az))
        const dx = x - cx - ax * along
        const dz = z - cz - az * along
        const d = Math.hypot(dx, dz)
        if (d >= BALL_R + DIAMOND_THICK || d === 0) continue
        const h = Math.sin(DIAMOND_FACE)
        bounce((dx / d) * h, Math.cos(DIAMOND_FACE), (dz / d) * h, 0, 0, 'brass')
        airborne = true
        const push = BALL_R + DIAMOND_THICK - d
        x += (dx / d) * push
        z += (dz / d) * push
      }
    }

    const r2 = Math.hypot(x, z)
    const ox = -z * rotorSpeed
    const oz = x * rotorSpeed

    // Rebord extérieur des cases, et bord du plateau central (la bille peut sauter dessus, et en redescend : il penche vers
    // les cases).
    if (r2 < RING_IN) {
      edge(RING_IN, RIM_TOP, 1, ox, oz)
      edge(POCKET_IN, CONE_LIP, -1, ox, oz)
    }

    // Frettes à profil bas : dessus arrondi (un demi-cylindre de rayon FRET_ROUND), dans le repère du rotor. La normale du
    // contact pointe vers le haut : lancée, la bille monte sur l'arrondi, saute et passe dans la case voisine ; lente,
    // elle repart dans sa case.
    const r3 = Math.hypot(x, z)
    if (r3 < RING_IN && r3 > POCKET_IN && y - BALL_R < fretTop(r3)) {
      const local = Math.atan2(z, x) - rotor
      const fret = (Math.round(local / STEP - 0.5) + 0.5) * STEP
      const gap = angleDiff(local, fret) * r3
      // Le dessus arrondi est un cylindre incliné (il monte vers l'extérieur, pente k) : écart de la bille à son axe,
      // dans les trois directions (vers l'extérieur, le long du tour, vers le haut), composante le long de l'axe retirée.
      const k = (fretTop(r3 + 0.005) - fretTop(r3 - 0.005)) / 0.01
      const dy = y - (fretTop(r3) - FRET_ROUND)
      const n2 = 1 + k * k
      const dr = (-dy * k) / n2
      const dv = dy / n2
      const dist = Math.hypot(dr, gap, dv)
      if (dist < BALL_R + FRET_ROUND && dist > 0) {
        const fa = fret + rotor
        const tx = -Math.sin(fa)
        const tz = Math.cos(fa)
        const ux = x / r3
        const uz = z / r3
        const nr = dr / dist
        const nt = gap / dist
        const ny = dv / dist
        bounce(ux * nr + tx * nt, ny, uz * nr + tz * nt, -z * rotorSpeed, x * rotorSpeed, 'brass')
        const push = BALL_R + FRET_ROUND - dist
        const rr = r3 + nr * push
        const pa = fa + (gap + nt * push) / r3
        x = Math.cos(pa) * rr
        z = Math.sin(pa) * rr
        y += ny * push
      }
    }

    // En l'air : rebond en touchant la surface (avec frottement : la rotation fait filer ou freine la bille), puis elle
    // roule. Au sol : elle suit la surface, sauf si celle-ci se dérobe d'un coup (marche de la couronne vers les cases).
    const fr = Math.hypot(x, z)
    const floor = floorAt(x, z, rotor) + BALL_R
    if (airborne) {
      if (y <= floor) {
        y = floor
        const onR = fr < ROTOR_R
        if (vy < -0.3) bounce(0, 1, 0, onR ? -z * rotorSpeed : 0, onR ? x * rotorSpeed : 0, 'wood')
        if (vy <= 0.3) {
          vy = 0
          airborne = false
        }
      }
    } else if (floor < y - 0.006) {
      airborne = true
    } else {
      y = floor
      vy = 0
    }

    // Orientation : q ← q + ½ (0, ω) ⊗ q · dt.
    const dqx = 0.5 * (wx * qw + wy * qz - wz * qy)
    const dqy = 0.5 * (wy * qw + wz * qx - wx * qz)
    const dqz = 0.5 * (wz * qw + wx * qy - wy * qx)
    const dqw = 0.5 * (-wx * qx - wy * qy - wz * qz)
    qx += dqx * DT
    qy += dqy * DT
    qz += dqz * DT
    qw += dqw * DT
    const ql = Math.hypot(qx, qy, qz, qw)
    qx /= ql
    qy /= ql
    qz /= ql
    qw /= ql

    if (step % RECORD_EVERY === 0) frames.push(x, y, z, rotor, qx, qy, qz, qw)

    // Arrêt : posée dans une case et immobile par rapport au rotor depuis un quart de seconde.
    const rel = Math.hypot(vx + z * rotorSpeed, vz - x * rotorSpeed)
    still = !airborne && fr < RING_IN && rel < 0.04 ? still + DT : 0
    if (still > 0.25) break
  }

  const restAngle = Math.atan2(z, x) - rotor
  return { frames: new Float32Array(frames), hits, duration: t, rotorContact: rotorContact < 0 ? t : rotorContact, restAngle }
}

// Vitesse que le croupier donne au rotor avant de lancer la bille : 11 à 17 tr/min, sans jamais le freiner s'il tourne déjà
// plus vite.
export const rotorLaunchSpeed = (current: number) => Math.max(rand([1.2, 1.8]), current)

// Le décalage du rotor, en nombre de cases, qui amène la bille de la case simulée à la case voulue (au plus court).
export function pocketShift(restAngle: number, targetIndex: number) {
  const simulated = ((Math.round(restAngle / STEP) % N) + N) % N
  const m = (((simulated - targetIndex) % N) + N) % N
  return m > N / 2 ? m - N : m
}
