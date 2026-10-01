import { uiIcon } from './icons.js'

// Presentation only. Existing controller actions own all encounter effects.
export function createRouteMap({ stage, stages, choices, visited, manage }) {
  const root = document.createElement('div')
  root.className = 'run-map'
  const surface = document.createElement('section')
  surface.className = 'run-map-surface'
  surface.setAttribute('aria-label', '경로 지도')
  const ns = 'http://www.w3.org/2000/svg'
  const drawing = document.createElementNS(ns, 'svg')
  drawing.setAttribute('viewBox', '0 0 1240 760')
  drawing.setAttribute('preserveAspectRatio', 'none')
  drawing.setAttribute('aria-hidden', 'true')
  surface.append(drawing)
  const shape = (tag, attrs) => {
    const node = document.createElementNS(ns, tag)
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value))
    drawing.append(node)
    return node
  }
  for (let row = 0; row < 8; row++) for (let col = 0; col < 14; col++) {
    const x = 22 + col * 89, y = 30 + row * 89
    if ((col + row) % 7) shape('rect', { x, y, width: 48 + col % 3 * 8, height: 40 + row % 3 * 6, class: 'run-map-block' })
  }
  shape('path', { d: 'M0 500L230 450L450 490L700 400L970 455L1240 380', class: 'run-map-street' })
  shape('path', { d: 'M0 690L280 660L540 710L830 675L1240 715V760H0Z', class: 'run-map-water' })
  const xAt = index => 78 + index * 180
  const line = (x1, y1, x2, y2, status) => {
    const mid = (x1 + x2) / 2
    shape('path', { d: `M${x1} ${y1}C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`, class: `run-map-line ${status}` })
  }
  const addNode = ({ x, y, name, icon, status, action }) => {
    const button = document.createElement('button')
    button.className = `run-map-node ${status}`
    button.style.left = `${x / 1240 * 100}%`
    button.style.top = `${y / 760 * 100}%`
    button.disabled = !action
    button.setAttribute('aria-label', name)
    const mark = document.createElement('span')
    mark.className = 'run-map-mark'
    mark.append(uiIcon(icon))
    const title = document.createElement('span')
    title.className = 'run-map-name'
    title.textContent = name
    button.append(mark, title)
    surface.append(button)
    return button
  }
  const aside = document.createElement('aside')
  aside.className = 'run-map-details'
  const heading = document.createElement('h3')
  const description = document.createElement('p')
  const move = document.createElement('button')
  move.className = 'button primary'
  move.textContent = '이동'
  move.disabled = true
  let selected = null
  move.addEventListener('click', () => selected?.action())
  aside.append(heading, description, move)
  const bag = document.createElement('button')
  bag.className = 'button run-map-bag'
  bag.setAttribute('aria-label', '장비와 물자')
  bag.append(uiIcon('backpack'))
  bag.addEventListener('click', manage)
  aside.append(bag)
  const names = ['문 닫힌 편의점', '아래로만 이어지는 주차장', '멈춘 지하철', '이름 없는 병동', '수문 관리소', '돌아보는 검문소', '숨 쉬는 출구']
  const captions = ['작업대 옆에 붕대와 공구가 남아 있다.', '어둠 속에서 작은 불빛이 흔들린다.']
  for (let index = 0; index < stages.length; index++) {
    const x = xAt(index)
    addNode({ x, y: 380, name: names[index] || stages[index].name.replace(/^\d+\s*\/\s*/, ''), icon: index === stages.length - 1 ? 'exhaust' : 'attack', status: index === stage ? 'current' : index < stage ? 'visited' : 'locked' })
    if (index >= stages.length - 1) continue
    for (let branch = 0; branch < 2; branch++) {
      const bx = x + 90, by = branch === 0 ? 225 : 535
      const available = index === stage
      const completed = index < stage && visited[index] === branch
      const status = available ? 'available' : completed ? 'visited' : 'locked'
      line(x, 380, bx, by, status)
      line(bx, by, xAt(index + 1), 380, completed ? 'visited' : 'locked')
      const choice = choices[branch]
      const node = addNode({ x: bx, y: by, name: branch === 0 ? '정비소' : '낯선 흔적', icon: branch === 0 ? 'settings' : 'eye', status, action: available ? choice.action : null })
      if (available) node.addEventListener('click', () => {
        surface.querySelectorAll('.selected').forEach(el => { el.classList.remove('selected'); el.setAttribute('aria-pressed', 'false') })
        node.classList.add('selected')
        node.setAttribute('aria-pressed', 'true')
        selected = choice
        heading.textContent = branch === 0 ? '정비소' : '낯선 흔적'
        description.textContent = captions[branch]
        move.disabled = false
      })
    }
  }
  root.append(surface, aside)
  return root
}
