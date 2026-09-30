// Drive headless Chrome over CDP: load game, seed a save, pick "새로 시작", watch for errors + frozen frames.
import { spawn } from 'node:child_process'
import { writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const port = 9333
const out = resolve(import.meta.dirname, 'out')
const scenario = process.argv[2] || 'discard'
await mkdir(out, { recursive: true })

const proc = spawn(chrome, [
  '--headless=new', `--remote-debugging-port=${port}`, '--window-size=1400,900',
  '--user-data-dir=' + out + '/chrome-profile', '--no-first-run', '--autoplay-policy=no-user-gesture-required',
  // The battle scene is WebGL (PixiJS); without a GPU, Chrome needs SwiftShader allowed explicitly.
  '--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio', 'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function json(url) { for (let i = 0; i < 40; i++) { try { return await (await fetch(url)).json() } catch { await sleep(250) } } throw new Error('chrome did not start') }

const targets = await json(`http://127.0.0.1:${port}/json`)
const page = targets.find(t => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const pending = new Map()
const logs = []
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
  if (msg.method === 'Runtime.consoleAPICalled') logs.push(`[${msg.params.type}] ` + msg.params.args.map(a => a.value ?? a.description ?? '').join(' '))
  if (msg.method === 'Runtime.exceptionThrown') logs.push('[EXCEPTION] ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text))
  if (msg.method === 'Log.entryAdded') logs.push(`[log:${msg.params.entry.level}] ${msg.params.entry.text} ${msg.params.entry.url || ''}`)
}
const send = (method, params = {}) => new Promise((resolve) => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params })) })
const evaluate = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return 'EVAL ERROR: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result?.result?.value }

await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable')

// 직업 화면은 고르기 → 확정 두 단계다. 확정 버튼이 없던 예전 화면도 그대로 통과한다.
const pickClass = () => evaluate(`(async () => {
  const title = document.querySelector('#modal h2')?.textContent
  document.querySelector('#modal .class-choice, #modal button.choice')?.click()
  await new Promise(r => setTimeout(r, 200))
  document.querySelector('#modal .class-confirm-button')?.click()
  return title
})()`)
// Loading waits for every battle sprite and the WebGL renderer, so poll until the loading modal is gone.
const loaded = () => evaluate(`(async () => { for (let i = 0; i < 100; i++) { const t = document.querySelector('#modal h2')?.textContent; if (t && t !== '불러오는 중') return t; await new Promise(r => setTimeout(r, 100)) } return 'TIMEOUT' })()`)
async function goto() { await send('Page.navigate', { url: 'http://localhost:8123/' }); await sleep(500); await loaded(); await pickClass(); await sleep(600) }

await goto()
if (scenario === 'discard' || scenario === 'resume') {
  // Play into turn 1 so a save exists, then reload and choose.
  console.log('save present after first load:', await evaluate(`Boolean(localStorage.getItem('last-shelter:run'))`))
  await goto()
  console.log('modal title:', await evaluate(`document.querySelector('#modal h2')?.textContent`))
  const label = scenario === 'discard' ? '새 게임' : '계속하기'
  console.log('clicked:', await evaluate(`(() => { const b = [...document.querySelectorAll('#modal button')].find(b => b.textContent.includes('${label}')); if (!b) return 'NOT FOUND'; b.click(); return b.textContent })()`))
  await sleep(800)
  console.log('class screen:', await pickClass())
  await sleep(1200)
}

// Frame liveness: screenshot the battle canvas twice and check the idle animation changed it.
// (A WebGL canvas can't be read back through a 2D context, so compare CDP screenshots instead.)
const pageState = `JSON.stringify({ overlayHidden: document.getElementById('overlay').hidden, appInert: document.getElementById('app').inert,
  hand: document.querySelectorAll('#hand .card').length, location: document.getElementById('location').textContent,
  phase: document.getElementById('phase').textContent, enemies: document.querySelectorAll('#targets .target').length })`
async function canvasShot() {
  const r = JSON.parse(await evaluate(`(() => { const r = document.getElementById('battle').getBoundingClientRect(); return JSON.stringify({ x: r.left, y: r.top, width: r.width, height: r.height, cw: document.getElementById('battle').width, ch: document.getElementById('battle').height }) })()`))
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: r.x, y: r.y, width: r.width, height: r.height, scale: 1 } })
  return { data: shot.result?.data || '', r }
}
const probe = {
  async run() {
    const a = await canvasShot(); await sleep(700); const b = await canvasShot()
    return JSON.stringify({ canvasW: a.r.cw, canvasH: a.r.ch, shotBytes: a.data.length, changed: a.data !== b.data, ...JSON.parse(await evaluate(pageState)) })
  },
}
console.log('probe:', await probe.run())
await send('Page.captureScreenshot', { format: 'png' }).then(r => writeFile(`${out}/shot-${scenario}.png`, Buffer.from(r.result.data, 'base64')))

// Play a card at an enemy and verify the effect finishes (phase returns to 내 행동).
const play = `(async () => {
  const card = [...document.querySelectorAll('#hand .card:not(.unavailable)')].find(c => c.querySelector('.card-summary')?.textContent.includes('피해')); if (!card) return 'no card';
  card.click(); await new Promise(r => setTimeout(r, 100));
  const target = document.querySelector('#targets .target'); if (!target) return 'no target';
  const canvas = document.getElementById('battle');
  const selected = document.querySelector('#hand .card.selected'); if (!selected) return 'card not selected';
  target.click();
  await new Promise(r => setTimeout(r, 200));
  const mid = document.getElementById('phase').textContent;
  await new Promise(r => setTimeout(r, 1500));
  return JSON.stringify({ mid, after: document.getElementById('phase').textContent, log: document.getElementById('lastLog').textContent, hand: document.querySelectorAll('#hand .card').length });
})()`
console.log('play:', await evaluate(play))
console.log('probe2:', await probe.run())
await send('Page.captureScreenshot', { format: 'png' }).then(r => writeFile(`${out}/shot-${scenario}-2.png`, Buffer.from(r.result.data, 'base64')))

const endTurn = `(async () => {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true })); document.getElementById('endTurn').click();
  await new Promise(r => setTimeout(r, 3500));
  return JSON.stringify({ phase: document.getElementById('phase').textContent, log: document.getElementById('lastLog').textContent, hp: document.querySelector('.vital.health strong')?.textContent, hand: document.querySelectorAll('#hand .card').length });
})()`
const playSelf = `(async () => {
  const card = [...document.querySelectorAll('#hand .card:not(.unavailable)')].find(c => c.querySelector('.card-summary')?.textContent.includes('방어도') || c.querySelector('.card-summary')?.textContent.includes('체력'));
  if (!card) return 'no self card';
  card.click(); await new Promise(r => setTimeout(r, 100));
  const canvas = document.getElementById('battle'); const r = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new MouseEvent('click', { clientX: r.left + r.width * 0.5, clientY: r.top + r.height * 0.3, bubbles: true }));
  await new Promise(r => setTimeout(r, 1300));
  return JSON.stringify({ log: document.getElementById('lastLog').textContent, block: document.querySelector('.player-effect strong')?.textContent, badges: [...document.querySelectorAll('#statuses .burn')].map(b => b.textContent), phase: document.getElementById('phase').textContent });
})()`
console.log('playSelf:', await evaluate(playSelf))
console.log('endTurn:', await evaluate(endTurn))
console.log('probe3:', await probe.run())
console.log('--- console/log entries ---')
for (const l of logs) console.log(l)
ws.close(); proc.kill()
