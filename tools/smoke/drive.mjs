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
  '--disable-gpu', '--mute-audio', 'about:blank',
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

const pickClass = () => evaluate(`[...document.querySelectorAll('#modal button')].find(b => b.textContent.includes('생존자'))?.click(); document.querySelector('#modal h2')?.textContent`)
async function goto() { await send('Page.navigate', { url: 'http://localhost:8123/' }); await sleep(2500); await pickClass(); await sleep(600) }

await goto()
if (scenario === 'discard' || scenario === 'resume') {
  // Play into turn 1 so a save exists, then reload and choose.
  console.log('save present after first load:', await evaluate(`Boolean(localStorage.getItem('last-shelter:run'))`))
  await goto()
  console.log('modal title:', await evaluate(`document.querySelector('#modal h2')?.textContent`))
  const label = scenario === 'discard' ? '새로 시작' : '이어하기'
  console.log('clicked:', await evaluate(`(() => { const b = [...document.querySelectorAll('#modal button')].find(b => b.textContent.includes('${label}')); if (!b) return 'NOT FOUND'; b.click(); return b.textContent })()`))
  await sleep(800)
  console.log('class screen:', await pickClass())
  await sleep(1200)
}

// Frame liveness: sample canvas pixels over time and check the enemy hover recoil is animating.
const probe = `(async () => {
  const c = document.getElementById('battle');
  const ctx = c.getContext('2d');
  const sum = () => { const d = ctx.getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 4009) s += d[i]; return s };
  const a = sum(); await new Promise(r => setTimeout(r, 700)); const b = sum();
  return JSON.stringify({ canvasW: c.width, canvasH: c.height, pixelSumA: a, pixelSumB: b, changed: a !== b,
    overlayHidden: document.getElementById('overlay').hidden, appInert: document.getElementById('app').inert,
    hand: document.querySelectorAll('#hand .card').length, location: document.getElementById('location').textContent,
    phase: document.getElementById('phase').textContent, enemies: document.querySelectorAll('#targets .target').length });
})()`
console.log('probe:', await evaluate(probe))
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
console.log('probe2:', await evaluate(probe))
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
console.log('probe3:', await evaluate(probe))
console.log('--- console/log entries ---')
for (const l of logs) console.log(l)
ws.close(); proc.kill()
