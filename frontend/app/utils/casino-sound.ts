// Sons de la table, synthétisés à la volée (Web Audio, aucun fichier) : roulement de la bille, chocs sur le laiton et sur le
// bois, jetons posés, petite fanfare quand on gagne. Le contexte audio naît au premier son, après un geste du joueur
// (exigence des navigateurs). Le choix « son coupé » est gardé dans ce navigateur.
import type { Material } from './ball-physics'

const MUTE_KEY = 'casino-muted'

let ctx: AudioContext | null = null
let master: GainNode
let noise: AudioBuffer
let rumble: AudioBuffer
let roll: { gain: GainNode; filter: BiquadFilterNode } | null = null
let muted = false
try {
  muted = localStorage.getItem(MUTE_KEY) === '1'
} catch {
  // Stockage indisponible (navigation privée…) : son actif.
}

function audio() {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.9
    master.connect(ctx.destination)
    // Une seconde de bruit blanc, base de tous les sons de bille.
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    // Deux secondes de bruit « brun » (bruit blanc intégré) : grave et feutré, la base du roulement sur le bois.
    rumble = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const brown = rumble.getChannelData(0)
    let last = 0
    for (let i = 0; i < brown.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
      brown[i] = last * 3.5
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

// Bruit filtré, enveloppe percussive : un choc, un clic de jeton.
function burst(freq: number, q: number, peak: number, decay: number, at = 0) {
  const a = audio()
  const t = a.currentTime + at
  const src = a.createBufferSource()
  src.buffer = noise
  const filter = a.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  filter.Q.value = q
  const gain = a.createGain()
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(peak, t + 0.002)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + decay)
  src.connect(filter).connect(gain).connect(master)
  src.start(t, Math.random() * 0.5, decay + 0.05)
}

// Note brève (son de la fanfare, résonance du laiton).
function tone(freq: number, peak: number, decay: number, at = 0, type: OscillatorType = 'sine') {
  const a = audio()
  const t = a.currentTime + at
  const osc = a.createOscillator()
  osc.type = type
  osc.frequency.value = freq
  const gain = a.createGain()
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(peak, t + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + decay)
  osc.connect(gain).connect(master)
  osc.start(t)
  osc.stop(t + decay + 0.05)
}

export const casinoSound = {
  get muted() {
    return muted
  },

  setMuted(value: boolean) {
    muted = value
    try {
      localStorage.setItem(MUTE_KEY, value ? '1' : '0')
    } catch {
      // Préférence non gardée : sans conséquence.
    }
    if (ctx) master.gain.setTargetAtTime(value ? 0 : 0.9, ctx.currentTime, 0.05)
  },

  // Choc de la bille, selon la matière et la vitesse d'impact (m/s). `slow` < 1 au ralenti : plus grave, plus long.
  hit(material: Material, speed: number, slow = 1) {
    const level = Math.min(1, speed / 1.2)
    if (level < 0.03) return
    if (material === 'brass') {
      // Laiton : clic sec et aigu, avec un tintement.
      burst(5200 * slow, 6, 0.55 * level, 0.04 / slow)
      tone(3100 * slow * (0.95 + Math.random() * 0.1), 0.08 * level, 0.09 / slow)
    } else {
      // Bois verni : choc plus sourd.
      burst(1700 * slow, 2.5, 0.45 * level, 0.035 / slow)
    }
  },

  // Roulement continu : un grondement grave et doux, plus sourd et plus fort quand la bille va vite. `speed` en m/s (0 :
  // silence, bille en l'air ou arrêtée).
  roll(speed: number, slow = 1) {
    if (!ctx && speed === 0) return
    const a = audio()
    if (!roll) {
      const src = a.createBufferSource()
      src.buffer = rumble
      src.loop = true
      const filter = a.createBiquadFilter()
      filter.type = 'lowpass'
      filter.Q.value = 0.7
      const gain = a.createGain()
      gain.gain.value = 0
      src.connect(filter).connect(gain).connect(master)
      src.start()
      roll = { gain, filter }
    }
    const t = a.currentTime
    roll.gain.gain.setTargetAtTime(Math.min(0.14, speed * 0.035), t, 0.08)
    roll.filter.frequency.setTargetAtTime((160 + speed * 110) * slow, t, 0.1)
  },

  // Jeton posé sur le tapis : deux petits clics.
  chip() {
    burst(2600, 3, 0.35, 0.03)
    burst(3400, 4, 0.2, 0.025, 0.035)
  },

  // Gain : arpège montant.
  win() {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.12, 0.45, i * 0.09, 'triangle'))
  },
}
