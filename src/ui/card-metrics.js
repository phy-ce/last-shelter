import { uiIcon } from './icons.js';

// Presentation only: values are supplied by content definitions and the rules layer.
export function cardMetrics(data, upgraded, { damage, hits, effects = {}, blockBonus = 0 }) {
  const rows = [];
  const add = (icon, value, label) => rows.push({ icon, value: String(value), label });
  if (data.choice) add('choice', '↔', '사용 시 효과 선택');
  else {
    if (data.damage) add('attack', `${damage}${hits > 1 ? `×${hits}` : ''}`, `피해 ${damage}${hits > 1 ? `, ${hits}회` : ''}${data.gamble?.before ? ' (동전 성공 시)' : ''}`);
    const block = data.block ? data.block(upgraded) : effects.block;
    if (block) add('shield', block + blockBonus, `방어도 ${block + blockBonus}`);
    const heal = data.heal ? data.heal(upgraded) : effects.heal;
    if (heal) add('heart', `+${heal}`, `체력 ${heal} 회복`);
    if (effects.cure) add('infection', `−${effects.cure}`, `감염 ${effects.cure} 감소`);
    if (effects.energy) add('energy', `+${effects.energy}`, `행동력 ${effects.energy} 회복`);
    if (effects.draw) add('cards', `+${effects.draw}`, `카드 ${effects.draw}장 뽑기`);
    if (effects.strength) add('attack', `+${effects.strength}`, `이번 전투 공격 피해 ${effects.strength} 증가`);
    if (data.burn) add('flame', data.burn(upgraded), `화상 ${data.burn(upgraded)}`);
    if (data.limbBonus) add('arm', `+${data.limbBonus(upgraded)}`, `사지 추가 피해 ${data.limbBonus(upgraded)}`);
    if (data.stagger) add('stagger', '', '다음 적 행동 경직');
    if (effects.numb) add('heal', '', '이번 턴 부상 무시');
  }
  if (data.target === 'all') add('all', '', '모든 적');
  if (data.delayed) add('clock', '', '다음 턴 시작에 발동');
  if (data.gamble) add('coin', '?', '동전 판정 · 선택하면 성공과 실패 효과 표시');
  if (data.ammo) add('ammo', `−${data.ammo}`, `탄약 ${data.ammo}발 소모`);
  if (data.noise) add('noise', `+${data.noise}`, `소음 ${data.noise} 증가`);
  if (effects.noiseDown) add('noise', `−${effects.noiseDown}`, `소음 ${effects.noiseDown} 감소`);
  if (data.exhaust) add('exhaust', '', '사용 후 소멸');
  return rows;
}

export function metricStrip(rows) {
  const strip = document.createElement('div');
  strip.className = 'card-metrics';
  for (const { icon, value, label } of rows) {
    const metric = document.createElement('span');
    metric.className = `card-metric metric-${icon}`;
    metric.title = label;
    metric.setAttribute('aria-label', label);
    metric.append(uiIcon(icon), document.createTextNode(value));
    strip.append(metric);
  }
  return strip;
}
