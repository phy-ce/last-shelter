import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const mainPath = resolve(root, 'src/legacy/game.js')
let main = await readFile(mainPath, 'utf8')

function take(startText, endText) {
  const start = main.indexOf(startText)
  const end = main.indexOf(endText, start)
  if (start < 0 || end < 0) throw new Error(`section not found: ${startText}`)
  const section = main.slice(start, end)
  main = main.slice(0, start) + main.slice(end)
  return section
}

await mkdir(resolve(root, 'src/audio'), { recursive: true })
await mkdir(resolve(root, 'src/core'), { recursive: true })
await mkdir(resolve(root, 'src/content'), { recursive: true })

take('    const settings = {', '    const Sound = (() => {')
const sound = take('    const Sound = (() => {', '    function unlockSound()')
const content = take('    const CARDS = {', '    const canvas = $("battle");')

const imports = `import { settings, motionOn } from '../core/settings.js'
import { Sound } from '../audio/engine.js'
import { CARDS, ENEMY_TYPES, STAGES, LIMBS, BURN_TEXT } from '../content/combat.js'

`
main = imports + main

await writeFile(resolve(root, 'src/core/settings.js'), `const motionPreference = matchMedia('(prefers-reduced-motion: reduce)')

export const settings = {
  volume: 72,
  muted: false,
  ambience: true,
  motion: !motionPreference.matches,
  blood: true,
}

export const motionOn = () => settings.motion && !motionPreference.matches
`)

await writeFile(
  resolve(root, 'src/audio/engine.js'),
  `import { settings } from '../core/settings.js'\n\n${sound.replace('    const Sound', 'export const Sound').trimStart()}`,
)

await writeFile(
  resolve(root, 'src/content/combat.js'),
  content
    .replace('    const CARDS', 'export const CARDS')
    .replace('    const ENEMY_TYPES', 'export const ENEMY_TYPES')
    .replace('    const STAGES', 'export const STAGES')
    .replace('    const LIMBS', 'export const LIMBS')
    .replace('    const BURN_TEXT', 'export const BURN_TEXT')
    .trimStart(),
)

await writeFile(mainPath, main)
