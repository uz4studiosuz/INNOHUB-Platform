/**
 * Synthesised sound effects.
 *
 * All audio is generated with the Web Audio API — no sample files, so the app
 * stays a self-contained static bundle. The context is created lazily on the
 * first user gesture, which is what browsers require anyway.
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let enabled = true

function ensure(): AudioContext | null {
  if (!enabled) return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.35
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setAudioEnabled(value: boolean) {
  enabled = value
  if (master) master.gain.value = value ? 0.35 : 0
}

export function isAudioEnabled() {
  return enabled
}

/** White noise buffer, reused by the percussive effects. */
let noiseBuffer: AudioBuffer | null = null
function noise(context: AudioContext) {
  if (noiseBuffer) return noiseBuffer
  const length = context.sampleRate * 2
  noiseBuffer = context.createBuffer(1, length, context.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  return noiseBuffer
}

/** Sharp metallic crack for a member snapping. */
export function playSnap() {
  const context = ensure()
  if (!context || !master) return
  const now = context.currentTime

  const src = context.createBufferSource()
  src.buffer = noise(context)
  const filter = context.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(2400, now)
  filter.frequency.exponentialRampToValueAtTime(320, now + 0.35)
  filter.Q.value = 1.6

  const gain = context.createGain()
  gain.gain.setValueAtTime(0.9, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

  src.connect(filter).connect(gain).connect(master)
  src.start(now)
  src.stop(now + 0.45)

  // A ringing partial on top gives it the "steel" character.
  const osc = context.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(880, now)
  osc.frequency.exponentialRampToValueAtTime(210, now + 0.3)
  const og = context.createGain()
  og.gain.setValueAtTime(0.35, now)
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.32)
  osc.connect(og).connect(master)
  osc.start(now)
  osc.stop(now + 0.35)
}

/** Low rumble for the structure coming down. */
export function playCollapse() {
  const context = ensure()
  if (!context || !master) return
  const now = context.currentTime

  const src = context.createBufferSource()
  src.buffer = noise(context)
  src.loop = true
  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(900, now)
  filter.frequency.exponentialRampToValueAtTime(90, now + 2.6)

  const gain = context.createGain()
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.linearRampToValueAtTime(0.8, now + 0.12)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 3.2)

  src.connect(filter).connect(gain).connect(master)
  src.start(now)
  src.stop(now + 3.3)
}

/** Creaking used when a member passes ~85% utilisation. */
let lastCreak = 0
export function playCreak() {
  const context = ensure()
  if (!context || !master) return
  const now = context.currentTime
  if (now - lastCreak < 0.9) return
  lastCreak = now

  const osc = context.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(120 + Math.random() * 60, now)
  osc.frequency.linearRampToValueAtTime(70 + Math.random() * 40, now + 0.6)

  const filter = context.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 420
  filter.Q.value = 7

  const gain = context.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(0.22, now + 0.1)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7)

  osc.connect(filter).connect(gain).connect(master)
  osc.start(now)
  osc.stop(now + 0.75)
}

// --- engine loop ------------------------------------------------------------

let engine: { osc: OscillatorNode[]; gain: GainNode } | null = null

export function startEngine() {
  const context = ensure()
  if (!context || !master || engine) return
  const gain = context.createGain()
  gain.gain.value = 0.0
  gain.connect(master)

  const oscs: OscillatorNode[] = []
  for (const [freq, level] of [
    [58, 0.6],
    [116, 0.25],
    [174, 0.12],
  ] as const) {
    const osc = context.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    const g = context.createGain()
    g.gain.value = level
    osc.connect(g).connect(gain)
    osc.start()
    oscs.push(osc)
  }
  gain.gain.linearRampToValueAtTime(0.09, context.currentTime + 0.4)
  engine = { osc: oscs, gain }
}

/** Rev with the playback speed so 2x actually sounds faster. */
export function setEngineRate(rate: number) {
  if (!engine || !ctx) return
  engine.osc.forEach((osc, i) => {
    const base = [58, 116, 174][i]
    osc.frequency.setTargetAtTime(base * (0.75 + rate * 0.35), ctx!.currentTime, 0.15)
  })
}

export function stopEngine() {
  if (!engine || !ctx) return
  const now = ctx.currentTime
  engine.gain.gain.cancelScheduledValues(now)
  engine.gain.gain.setTargetAtTime(0, now, 0.12)
  const dying = engine
  engine = null
  setTimeout(() => dying.osc.forEach((o) => o.stop()), 600)
}
