import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const rate = 44100
let seed = 0x51a7e2
const random = () => {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
  return (seed >>> 0) / 0xffffffff * 2 - 1
}
const env = (t, attack, decay) => Math.min(1, t / attack) * Math.exp(-t / decay)

function wav(seconds, synth) {
  const count = Math.floor(rate * seconds)
  const out = Buffer.alloc(44 + count * 2)
  out.write('RIFF', 0); out.writeUInt32LE(36 + count * 2, 4); out.write('WAVEfmt ', 8)
  out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22)
  out.writeUInt32LE(rate, 24); out.writeUInt32LE(rate * 2, 28); out.writeUInt16LE(2, 32)
  out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(count * 2, 40)
  for (let i = 0; i < count; i++) {
    const v = Math.max(-1, Math.min(1, synth(i / rate, i)))
    out.writeInt16LE(Math.round(v * 32767), 44 + i * 2)
  }
  return out
}

const sounds = {
  'coin-toss.wav': wav(0.72, (t) => {
    const taps = [0, .095, .205, .335]
    return taps.reduce((v, at, i) => {
      const x = t - at
      return x < 0 ? v : v + Math.sin(x * Math.PI * 2 * (2350 - i * 170)) * env(x, .002, .075) * .24
    }, 0)
  }),
  'pistol-tail.wav': wav(0.58, (t) => {
    const crack = random() * env(t, .001, .035)
    const body = Math.sin(t * Math.PI * 2 * (115 - 55 * t)) * env(t, .001, .11)
    const echo = t > .16 ? random() * env(t - .16, .003, .1) : 0
    return crack * .64 + body * .58 + echo * .11
  }),
  'shotgun-tail.wav': wav(0.95, (t) => {
    const blast = random() * env(t, .002, .09)
    const body = Math.sin(t * Math.PI * 2 * (78 - 24 * t)) * env(t, .001, .18)
    const room = t > .2 ? random() * env(t - .2, .01, .24) : 0
    return blast * .72 + body * .7 + room * .16
  }),
  'body-impact.wav': wav(0.38, (t) => {
    const thud = Math.sin(t * Math.PI * 2 * (92 - 70 * t)) * env(t, .002, .075)
    return thud * .72 + random() * env(t, .001, .03) * .18
  }),
}

const output = resolve(import.meta.dirname, '../public/assets/audio')
await mkdir(output, { recursive: true })
for (const [name, data] of Object.entries(sounds)) await writeFile(resolve(output, name), data)
