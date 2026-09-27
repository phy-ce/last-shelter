// Tabler Icons 3.48.0 (MIT). Every reusable UI glyph lives here; no custom
// path fallback is kept, so navigation, cards, status and intents share one language.
const tablerIcons = {
  attack: { body: '<path d="M20 4v5l-9 7-4 4-3-3 4-4 7-9h5"/><path d="m6.5 11.5 6 6"/>' },
  cards: { body: '<path d="m3.604 7.197 7.138-3.109a.96.96 0 0 1 1.27.527l4.924 11.902a1 1 0 0 1-.514 1.304l-7.137 3.109a.96.96 0 0 1-1.271-.527L3.09 8.5a1 1 0 0 1 .514-1.304"/><path d="M15 4h1a1 1 0 0 1 1 1v3.5M20 6l.768.315a1 1 0 0 1 .53 1.311L19 13"/>' },
  discard: { body: '<path d="M4 7h16M10 11v6m4-6v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>' },
  // Tabler capsule-horizontal: brass coloring and an angled mount make this
  // read as a cartridge instead of the previous target/reticle glyph.
  ammo: { body: '<path d="M3 12a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6 6 6 0 0 1-6 6H9a6 6 0 0 1-6-6"/>' },
  flame: { body: '<path d="M12 10.941c2.333-3.308.167-7.823-1-8.941 0 3.395-2.235 5.299-3.667 6.706C5.903 10.114 5 12 5 14.294 5 17.998 8.134 21 12 21s7-3.002 7-6.706c0-1.712-1.232-4.403-2.333-5.588-2.084 3.353-3.257 3.353-4.667 2.235"/>' },
  stagger: { body: '<path d="M4 12h6l-6 8h6M14 4h6l-6 8h6"/>' },
  clock: { body: '<path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0M12 7v5l3 3"/>' },
  // Tabler circle-half-2: two unmarked faces replace the casual $ token.
  coin: { body: '<path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0"/><path d="M12 3v18"/><path d="m12 14 7-7"/><path d="m12 19 8.5-8.5"/><path d="m12 9 4.5-4.5"/>' },
  all: { body: '<path d="M5 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85"/>' },
  arm: { body: '<path d="M8 13V4.5a1.5 1.5 0 0 1 3 0V12m0-.5v-2a1.5 1.5 0 1 1 3 0V12m0-1.5a1.5 1.5 0 0 1 3 0V12m0-.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-1.792a6 6 0 0 1-5.012-2.7L7 19l-3.286-5.728A1.5 1.5 0 0 1 6.53 11.53L8 13"/>' },
  leg: { body: '<path d="M12 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0M7 21l3-4m6 4-2-4-3-3 1-6M6 12l2-3 4-1 3 3 3 1"/>' },
  eye: { body: '<path d="M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0M21 12c-2.4 4-5.4 6-9 6s-6.6-2-9-6c2.4-4 5.4-6 9-6s6.6 2 9 6"/>' },
  hidden: { body: '<path d="M10.585 10.587a2 2 0 0 0 2.829 2.828M16.681 16.673A8.717 8.717 0 0 1 12 18c-3.6 0-6.6-2-9-6 1.272-2.12 2.712-3.678 4.32-4.674m2.86-1.146A9.055 9.055 0 0 1 12 6c3.6 0 6.6 2 9 6-.666 1.11-1.379 2.067-2.138 2.87M3 3l18 18"/>' },
  choice: { body: '<path d="M3 19a2 2 0 1 0 4 0 2 2 0 0 0-4 0M19 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4M11 19h5.5a3.5 3.5 0 0 0 0-7h-8a3.5 3.5 0 0 1 0-7H13"/>' },
  exhaust: { body: '<path d="M6.5 7h11m-11 10h11M6 20v-2a6 6 0 1 1 12 0v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1M6 4v2a6 6 0 1 0 12 0V4a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1"/>' },
  heal: { body: '<path d="M13 3a1 1 0 0 1 1 1v4.535l3.928-2.267a1 1 0 0 1 1.366.366l1 1.732a1 1 0 0 1-.366 1.366L16.001 12l3.927 2.269a1 1 0 0 1 .366 1.366l-1 1.732a1 1 0 0 1-1.366.366L14 15.464V20a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-4.536l-3.928 2.268a1 1 0 0 1-1.366-.366l-1-1.732a1 1 0 0 1 .366-1.366L7.999 12 4.072 9.732a1 1 0 0 1-.366-1.366l1-1.732a1 1 0 0 1 1.366-.366L10 8.535V4a1 1 0 0 1 1-1h2"/>' },
  heart: { body: '<path d="m19.5 12.572-7.5 7.428-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572"/>' },
  energy: { body: '<path d="M13 3v7h6l-8 11v-7H5l8-11"/>' },
  shield: { body: '<path d="M12 3a12 12 0 0 0 8.5 3A12 12 0 0 1 12 21 12 12 0 0 1 3.5 6 12 12 0 0 0 12 3"/>' },
  infection: { body: '<path d="M7 12a5 5 0 1 0 10 0 5 5 0 1 0-10 0M12 7V3m-1 0h2m2.536 5.464 2.828-2.828m-.707-.707 1.414 1.414M17 12h4m0-1v2m-5.465 2.536 2.829 2.828m.707-.707-1.414 1.414M12 17v4m1 0h-2m-2.535-5.464-2.829 2.828m.707.707L4.93 17.657M7 12H3m0 1v-2m5.464-2.536L5.636 5.636m-.707.707L6.343 4.93"/>' },
  body: { body: '<path d="M10 9a2 2 0 1 0 4 0 2 2 0 0 0-4 0M8 16a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2M3 7V5a2 2 0 0 1 2-2h2M3 17v2a2 2 0 0 0 2 2h2M17 3h2a2 2 0 0 1 2 2v2M17 21h2a2 2 0 0 0 2-2v-2"/>' },
  noise: { body: '<path d="M21 12h-2c-.894 0-1.662-.857-1.761-2-.296-3.45-.749-6-2.749-6s-2.5 3.582-2.5 8-.5 8-2.5 8-2.452-2.547-2.749-6c-.1-1.147-.867-2-1.763-2H3"/>' },
  codex: { body: '<path d="M19 4v16H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12m0 12H7a2 2 0 0 0-2 2M9 8h6"/>' },
  log: { body: '<path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1m3 0v18m4-14h2m-2 4h2"/>' },
  help: { body: '<path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0m9 4v.01M12 13a2 2 0 0 0 .914-3.782 1.98 1.98 0 0 0-2.414.483"/>' },
  settings: { body: '<path d="M12 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0M4 6h8m4 0h4M6 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0m-4 0h2m4 0h10m-5 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0M4 18h11m4 0h1"/>' },
  backpack: { body: '<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M8 21v-5a4 4 0 0 1 8 0v5"/><path d="M8 10h8"/><path d="M8 18h8"/>' },
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
    body: '<path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0"/><path d="M12 3v18"/><path d="m12 14 7-7"/><path d="m12 19 8.5-8.5"/><path d="m12 9 4.5-4.5"/>',
  },
};

tablerIcons["intent-attack"] = tablerIcons["status-strength"];
tablerIcons["intent-guard"] = tablerIcons["status-block"];
tablerIcons["intent-infection"] = tablerIcons["status-infection"];

export function uiIcon(name) {
  const tabler = tablerIcons[name] || tablerIcons.body;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', tabler?.filled ? 'currentColor' : 'none');
  svg.setAttribute('stroke', tabler?.filled ? 'none' : 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('hud-icon');
  svg.classList.add('tabler-icon', tabler.filled ? 'is-filled' : 'is-outline');
  svg.innerHTML = tabler.body;
  return svg;
}

export function mountUiIcons(root = document) {
  root.querySelectorAll('[data-ui-icon]').forEach((slot) => {
    slot.replaceWith(uiIcon(slot.dataset.uiIcon));
  });
}
