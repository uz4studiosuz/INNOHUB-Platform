/**
 * Procedural textures.
 *
 * The app has to work fully offline (spec 11: "No External APIs"), so every
 * texture is painted into an offscreen canvas at start-up instead of being
 * fetched. They are cheap, tile seamlessly enough at the distances used, and
 * cost nothing to ship.
 */

import * as THREE from 'three'

function makeCanvas(size = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  return { canvas, ctx: canvas.getContext('2d')! }
}

function finish(canvas: HTMLCanvasElement, repeat: number) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat, repeat)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Value noise splatter used by most of the surfaces below. */
function splatter(
  ctx: CanvasRenderingContext2D,
  size: number,
  count: number,
  colors: string[],
  radius: [number, number],
) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0]
    const r = radius[0] + Math.random() * (radius[1] - radius[0])
    ctx.beginPath()
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

let grass: THREE.Texture | null = null
export function grassTexture() {
  if (grass) return grass
  const size = 256
  const { canvas, ctx } = makeCanvas(size)
  ctx.fillStyle = '#3f6b32'
  ctx.fillRect(0, 0, size, size)
  splatter(ctx, size, 2200, ['#4b7d3a', '#365c2a', '#568a41', '#2f5124'], [1, 3.5])
  // A few dirt patches to break up the green.
  ctx.globalAlpha = 0.35
  splatter(ctx, size, 40, ['#6b5a3a', '#5a4c30'], [6, 18])
  ctx.globalAlpha = 1
  grass = finish(canvas, 24)
  return grass
}

let rock: THREE.Texture | null = null
export function rockTexture() {
  if (rock) return rock
  const size = 256
  const { canvas, ctx } = makeCanvas(size)
  ctx.fillStyle = '#6b6257'
  ctx.fillRect(0, 0, size, size)
  splatter(ctx, size, 900, ['#7b7266', '#5c544a', '#867c6e', '#4f483f'], [2, 9])
  rock = finish(canvas, 10)
  return rock
}

let concrete: THREE.Texture | null = null
export function concreteTexture() {
  if (concrete) return concrete
  const size = 256
  const { canvas, ctx } = makeCanvas(size)
  ctx.fillStyle = '#9a9a95'
  ctx.fillRect(0, 0, size, size)
  splatter(ctx, size, 1400, ['#a4a49f', '#8d8d88', '#b0b0aa'], [1, 4])
  // Form-work seams.
  ctx.strokeStyle = 'rgba(90,90,88,0.5)'
  ctx.lineWidth = 2
  for (let i = 0; i <= size; i += 64) {
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(size, i)
    ctx.stroke()
  }
  concrete = finish(canvas, 3)
  return concrete
}

let asphalt: THREE.Texture | null = null
export function asphaltTexture() {
  if (asphalt) return asphalt
  const size = 256
  const { canvas, ctx } = makeCanvas(size)
  ctx.fillStyle = '#33363b'
  ctx.fillRect(0, 0, size, size)
  splatter(ctx, size, 2600, ['#3c4046', '#2b2e32', '#454a51'], [1, 2.6])
  asphalt = finish(canvas, 8)
  return asphalt
}

let wood: THREE.Texture | null = null
export function woodTexture() {
  if (wood) return wood
  const size = 256
  const { canvas, ctx } = makeCanvas(size)
  ctx.fillStyle = '#a9743f'
  ctx.fillRect(0, 0, size, size)
  // Grain: wavy vertical bands, the way a sawn face reads.
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size
    ctx.strokeStyle = `rgba(${90 + Math.random() * 60},${55 + Math.random() * 40},${25 + Math.random() * 25},${0.25 + Math.random() * 0.4})`
    ctx.lineWidth = 0.6 + Math.random() * 2.4
    ctx.beginPath()
    ctx.moveTo(x, 0)
    for (let y = 0; y <= size; y += 16) {
      ctx.lineTo(x + Math.sin((y / size) * Math.PI * 2 + i) * 4, y)
    }
    ctx.stroke()
  }
  // Occasional knot.
  for (let i = 0; i < 3; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    for (let r = 10; r > 0; r -= 2) {
      ctx.strokeStyle = `rgba(80,48,20,${0.1 + r / 40})`
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.ellipse(x, y, r, r * 0.55, 0.4, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  wood = finish(canvas, 2)
  return wood
}

let metal: THREE.Texture | null = null
export function metalTexture() {
  if (metal) return metal
  const size = 256
  const { canvas, ctx } = makeCanvas(size)
  ctx.fillStyle = '#9aa4b2'
  ctx.fillRect(0, 0, size, size)
  // Faint brushed streaks + a little weathering.
  for (let i = 0; i < 400; i++) {
    const y = Math.random() * size
    ctx.strokeStyle = `rgba(${140 + Math.random() * 60},${148 + Math.random() * 60},${160 + Math.random() * 60},0.25)`
    ctx.lineWidth = 0.5 + Math.random()
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size, y + (Math.random() - 0.5) * 3)
    ctx.stroke()
  }
  metal = finish(canvas, 2)
  return metal
}

/** Texture lookup keyed by the material id used in the design. */
export function materialTexture(id: 'steel' | 'wood' | 'composite') {
  if (id === 'wood') return woodTexture()
  if (id === 'steel') return metalTexture()
  return null // composite is a flat dark matte, no texture needed
}
