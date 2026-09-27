const paths = {
  attack: '<path d="m14 3 7-1-1 7-10 10-5-5L14 3Z M4 13l7 7M3 21l4-4"/>',
  cards: '<rect x="7" y="6" width="13" height="15" rx="2"/><path d="M16 3H4a1 1 0 0 0-1 1v13M11 11h5m-5 4h5"/>',
  discard: '<path d="M5 4h14v11H5zM8 8h8M9 18l3 3 3-3m-3-3v6"/>',
  ammo: '<path d="M8 21V8l4-6 4 6v13ZM8 16h8M8 19h8M8 8h8"/>',
  flame: '<path d="M12 2c3 5-1 6 2 9l3-4c4 5 5 9 1 13-4 4-12 1-12-4 0-4 4-6 6-14Z"/>',
  stagger: '<path d="m3 7 5 3-3 4 5 1m11-8-5 3 3 4-5 1M10 3l2 4 2-4M9 20h6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  coin: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/><path d="m12 8 3 4-3 4-3-4 3-4Z"/>',
  all: '<circle cx="12" cy="9" r="3"/><path d="M7 21v-4a5 5 0 0 1 10 0v4M4 8a3 3 0 0 0 0 6m16-6a3 3 0 0 1 0 6M2 21v-3m20 3v-3"/>',
  arm: '<path d="m8 3 3 2-3 8 6 2 3-4 4 2-3 7-10-1-5-4 5-12Z"/>',
  leg: '<path d="m8 3 7 1-2 8 3 7 5 1v2h-9L8 12l-2-1 2-8Z"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  hidden: '<path d="m3 3 18 18M10 5c6-1 12 7 12 7l-3 3M6 6l-4 6s7 11 16 5M9 9a4 4 0 0 0 6 6"/>',
  choice: '<path d="M12 22V12L5 5m7 7 7-7M3 10V3h7m4 0h7v7"/>',
  exhaust: '<path d="M7 3h10v10H7zM10 16l-2 3m5-3v5m3-5 2 3"/>',
  heal: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  energy: '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/>',
  infection: '<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/><path d="M9 15h6m-3-3v6"/>',
  body: '<circle cx="12" cy="4" r="2"/><path d="m5 9 7-2 7 2M12 7v7m0 0-4 7m4-7 4 7M8 8l-2 7m10-7 2 7"/>',
  noise: '<path d="M3 10v4m4-7v10m5-14v18m5-14v10m4-7v4"/>',
};

export function uiIcon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('hud-icon');
  svg.innerHTML = paths[name] || paths.body;
  return svg;
}
