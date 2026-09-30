// Capture battle frames at 1920x1080 while effects play, for visual review.
// Usage: node tools/smoke/shots.mjs [classIndex=0]   (needs `npm run smoke:serve`)
import { spawn } from 'node:child_process'
import { writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const port = 9334
const out = resolve(import.meta.dirname, 'out', 'shots')
const classIndex = Number(process.argv[2] || 0)
await mkdir(out, { recursive: true })

const proc = spawn(chrome, [
  '--headless=new', `--remote-debugging-port=${port}`, '--window-size=1920,1080', '--force-device-scale-factor=1',
  '--user-data-dir=' + resolve(out, '..', 'chrome-profile-shots'), '--no-first-run', '--autoplay-policy=no-user-gesture-required',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio', 'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function json(url) { for (let i = 0; i < 40; i++) { try { return await (await fetch(url)).json() } catch { await sleep(250) } } throw new Error('chrome did not start') }
const page = (await json(`http://127.0.0.1:${port}/json`)).find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
const logs = []
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
  if (msg.method === 'Runtime.exceptionThrown') logs.push('[EXCEPTION] ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text))
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warn'].includes(msg.params.type)) logs.push(`[${msg.params.type}] ` + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
}
const send = (method, params = {}) => new Promise((res) => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })) })
const evaluate = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); return r.result?.result?.value }
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(`${out}/${name}.png`, Buffer.from(r.result.data, 'base64')) }

await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate', { url: 'http://localhost:8123/' })
await evaluate(`(async () => { for (let i = 0; i < 150; i++) { const t = document.querySelector('#modal h2')?.textContent; if (t && t !== '불러오는 중') return t; await new Promise(r => setTimeout(r, 100)) } })()`)
// Discard any saved run, pick the class, confirm; retry until the battle is showing.
const started = await evaluate(`(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms))
  for (let i = 0; i < 40; i++) {
    if (document.getElementById('overlay').hidden) return true
    const fresh = [...document.querySelectorAll('#modal button')].find(b => b.textContent.includes('새로 시작'))
    if (fresh) fresh.click()
    else {
      document.querySelectorAll('#modal .class-choice, #modal button.choice')[${classIndex}]?.click()
      await wait(200)
      document.querySelector('#modal .class-confirm-button')?.click()
    }
    await wait(400)
  }
  return false
})()`)
if (!started) { console.log('could not start a battle'); ws.close(); proc.kill(); process.exit(1) }
await sleep(1500)
await shot('00-idle')

// fx mode: fire each effect directly through the dev hook at 1/6 speed and capture a few frames.
if (process.argv[3] === 'fx') {
  const keys = ['pistol', 'shotgun', 'knife', 'axe', 'guard', 'heal', 'quiet', 'fire', 'flare', 'grenade', 'focus', 'flashbang', 'hurt', 'injury', 'buff', 'death']
  await evaluate(`window.__battle.view.debugTimeScale(1 / 6)`)
  for (const key of keys) {
    await evaluate(`(() => {
      const b = window.__battle, st = b.state(), v = b.view, g = b.geometry()
      const targets = st.enemies.map((e) => b.targetPoint(e, null))
      const k = '${key}'
      if (k === 'hurt') { v.burst(g.heroX, g.ground - 107 * g.scale, 25); v.floatText(g.heroX, g.ground - 162 * g.scale, '−7', '#dfa087'); v.shake(8); v.heroRecoil(1); v.playerHit({ x: g.heroX, y: g.ground - 107 * g.scale }, 7) }
      else if (k === 'injury') { const p = { x: g.heroX + 25 * g.scale, y: g.ground - 28 * g.scale }; v.burst(p.x, p.y, 62); v.shake(23); v.heroRecoil(1.8); v.injury(p) }
      else if (k === 'death') v.kill(st.enemies[0])
      else if (k === 'buff') v.enemyBuff(st.enemies[st.enemies.length - 1])
      else {
        v.action(k, ['knife', 'axe', 'pistol', 'shotgun', 'fire', 'flare'].includes(k) ? targets.slice(0, 1) : targets)
        const hitAt = { knife: 0.105, axe: 0.17, fire: 0.34, flare: 0.36, grenade: 0.3, flashbang: 0.28 }[k] ?? 0
        const style = { fire: 'fire', flare: 'fire' }[k] || k
        if (['knife', 'axe', 'pistol', 'shotgun', 'fire', 'flare', 'grenade', 'flashbang'].includes(k)) setTimeout(() => {
          for (const [i, e] of st.enemies.entries()) if (i === 0 || ['grenade', 'flashbang'].includes(k)) { const p = b.targetPoint(e, null); v.floatText(p.x, p.y - 18, '−6', '#e8ca9b'); v.impact(e, p, 6, style) }
        }, hitAt * 6000)
      }
    })()`)
    for (const [i, t] of [150, 700, 1600, 3000].entries()) { await sleep(i ? t - [150, 700, 1600, 3000][i - 1] : t); await shot(`fx-${key}-${i}`) }
    await sleep(3500)
    if (key === 'death') break
  }
  console.log(logs.length ? logs.join('\n') : 'no errors')
  ws.close(); proc.kill(); process.exit(0)
}

// Play every playable attack card in hand at the first enemy, capturing frames mid-effect.
for (let round = 0; round < 3; round++) {
  const label = await evaluate(`(() => {
    const card = [...document.querySelectorAll('#hand .card:not(.unavailable)')].find(c => c.querySelector('.card-summary')?.textContent.includes('피해'));
    if (!card) return null; card.click(); return card.querySelector('.card-title')?.textContent })()`)
  if (!label) break
  await sleep(120)
  await evaluate(`document.querySelector('#targets .target')?.click()`)
  for (const t of [60, 180, 320]) { await sleep(t === 60 ? 60 : t - (t === 180 ? 60 : 180)); await shot(`1${round}-attack-${t}ms`) }
  await sleep(1400)
}
await evaluate(`(() => { document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true })); document.getElementById('endTurn').click() })()`)
for (const t of [500, 900, 1300, 1700]) { await sleep(400); await shot(`20-enemy-${t}ms`) }
await sleep(2500)
await shot('30-turn2')
console.log(logs.length ? logs.join('\n') : 'no errors')
ws.close(); proc.kill()
