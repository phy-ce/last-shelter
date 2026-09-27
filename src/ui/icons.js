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

// Tabler Icons 3.48.0 (MIT). Combat-only glyphs are kept separate so the
// status/intent language can be tuned without changing cards or navigation.
const tablerIcons = {
  "status-strength": {
    body: '<path d="M20 4v5l-9 7-4 4-3-3 4-4 7-9h5"/><path d="m6.5 11.5 6 6"/>',
  },
  "status-block": {
    filled: true,
    body: '<path d="M11.884 2.007 11.998 2l.118.007.059.008.061.013.111.034a.993.993 0 0 1 .217.112l.104.082.255.218a11 11 0 0 0 7.189 2.537l.342-.01a1 1 0 0 1 1.005.717 13 13 0 0 1-9.208 16.25 1 1 0 0 1-.502 0A13 13 0 0 1 2.54 5.718 1 1 0 0 1 3.545 5a11 11 0 0 0 7.531-2.527l.263-.225.096-.075a.993.993 0 0 1 .217-.112l.112-.034a.97.97 0 0 1 .12-.02Z"/>',
  },
  "status-injury": {
    body: '<path d="M15 3a3 3 0 0 1 3 3 3 3 0 1 1-2.12 5.122l-4.758 4.758a3 3 0 1 1-5.117 2.297V18h-.176a3 3 0 1 1 2.298-5.115l4.758-4.758A3 3 0 0 1 15.005 3H15"/><path d="m10.65 10.35 1.55 1.25-1.15 1.45 1.5 1.2"/>',
  },
  "status-noise": {
    body: '<path d="M21 12h-2c-.894 0-1.662-.857-1.761-2-.296-3.45-.749-6-2.749-6s-2.5 3.582-2.5 8-.5 8-2.5 8-2.452-2.547-2.749-6c-.1-1.147-.867-2-1.763-2H3"/>',
  },
  "status-infection": {
    body: '<path d="M7 12a5 5 0 1 0 10 0 5 5 0 1 0-10 0M12 7V3m-1 0h2m2.536 5.464 2.828-2.828m-.707-.707 1.414 1.414M17 12h4m0-1v2m-5.465 2.536 2.829 2.828m.707-.707-1.414 1.414M12 17v4m1 0h-2m-2.535-5.464-2.829 2.828m.707.707L4.93 17.657M7 12H3m0 1v-2m5.464-2.536L5.636 5.636m-.707.707L6.343 4.93"/>',
  },
  "status-numb": {
    filled: true,
    body: '<path d="M20.207 3.793a5.95 5.95 0 0 1 0 8.414l-8 8a5.95 5.95 0 0 1-8.414-8.414l8-8a5.95 5.95 0 0 1 8.414 0m-7 1.414L8.913 9.5l5.586 5.586 4.294-4.292a3.95 3.95 0 1 0-5.586-5.586"/>',
  },
  "status-grab": {
    body: '<path d="m9 15 6-6M11 6l.463-.536a5 5 0 0 1 7.071 7.072L18 13m-5 5-.397.534a5.068 5.068 0 0 1-7.127 0 4.972 4.972 0 0 1 0-7.071L6 11"/>',
  },
  "status-pending": {
    filled: true,
    body: '<path d="M17 3.34A10 10 0 1 1 2.005 12.324L2 12l.005-.324A10 10 0 0 1 17 3.34M12 6a1 1 0 0 0-.993.883L11 7v5l.009.131a1 1 0 0 0 .197.477l.087.1 3 3 .094.082a1 1 0 0 0 1.226 0l.094-.083.083-.094a1 1 0 0 0 0-1.226l-.083-.094L13 11.585V7l-.007-.117A1 1 0 0 0 12 6"/>',
  },
  "status-burn": {
    filled: true,
    body: '<path d="M10 2c0-.88 1.056-1.331 1.692-.722 1.958 1.876 3.096 5.995 1.75 9.12l-.08.174.012.003c.625.133 1.203-.43 2.303-2.173l.14-.224a1 1 0 0 1 1.582-.153C18.733 9.46 20 12.402 20 14.295 20 18.56 16.409 22 12 22s-8-3.44-8-7.706c0-2.252 1.022-4.716 2.632-6.301l.605-.589c.241-.236.434-.43.618-.624C9.285 5.268 10 3.856 10 2"/>',
  },
  "intent-summon": {
    body: '<path d="M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0"/><path d="M16 19h6m-3-3v6M6 21v-2a4 4 0 0 1 4-4h4"/>',
  },
  "intent-regen": {
    body: '<path d="m12 20-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.96 6.053"/><path d="M16 19h6m-3-3v6"/>',
  },
  "intent-charge": {
    filled: true,
    body: '<path d="M13 2a1 1 0 0 1 1 1v6h5a1 1 0 0 1 .808 1.589l-8 11A1 1 0 0 1 10 21v-6H5a1 1 0 0 1-.808-1.589l8-11A1 1 0 0 1 13 2"/>',
  },
  "intent-scream": {
    body: '<path d="M15 8a5 5 0 0 1 0 8m2.7-11a9 9 0 0 1 0 14M6 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2l3.5-4.5A.8.8 0 0 1 11 5v14a.8.8 0 0 1-1.5.5L6 15"/>',
  },
  "intent-stagger": {
    body: '<path d="M4 12h6l-6 8h6M14 4h6l-6 8h6"/>',
  },
  "intent-hidden": {
    body: '<path d="M10.585 10.587a2 2 0 0 0 2.829 2.828M16.681 16.673A8.717 8.717 0 0 1 12 18c-3.6 0-6.6-2-9-6 1.272-2.12 2.712-3.678 4.32-4.674m2.86-1.146A9.055 9.055 0 0 1 12 6c3.6 0 6.6 2 9 6-.666 1.11-1.379 2.067-2.138 2.87M3 3l18 18"/>',
  },
  "intent-grab": {
    body: '<path d="M8 11V7.5a1.5 1.5 0 0 1 3 0V10m0-.5v-3a1.5 1.5 0 0 1 3 0V10m0-2.5a1.5 1.5 0 0 1 3 0V10m0-.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1.792a6 6 0 0 1-5.012-2.7L7 17l-3.286-5.728A1.5 1.5 0 0 1 6.53 9.53L8 11"/>',
  },
  "intent-coin": {
    filled: true,
    body: '<path d="M17 3.34A10 10 0 1 1 2 12l.005-.324A10 10 0 0 1 17 3.34M12 6a1 1 0 0 0-1 1 3 3 0 1 0 0 6v2a1.024 1.024 0 0 1-.866-.398l-.068-.101a1 1 0 0 0-1.732.998A3 3 0 0 0 10.839 17H11a1 1 0 0 0 .883.993L12 18a1 1 0 0 0 1-1l.176-.005A3 3 0 0 0 13 11V9c.358-.012.671.14.866.398l.068.101a1 1 0 0 0 1.732-.998A3 3 0 0 0 13.161 7H13a1 1 0 0 0-1-1m1 7a1 1 0 0 1 0 2v-2m-2-4v2a1 1 0 0 1 0-2"/>',
  },
};

tablerIcons["intent-attack"] = tablerIcons["status-strength"];
tablerIcons["intent-guard"] = tablerIcons["status-block"];
tablerIcons["intent-infection"] = tablerIcons["status-infection"];

export function uiIcon(name) {
  const tabler = tablerIcons[name];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', tabler?.filled ? 'currentColor' : 'none');
  svg.setAttribute('stroke', tabler?.filled ? 'none' : 'currentColor');
  svg.setAttribute('stroke-width', tabler ? '2.2' : '1.6');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('hud-icon');
  if (tabler) svg.classList.add('tabler-icon', tabler.filled ? 'is-filled' : 'is-outline');
  svg.innerHTML = tabler?.body || paths[name] || paths.body;
  return svg;
}
