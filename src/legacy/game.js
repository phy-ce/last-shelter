import { cardMetrics, metricStrip } from '../ui/card-metrics.js'
import { bodyDiagram } from '../ui/body-diagram.js'
import { mountUiIcons, uiIcon } from '../ui/icons.js'
import { settings, motionOn, saveSettings } from '../core/settings.js'
import { saveRun, loadRun, clearRun } from '../core/save.js'
import { preloadArt } from '../boot/preload.js'
import { Music } from '../audio/music.js'
import { Sound } from '../audio/engine.js'
import * as rules from '../core/combat-rules.js'
import { CARDS, CARD_FLAVOR, STAGES, LIMBS, BURN_TEXT, skillEffects } from '../content/combat.js'
import { ITEMS, RARITIES, itemDef, itemShape } from '../content/items.js'
import { CLASSES, classDef } from '../content/classes.js'
import { COMBAT_BACKGROUND, SURVIVOR, heroSprite, INFECTED, ENEMY_SPRITES, ENEMY_INJURED_SPRITES, UPGRADE_EPAULETTE, CARD_ART, COIN_HEADS, COIN_TAILS, EFFECT_SPRITES, assetReady } from '../art/assets.js'

const $ = (id) => document.getElementById(id);
mountUiIcons();
// 캔버스 텍스트도 CSS와 같은 표시용 서체를 쓴다. 한 번만 읽어 두고 프레임마다 재계산하지 않는다.
const displayFont = (() => {
  let cached = "";
  return () => {
    if (!cached) cached = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "Georgia, serif";
    return cached;
  };
})();
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)");

    function unlockSound() {
      Sound.unlock().then((ok) => {
        if (ok) Sound.resumeWet();
      });
    }

    document.addEventListener("pointerdown", unlockSound, { capture: true });
    document.addEventListener("keydown", (event) => {
      if (!event.repeat && !event.ctrlKey && !event.metaKey) unlockSound();
    }, { capture: true });

    const canvas = $("battle");
    const ctx = canvas.getContext("2d");
    const artCache = new Map();
    const figureCache = new Map();
    const background = document.createElement("canvas");

    let state;
    let modal = null;
    let frameHandle = 0;
    let returnFocus = null;
    let hoverCard = null;
    let hoverAim = null;
    let coinData = null;
    let coinResolver = null;
    let deckGrouped = true;
    let gameVersion = 0;
    let injuryTimer;
    let frameTime = 0;
    let shake = 0;
    let heroRecoil = 0;
    let muzzle = 0;
    let actionVisual = null;
    let particles = [];
    let impactFx = [];
    let stains = [];
    let texts = [];
    let traces = [];
    let ghosts = [];
    let shells = [];
    let dealtCards = new Set();
    const enemySlots = new Map();
    let view = { w: 1200, h: 430, dpr: 1 };

    function el(tag, className = "", text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }

    function button(text, action, className = "button") {
      const node = el("button", className, text);
      node.type = "button";
      node.addEventListener("click", action);
      return node;
    }

    function randomAt(seed) {
      const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
      return value - Math.floor(value);
    }

    function line(c, points, color, width = 1) {
      c.strokeStyle = color;
      c.lineWidth = width;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.beginPath();
      points.forEach(([x, y], i) => {
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      });
      c.stroke();
    }

    function oval(c, x, y, rx, ry, color) {
      c.fillStyle = color;
      c.beginPath();
      c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
      c.fill();
    }

    function brush(c, path, color, width = 3) {
      const p = new Path2D(path);
      c.strokeStyle = color;
      c.lineWidth = width;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.stroke(p);
      c.save();
      c.translate(0.7, -0.5);
      c.strokeStyle = "#edd5b52b";
      c.lineWidth = Math.max(0.5, width * 0.12);
      c.stroke(p);
      c.restore();
    }

    function sketch(c, path, fill, seed = 1, density = 100) {
      const p = new Path2D(path);
      c.fillStyle = fill;
      c.fill(p);
      c.save();
      c.clip(p);

      for (let i = 0; i < density; i++) {
        const x = randomAt(seed * 17 + i * 3) * 430 - 215;
        const y = randomAt(seed * 29 + i * 7) * 340 - 240;
        const n = 14 + randomAt(i + seed) * 55;
        line(c, [[x, y], [x + n, y - n * 0.6]], "#21172b42", 0.7);
        line(c, [[x + 4, y], [x + n + 4, y - n * 0.4]], "#f1d9b523", 0.6);
      }

      const shade = c.createLinearGradient(-60, -180, 90, 60);
      shade.addColorStop(0, "#efd8b12e");
      shade.addColorStop(0.5, "#ffffff00");
      shade.addColorStop(1, "#130d2570");
      c.fillStyle = shade;
      c.fillRect(-300, -300, 600, 600);
      c.restore();

      for (let i = 0; i < 3; i++) {
        c.save();
        c.translate((randomAt(seed + i) - 0.5) * 1.4, (randomAt(seed + i + 8) - 0.5) * 1.2);
        c.strokeStyle = i === 0 ? "#191321d9" : "#37233175";
        c.lineWidth = i === 0 ? 1.5 : 0.65;
        c.stroke(p);
        c.restore();
      }
    }

    function paper(c, w, h, seed = 1) {
      for (let i = 0; i < 1800; i++) {
        c.fillStyle = i % 2 ? "#ffe1b709" : "#09061914";
        c.fillRect(
          randomAt(i * 3 + seed) * w,
          randomAt(i * 7 + seed) * h,
          0.8 + randomAt(i) * 2,
          0.7
        );
      }
    }

    function eye(c, x, y, scale = 1) {
      c.save();
      c.translate(x, y);
      c.scale(scale, scale);
      sketch(c, "M-19 0 Q0 -16 20 0 Q0 13 -19 0Z", "#bfae8c", 11, 15);
      oval(c, -2, 0, 5, 7, "#705454");
      oval(c, -3, 0, 2, 6, "#180f23");
      brush(c, "M-23 -3 Q-3 -19 23 -3", "#2e1d2c", 1.4);
      c.restore();
    }

    function paintFigure(c, enemy, limbs = {}) {
      const coat = enemy ? enemy.coat : "#707a5e";
      const armBroken = enemy?.parts.some((p) => p.key === "arm" && p.hp === 0);
      const legBroken = enemy?.parts.some((p) => p.key === "leg" && p.hp === 0);

      if (legBroken) {
        sketch(c, "M-15 -69 Q-27 -39 -43 -33 L-56 -35 Q-62 -29 -43 -22 Q-28 -26 -8 -41Z", "#524741", 1);
        sketch(c, "M7 -66 Q22 -48 22 -32 L10 -29 L-2 -56Z", "#65524b", 2);
      } else {
        sketch(c, "M-18 -71 Q-27 -42 -25 -8 L-38 -3 Q-45 4 -22 4 L-11 -3 Q-5 -42 3 -65Z", enemy ? "#544c45" : "#3e483c", 1, 150);
        sketch(c, "M5 -71 Q26 -52 26 -15 L39 -6 Q46 3 30 4 L17 0 Q8 -26 -7 -58Z", "#4e5144", 2, 150);
      }

      sketch(c, "M-28 -130 Q-8 -143 17 -129 Q32 -106 22 -63 Q0 -57 -29 -61 Q-37 -99 -28 -130Z", coat, 3, 220);
      brush(c, "M-12 -131 Q-8 -103 -5 -65", "#343330", 5);

      if (enemy) {
        for (let i = 0; i < 6; i++) {
          brush(c, `M-17 ${-123 + i * 9} Q-3 ${-118 + i * 9} 10 ${-123 + i * 9}`, "#b29b80", 1);
          brush(c, `M-6 ${-127 + i * 9} L-3 ${-118 + i * 9}`, "#251826", 1.2);
        }

        if (!armBroken) {
          sketch(c, "M-25 -129 Q-44 -120 -51 -106 L-80 -104 L-82 -94 Q-52 -89 -40 -100 L-19 -118Z", coat, 5, 170);
          brush(c, "M-80 -101 Q-91 -95 -101 -87", "#b19c83", 6);
          for (let i = 0; i < 4; i++) {
            brush(c, `M-99 ${-91 + i * 2} Q-111 ${-88 + i * 4} -118 ${-78 + i * 4}`, "#af9981", 1.5);
          }
        } else {
          sketch(c, "M-25 -132 Q-40 -127 -38 -111 L-28 -107 L-18 -122Z", coat, 6, 70);
          brush(c, "M-38 -111 Q-32 -106 -28 -109", settings.blood ? "#934148" : "#ae987e", 4);
        }

        sketch(c, "M18 -128 Q36 -119 33 -98 L23 -78 L-11 -62 L-18 -71 L17 -90 L17 -113Z", coat, 7, 150);
        brush(c, "M-11 -67 L-29 -60", "#b09b84", 5);
      } else {
        sketch(c, "M-30 -125 Q-46 -123 -44 -91 L-34 -73 L-26 -80Z", "#485344", 4, 100);
        sketch(c, "M-22 -123 Q-31 -114 -18 -100 L11 -86 Q32 -94 52 -105 L44 -114 L11 -102Z", "#66765a", 5, 140);
        sketch(c, "M10 -125 Q24 -118 31 -106 L59 -116 L65 -105 Q40 -91 24 -94 Q8 -98 2 -113Z", coat, 6, 140);
        oval(c, 58, -109, 8, 5, "#bbaa8a");
        sketch(c, "M46 -121 L93 -121 L94 -114 L65 -111 L59 -95 L48 -98 L51 -112Z", "#393b38", 7, 100);
        brush(c, "M51 -120 L91 -120", "#b6b49a", 1.2);
      }

      c.save();
      c.translate(-6, -150);
      c.rotate(enemy ? -0.2 : 0.06);
      sketch(c, "M-16 -18 Q-7 -31 8 -23 Q22 -13 16 7 Q12 24 0 29 Q-16 19 -16 1Z", "#b9aa8d", 11, 160);

      if (enemy?.type === "boss") {
        brush(c, "M-14 -22 Q-34 -3 -27 42 M13 -22 Q34 -6 29 44", "#29202c", 10);
        eye(c, 0, -1, 0.55);
      } else if (enemy) {
        brush(c, "M-12 -4 Q0 -1 12 -6", "#30202c", 3);
        for (let i = 0; i < 4; i++) {
          brush(c, `M${-10 + i * 6} -9 L${-8 + i * 6} 1`, "#d2be9c", 1);
        }
        oval(c, 0, 17, 4, 8, "#36212c");
      } else {
        sketch(c, "M-23 -6 Q-24 -24 -7 -29 Q12 -29 19 -9 Q1 -14 -23 -6Z", "#55654d", 12, 80);
        sketch(c, "M-18 3 Q-5 0 15 9 L9 22 Q-7 27 -18 15Z", "#3b453b", 13, 70);
        brush(c, "M1 -1 L10 1", "#19161a", 2);
      }
      c.restore();

      if (enemy?.type === "spitter") {
        oval(c, 7, -112, 12, 15, "#96945f");
        eye(c, 7, -112, 0.5);
      }

      if (enemy?.type === "boss") {
        for (let i = 0; i < 4; i++) {
          eye(c, 5 + Math.sin(i) * 7, -123 + i * 16, 0.35);
          brush(c, `M20 ${-103 + i * 9} Q47 ${-113 + i * 14} ${54 + i * 6} ${-61 + i * 11}`, "#8d7063", 3);
        }
      }

      if (!enemy) {
        for (const [key, x, y] of [
          ["leftArm", -8, -107],
          ["rightArm", 33, -105],
          ["leftLeg", -22, -28],
          ["rightLeg", 21, -26]
        ]) {
          if (!limbs[key]) continue;
          c.save();
          c.translate(x, y);
          sketch(c, "M-8 -8 Q0 -11 10 -5 L8 8 Q0 12 -9 5Z", "#ad9d83", 19, 40);
          brush(c, "M-6 -5 L8 2 M-7 0 L7 7", "#5c504a", 1.2);
          if (settings.blood) brush(c, "M-2 -5 Q5 -1 0 7", "#873d42", 3);
          c.restore();
        }
      }
    }

    function figureArt(enemy) {
      const mask = enemy
        ? enemy.parts.map((p) => p.hp === 0 ? "1" : "0").join("")
        : LIMBS.map((l) => state?.limbs[l.key] ? "1" : "0").join("");
      const key = `${enemy?.type || "hero"}-${mask}-${settings.blood}`;
      if (figureCache.has(key)) return figureCache.get(key);

      const image = document.createElement("canvas");
      image.width = 520;
      image.height = 460;
      const c = image.getContext("2d");
      c.scale(2, 2);
      c.translate(136, 209);
      paintFigure(c, enemy, enemy ? {} : state?.limbs || {});
      figureCache.set(key, image);
      return image;
    }

    function cardArt(key) {
      if (artCache.has(key)) return artCache.get(key);
      const image = document.createElement("canvas");
      image.width = 600;
      image.height = 340;
      const c = image.getContext("2d");
      c.scale(600 / 350, 340 / 200);

      const bg = c.createLinearGradient(0, 0, 350, 200);
      bg.addColorStop(0, "#b19a76");
      bg.addColorStop(0.6, "#746151");
      bg.addColorStop(1, "#352635");
      c.fillStyle = bg;
      c.fillRect(0, 0, 350, 200);

      for (let i = 0; i < 45; i++) {
        oval(c, randomAt(i + 10) * 350, randomAt(i + 70) * 200, 15 + randomAt(i) * 40, 7, "#261a3014");
      }

      c.save();
      c.translate(178, 105);
      c.rotate(-0.2);

      if (key === "knife") {
        sketch(c, "M-116 6 Q-80 0 -39 7 L-38 28 Q-81 31 -118 24Z", "#5c4538", 1, 200);
        sketch(c, "M-35 3 Q52 -2 132 -8 Q111 18 79 25 L-35 26Z", "#b4b3a0", 2, 260);
        brush(c, "M-30 6 L121 -4 M-37 -3 L-37 34", "#dfd3ae", 2);
        for (let i = 0; i < 7; i++) {
          brush(c, `M${-106 + i * 9} 8 L${-108 + i * 9} 26`, "#a18a66", 1.4);
        }
      } else if (key === "pistol") {
        sketch(c, "M-94 -35 Q0 -42 98 -34 L101 -8 L-2 -6 Q-16 13 -20 50 Q-30 60 -60 47 L-49 -8 L-87 -7Z", "#4b4e4d", 4, 350);
        sketch(c, "M-45 -5 L-16 2 L-31 48 L-54 41Z", "#756048", 8, 160);
        brush(c, "M-87 -34 L94 -33 M-84 -27 L94 -26", "#c4c0a3", 1.5);
        brush(c, "M-4 -5 Q23 -6 16 16 Q9 26 -19 21", "#a8aa96", 2);
        for (let i = 0; i < 8; i++) {
          brush(c, `M${-79 + i * 5} -28 L${-81 + i * 5} -12`, "#282330", 1.3);
        }
      } else if (key === "shotgun") {
        sketch(c, "M-137 -5 Q-100 -15 -65 -6 L-27 -20 L137 -20 L137 -7 L-26 -5 L-58 11 Q-88 17 -122 35Z", "#6d5542", 3, 340);
        sketch(c, "M-57 -24 L141 -24 L141 -12 L-50 -10Z", "#616563", 6, 200);
        sketch(c, "M7 -13 Q39 -17 72 -13 L71 7 Q43 11 8 6Z", "#8e704d", 7, 180);
        brush(c, "M-50 -24 L137 -24", "#d7c399", 1.4);
        for (let i = 0; i < 10; i++) {
          brush(c, `M${12 + i * 6} -10 L${11 + i * 6} 6`, "#4b3e39", 1);
        }
      } else if (key === "guard") {
        brush(c, "M-70 -70 L-58 76 M66 -72 L60 77", "#433a34", 15);
        for (let i = 0; i < 3; i++) {
          c.save();
          c.translate(0, -50 + i * 40);
          sketch(c, "M-122 -11 Q-60 -15 7 -9 L119 -15 L122 15 Q54 12 -8 19 L-124 14Z", i % 2 ? "#9b7e55" : "#89724c", i + 1, 220);
          brush(c, "M-109 -2 Q-31 8 106 -4 M-109 8 Q-14 -2 108 8", "#4b3c385a", 1.2);
          oval(c, -66, 1, 3, 3, "#302933");
          oval(c, 62, 1, 3, 3, "#302933");
          c.restore();
        }
        brush(c, "M-62 -65 L62 75", "#61503b", 12);
      } else if (key === "heal") {
        sketch(c, "M-77 -39 Q-81 -46 -66 -46 L70 -45 Q81 -44 81 -30 L76 59 Q6 68 -77 58Z", "#909077", 4, 350);
        brush(c, "M-27 -43 L-27 -61 Q0 -69 29 -59 L29 -44", "#c0b599", 7);
        sketch(c, "M-26 -25 Q0 -29 28 -23 L27 37 L-28 35Z", "#cabc9f", 3, 160);
        brush(c, "M0 -16 L0 27 M-19 5 L19 5", "#98514e", 12);
      } else if (key === "axe") {
        brush(c, "M-91 79 Q-17 15 58 -74", "#554437", 15);
        brush(c, "M-91 76 Q-10 3 58 -76", "#b39766", 10);
        sketch(c, "M26 -60 L54 -89 Q74 -68 119 -64 Q113 -39 124 -16 Q86 -16 57 -43 L39 -42Z", "#9fa195", 5, 300);
        sketch(c, "M26 -60 L54 -89 Q66 -74 92 -69 L81 -36 L57 -43 L39 -42Z", "#975a4b", 8, 180);
        brush(c, "M116 -60 Q109 -39 120 -20", "#e6d8b3", 3);
      } else if (key === "fire") {
        sketch(c, "M-17 -65 L14 -65 L15 -30 Q40 -16 38 8 L31 68 Q0 78 -33 67 L-40 7 Q-42 -17 -17 -30Z", "#7c845c", 6, 300);
        sketch(c, "M-34 4 Q-2 -3 34 5 L32 37 Q0 45 -34 35Z", "#b8a774", 8, 130);
        brush(c, "M-27 -8 Q-29 21 -24 57", "#d9d49a70", 3);
        brush(c, "M-1 -65 Q17 -87 36 -75", "#cbb991", 7);
        sketch(c, "M28 -72 Q13 -85 34 -107 Q28 -92 46 -97 Q58 -117 60 -123 Q77 -91 52 -71Z", "#d59965", 9, 90);
      } else if (key === "search") {
        sketch(c, "M-100 -37 Q-4 -43 103 -35 L100 65 Q-8 73 -101 62Z", "#897355", 9, 350);
        sketch(c, "M-108 -53 Q-8 -61 110 -52 L108 -30 L-109 -33Z", "#aa9060", 10, 200);
        brush(c, "M-68 -48 L-65 63 M66 -49 L65 66", "#51493a", 10);
        sketch(c, "M-25 -1 L29 -3 L27 30 L-24 31Z", "#c7b68d", 2, 70);
        c.fillStyle = "#5b5142";
        c.font = "bold 20px Georgia, serif";
        c.fillText("07", -13, 23);
      } else {
        c.save();
        c.translate(-15, 121);
        paintFigure(c, null);
        c.restore();
        if (key === "focus") eye(c, 91, -46, 1.3);
        else {
          for (let i = 0; i < 10; i++) {
            brush(c, `M${-125 + i * 18} -85 Q${-150 + i * 18} -10 ${-128 + i * 18} 80`, "#bbb28e35", 2);
          }
        }
      }

      c.restore();
      paper(c, 350, 200, key.length);
      const shade = c.createLinearGradient(0, 0, 0, 200);
      shade.addColorStop(0.6, "#17102000");
      shade.addColorStop(1, "#171020aa");
      c.fillStyle = shade;
      c.fillRect(0, 0, 350, 200);
      artCache.set(key, image);
      return image;
    }

    function appendArt(parent, key) {
      if (CARD_ART[key]) {
        const art = document.createElement("img");
        art.src = CARD_ART[key];
        art.alt = "";
        art.setAttribute("aria-hidden", "true");
        parent.append(art);
        return;
      }
      const art = document.createElement("canvas");
      art.width = 600;
      art.height = 340;
      art.setAttribute("aria-hidden", "true");
      art.getContext("2d").drawImage(cardArt(key), 0, 0);
      parent.append(art);
    }

    // 아이템 대표 이미지. 전용 카드 아트가 없으면 캔버스 더미 그림으로 대신한다.
    function itemArtNode(data, className) {
      const key = data.cards[0] || "pistol";
      if (CARD_ART[key]) {
        const art = el("img", className);
        art.src = CARD_ART[key];
        art.alt = "";
        return art;
      }
      const art = el("canvas", className);
      art.width = 600;
      art.height = 340;
      art.setAttribute("aria-hidden", "true");
      art.getContext("2d").drawImage(cardArt(key), 0, 0);
      return art;
    }

    function appendUpgradeMark(parent, upgraded) {
      if (!upgraded) return;
      const badge = el("img", "upgrade-epaulette");
      badge.src = UPGRADE_EPAULETTE;
      badge.alt = "강화됨";
      badge.title = "강화된 카드";
      parent.append(badge);
    }

    function paintBackground() {
      background.width = 1400;
      background.height = 520;
      const c = background.getContext("2d");
      const sky = c.createLinearGradient(0, 0, 0, 520);
      sky.addColorStop(0, "#28202f");
      sky.addColorStop(0.55, "#887961");
      sky.addColorStop(1, "#201923");
      c.fillStyle = sky;
      c.fillRect(0, 0, 1400, 520);

      for (let i = 0; i < 17; i++) {
        const x = i * 88 - 30;
        const height = 110 + randomAt(i + 5) * 170;
        c.save();
        c.translate(x, 335);
        sketch(c, `M0 0 L3 ${-height} Q38 ${-height - 5} 72 ${-height + 3} L80 0Z`, i % 2 ? "#514747" : "#61544d", i, 140);
        for (let j = 0; j < 16; j++) {
          const wx = 12 + j % 3 * 20;
          const wy = -height + 20 + Math.floor(j / 3) * 29;
          if (wy < -12) brush(c, `M${wx} ${wy} L${wx} ${wy + 12}`, "#28202c", 6);
        }
        c.restore();
      }

      c.fillStyle = "#27202a";
      c.fillRect(0, 330, 1400, 190);

      for (let i = 0; i < 90; i++) {
        const x = randomAt(i + 90) * 1400;
        const y = 340 + randomAt(i + 210) * 180;
        brush(c, `M${x} ${y} q30 -3 65 1`, "#b7a17c20", 1);
      }

      for (const side of [0, 1400]) {
        c.save();
        c.translate(side, 0);
        if (side) c.scale(-1, 1);
        sketch(c, "M0 0 L196 0 Q183 143 207 321 L0 389Z", "#302531", 6, 220);
        for (let i = 0; i < 13; i++) {
          const x = 15 + randomAt(i + 3) * 150;
          brush(c, `M${x} -10 Q${x + 50} 95 ${x - 9} 201 Q${x - 30} 281 ${x + 19} 374`, "#654549", 3 + randomAt(i) * 8);
          brush(c, `M${x - 2} 0 Q${x + 45} 95 ${x - 13} 207`, "#9e715870", 1);
        }
        c.restore();
      }

      brush(c, "M333 345 Q337 195 334 66 Q367 59 413 65", "#26202c", 5);
      oval(c, 412, 70, 18, 4, "#d1b98f");
      eye(c, 101, 149, 1.6);
      eye(c, 1320, 221, 1.5);
      paper(c, 1400, 520, 37);
      const shade = c.createRadialGradient(700, 260, 150, 700, 260, 770);
      shade.addColorStop(0, "#09061100");
      shade.addColorStop(1, "#090611d9");
      c.fillStyle = shade;
      c.fillRect(0, 0, 1400, 520);
    }

    function geometry() {
      const wideCombat = view.w / Math.max(1, view.h) > 2.7;
      return {
        scale: Math.max(0.18, Math.min((view.h - 90) / 270, view.w / 1120)),
        ground: view.h - 260,
        wideCombat,
        heroX: view.w * 0.18
      };
    }

    function enemyPosition(enemy) {
      const alive = new Set(state.enemies.map((entry) => entry.id));
      for (const id of enemySlots.keys()) if (!alive.has(id)) enemySlots.delete(id);
      if (!enemySlots.size) {
        const initial = {
          1: [.73],
          2: [.59, .79],
          3: [.48, .68, .86],
          4: [.43, .59, .75, .9],
          5: [.4, .525, .65, .775, .9]
        }[Math.min(5, state.enemies.length)] || [.73];
        state.enemies.forEach((entry, index) => enemySlots.set(entry.id, initial[index] ?? .9));
      }
      if (!enemySlots.has(enemy.id)) {
        const used = [...enemySlots.values()];
        const candidates = [.42, .5, .58, .66, .74, .82, .9];
        const slot = candidates.reduce((best, candidate) => {
          const distance = Math.min(...used.map((value) => Math.abs(value - candidate)));
          const bestDistance = Math.min(...used.map((value) => Math.abs(value - best)));
          return distance > bestDistance ? candidate : best;
        }, candidates[0]);
        enemySlots.set(enemy.id, slot);
      }
      const g = geometry();
      const heightLimit = Math.max(0.18, (g.ground - 170) / 264);
      return {
        x: view.w * enemySlots.get(enemy.id),
        y: g.ground,
        scale: Math.min(g.scale * enemy.size, g.wideCombat ? 0.82 : heightLimit)
      };
    }

    function partPosition(enemy, part) {
      const p = enemyPosition(enemy);
      return {
        x: p.x + (part.key === "arm" ? -53 : 14) * p.scale,
        y: p.y + (part.key === "arm" ? -108 : -34) * p.scale,
        radius: Math.max(10, 18 * p.scale)
      };
    }

    function positionStatuses() {
      if (!state) return;
      const g = geometry();
      const heroStack = $("statuses").querySelector(".status-stack[data-hero]");
      if (heroStack) {
        heroStack.style.left = `${g.heroX}px`;
        heroStack.style.top = `${g.ground + 14}px`;
      }
    }

    function resizeCanvas() {
      const box = canvas.getBoundingClientRect();
      view = {
        w: Math.max(1, box.width),
        h: Math.max(1, box.height),
        dpr: Math.min(devicePixelRatio || 1, 2)
      };
      canvas.width = Math.round(view.w * view.dpr);
      canvas.height = Math.round(view.h * view.dpr);
      positionStatuses();
    }

    function floatText(x, y, text, color = "#e6c995") {
      texts.push({ x, y, text, color, life: 1.2 });
    }

    async function settleCombatPresentation(version, timeout = 1800) {
      const started = performance.now();
      while (version === gameVersion && performance.now() - started < timeout) {
        if (!texts.length && !particles.length && !impactFx.length && !traces.length && !ghosts.length && !actionVisual) return;
        await wait(50);
      }
    }

    function burst(x, y, count = 20, color = "#9d424e", blood = true) {
      if (blood && !settings.blood) return;
      const amount = motionOn() ? count : Math.min(5, count);

      for (let i = 0; i < amount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 35 + Math.random() * 150;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 25,
          size: 1 + Math.random() * 2.6,
          life: 0.35 + Math.random() * 0.6,
          color,
          blood
        });
      }

      if (blood) {
        stains.push({ x, y: geometry().ground + 5, size: 12 + count * 0.55, life: 12 });
        stains = stains.slice(-25);
      }
    }

    function startVisual(key, targets = [], partKey = null) {
      actionVisual = {
        key,
        start: performance.now(),
        points: targets.map((enemy) => {
          const p = enemyPosition(enemy);
          const part = enemy.parts.find((item) => item.key === partKey);
          return part ? partPosition(enemy, part) : { x: p.x, y: p.y - 107 * p.scale };
        }),
        shellMade: false
      };

      if (["pistol", "shotgun"].includes(key)) {
        muzzle = key === "shotgun" ? 0.075 : 0.05;
        heroRecoil = motionOn() ? key === "shotgun" ? 1 : 0.4 : 0;
        shake = motionOn() ? key === "shotgun" ? 9 : 4 : 0;
        const g = geometry();

        for (const point of actionVisual.points) {
          const count = key === "shotgun" ? 5 : 1;
          for (let i = 0; i < count; i++) {
            traces.push({
              x1: g.heroX + 101 * g.scale,
              y1: g.ground - 126 * g.scale,
              x2: point.x + (Math.random() - 0.5) * 10,
              y2: point.y + (i - (count - 1) / 2) * 7,
              life: 0.07,
              max: 0.07
            });
          }
        }
      }
    }

    function impact(enemy, damage, partKey, style) {
      const p = enemyPosition(enemy);
      const part = enemy.parts.find((item) => item.key === partKey);
      const point = part ? partPosition(enemy, part) : { x: p.x, y: p.y - 107 * p.scale };
      enemy.flash = 1;
      enemy.recoil = motionOn() ? style === "shotgun" ? 1.3 : 0.65 : 0;
      floatText(point.x, point.y - 18, `−${damage}`, part ? "#dda38e" : "#e8ca9b");

      if (damage > 0) {
        impactFx.push({
          x: point.x,
          y: point.y,
          life: style === "shotgun" ? 0.34 : 0.26,
          max: style === "shotgun" ? 0.34 : 0.26,
          scale: style === "shotgun" ? 1.25 : style === "knife" ? 0.72 : 1,
          fire: ["fire", "burn"].includes(style)
        });
      }

      if (style === "axe" && motionOn()) shake = Math.max(shake, 8);
    }

    function injuryEffect(key) {
      const limb = LIMBS.find((l) => l.key === key);
      const g = geometry();
      const arm = limb.type === "arm";
      burst(
        g.heroX + (key.startsWith("left") ? -16 : 25) * g.scale,
        g.ground - (arm ? 107 : 28) * g.scale,
        62
      );
      shake = motionOn() ? 23 : 0;
      heroRecoil = motionOn() ? 1.8 : 0;

      const banner = $("injuryBanner");
      banner.classList.remove("depletion");
      banner.classList.remove("active");
      banner.replaceChildren(
        el("strong", "", `${limb.name} 훼손`),
        el("span", "", arm ? "공격 피해 −2" : "턴 시작 드로우 −1")
      );
      void banner.offsetWidth;
      banner.classList.add("active");
      clearTimeout(injuryTimer);
      injuryTimer = setTimeout(() => banner.classList.remove("active"), 1700);

      Sound.play("playerInjury");
      Sound.play("playerPain");
    }

    function depletionEffect(item) {
      const data = itemDef(item.key);
      const banner = $("injuryBanner");
      banner.classList.remove("active");
      banner.classList.add("depletion");
      banner.replaceChildren(
        el("strong", "", `${data.name} 소진`),
        el("span", "", `사용 횟수 0/${data.uses} · 가방과 덱에서 제거됨`)
      );
      void banner.offsetWidth;
      banner.classList.add("active");
      clearTimeout(injuryTimer);
      injuryTimer = setTimeout(() => banner.classList.remove("active"), 1700);
      const g = geometry();
      floatText(g.heroX, g.ground - 178 * g.scale, `${data.name} · 소진`, "#d5bd8e");
      Sound.play("cardDrop");
    }

    function drawFigure(enemy, x, y, scale, time, alpha = 1) {
      const recoil = enemy ? enemy.recoil || 0 : heroRecoil;
      const lunge = enemy?.lunge || 0;
      const breathe = motionOn() ? Math.sin(time * 1.7 + (enemy?.id || 0)) * 0.004 : 0;
      ctx.save();
      ctx.globalAlpha = alpha;
      oval(ctx, x, y + 5, 40 * scale, 7 * scale, "#07040c88");
      ctx.translate(
        x + (enemy ? recoil * 10 - lunge * 30 : -recoil * 10) * scale,
        y
      );
      ctx.rotate((motionOn() ? enemy ? recoil * 0.07 - lunge * 0.1 : -recoil * 0.06 : 0) + breathe);
      ctx.scale(scale, scale);
      let sprite;
      let hasBrokenPart = false;
      if (enemy) {
        const broken = new Set(enemy.parts.filter((part) => part.hp === 0).map((part) => part.key));
        hasBrokenPart = broken.size > 0;
        const damaged = ENEMY_INJURED_SPRITES[enemy.type];
        sprite = broken.has("arm") && damaged?.arm ? damaged.arm : broken.has("leg") && damaged?.leg ? damaged.leg : ENEMY_SPRITES[enemy.type] || INFECTED;
      } else {
        sprite = state ? heroSprite(rules.heroAppearance(state)) : SURVIVOR;
      }
      if (hasBrokenPart) ctx.filter = "brightness(.76) saturate(.72)";
      if (assetReady(sprite)) ctx.drawImage(sprite, -88, -258, 176, 264);
      else ctx.drawImage(figureArt(enemy), -136, -209, 260, 230);
      ctx.filter = "none";

      if (enemy?.flash > 0 && motionOn()) {
        ctx.globalAlpha = alpha * enemy.flash * 0.2;
        ctx.globalCompositeOperation = "screen";
        if (assetReady(sprite)) ctx.drawImage(sprite, -88, -258, 176, 264);
        else ctx.drawImage(figureArt(enemy), -136, -209, 260, 230);
      }
      ctx.restore();
    }

    function drawAction(now) {
      if (!actionVisual) return;
      const a = actionVisual;
      const t = (now - a.start) / 1000;
      const g = geometry();
      const s = g.scale;
      const duration = a.key === "heal" ? 1.1 : a.key === "shotgun" ? 1.0 : a.key === "grenade" ? 0.9 : a.key === "flare" ? 0.95 : a.key === "flashbang" ? 0.78 : 0.65;

      if (t > duration) {
        actionVisual = null;
        return;
      }

      if (["pistol", "shotgun"].includes(a.key)) {
        const ejectAt = a.key === "shotgun" ? 0.59 : 0.055;

        if (!a.shellMade && t >= ejectAt) {
          a.shellMade = true;
          shells.push({
            x: g.heroX + 60 * s,
            y: g.ground - 125 * s,
            vx: -35,
            vy: -65,
            rotation: 0,
            life: 0.55,
            heavy: a.key === "shotgun"
          });
        }

        if (a.key === "shotgun" && t > 0.55 && t < 0.94) {
          const slide = Math.sin((t - 0.55) / 0.39 * Math.PI) * 12 * s;
          line(ctx, [
            [g.heroX + 55 * s - slide, g.ground - 116 * s],
            [g.heroX + 77 * s - slide, g.ground - 116 * s]
          ], "#97815f", 4 * s);
        }
      }

      if (["knife", "axe"].includes(a.key)) {
        const hitAt = a.key === "knife" ? 0.105 : 0.17;
        if (t >= hitAt && t <= hitAt + 0.14) {
          const sprite = EFFECT_SPRITES.slash;
          if (assetReady(sprite)) {
            ctx.save();
            ctx.globalAlpha = 1 - (t - hitAt) / 0.14;
            ctx.globalCompositeOperation = "screen";
            for (const p of a.points) {
              const size = (a.key === "knife" ? 72 : 104) * s;
              ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
            }
            ctx.restore();
          }
        }
      }

      if (a.key === "guard") {
        const sprite = EFFECT_SPRITES.guard;
        if (assetReady(sprite)) {
          const progress = motionOn() ? clamp(t / 0.12, 0, 1) : 1;
          const w = 118 * s;
          const h = 168 * s;
          ctx.save();
          ctx.globalAlpha = clamp((0.65 - t) * 4, 0, 1);
          ctx.drawImage(sprite, g.heroX + (30 + (1 - progress) * 18) * s, g.ground - h - 2 * s, w, h);
          ctx.restore();
        }
      }

      if (a.key === "heal") {
        const sprite = EFFECT_SPRITES.heal;
        if (assetReady(sprite)) {
          const pulse = 1 + Math.sin(t * 16) * 0.05;
          const size = 92 * s * pulse;
          ctx.save();
          ctx.globalAlpha = clamp((1.1 - t) * 5, 0, 1);
          ctx.globalCompositeOperation = "screen";
          ctx.drawImage(sprite, g.heroX - size / 2, g.ground - 120 * s - size / 2, size, size);
          ctx.restore();
        }
      }

      if (a.key === "quiet") {
        const sprite = EFFECT_SPRITES.quiet;
        if (assetReady(sprite)) {
          const w = 150 * s;
          const h = 120 * s;
          ctx.save();
          ctx.globalAlpha = clamp((0.65 - t) * 1.5, 0, 0.62);
          ctx.drawImage(sprite, g.heroX - w / 2, g.ground - h, w, h);
          ctx.restore();
        }
      }

      if (a.key === "fire" && t < 0.34 && a.points.length) {
        const target = a.points[Math.floor(a.points.length / 2)];
        const progress = t / 0.34;
        const x = g.heroX + (target.x - g.heroX) * progress;
        const y = g.ground - 125 * s
          + (target.y - (g.ground - 125 * s)) * progress
          - (motionOn() ? Math.sin(progress * Math.PI) * 60 : 0);
        const sprite = EFFECT_SPRITES.molotov;
        if (assetReady(sprite)) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.atan2(target.y - (g.ground - 125 * s), target.x - g.heroX));
          ctx.drawImage(sprite, -35 * s, -20 * s, 70 * s, 47 * s);
          ctx.restore();
        }
      }

      if (a.key === "flare" && a.points.length) {
        const target = a.points[Math.floor(a.points.length / 2)];
        const progress = clamp(t / 0.46, 0, 1);
        const sx = g.heroX + 75 * s;
        const sy = g.ground - 126 * s;
        const x = sx + (target.x - sx) * progress;
        const y = sy + (target.y - sy) * progress - Math.sin(progress * Math.PI) * 34;
        const sprite = EFFECT_SPRITES.flare;
        if (t < 0.5 && assetReady(sprite)) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.atan2(target.y - sy, target.x - sx));
          ctx.globalAlpha = t > 0.52 ? clamp((0.72 - t) / 0.2, 0, 1) : 1;
          ctx.globalCompositeOperation = "screen";
          ctx.drawImage(sprite, -48, -24, 96, 48);
          ctx.restore();
        }
      }

      if (a.key === "grenade" && t > 0.18) {
        const sprite = EFFECT_SPRITES.grenade;
        if (assetReady(sprite)) {
          const progress = clamp((t - 0.18) / 0.28, 0, 1);
          const alpha = clamp((0.9 - t) / 0.28, 0, 1);
          for (const point of a.points) {
            const size = (80 + progress * 135) * s;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.globalCompositeOperation = "screen";
            ctx.drawImage(sprite, point.x - size / 2, point.y - size / 2, size, size);
            ctx.restore();
          }
        }
      }

      if (a.key === "focus") {
        const target = { x: g.heroX, y: g.ground - 120 * s };
        const sprite = EFFECT_SPRITES.focus;
        if (assetReady(sprite)) {
          const w = 92 * s;
          const h = 58 * s;
          ctx.save();
          ctx.globalAlpha = clamp((0.65 - t) * 1.2, 0, 0.8);
          ctx.globalCompositeOperation = "screen";
          ctx.drawImage(sprite, g.heroX - w / 2, g.ground - 222 * s, w, h);
          ctx.restore();
        }
        const impact = EFFECT_SPRITES.flareImpact;
        if (t >= 0.34 && assetReady(impact)) {
          const bloom = clamp((t - 0.34) / 0.22, 0, 1);
          const fade = clamp((0.95 - t) / 0.34, 0, 1);
          const size = (70 + bloom * 190) * s;
          ctx.save();
          ctx.globalAlpha = fade;
          ctx.globalCompositeOperation = "screen";
          ctx.drawImage(impact, target.x - size / 2, target.y - size / 2, size, size);
          ctx.restore();
        }
      }

      if (a.key === "flashbang" && a.points.length) {
        const center = a.points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
        center.x /= a.points.length;
        center.y /= a.points.length;
        const sprite = EFFECT_SPRITES.flashbang;
        if (assetReady(sprite)) {
          const bloom = motionOn() ? clamp(t / 0.16, 0, 1) : 1;
          const fade = clamp((0.78 - t) / 0.42, 0, 1);
          const size = (110 + bloom * 310) * s;
          ctx.save();
          ctx.globalAlpha = fade;
          ctx.globalCompositeOperation = "screen";
          ctx.drawImage(sprite, center.x - size / 2, center.y - size / 2, size, size);
          ctx.restore();
        }
      }
    }

    function drawFrame(now) {
      // 프레임 중 예외가 나도 다음 resumeFrames()가 다시 켤 수 있도록 먼저 비운다.
      frameHandle = 0;
      const dt = Math.min((now - frameTime) / 1000 || 0, 0.04);
      frameTime = now;
      const time = now / 1000;
      const g = geometry();

      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      ctx.clearRect(0, 0, view.w, view.h);
      ctx.save();

      if (motionOn() && shake > 0) {
        ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake * 0.55);
      }

      const scene = assetReady(COMBAT_BACKGROUND) ? COMBAT_BACKGROUND : background;
      const sceneW = assetReady(COMBAT_BACKGROUND) ? COMBAT_BACKGROUND.naturalWidth : 1400;
      const sceneH = assetReady(COMBAT_BACKGROUND) ? COMBAT_BACKGROUND.naturalHeight : 520;
      const sceneCover = Math.max(view.w / sceneW, view.h / sceneH);
      ctx.drawImage(
        scene,
        (view.w - sceneW * sceneCover) / 2,
        (view.h - sceneH * sceneCover) / 2,
        sceneW * sceneCover,
        sceneH * sceneCover
      );

      for (const stain of stains) {
        stain.life -= dt;
        ctx.globalAlpha = Math.min(0.5, stain.life / 3);
        oval(ctx, stain.x, stain.y, stain.size, 4, "#66233b");
      }
      ctx.globalAlpha = 1;
      stains = stains.filter((p) => p.life > 0);

      drawFigure(null, g.heroX, g.ground, g.scale * 0.9, time);

      const selected = selectedCard();

      for (const enemy of state.enemies) {
        const p = enemyPosition(enemy);
        drawFigure(enemy, p.x, p.y, p.scale, time);
        enemy.recoil = Math.max(0, enemy.recoil - dt * 4);
        enemy.flash = Math.max(0, enemy.flash - dt * 4);

        if (enemy.burn > 0 && motionOn()) {
          const sprite = EFFECT_SPRITES.burn;
          if (assetReady(sprite)) {
            const pulse = 1 + Math.sin(time * 7 + enemy.id) * 0.035;
            const w = 156 * p.scale * pulse;
            const h = 104 * p.scale * pulse;
            ctx.save();
            ctx.globalAlpha = 0.84;
            ctx.globalCompositeOperation = "screen";
            ctx.drawImage(sprite, p.x - w / 2, p.y - h + 12 * p.scale, w, h);
            ctx.restore();
          }
        }

        if (selected && CARDS[selected.key].target === "single") {
          for (const part of enemy.parts.filter((item) => item.hp > 0)) {
            const pp = partPosition(enemy, part);
            const active = hoverAim?.enemyId === enemy.id && hoverAim?.partKey === part.key;
            ctx.beginPath();
            ctx.arc(pp.x, pp.y, pp.radius, 0, Math.PI * 2);
            ctx.strokeStyle = active ? "#efd49c" : "#cba57099";
            ctx.lineWidth = active ? 2 : 1;
            ctx.stroke();
          }
        }
      }

      for (const ghost of ghosts) {
        ghost.life -= dt;
        ctx.save();
        ctx.translate(ghost.x, ghost.y);
        const t = 1 - ghost.life / ghost.max;
        ctx.rotate(motionOn() ? t * 0.65 : 0);
        drawFigure(ghost.enemy, 0, motionOn() ? t * 18 : 0, ghost.scale, time, Math.max(0, ghost.life / ghost.max));
        ctx.restore();
      }
      ghosts = ghosts.filter((p) => p.life > 0);

      drawAction(now);

      if (muzzle > 0 && motionOn()) {
        const x = g.heroX + 101 * g.scale;
        const y = g.ground - 126 * g.scale;
        const sprite = EFFECT_SPRITES.muzzle;
        if (assetReady(sprite)) {
          ctx.save();
          ctx.globalAlpha = clamp(muzzle * 18, 0, 1);
          ctx.globalCompositeOperation = "screen";
          ctx.drawImage(sprite, x - 18 * g.scale, y - 24 * g.scale, 82 * g.scale, 48 * g.scale);
          ctx.restore();
        }
      }

      const impactSprite = EFFECT_SPRITES.impact;
      for (const fx of impactFx) {
        fx.life -= dt;
        if (!assetReady(impactSprite)) continue;
        const progress = 1 - fx.life / fx.max;
        const size = (48 + progress * 54) * fx.scale * g.scale;
        ctx.save();
        ctx.globalAlpha = clamp(fx.life / fx.max, 0, 1) * (fx.fire ? 0.65 : 0.9);
        ctx.globalCompositeOperation = fx.fire ? "screen" : "source-over";
        ctx.drawImage(impactSprite, fx.x - size / 2, fx.y - size / 2, size, size);
        ctx.restore();
      }
      impactFx = impactFx.filter((fx) => fx.life > 0);

      for (const trace of traces) {
        trace.life -= dt;
        if (motionOn()) {
          ctx.globalAlpha = Math.max(0, trace.life / trace.max);
          line(ctx, [[trace.x1, trace.y1], [trace.x2, trace.y2]], "#e2c598", 1);
        }
      }
      traces = traces.filter((p) => p.life > 0);
      ctx.globalAlpha = 1;

      for (const shell of shells) {
        shell.life -= dt;
        if (motionOn()) {
          shell.x += shell.vx * dt;
          shell.y += shell.vy * dt;
          shell.vy += 340 * dt;
          shell.rotation += dt * 13;
        }

        ctx.save();
        ctx.globalAlpha = clamp(shell.life * 4, 0, 1);
        ctx.translate(shell.x, shell.y);
        ctx.rotate(shell.rotation);
        ctx.fillStyle = shell.heavy ? "#885646" : "#aa8c55";
        ctx.fillRect(-3, -1.5, shell.heavy ? 8 : 5, 3);
        ctx.restore();
      }
      shells = shells.filter((p) => p.life > 0);

      for (const particle of particles) {
        particle.life -= dt;
        const x = particle.x;
        const y = particle.y;
        if (motionOn()) {
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          particle.vy += 290 * dt;
        }
        ctx.globalAlpha = clamp(particle.life * 2.5, 0, 1);
        line(ctx, [[x, y], [particle.x + 0.1, particle.y + 0.1]], particle.color, particle.size);
      }
      particles = particles.filter((p) => p.life > 0);

      for (const item of texts) {
        item.life -= dt;
        if (motionOn()) item.y -= dt * 23;
        ctx.globalAlpha = clamp(item.life * 2, 0, 1);
        ctx.font = `bold 17px ${displayFont()}`;
        ctx.textAlign = "center";
        ctx.strokeStyle = "#17101b";
        ctx.lineWidth = 3;
        ctx.strokeText(item.text, item.x, item.y);
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, item.x, item.y);
      }
      texts = texts.filter((p) => p.life > 0);

      ctx.globalAlpha = 1;
      ctx.restore();
      shake = Math.max(0, shake - dt * 35);
      muzzle = Math.max(0, muzzle - dt);
      heroRecoil = Math.max(0, heroRecoil - dt * 4);
      if (modal || document.hidden) return;
      frameHandle = requestAnimationFrame(drawFrame);
    }

    // 모달이 열려 있거나 탭이 보이지 않으면 캔버스 루프를 멈추고, 필요할 때만 다시 돈다.
    function resumeFrames() {
      if (frameHandle || !state || modal || document.hidden) return;
      frameTime = performance.now();
      frameHandle = requestAnimationFrame(drawFrame);
    }

    // ── 규칙 어댑터: 상태는 rules가 바꾸고, 여기서는 현재 state를 넘겨주기만 한다. ──
    const sourceItem = (card) => rules.sourceItem(state, card);
    const rarityOf = (card) => rules.rarityOf(state, card);
    const ammoCount = () => rules.ammoCount(state);
    const cardLockReason = (card) => rules.cardLockReason(state, card);

    function addLog(text) {
      state.logs.unshift(text);
      state.logs = state.logs.slice(0, 100);
      $("lastLog").textContent = text;
    }

    function notify(text) {
      $("lastLog").textContent = text;
    }

    const injuredCount = (type) => rules.injuredCount(state, type);
    const attackBonus = () => rules.attackBonus(state);
    const attackDamage = (card, partKey = null) => rules.attackDamage(state, card, partKey);

    // 손패 요약용: 효과 수치를 문장으로.
    function skillSummary(card) {
      const data = CARDS[card.key];
      const fx = skillEffects(card.key, card.upgraded);
      const parts = [];
      // 선택 카드(개인 정비): 방어도 또는 장비 교체 중 하나.
      if (fx.block) parts.push(`방어도 +${fx.block + rules.blockBonus(state)}${data.choice ? " 또는 장비 교체" : ""}`);
      if (fx.heal) parts.push(`체력 +${fx.heal}`);
      if (fx.cure) parts.push(`감염 −${fx.cure}`);
      if (fx.noiseDown) parts.push(`소음 −${fx.noiseDown}`);
      if (fx.strength) parts.push(`이번 전투 공격 +${fx.strength}`);
      if (fx.energy) parts.push(`행동력 +${fx.energy}`);
      if (fx.draw) parts.push(`${fx.draw}장 뽑기`);
      if (fx.numb) parts.push("이번 턴 부상 무시");
      if (data.noise) parts.push(`소음 +${data.noise}`);
      if (data.delayed) parts.unshift("예약");
      const notes = [];
      if (data.exhaust) notes.push("소멸");
      return `${parts.join(" · ")}${notes.length ? `\n${notes.join(" · ")}` : ""}`;
    }

    function effectSummary(effect = {}) {
      const parts = [];
      if (effect.damage) parts.push(`피해 ${effect.damage}`);
      if (effect.damageAll) parts.push(`모든 적 피해 ${effect.damageAll}`);
      if (effect.selfDamage) parts.push(`자신 체력 −${effect.selfDamage} (방어도 적용)`);
      if (effect.injureLimb) parts.push("사지 훼손");
      if (effect.energy) parts.push(`행동력 +${effect.energy}`);
      if (effect.draw) parts.push(`카드 ${effect.draw}장 뽑기`);
      if (effect.discardHand) parts.push("손패 전부 버림");
      if (effect.strength) parts.push(`이번 전투 공격 +${effect.strength}`);
      if (effect.infection) parts.push(`감염 +${effect.infection}`);
      if (effect.noise) parts.push(`소음 +${effect.noise}`);
      if (effect.block) parts.push(`방어도 +${effect.block}`);
      if (effect.staggerAll) parts.push("모든 적 경직");
      return parts.join(" · ");
    }

    // 캐릭터 선택은 전투 state가 생기기 전이므로, 영구 카드 정의만으로 시작 기술을 설명한다.
    function baseCardSummary(card) {
      const data = CARDS[card.key];
      const u = card.upgraded;
      const lines = [];
      if (data.type === "attack") {
        const details = [];
        if (data.burn) details.push(`화상 ${data.burn(u)}`);
        if (data.block) details.push(`방어도 +${data.block(u)}`);
        if (data.heal) details.push(`체력 +${data.heal(u)}`);
        if (data.stagger) details.push("경직");
        if (data.limbBonus) details.push(`사지 +${data.limbBonus(u)}`);
        const hits = rules.hitCount(card);
        const damage = data.damage ? data.damage(u) : 0;
        const prefix = data.delayed ? "예약 · " : "";
        lines.push(data.damage
          ? `${prefix}${data.target === "all" ? "모든 적 " : ""}피해 ${damage}${hits > 1 ? `×${hits}` : ""}${details.length ? ` · ${details.join(" · ")}` : ""}`
          : `${prefix}${data.target === "all" ? "모든 적 " : ""}${details.join(" · ")}`);
      } else {
        const fx = skillEffects(card.key, u);
        const effects = [];
        if (fx.block) effects.push(`방어도 +${fx.block}${data.choice ? " 또는 장비 교체" : ""}`);
        if (fx.heal) effects.push(`체력 +${fx.heal}`);
        if (fx.cure) effects.push(`감염 −${fx.cure}`);
        if (fx.noiseDown) effects.push(`소음 −${fx.noiseDown}`);
        if (fx.strength) effects.push(`이번 전투 공격 +${fx.strength}`);
        if (fx.energy) effects.push(`행동력 +${fx.energy}`);
        if (fx.draw) effects.push(`${fx.draw}장 뽑기`);
        if (fx.numb) effects.push("이번 턴 부상 무시");
        if (data.noise) effects.push(`소음 +${data.noise}`);
        lines.push(`${data.delayed ? "예약 · " : ""}${effects.join(" · ")}`);
      }
      if (data.gamble) {
        const resolveEffect = (value) => typeof value === "function" ? value(u) : value || {};
        if (data.gamble.before) lines.push("동전 성공 시 발동 · 실패 시 불발");
        else {
          const win = effectSummary(resolveEffect(data.gamble.win));
          const lose = effectSummary(resolveEffect(data.gamble.lose));
          if (win) lines.push(`동전 성공: ${win}`);
          if (lose) lines.push(`동전 실패: ${lose}`);
        }
      }
      const costs = [];
      if (data.noise && data.type === "attack") costs.push(`소음 +${data.noise}`);
      if (data.ammo) costs.push(`탄약 −${data.ammo}`);
      if (data.exhaust) costs.push("소멸");
      if (costs.length) lines.push(costs.join(" · "));
      return lines.filter(Boolean).join("\n");
    }

    const hitCount = rules.hitCount;

    function selectedCard() {
      return state?.hand.find((c) => c.id === state.selected) || null;
    }

    function ready() {
      return state?.phase === "combat" && !modal;
    }

    const limbName = rules.limbName;
    const intentLabel = rules.intentLabel;

    // 규칙 이벤트를 화면·소리로 바꾼다. 상태는 이미 바뀐 뒤다.
    function present(events) {
      for (const ev of events) {
        if (ev.text) $("lastLog").textContent = ev.text;
        switch (ev.type) {
          case "draw":
            ev.cards.forEach((id) => dealtCards.add(id));
            if (ev.cards.length) Sound.play("drawCard");
            break;
          case "enemy-block": {
            const p = enemyPosition(ev.enemy);
            floatText(p.x, p.y - 170 * p.scale, `방어 ${ev.absorbed}`, "#d4c38d");
            Sound.play("blockHit");
            break;
          }
          case "hit":
            impact(ev.enemy, ev.damage, ev.part, ev.style);
            break;
          case "limb-broken": {
            const p = partPosition(ev.enemy, ev.part);
            burst(p.x, p.y, 40);
            floatText(p.x, p.y - 40, `${ev.part.name} 파괴`, "#e4ad8e");
            if (motionOn()) shake = Math.max(shake, 12);
            break;
          }
          case "stagger":
          case "stagger-resist": {
            const p = enemyPosition(ev.enemy);
            floatText(p.x, p.y - 190 * p.scale, ev.type === "stagger" ? "경직" : "경직 저항", ev.type === "stagger" ? "#cfd6e8" : "#a9adb8");
            break;
          }
          case "enemy-guard": {
            const p = enemyPosition(ev.enemy);
            floatText(p.x, p.y - 170 * p.scale, `방어 +${ev.block}`, "#d4c38d");
            Sound.play("blockHit");
            break;
          }
          case "enemy-skip": {
            const p = enemyPosition(ev.enemy);
            floatText(p.x, p.y - 170 * p.scale, "경직 · 행동 없음", "#cfd6e8");
            break;
          }
          case "enemy-scream": {
            const p = enemyPosition(ev.enemy);
            floatText(p.x, p.y - 170 * p.scale, `소음 +${ev.noise}`, "#e0b8a0");
            Sound.play("enemyScream");
            break;
          }
          case "enemy-buff": // 로그만. 연출은 프레젠테이션 쪽에서 채운다.
            break;
          case "enemy-summon": // 로그만. 합류 연출은 프레젠테이션 쪽에서 채운다.
            break;
          case "enemy-regen": {
            const p = enemyPosition(ev.enemy);
            floatText(p.x, p.y - 170 * p.scale, `+${ev.healed}`, "#9ad19a");
            break;
          }
          case "evade": {
            const g = geometry();
            floatText(g.heroX, g.ground - 135 * g.scale, "회피");
            break;
          }
          case "player-hit": {
            const g = geometry();
            floatText(g.heroX + ev.hit * 14, g.ground - 162 * g.scale, ev.damage ? `−${ev.damage}` : "방어", ev.damage ? "#dfa087" : "#c9c6a6");
            if (ev.damage) {
              // 사지 강타에 새 훼손 효과음을 붙이지 않습니다.
              if (!ev.coin) Sound.play("hit");
              heroRecoil = motionOn() ? 1 : 0;
              shake = motionOn() ? 8 : 0;
              burst(g.heroX, g.ground - 107 * g.scale, 25);
            } else {
              Sound.play("blockHit");
              burst(g.heroX + 44 * g.scale, g.ground - 87 * g.scale, 15, "#ad956f", false);
            }
            break;
          }
          case "log": {
            const infectionGain = ev.text?.match(/^감염 (\d+) 증가\.$/);
            if (infectionGain) {
              const g = geometry();
              floatText(g.heroX + 30, g.ground - 194 * g.scale, `감염 수치 +${infectionGain[1]}`, "#9fd98b");
            }
            break;
          }
          case "infection-tick": {
            const g = geometry();
            floatText(g.heroX, g.ground - 184 * g.scale, `체력 −${ev.damage} · 감염 피해`, "#ef8c79");
            if (ev.damage) {
              heroRecoil = motionOn() ? 0.45 : 0;
              Sound.play("hit");
            }
            break;
          }
          case "fever": {
            const g = geometry();
            floatText(g.heroX, g.ground - 214 * g.scale, "고열 · 행동력 −1", "#e68a72");
            break;
          }
          case "grab": {
            const g = geometry();
            floatText(g.heroX, g.ground - 190 * g.scale, "붙잡힘 · 드로우 −1", "#d9b7a6");
            break;
          }
          case "limb-injured":
            injuryEffect(ev.limb);
            break;
          case "item-depleted":
            depletionEffect(ev.item);
            break;
          case "backfire": {
            const g = geometry();
            if (ev.blocked) floatText(g.heroX + 18, g.ground - 185 * g.scale, `방어 ${ev.blocked}`, "#c9c6a6");
            if (ev.damage) {
              burst(g.heroX, g.ground - 95 * g.scale, 28);
              floatText(g.heroX, g.ground - 165 * g.scale, `−${ev.damage}`, "#e19b8c");
              Sound.play("hit");
            } else {
              Sound.play("blockHit");
            }
            break;
          }
          case "gamble-win":
          case "gamble-lose": {
            const g = geometry();
            floatText(g.heroX, g.ground - 200 * g.scale, ev.type === "gamble-win" ? "성공" : "실패", ev.type === "gamble-win" ? "#e6d39a" : "#d98c7c");
            Sound.play(ev.type === "gamble-win" ? "cardPlay" : "gatherCards");
            break;
          }
          case "discard-hand":
            Sound.play("gatherCards");
            break;
          case "spell-queued": {
            const g = geometry();
            if (ev.enemy) { const p = enemyPosition(ev.enemy); floatText(p.x, p.y - 200 * p.scale, "예약", "#b9c8ee"); }
            else floatText(g.heroX, g.ground - 200 * g.scale, "예약", "#b9c8ee");
            break;
          }
          case "spell-resolve": {
            Sound.play({ fireball: "flare", foresight: "drawCard" }[ev.card.key] || "magicHit");
            for (const target of ev.targets) { const p = enemyPosition(target); floatText(p.x, p.y - 200 * p.scale, `${CARDS[ev.card.key].name} 발동`, "#dfe6ff"); }
            if (!ev.targets.length) { const g = geometry(); floatText(g.heroX, g.ground - 200 * g.scale, `${CARDS[ev.card.key].name} 발동`, "#dfe6ff"); }
            if (motionOn()) shake = Math.max(shake, 6);
            break;
          }
          case "skill": {
            const cardSound = {
              rush: "drawCard", adrenaline: "powerUp", focus: "powerUp", overdose: "powerUp",
              allIn: "cardPlay", foresight: "magicCast", ward: "magicCast", maintenance: "inventoryMove"
            }[ev.card?.key];
            if (ev.sound || cardSound) Sound.play(ev.sound || cardSound);
            const g = geometry();
            if (ev.feedback) floatText(g.heroX, g.ground - 176 * g.scale, ev.feedback, "#c1bea0");
            break;
          }
        }
      }
    }

    // 직업 선택 → 새 게임. 세이브가 없거나 버릴 때 항상 여기서 시작한다.
    function chooseClass() {
      Music.play("explore");
      openModal({
        type: "options",
        title: "누구로 살아남을 것인가",
        subtitle: "CHOOSE SURVIVOR",
        description: "시작 체력과 덱, 전투 규칙이 달라집니다.",
        options: Object.entries(CLASSES).map(([id, cls]) => {
          const skills = cls.skills.map(([key, count]) => ({
            key,
            count,
            name: CARDS[key].name,
            cost: CARDS[key].cost,
            description: baseCardSummary({ key, upgraded: false })
          }));
          const inventory = cls.inventory.map((key) => itemDef(key).name);
          const trait = classTraitText(cls).replace(/^특성:\s*/, "");
          return {
            classId: id,
            title: cls.name,
            hp: cls.hp,
            tagline: cls.tagline,
            trait,
            skills,
            inventory,
            text: `${cls.tagline}\n${trait}\n시작 기술: ${skills.map((skill) => `${skill.name} ×${skill.count}`).join(" · ")}${inventory.length ? ` / 장비: ${inventory.join(" · ")}` : ""}`,
            action: () => newGame(id)
          };
        })
      });
    }

    function classTraitText(cls) {
      const t = cls.traits;
      const lines = [];
      if (t.noArms) lines.push("두 팔이 없음: 손 장비 불가(영구), 주문은 팔 부상 무시");
      if (t.attackBonus) lines.push(`공격 +${t.attackBonus}`);
      if (t.blockBonus) lines.push(`카드 방어도 +${t.blockBonus}`);
      if (t.hideIntents) lines.push("적의 다음 행동이 보이지 않음");
      return lines.length ? `특성: ${lines.join(" · ")}` : "특성 없음";
    }

    function newGame(classId = "survivor") {
      gameVersion++;
      closeModal();
      Sound.stop();
      Sound.resumeWet();
      Sound.ambience();

      state = rules.createState(classId);

      resetVisuals();
      startBattle();
      // closeModal()이 먼저 불릴 때는 state가 없어 루프가 시작되지 않으므로 여기서 확실히 켠다.
      resumeFrames();
      notify("공격은 카드 → 대상 선택. 방어·회복은 즉시 사용. M: 음소거.");
    }

    function resetVisuals() {
      hoverCard = null;
      hoverAim = null;
      particles = [];
      impactFx = [];
      stains = [];
      texts = [];
      traces = [];
      ghosts = [];
      shells = [];
      actionVisual = null;
      shake = 0;
      heroRecoil = 0;
      muzzle = 0;
      figureCache.clear();
      clearTimeout(injuryTimer);
      $("injuryBanner").classList.remove("active");
    }

    // 저장된 런을 마지막 턴 시작 상태로 복원한다.
    function restoreGame(saved) {
      gameVersion++;
      closeModal();
      Sound.stop();
      Sound.resumeWet();
      Sound.ambience();
      state = saved.state;
      rules.setUid(saved.uid);
      battleMusic();
      present(rules.normalizeBag(state));
      for (const enemy of state.enemies) {
        enemy.recoil = 0;
        enemy.flash = 0;
        enemy.lunge = 0;
      }
      resetVisuals();
      dealtCards.clear();
      resizeCanvas();
      render();
      resumeFrames();
      notify(`${STAGES[state.stage].name} · TURN ${state.turn}에서 이어합니다.`);
    }

    // 구역 음악: 보스가 있으면 보스 곡, 아니면 전투 곡.
    function battleMusic() {
      Music.play(STAGES[state.stage].enemies.includes("boss") ? "boss" : "combat");
    }

    function startBattle() {
      battleMusic();
      present(rules.startBattle(state));
      hoverCard = null;
      hoverAim = null;
      stains = [];
      ghosts = [];
      actionVisual = null;
      startTurn();
    }

    async function startTurn() {
      const version = gameVersion;
      present(rules.beginTurn(state));
      if (checkResult()) return;
      render();

      // 예약 주문은 하나씩 터뜨린다. 그동안은 입력을 막는다.
      const queue = rules.takePending(state);
      if (queue.length) { state.phase = "resolving"; render(); }
      for (const entry of queue) {
        await wait(motionOn() ? 260 : 0);
        if (version !== gameVersion) return;
        present(rules.resolveSpell(state, entry));
        cleanEnemies();
        render();
        await wait(motionOn() ? 420 : 0);
        if (version !== gameVersion) return;
      }
      if (queue.length && checkResult()) return;
      state.phase = "combat";

      present(rules.finishTurnStart(state));
      render();
      saveRun(state, rules.getUid());
    }

    function selectCard(id) {
      if (!ready()) return;
      const card = state.hand.find((c) => c.id === id);
      if (!card) return;
      const data = CARDS[card.key];

      const injuryLock = cardLockReason(card);
      if (injuryLock) {
        notify(injuryLock);
        return;
      }

      if (state.energy < rules.cardCost(card)) {
        notify(`행동력 부족 · 필요 ${rules.cardCost(card)}`);
        return;
      }

      hideTooltip();
      hoverCard = null;
      hoverAim = null;

      state.selected = state.selected === id ? null : id;
      render();
    }

    function cancelSelection() {
      state.selected = null;
      hoverCard = null;
      hoverAim = null;
      hideTooltip();
      render();
    }

    function cleanEnemies() {
      const dead = state.enemies.filter((e) => e.hp <= 0);
      if (dead.length) Sound.play("zombieDeath");
      for (const enemy of dead) {
        const p = enemyPosition(enemy);
        ghosts.push({ enemy, ...p, life: 0.6, max: 0.6 });
      }
      rules.cleanEnemies(state);
    }

    async function executeCard(kind, enemyId = null, partKey = null) {
      if (!ready()) return;
      const card = selectedCard();
      if (!card) return;
      const check = rules.canPlay(state, card, kind, enemyId, partKey);
      if (!check.ok) {
        if (check.reason) {
          notify(check.reason);
          cancelSelection();
        }
        return;
      }
      const data = CARDS[card.key];
      const { enemy, targets } = check;
      const version = gameVersion;
      state.phase = "playing";
      present(rules.beginCard(state, card));
      hoverCard = null;
      hoverAim = null;
      hideTooltip();
      render();

      await Sound.unlock();
      if (version !== gameVersion) return;
      Sound.resumeWet();
      Sound.play("cardPlay");

      const started = performance.now();
      const visualKeys = {
        quickCut: "knife", deepCut: "knife", smash: "axe", shieldBash: "guard",
        batSwing: "axe", batShove: "guard", flareShot: "flare", grenade: "grenade",
        parry: "guard", brace: "guard", painkiller: "heal", rush: "search",
        smoke: "quiet", adrenaline: "focus",
        // 추가 카드는 기존 연출을 임시로 빌려 쓴다.
        slash: "axe", hamstring: "knife", thrust: "knife", sweep: "axe",
        hammerBlow: "axe", bolt: "knife", flashbang: "flashbang", feint: "knife",
        antibiotic: "heal", tourniquet: "heal", secondWind: "guard",
        fanFire: "pistol", allIn: "search", overdose: "focus",
        arcaneBolt: "knife", fireball: "flare", ward: "quiet", drain: "knife", foresight: "search"
      };
      const visualKey = visualKeys[card.key] || card.key;

      // 동전을 먼저 던지는 도박 카드(속사): 실패하면 기본 효과가 아예 일어나지 않는다.
      let coinFirst = null;
      if (data.gamble?.before) {
        coinFirst = await requestCoin(rules.gamblePrompt(card));
        if (version !== gameVersion) return;
        if (!coinFirst) present(rules.resolveGamble(state, card, false, targets));
      }

      if (coinFirst !== false && !data.delayed) startVisual(visualKey, data.type === "attack" ? targets : [], partKey);

      if (coinFirst === false) {
        // 불발: 연출도 효과도 없음
      } else if (data.delayed) {
        // 예약 주문: 지금은 걸어두기만 한다. 다음 턴 시작에 resolvePending이 터뜨린다.
        Sound.play("magicCast");
        present(rules.queueSpell(state, card, enemy, partKey));
        if (data.target === "single" && enemy) state.target = enemy.id;
      } else if (data.type === "attack") {
        if (card.key !== "fire") Sound.play(visualKey);

        const hitDelay = visualKey === "knife" ? 105 : visualKey === "axe" ? 170 : card.key === "fire" ? 340 : visualKey === "flare" ? 360 : visualKey === "flashbang" ? 280 : card.key === "grenade" ? 300 : 0;
        if (hitDelay) await wait(hitDelay);
        if (version !== gameVersion) return;
        if (card.key === "fire") Sound.play("glass");

        const hits = hitCount(card);
        for (let hit = 0; hit < hits; hit++) {
          if (hit) {
            await wait(motionOn() ? 220 : 0);
            if (version !== gameVersion) return;
            startVisual(visualKey, targets.filter((t) => t.hp > 0), partKey);
            Sound.play(visualKey);
          }
          // 전체 공격도 적 하나씩, 사이에 숨을 둔다.
          for (const [index, target] of targets.entries()) {
            if (index) {
              await wait(motionOn() ? 150 : 0);
              if (version !== gameVersion) return;
            }
            present(rules.applyAttackHitTo(state, card, target, partKey));
            if (targets.length > 1) render();
          }
        }
        present(rules.finishAttack(state, card, targets, enemy));
      } else if (data.choice) {
        // 개인 정비: 카드 값은 이미 치렀고, 여기서 무엇을 할지 고른다.
        const pick = await new Promise((resolve) => openModal({
          type: "options",
          title: data.name,
          subtitle: "PERSONAL MAINTENANCE",
          description: "한 턴을 씁니다. 하나만 고를 수 있습니다.",
          options: [
            { title: "방어 태세", text: `방어도 ${skillEffects(card.key, card.upgraded).block} 획득.`, action: () => resolve("block") },
            { title: "장비 교체", text: "손에 든 장비를 바꿉니다. 빠진 장비의 카드는 사라지고 새 장비의 카드가 뽑기 더미에 섞입니다.", action: () => resolve("swap") }
          ]
        }));
        if (version !== gameVersion) return;
        closeModal();
        if (pick === "block") {
          const events = [];
          rules.applySkill(state, card, events);
          present(events);
        } else {
          await new Promise((resolve) => showInventory(null, null, resolve));
          if (version !== gameVersion) return;
          present(rules.refitDeck(state));
        }
      } else {
        const events = [];
        rules.applySkill(state, card, events);
        present(events);
      }

      // 도박 카드: 기본 효과 뒤에 동전. 결과 효과는 카드 정의(gamble.win / lose)가 정한다.
      if (data.gamble && coinFirst === null) {
        render();
        const won = await requestCoin(rules.gamblePrompt(card));
        if (version !== gameVersion) return;
        present(rules.resolveGamble(state, card, won, targets));
      } else if (coinFirst === true) {
        present(rules.resolveGamble(state, card, true, targets));
      }

      present(rules.finishCard(state, card));
      cleanEnemies();
      render();

      const total = card.key === "shotgun"
        ? 970
        : card.key === "heal"
          ? 1020
          : card.key === "guard"
            ? 380
            : card.key === "fire"
              ? 530
              : 330;

      await wait(Math.max(0, total - (performance.now() - started)));
      if (version !== gameVersion) return;
      if (rules.outcome(state)) {
        await settleCombatPresentation(version);
        if (version !== gameVersion) return;
      }
      state.phase = "combat";
      if (!checkResult()) render();
    }

    function onEnemyClick(id, partKey = null) {
      if (!ready()) return;
      if (selectedCard()) executeCard("enemy", id, partKey);
      else {
        state.target = id;
        render();
      }
    }

    async function endTurn() {
      if (!ready()) return;
      if (state.selected !== null) {
        cancelSelection();
        notify("선택 취소. 턴 종료를 다시 누르면 적이 행동합니다.");
        return;
      }

      const version = gameVersion;
      state.phase = "resolving";
      hoverCard = null;
      hideTooltip();
      if (motionOn() && state.hand.length) {
        document.querySelectorAll("#hand .card").forEach((node, index) => {
          node.style.setProperty("--discard-delay", `${index * 22}ms`);
          node.classList.add("discarding");
        });
        Sound.play("turnEnd");
        await wait(Math.min(320, 180 + state.hand.length * 22));
        if (version !== gameVersion) return;
      }
      rules.discardHand(state);
      render();

      for (const enemy of [...state.enemies]) {
        if (enemy.burn > 0) {
          present(rules.burnTick(state, enemy));
          render();
          await wait(motionOn() ? 160 : 0);
        }
      }

      cleanEnemies();
      if (checkResult()) return;
      const acting = [...state.enemies];
      const reinforceEvents = [];
      rules.reinforce(state, reinforceEvents);
      present(reinforceEvents);
      render();

      for (const enemy of acting) {
        if (version !== gameVersion) return;
        await wait(motionOn() ? 210 : 30);
        const intent = { ...enemy.intent };

        const events = [];
        if (rules.resolveNonAttack(state, enemy, intent, events)) {
          present(events);
          render();
          continue;
        }

        if (intent.coin) {
          const won = await requestCoin({
            title: `${enemy.name}의 사지 강타`,
            description: intent.limb ? `${limbName(intent.limb)}을 노리고 있습니다.` : "거대한 손이 다가옵니다.",
            success: "공격 회피.",
            failure: `공격 ${intent.damage}.${intent.limb ? ` 체력 피해를 받으면 ${limbName(intent.limb)} 부상.` : ""}`
          });

          if (version !== gameVersion) return;
          if (won) {
            present(rules.evade(state, enemy));
            render();
            continue;
          }
        }

        let penetrated = false;

        for (let hit = 0; hit < intent.hits; hit++) {
          enemy.lunge = motionOn() ? 1 : 0;
          await wait(motionOn() ? 110 : 0);
          const hitEvents = [];
          const { damage } = rules.enemyHit(state, enemy, intent, hit, hitEvents);
          penetrated ||= damage > 0;
          present(hitEvents);
          enemy.lunge = 0;
          render();
          if (checkResult()) return;
          await wait(motionOn() ? 190 : 0);
        }

        const afterEvents = [];
        const injuredLimb = rules.enemyAfterAttack(state, enemy, intent, penetrated, afterEvents);
        present(afterEvents);
        if (injuredLimb) {
          render();
          await wait(motionOn() ? 1450 : 500);
        }
        render();
      }

      rules.endEnemyPhase(state);
      await wait(motionOn() ? 150 : 0);
      if (version === gameVersion) startTurn();
    }

    function checkResult() {
      const result = rules.outcome(state);
      if (result === "dead") {
        Music.stop();
        state.phase = "over";
        state.selected = null;
        clearRun();
        Sound.play("playerDeath");
        render();
        openModal({
          type: "options",
          title: "이제 벽은 한 번 더 숨을 쉰다",
          subtitle: "SIGNAL LOST",
          description: `${state.stage + 1}구역에서 생체 신호가 사라졌습니다.`,
          options: [
            { title: "다시 시작", text: "새로운 탈출.", action: chooseClass }
          ]
        });
        return true;
      }

      if (result === "extracted" || result === "victory") {
        Music.play("explore");
        state.phase = result === "extracted" ? "over" : "reward";
        state.selected = null;
        render();

        if (result === "extracted") {
          clearRun();
          openModal({
            type: "options",
            title: "문 밖에서는 아무도 숨 쉬지 않았다",
            subtitle: "EXTRACTION COMPLETE",
            description: `탈출 성공 · 체력 ${state.hp} / 감염 ${state.infection} / 사지 부상 ${injuredCount()}곳`,
            options: [
              { title: "새로운 탈출", text: "다른 선택으로 다시 시작.", action: chooseClass }
            ]
          });
        } else {
          showReward();
        }
        return true;
      }
      return false;
    }

    function openModal(config) {
      hideTooltip();
      document.querySelector(".upgrade-side-preview")?.remove();
      hoverCard = null;
      $("preview").hidden = true;
      if (!modal) returnFocus = document.activeElement;
      modal = { closable: false, ...config };
      $("overlay").hidden = false;
      $("app").inert = true;
      renderModal();
    }

    function closeModal() {
      modal = null;
      $("overlay").hidden = true;
      $("app").inert = false;
      hideTooltip();
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
      if (state) updatePreview();
      resumeFrames();
    }

    // 아이템 카드가 덱에 들어오는 조건을 한눈에 구분하는 배지.
    function itemKindBadge(data) {
      if (data.kind === "hand") {
        if (state && !rules.canEquip(state)) return el("span", "kind-badge kind-resource", "들 수 없음 · 팔이 없음");
        return el("span", "kind-badge kind-hand", "장비");
      }
      if (data.kind === "consumable" && state && !rules.hasWorkingArm(state)) return el("span", "kind-badge kind-resource", "쓸 수 없음 · 팔 부상");
      if (data.kind === "resource") return el("span", "kind-badge kind-resource", "탄약");
      return el("span", "kind-badge kind-consumable", "소모품");
    }

    // 카드 뒷면 = 플레이버 텍스트. 도감·덱에서 「뒷면」을 눌러야 보인다.
    function appendCardBack(node, key) {
      const flavor = CARD_FLAVOR[key];
      if (!flavor) return;
      const chip = el("span", "flip-chip", "뒷면");
      chip.setAttribute("role", "button");
      chip.tabIndex = 0;
      const back = el("div", "card-back");
      back.append(el("p", "card-flavor", flavor));
      const flip = (event) => {
        event.stopPropagation();
        event.preventDefault();
        node.classList.toggle("flipped");
      };
      chip.addEventListener("click", flip);
      chip.addEventListener("keydown", (event) => { if (event.code === "Enter" || event.code === "Space") flip(event); });
      back.addEventListener("click", flip);
      node.append(chip, back);
    }

    // 전투 HUD와 같은 모양의 상태 띠(보상·가방 화면). deckAction이 있으면 덱 장수가 버튼이 된다.
    function hudStrip(deckAction = null) {
      const hud = el("div", "loot-hud");
      const vitals = el("div", "player-vitals");
      const health = el("div", `vital health${state.hp < 20 ? " danger" : ""}`);
      const healthTrack = el("span", "health-track");
      healthTrack.style.setProperty("--health", `${clamp(state.hp / state.maxHp * 100, 0, 100)}%`);
      health.append(uiIcon("heart"), el("strong", "", state.hp), el("small", "", `/ ${state.maxHp}`), healthTrack);
      vitals.append(health);
      const effects = el("div", "player-effects");
      const infection = el("div", `player-effect${state.infection >= 3 ? " danger" : state.infection ? " active" : ""}`);
      infection.title = "감염 수치";
      infection.append(uiIcon("infection"), el("strong", "", state.infection), el("span", "loot-effect-label", "감염"));
      const body = el("div", `player-effect body-effect${injuredCount() ? " danger" : ""}`);
      body.title = "훼손된 사지 수";
      body.append(uiIcon("body"), el("strong", "", injuredCount()), el("span", "loot-effect-label", "사지 부상"));
      effects.append(infection, body);
      const ammo = el("div", `hud-ammo${ammoCount() < 2 ? " danger" : ""}`);
      ammo.title = "보유 탄약";
      ammo.append(uiIcon("ammo"), el("strong", "", ammoCount()), el("span", "loot-effect-label", "탄약"));
      const deck = deckAction ? button("", deckAction, "pile-summary") : el("div", "pile-summary");
      deck.append(uiIcon("cards"), el("strong", "", state.deck.length));
      hud.append(vitals, effects, ammo, deck);
      return hud;
    }

    function modalCard(card, action = null, number = null) {
      const data = CARDS[card.key];
      const rarity = rarityOf(card);
      const injuryLock = cardLockReason(card);
      const node = el(action ? "button" : "article", `choice art-card rarity-${rarity}${injuryLock ? " limb-disabled" : ""}`);
      appendArt(node, card.key);
      appendUpgradeMark(node, card.upgraded);
      const content = el("div", "content");
      content.append(
        el("strong", "", `${number ? `${number}. ` : ""}${data.name}${card.upgraded ? "+" : ""} · ${rules.cardCost(card)} AP`),
        el("p", "card-rules", summary(card)),
        card.sourceItem ? el("small", "item-source", `출처 · ${itemDef(sourceItem(card)?.key)?.name || "소진된 아이템"}`) : el("small", "item-source", "출처 · 스킬")
      );
      if (injuryLock) content.append(el("span", "injury-lock", injuryLock));
      node.append(content);
      appendCardBack(node, card.key);
      if (action) node.addEventListener("click", action);
      return node;
    }

    function pileName(card) {
      if (state.hand.some((c) => c.id === card.id)) return "손패";
      if (state.draw.some((c) => c.id === card.id)) return "뽑기";
      if (state.discard.some((c) => c.id === card.id)) return "버림";
      if (state.exhausted.some((c) => c.id === card.id)) return "소멸";
      return "덱";
    }

    // 덱 그리드는 세로 스크롤이므로 ↑/↓ 키로 한 화면씩 이동한다.
    function scrollDeck(direction) {
      const rail = $("deckRail");
      rail?.scrollBy({
        top: direction * Math.max(160, rail.clientHeight * 0.7),
        behavior: motionOn() ? "smooth" : "auto"
      });
    }

    function renderSettings(content, footer) {
      content.className = "settings-list";

      const volumeRow = el("div", "setting");
      const label = el("label", "", "전체 음량");
      const slider = el("input");
      slider.type = "range";
      slider.min = "0";
      slider.max = "100";
      slider.value = settings.volume;
      slider.setAttribute("aria-label", "전체 음량");
      const value = el("output", "", `${settings.volume}%`);
      slider.addEventListener("input", () => {
        settings.volume = Number(slider.value);
        value.textContent = `${settings.volume}%`;
        Sound.updateVolume();
        Music.updateVolume();
        saveSettings();
      });
      label.append(slider, value);
      volumeRow.append(label);

      const mute = button(settings.muted ? "음소거 해제" : "음소거", () => {
        settings.muted = !settings.muted;
        Sound.updateVolume();
        Music.updateVolume();
        saveSettings();
        mute.textContent = settings.muted ? "음소거 해제" : "음소거";
        mute.setAttribute("aria-pressed", String(settings.muted));
      });
      mute.setAttribute("aria-pressed", String(settings.muted));
      volumeRow.append(mute);
      content.append(volumeRow);

      for (const [key, name] of [
        ["music", "배경 음악"],
        ["blood", "혈흔"],
        ["motion", "강한 움직임"]
      ]) {
        const row = el("div", "setting");
        const toggleLabel = el("label", "", name);
        const checkbox = el("input");
        checkbox.type = "checkbox";
        checkbox.checked = settings[key];
        if (key === "motion" && motionPreference.matches) checkbox.disabled = true;
        checkbox.addEventListener("change", () => {
          settings[key] = checkbox.checked;
          saveSettings();

          if (key === "music") {
            Music.updateVolume();
          } else if (key === "blood") {
            figureCache.clear();
            if (!settings.blood) {
              particles = particles.filter((p) => !p.blood);
              stains = [];
            }
          } else {
            syncMotion();
          }
        });
        toggleLabel.append(checkbox);
        row.append(toggleLabel);
        content.append(row);
      }

      const activation = el("div", "setting");
      const status = el("span", "", Sound.status());
      activation.append(
        status,
        button("소리 활성화", async () => {
          await Sound.unlock();
          Sound.resumeWet();
          status.textContent = Sound.status();
        })
      );
      content.append(activation);
      footer.textContent = "설정은 이 기기에 저장됩니다. M: 음소거.";
      if (motionPreference.matches) {
        footer.textContent += " 기기의 동작 줄이기가 적용 중입니다.";
      }
    }

    function renderModal() {
      if (!modal) return;
      if (modal.type === "coin") {
        renderCoin();
        return;
      }

      const m = modal;
      const root = $("modal");
      root.className = "modal";
      if (["deck", "upgrade"].includes(m.type)) root.classList.add("deck-modal");
      if (m.type === "upgrade") root.classList.add("upgrade-modal");
      if (m.type === "route") root.classList.add("route-modal");
      root.replaceChildren();
      $("overlay").querySelector(".modal-aside")?.remove();
      const head = el("div", "row");
      const titles = el("div");
      const title = el("h2", "", m.title);
      title.id = "modalTitle";
      if (m.subtitle !== null) titles.append(el("div", "eyebrow", m.subtitle || "LAST SHELTER"));
      titles.append(title);
      head.append(titles);
      if (m.closable) head.append(button("닫기 · Esc", closeModal));
      root.append(head);
      if (m.description) root.append(el("p", "description", m.description));

      const content = el("div");
      const footer = el("div", "modal-footer");

      if (m.type === "codex") {
        content.className = "codex-scroll";

        const itemSection = el("section", "codex-section");
        itemSection.append(el("h3", "", `장비·아이템 / ${Object.keys(ITEMS).length}종`));
        const itemGrid = el("div", "codex-grid");
        for (const [key, data] of Object.entries(ITEMS)) {
          const owned = state.inventory.filter((item) => item.key === key);
          const equipped = owned.some((item) => Object.values(state.equipment).includes(item.uid));
          const entry = el("article", `codex-entry rarity-${data.rarity}`);
          const art = itemArtNode(data, "codex-art");
          entry.append(
            art,
            itemKindBadge(data),
            el("strong", "", data.name),
            el("p", "", data.note),
            el("small", "item-source", data.kind === "hand" ? `${data.hands}손 장비 · ${data.cards.map((cardKey) => CARDS[cardKey].name).join(" · ")}` : data.kind === "resource" ? `탄약 ×${owned.reduce((sum, item) => sum + item.uses, 0)} 보유` : `${data.uses}회 소모품 · ${data.cards.map((cardKey) => CARDS[cardKey].name).join(" · ")}`),
            el("small", "owned-label", owned.length ? `보유 ${owned.length}${equipped ? " · 장착 중" : ""}` : "미보유")
          );
          itemGrid.append(entry);
        }
        itemSection.append(itemGrid);

        const cardSection = el("section", "codex-section");
        cardSection.append(el("h3", "", `카드 / ${Object.keys(CARDS).length}종`));
        const cardGrid = el("div", "codex-grid card-codex-grid");
        for (const [key, data] of Object.entries(CARDS)) {
          const sources = Object.values(ITEMS).filter((item) => item.cards.includes(key)).map((item) => item.name);
          const entry = el("article", `codex-entry rarity-${data.rarity}`);
          appendArt(entry, key);
          entry.append(
            el("strong", "", `${data.name} · ${data.cost} AP`),
            el("p", "", summary({ key, upgraded: false })),
            el("small", "item-source", sources.length ? `출처: ${sources.join(" · ")}` : "출처: 희귀 스킬")
          );
          appendCardBack(entry, key);
          cardGrid.append(entry);
        }
        cardSection.append(cardGrid);
        content.append(itemSection, cardSection);
        footer.textContent = "C / Esc 닫기";
      } else if (m.type === "deck" || m.type === "upgrade") {
        const cards = m.type === "upgrade" ? state.deck.filter((c) => rules.isUpgradable(state, c)) : m.cards || state.deck;
        let cardList = content;
        let equipmentList = null;
        let skillList = null;
        if (m.type === "upgrade") {
          content.className = "upgrade-workspace";
          const skillNeed = rules.skillUpgradeCount(state);
          const guide = el("section", "upgrade-mode-guide");
          const mode = (mark, title, copy) => {
            const node = el("div", "upgrade-mode");
            node.append(el("b", "upgrade-mode-mark", mark), el("strong", "", title), el("span", "", copy));
            return node;
          };
          guide.append(
            el("div", "upgrade-guide-label", "강화 방식 중 하나를 선택"),
            mode("A", "장비 1개", "장비가 제공하는 모든 카드 강화"),
            el("span", "upgrade-or", "또는"),
            mode("B", `스킬 ${skillNeed}장`, "장비에 포함되지 않은 카드만 선택")
          );
          cardList = el("div", "upgrade-candidate-scroll");
          cardList.id = "deckRail";
          cardList.setAttribute("aria-label", "강화 후보. 위아래로 스크롤합니다.");
          const equipmentSection = el("section", "upgrade-candidate-section upgrade-equipment-section");
          const equipmentHeading = el("div", "upgrade-section-heading");
          equipmentHeading.append(uiIcon("settings"), el("div", "", ""));
          equipmentHeading.lastElementChild.append(el("strong", "", "장비"), el("span", "", "하나를 선택하면 소속 카드가 전부 강화됩니다."));
          equipmentList = el("div", "deck-grid upgrade-candidate-grid");
          equipmentSection.append(equipmentHeading, equipmentList);
          const skillSection = el("section", "upgrade-candidate-section upgrade-skill-section");
          const skillHeading = el("div", "upgrade-section-heading");
          skillHeading.append(uiIcon("cards"), el("div", "", ""));
          skillHeading.lastElementChild.append(el("strong", "", "독립 스킬"), el("span", "", `${skillNeed}장을 골라 한 번에 강화합니다.`));
          skillList = el("div", "deck-grid upgrade-candidate-grid");
          skillSection.append(skillHeading, skillList);
          cardList.append(equipmentSection, skillSection);
          content.append(guide, cardList);
        } else {
          content.className = "deck-grid";
          content.id = "deckRail";
          content.setAttribute("aria-label", "카드 목록. 위아래로 스크롤합니다.");
        }

        const entries = [];
        if (m.type === "deck" && deckGrouped) {
          const groups = new Map();
          for (const card of cards) {
            const key = `${card.key}:${card.upgraded}:${card.sourceItem ?? "skill"}`;
            const group = groups.get(key) || { card, count: 0 };
            group.count++;
            groups.set(key, group);
          }
          entries.push(...groups.values());
        } else if (m.type === "upgrade") {
          const groups = new Map();
          for (const card of cards) {
            const key = card.sourceItem != null ? `item:${card.sourceItem}` : `skill:${card.id}`;
            const group = groups.get(key) || { card, count: 0, bundle: [], item: card.sourceItem != null ? sourceItem(card) : null };
            group.count++;
            group.bundle.push(card);
            groups.set(key, group);
          }
          entries.push(...groups.values());
        } else {
          entries.push(...cards.map((card) => ({ card, count: 1 })));
        }

        for (const { card, count, bundle = [card], item = null } of entries) {
          const action = m.type === "upgrade" ? () => {
            m.selectedIds = nextUpgradeSelection(m.selectedIds || [], card, item != null);
            renderModal();
          } : null;
          if (m.type === "upgrade") {
            if (item) {
              const itemData = itemDef(item.key);
              const node = button("", action, `upgrade-bundle rarity-${itemData.rarity}`);
              node.dataset.upgradeId = card.id;
              const chosen = (m.selectedIds || []).includes(card.id);
              node.classList.toggle("upgrade-selected", chosen);
              node.setAttribute("aria-pressed", String(chosen));
              const selectionMark = el("span", "upgrade-selection-mark", chosen ? "선택됨" : "선택");
              selectionMark.prepend(uiIcon("choice"));
              const heading = el("div", "upgrade-bundle-heading");
              heading.append(
                el("span", "upgrade-kind", "장비 강화"),
                el("strong", "", itemData.name),
                el("small", "", `카드 ${bundle.length}장 동시 강화`)
              );
              const included = el("div", "upgrade-bundle-cards");
              for (const bundledCard of bundle) {
                included.append(el("span", "", `${CARDS[bundledCard.key].name}${bundledCard.upgraded ? "+" : ""}`));
              }
              node.append(itemArtNode(itemData, "upgrade-item-art"), selectionMark, heading, included);
              bindUpgradeItemTooltip(node, itemData);
              equipmentList.append(node);
              continue;
            }
            const node = modalCard(card, action);
            node.classList.add("upgrade-skill-card");
            node.querySelector(".content").prepend(el("span", "upgrade-kind", `스킬 ${rules.skillUpgradeCount(state)}장 강화`));
            node.dataset.upgradeId = card.id;
            const chosen = (m.selectedIds || []).includes(card.id);
            node.classList.toggle("upgrade-selected", chosen);
            node.setAttribute("aria-pressed", String(chosen));
            const selectionMark = el("span", "upgrade-selection-mark", chosen ? "선택됨" : "선택");
            selectionMark.prepend(uiIcon("choice"));
            const comparison = el("div", "upgrade-inline-comparison");
            comparison.append(
              el("span", "upgrade-before", `현재\n${summary(card, false)}`),
              el("b", "upgrade-arrow", "→"),
              el("span", "upgrade-after", `강화 후\n${summary({ ...card, upgraded: true }, false)}`)
            );
            node.append(selectionMark, comparison);
            skillList.append(node);
            continue;
          }
          const node = modalCard(card, action);
          if (m.type === "deck") {
            node.querySelector(".content").append(el("span", "pile-label", pileName(card)));
            if (count > 1) node.append(el("span", "card-count", `×${count}`));
          }
          cardList.append(node);
        }

        if (m.type === "deck") footer.append(
          button(`중복 묶기 · ${deckGrouped ? "켬" : "끔"}`, () => { deckGrouped = !deckGrouped; renderModal(); }),
          el("span", "", `${cards.length}장 · 세로 스크롤`),
          ...(m.backToInventory ? [button(`${m.backLabel || "장비와 물자로"} · Esc`, m.backToInventory, "button primary")] : [])
        );
        if (m.type === "upgrade") {
          const selected = (m.selectedIds || []).map((id) => cards.find((card) => card.id === id)).filter(Boolean);
          content.classList.toggle("upgrade-has-selection", selected.length > 0);
          const selectedItem = selected.length ? sourceItem(selected[0]) : null;
          const selectedBundleCount = selectedItem ? cards.filter((card) => card.sourceItem === selectedItem.uid).length : 0;
          const skillNeed = rules.skillUpgradeCount(state);
          const ready = rules.canConfirmUpgrade(state, selected);
          const selectionPanel = el("aside", `upgrade-selection-panel${ready ? " ready" : ""}`);
          const selectionHeading = el("div", "upgrade-selection-heading");
          selectionHeading.append(el("span", "eyebrow", "CURRENT TARGET"), el("strong", "", selectedItem ? "장비 강화" : "스킬 강화"));
          const selectionBody = el("div", "upgrade-selection-body");
          if (selectedItem) {
            selectionBody.append(el("b", "", itemDef(selectedItem.key).name), el("span", "", `포함 카드 ${selectedBundleCount}장 전체`));
            for (const bundledCard of cards.filter((candidate) => candidate.sourceItem === selectedItem.uid)) {
              selectionBody.append(el("small", "", `${CARDS[bundledCard.key].name} → ${CARDS[bundledCard.key].name}+`));
            }
          } else if (selected.length) {
            selectionBody.append(el("b", "", `${selected.length} / ${skillNeed} 선택`));
            for (const selectedCard of selected) selectionBody.append(el("small", "", `${CARDS[selectedCard.key].name} → ${CARDS[selectedCard.key].name}+`));
          } else {
            selectionHeading.lastElementChild.textContent = "아직 선택하지 않음";
            selectionBody.append(el("p", "", "왼쪽에서 장비 하나 또는 독립 스킬을 고르세요."));
          }
          const confirm = button(selectedItem ? "이 장비 강화" : `스킬 ${skillNeed}장 강화`, () => {
              if (!rules.canConfirmUpgrade(state, selected)) return;
              present(rules.upgradeSelection(state, selected));
              // 강화 결과를 한 장씩 보여 준 뒤 한 번만 다음 구역으로 간다.
              // 장비는 소속 카드 전부(같은 카드가 여러 장이면 한 번만).
              const shown = selectedItem
                ? [...new Map(state.deck.filter((card) => card.sourceItem === selectedItem.uid).map((card) => [card.key, card])).values()]
                : selected;
              const reveal = (index) => showAcquisition(shown[index], index + 1 < shown.length ? () => reveal(index + 1) : prepareNextBattle, "강화 완료", false);
              reveal(0);
            }, "button primary upgrade-confirm");
          confirm.disabled = !ready;
          selectionPanel.append(selectionHeading, selectionBody, confirm);
          content.append(selectionPanel);
          footer.append(
            el("span", "", selectedItem ? `${itemDef(selectedItem.key).name}의 소속 카드가 전부 강화됩니다.`
              : selected.length ? `독립 스킬 ${selected.length}/${skillNeed} 선택` : "두 방식은 함께 선택할 수 없습니다."),
            button("돌아가기 · Esc", chooseRoute)
          );
        }
      } else if (m.type === "route") {
        content.className = "route-screen";
        const overview = el("section", "intermission-overview");
        const overviewHeading = el("div", "intermission-heading");
        overviewHeading.append(
          el("span", "eyebrow", "BATTLE CLEARED"),
          el("strong", "", STAGES[state.stage]?.name || "전투 종료"),
          el("p", "", "다음 구역으로 가기 전에 상태를 확인하세요.")
        );
        const stats = el("div", "intermission-stats");
        const stat = (icon, label, value, danger = false) => {
          const node = el("div", `intermission-stat${danger ? " danger" : ""}`);
          node.append(uiIcon(icon), el("span", "", label), el("strong", "", value));
          return node;
        };
        stats.append(
          stat("heart", "체력", `${state.hp}/${state.maxHp}`, state.hp / state.maxHp < .35),
          stat("infection", "감염", state.infection, state.infection >= 4),
          stat("body", "사지 부상", `${injuredCount()}곳`, injuredCount() > 0),
          stat("ammo", "탄약", `${ammoCount()}발`, ammoCount() < 2),
          stat("cards", "덱", `${state.deck.length}장`)
        );
        const management = button("", showInventory, "route-management");
        management.append(
          uiIcon("backpack"),
          el("span", "", "장비와 물자"),
          el("small", "", "정비 · 소모품 · 덱 확인"),
          el("b", "", "열기 →")
        );
        overview.append(overviewHeading, stats, management);
        content.append(overview);
        const routeHeading = el("div", "route-section-heading");
        routeHeading.append(el("span", "eyebrow", "NEXT MOVE"), el("strong", "", "다음 행동을 선택"), el("p", "", "한 곳을 선택해 정비하거나 다음 구역으로 이동합니다."));
        content.append(routeHeading);
        const paths = el("section", "route-grid");
        const routeMeta = {
          shelter: { icon: "heal", label: "회복" },
          workshop: { icon: "settings", label: "영구 강화" },
          stranger: { icon: "cards", label: "새 스킬" },
          armory: { icon: "coin", label: "위험한 보급" }
        };
        m.options.forEach((option, index) => {
          const node = button("", option.action, `route-card route-${option.tone}`);
          node.disabled = Boolean(option.disabled);
          const art = el("img", "route-art");
          art.src = option.art;
          art.alt = "";
          const meta = routeMeta[option.tone] || { icon: "choice", label: "이동" };
          const category = el("span", "route-category");
          category.append(uiIcon(meta.icon), el("b", "", meta.label));
          const copy = el("span", "route-copy", "");
          copy.append(el("small", "route-index", String(index + 1).padStart(2, "0")), el("strong", "", option.title), el("p", "", option.text));
          if (option.disabled) copy.append(el("em", "route-unavailable", "현재 이용 불가"));
          node.append(art, category, copy);
          paths.append(node);
        });
        content.append(paths);
      } else if (m.type === "loot") {
        // 보상을 고르기 전에 덱과 장비를 확인할 수 있어야 한다. 두 화면 모두 이 보상 화면으로 되돌아온다.
        const backHere = () => openModal(m);
        const hud = hudStrip(() => openModal({ type: "deck", title: `생존 덱 / ${state.deck.length}장`, backToInventory: backHere, backLabel: "보상으로" }));
        const handName = (slot) => { const item = state.inventory.find((i) => i.uid === state.equipment[slot]); return item ? rules.itemName(item) : "빈손"; };
        const hands = button("", () => showInventory(null, backHere), "pile-summary loot-hands");
        hands.append(el("span", "", "양손"), el("strong", "", `${handName("left")} · ${handName("right")}`));
        hud.append(hands);
        root.append(hud);
        content.className = "modal-grid loot-grid";
        m.items.forEach((item, index) => {
          if (rules.isRewardCard(item)) {
            // 전리품 풀에 섞인 카드(술사의 주문). 고르면 덱에 영구 추가.
            const node = modalCard(item, () => {
              const events = [];
              const added = rules.addSkill(state, item.key, events);
              present(events);
              Sound.play("gatherCards");
              showAcquisition(added, m.afterAction ? prepareNextBattle : m.continue || chooseRoute);
            });
            content.append(node);
            return;
          }
          const data = itemDef(item.key);
          const action = () => {
            Sound.play("inventoryMove");
            if (!rules.canAddLoot(state, item)) {
              // 가방이 꽉 찼다. 가방 화면에서 자리를 만들거나 손에 들거나 버린다.
              if (m.afterAction) showInventory(nextStage, null, null, item, true);
              else showInventory(m.continue, null, null, item);
              return;
            }
            present(rules.addLoot(state, item));
            if (m.afterAction) {
              prepareNextBattle();
              return;
            }
            if (m.continue) {
              // 인벤토리에서 Esc를 누르면 이 결정 화면으로 되돌아온다. 다음 구역 이동은 명시적 버튼으로만.
              const decide = () => openModal({
                type: "options",
                title: `${rules.itemLabel(item)} 확보`,
                options: [
                  { title: "장비 관리", text: "장착 후 이동", action: () => showInventory(m.continue, decide) },
                  { title: "다음 구역", text: "보관하고 이동", action: m.continue }
                ]
              });
              decide();
              return;
            }
            openModal({
              type: "options", title: `${rules.itemLabel(item)} 획득`, subtitle: `${RARITIES[data.rarity].name} ITEM`,
              description: `${data.cards.length ? `제공 카드: ${data.cards.map((key) => CARDS[key].name).join(" · ")}` : ""}${data.cards.some((key) => Boolean(CARDS[key]?.ammo)) ? "\n탄약 지급" : ""}`,
              options: [{ title: "장비와 물자 확인", text: "장착하거나 다음 경로를 고릅니다.", action: showInventory }]
            });
          };
          const node = button("", action, `choice item-choice rarity-${data.rarity}`);
          const picture = itemArtNode(data, "item-reward-art");
          node.append(
            picture,
            itemKindBadge(data),
            el("strong", "", rules.itemLabel(item))
          );
          bindItemCardTooltip(node, data);
          content.append(node);
        });
        $("overlay").append(button("건너뛰기", m.afterAction ? prepareNextBattle : chooseRoute, "modal-aside"));
      } else if (m.type === "inventory") {
        content.className = `bag-screen${m.readOnly ? " inventory-readonly" : ""}`;
        root.append(hudStrip(() => openModal({
          type: "deck",
          title: `생존 덱 / ${state.deck.length}장`,
          backToInventory: () => showInventory(m.continue, m.back, m.combatDone, m.incoming, m.noReturn, m.readOnly)
        })));
        content.append(bagLayout(m));
        // 새 전리품을 놓지 않고 나가면 두고 간다.
        const leave = (fn) => () => { dropIncoming(m); fn(); };
        if (m.readOnly) {
          footer.append(el("span", "", "확인 전용 · 전투 중에는 장비를 바꿀 수 없습니다."), button("닫기 · Esc", closeModal, "button primary"));
        } else if (m.combatDone) {
          footer.append(button("정비 완료 · Esc", inventoryBack, "button primary"));
        } else if (m.continue) {
          footer.append(
            ...(m.noReturn ? [] : [button("돌아가기 · Esc", inventoryBack)]),
            button("다음 구역", leave(m.continue), "button primary")
          );
        } else if (m.back) {
          footer.append(button("돌아가기 · Esc", inventoryBack, "button primary"));
        } else {
          footer.append(button("경로 선택으로 · Esc", leave(chooseRoute), "button primary"));
        }
      } else if (m.type === "skillPick") {
        content.className = "modal-grid";
        for (const card of m.cards) {
          const node = modalCard(card, () => {
            const events = [];
            const added = rules.addSkill(state, card.key, events);
            present(events);
            showAcquisition(added, m.next || nextStage);
          });
          content.append(node);
        }
        footer.append(el("span", "", "카드를 클릭하면 덱에 영구 추가됩니다."), button("가져가지 않고 이동", m.next || nextStage));
      } else if (m.type === "acquisition") {
        content.className = "acquisition";
        const card = modalCard(m.card);
        card.classList.add("acquired-card");
        const details = el("div");
        details.setAttribute("role", "status");
        details.append(
          el("div", "eyebrow", m.added ? "ADDED TO YOUR DECK" : "UPGRADE COMPLETE"),
          el("h3", "", `${CARDS[m.card.key].name}${m.card.upgraded ? "+" : ""}`),
          el("p", "description", m.added ? `덱에 추가했습니다. 현재 ${state.deck.length}장.` : "강화된 성능이 덱에 반영되었습니다."),
          button("확인하고 계속 · Space", m.continue, "button primary")
        );
        content.append(card, details);
      } else if (m.type === "cardDetail") {
        content.className = "card-inspect-layout";
        const inspected = modalCard(m.card);
        inspected.classList.add("card-inspect-card");
        content.append(inspected);
        footer.append(el("span", "", "카드의 실제 비용과 현재 효과입니다."), button("닫기 · Esc", closeModal, "button primary"));
      } else if (m.type === "body") {
        content.className = "limb-list body-screen";
        content.append(bodyDiagram(state.limbs));
        LIMBS.forEach((limb) => {
          const injured = state.limbs[limb.key];
          const permanent = rules.isPermanentLimb(state, limb.key);
          const box = el("section", `limb-box limb-${limb.key}${injured ? " injured" : ""}`);
          box.tabIndex = 0;
          box.append(
            uiIcon(limb.type),
            el("strong", "", limb.name),
            el("span", "limb-condition", permanent ? "없음" : injured ? "부상" : "정상"),
            el("p", "", limb.type === "arm"
              ? `부상 시 공격 피해 −2.\n현재 적용: ${injured ? "−2" : "없음"}.`
              : `부상 시 턴 시작 드로우 −1.\n현재 적용: ${injured ? "−1" : "없음"}.`)
          );
          content.append(box);
        });
        footer.textContent = "사지 부상은 은신처에서 치료합니다.";
      } else if (m.type === "help") {
        content.className = "help-grid";
        const sections = [
          ["조작", "카드 선택 → 전투 화면의 대상 클릭.\n공격: 적 몸통 또는 사지 클릭. 방어·회복: 전투 화면 클릭.\n1–9 / 0은 카드를 선택합니다. 카드 우클릭은 상세 보기.\nEsc / 전장 우클릭: 카드 선택 취소.\nSpace: 턴 종료. 카드 선택 중에는 선택 취소."],
          ["몸통과 사지", "몸통 피해: 적 체력 감소. 0이면 처치.\n사지 피해: 해당 사지 내구도만 감소. 0이면 기능 파괴.\n초과 피해는 몸통으로 넘어가지 않음.\n파괴 효과는 현재 턴 의도에도 즉시 반영.\n전체 공격과 화상은 몸통에 적용.\n'사지 +N' 카드는 사지를 노릴 때만 추가 피해.\n연타(×2) 카드는 같은 대상을 두 번 때립니다."],
          ["적의 행동", "경직: 다음 적 행동을 통째로 건너뜀. 풀린 적은 다음 한 턴 동안 경직 저항(다시 걸리지 않음).\n울부짖기: 소음 증가. 증원 판정에 바로 반영.\n재생: 적 체력 회복. 부위를 파괴하면 사라짐.\n붙잡기: 체력 피해를 받으면 다음 턴 드로우 −1 (최대 −2).\n의도 아이콘과 수치로 구분합니다. 적 상태창에 마우스를 올리면 행동 설명이 나옵니다."],
          ["상태", `방어도는 적 공격을 흡수한 만큼 감소하며 다음 내 턴 시작에 사라집니다.\n${BURN_TEXT}\n감염 2마다 내 턴 시작 체력 피해 1. 방어 무시.
감염 8 이상: 고열 · 턴 시작 행동력 2.\n공격 강화와 팔 부상은 직접 공격에만 적용.\n소멸 카드는 이번 전투에서 다시 뽑지 않습니다.`],
          ["동전과 부상", "앞면·뒷면 각 50%. 선택한 면이 나오면 성공.\n사지 강타 성공: 회피.\n실패: 방어 적용 후 체력 피해를 받으면 지정 사지 부상.\n팔 하나당 공격 피해 −2. 두 팔 다 다치면 소모품(응급 처치·수류탄 등)을 쓸 수 없음.\n다리 하나당 턴 시작 드로우 −1.\n응급 처치는 사지를 치료하지 않습니다. 진통제는 이번 턴만 부상 효과를 무시합니다."],
          ["전투 흐름", "매 턴 행동력 3, 기본 드로우 5. 손패 최대 10.\n턴 종료: 손패 버림 → 화상 → 증원 → 적 행동 → 소음 1 감소.\n소음 6 이상이면 6을 소비하고 배회자 합류. 턴당 1마리, 적 최대 5마리. 합류한 턴에는 대기."],
          ["직업", "생존자: 기본.\n술사: 두 팔이 없어 손 장비·소모품을 평생 못 씁니다. 주문은 예약형 — 쓰면 다음 내 턴 시작에 발동하니 그때까지 역장으로 버텨야 합니다. 대상이 죽으면 다른 적에게 옮겨 붙고, 전투가 끝나면 예약은 사라집니다. 전리품에는 평소 물건에 주문이 섞여 나옵니다.\n광인: 적의 다음 행동이 보이지 않는 대신 공격 +3, 카드 방어도 +2."],
          ["도박 카드", "세열 수류탄·올인·과다 투여는 효과 뒤에, 속사는 효과 전에 동전을 던집니다.\n앞면·뒷면을 고르고, 맞히면 카드에 적힌 성공 효과, 틀리면 실패 효과.\n실패 효과는 자해·사지 부상·손패 버림·감염·증원처럼 되돌릴 수 없습니다."],
          ["개인 정비", "3 AP 스킬. 사용 시 방어도 10 또는 장비 교체 중 하나.\n장비 교체: 손에서 내려놓은 장비의 카드는 손패·더미에서 사라지고, 새 장비의 카드가 뽑기 더미에 섞입니다.\n전투 중에는 구급상자를 직접 쓸 수 없습니다."],
          ["경로", "은신처: 회복과 사지 치료.\n정비소: 카드 1장 영구 강화.\n낯선 생존자: 장비 없이 쓰는 스킬 카드 1장 획득.\n군수 창고: 동전 성공 시 무기·탄약, 실패 시 체력 −6."],
          ["소리·탐색", "D 덱 / C 도감 / B 신체 / I 인벤토리 / L 기록 / H 규칙 / O 설정 / M 음소거.\n전투 중 인벤토리는 확인 전용입니다.\n덱과 강화 화면은 휠 또는 ↑↓ 키로 스크롤.\n도감에서 모든 카드·아이템과 출처를 확인.\n소리·연출 설정은 이 기기에 저장됩니다.\n체력·감염·사지 부상은 전투 사이에 유지.\n진행은 매 턴 시작에 자동 저장. 새로고침하면 마지막 턴 시작으로 돌아갑니다."]
        ];
        sections.forEach(([heading, text]) => {
          const section = el("section");
          section.append(el("h3", "", heading), el("p", "", text));
          content.append(section);
        });
      } else if (m.type === "log") {
        state.logs.forEach((text) => content.append(el("div", "log-line", text)));
      } else if (m.type === "settings") {
        renderSettings(content, footer);
      } else {
        content.className = "modal-grid";
        const classScreen = m.subtitle === "CHOOSE SURVIVOR";
        if (classScreen) { root.classList.add("class-modal"); content.classList.add("class-options"); }
        m.options.forEach((option, index) => {
          const action = option.disabled ? null : option.action;
          const chosen = classScreen && m.selectedClassId === option.classId;
          const selectClass = () => {
            m.selectedClassId = option.classId;
            renderModal();
          };
          const node = button("", classScreen ? selectClass : () => action?.(), "choice");
          node.disabled = Boolean(option.disabled);
          if (classScreen) {
            node.classList.add("class-choice");
            node.dataset.class = option.classId;
            node.classList.toggle("class-selected", chosen);
            node.setAttribute("aria-pressed", String(chosen));
            const classPresentation = {
              survivor: { number: "01", role: "균형형", icon: "body", portrait: "/assets/art/survivor-class-v1.webp" },
              mage: { number: "02", role: "예약 주문", icon: "status-pending", portrait: "/assets/art/survivor-mage-v1.webp" },
              berserker: { number: "03", role: "공세형", icon: "status-strength", portrait: "/assets/art/survivor-berserker-v1.webp" },
            };
            const presentation = classPresentation[option.classId] || classPresentation.survivor;
            const portrait = el("div", "class-portrait");
            const portraitImage = el("img", "");
            portraitImage.src = presentation.portrait;
            portraitImage.alt = "";
            portraitImage.decoding = "async";
            portrait.append(portraitImage);
            portrait.append(
              el("span", "class-number", presentation.number),
              el("span", "class-role", presentation.role)
            );
            const emblem = el("div", "class-emblem");
            emblem.append(uiIcon(presentation.icon));
            portrait.append(emblem);
            node.append(portrait);
          }
          if (classScreen) {
            node.setAttribute("aria-label", `${option.title}. ${option.text}`);
            const body = el("div", "class-choice-body");
            const heading = el("div", "class-choice-heading");
            const vitality = el("span", "class-vitality");
            vitality.append(uiIcon("heart"), el("b", "", option.hp), el("small", "", "HP"));
            heading.append(el("strong", "class-name", option.title), vitality);

            const details = el("div", "class-hover-details");
            const detailRow = (icon, label, copy) => {
              const row = el("div", "class-info-row");
              const copyNode = copy instanceof Node ? copy : el("p", "class-info-copy", copy);
              copyNode.classList.add("class-info-copy");
              row.append(
                uiIcon(icon),
                el("strong", "class-info-label", label),
                el("small", "class-info-hint", "HOVER"),
                copyNode
              );
              return row;
            };
            const startCards = el("div", "class-start-cards");
            for (const skill of option.skills) {
              const card = el("article", `class-start-card rarity-${CARDS[skill.key].rarity}`);
              card.append(
                el("span", "class-start-cost", `${skill.cost} AP`),
                el("strong", "", `${skill.name} ×${skill.count}`),
                el("p", "", skill.description)
              );
              startCards.append(card);
            }
            const startSkillsRow = detailRow("cards", "시작 기술", startCards);
            startSkillsRow.classList.add("class-start-skills-row");
            startSkillsRow.querySelector(".class-info-hint").textContent = "HOVER · SCROLL";
            details.append(
              detailRow("log", "고유 규칙", option.trait),
              startSkillsRow,
              detailRow("backpack", "소지품", (option.inventory.length ? option.inventory : ["없음"]).join(" · "))
            );

            body.append(
              heading,
              details,
              el("span", "class-select-cta", chosen ? "선택됨" : "선택해서 확인")
            );
            node.append(body);
          } else {
            node.append(el("strong", "", option.title), el("p", "", option.text));
          }
          content.append(node);
        });
        if (classScreen) {
          content.classList.toggle("has-class-selection", Boolean(m.selectedClassId));
          const selectedClass = m.options.find((option) => option.classId === m.selectedClassId);
          const selection = el("div", "class-confirm-copy");
          selection.append(
            el("span", "eyebrow", "SELECTED SURVIVOR"),
            el("strong", "", selectedClass ? selectedClass.title : "아직 선택하지 않음"),
            el("small", "", selectedClass ? "시작 규칙과 소지품을 확인한 뒤 확정하세요." : "캐릭터를 한 번 눌러 선택하세요.")
          );
          const confirm = button(selectedClass ? "이 생존자로 시작" : "생존자 선택 필요", () => selectedClass?.action(), "button primary class-confirm-button");
          confirm.disabled = !selectedClass;
          footer.append(selection, confirm);
        } else {
          footer.textContent = "클릭하여 선택";
        }
      }

      root.append(content, footer);
      root.scrollTop = 0;
      const lastSelectedId = m.type === "upgrade" ? (m.selectedIds || []).at(-1) : null;
      const selectedUpgradeNode = lastSelectedId != null
        ? root.querySelector(`[data-upgrade-id="${CSS.escape(String(lastSelectedId))}"]`)
        : null;
      const selectedClassNode = m.selectedClassId
        ? root.querySelector(`.class-choice[data-class="${CSS.escape(String(m.selectedClassId))}"]`)
        : null;
      (selectedUpgradeNode || selectedClassNode || root.querySelector("button:not(:disabled), [tabindex='0']"))?.focus({ preventScroll: true });
    }

    function requestCoin(config) {
      return new Promise((resolve) => {
        coinResolver = resolve;
        coinData = { ...config, result: null, won: false, spinning: false };
        openModal({ type: "coin" });
      });
    }

    function renderCoin() {
      const root = $("modal");
      root.replaceChildren();
      $("overlay").querySelector(".modal-aside")?.remove();
      root.className = "modal coin-modal";
      const threat = el("h2", "coin-title", coinData.title);
      threat.id = "modalTitle";
      const description = coinData.title === "실린더가 돈다" ? "이번엔 총알이 나갈까?" : coinData.description;
      root.append(threat, el("p", "sr-only", description));

      const layout = el("div", "coin-layout");
      const space = el("div", "coin-space");
      const coin = el("div", `coin${coinData.spinning ? " spinning" : ""}${coinData.result ? " landed" : ""}`);
      coin.setAttribute("aria-hidden", "true");
      const headsFace = el("img", "coin-face coin-heads");
      headsFace.src = COIN_HEADS;
      const tailsFace = el("img", "coin-face coin-tails");
      tailsFace.src = COIN_TAILS;
      if (coinData.result === "tails") coin.classList.add("show-tails");
      coin.append(headsFace, tailsFace);
      const glint = el("span", "coin-glint");
      space.append(coin, glint);

      const details = el("div", "coin-details");
      const result = el("div", "coin-result", coinData.spinning
        ? "…"
        : coinData.result
          ? (coinData.won ? "성공" : "실패")
          : "");
      result.setAttribute("aria-live", "polite");
      const controls = el("div", "row");

      if (coinData.result) {
        controls.append(button("계속", finishCoin, "button primary"));
      } else {
        const heads = button("HEADS", () => tossCoin("heads"), "coin-choice heads-choice");
        const tails = button("TAILS", () => tossCoin("tails"), "coin-choice tails-choice");
        heads.setAttribute("aria-label", `앞면. 성공 시 ${coinData.success}. 실패 시 ${coinData.failure}.`);
        tails.setAttribute("aria-label", `뒷면. 성공 시 ${coinData.success}. 실패 시 ${coinData.failure}.`);
        heads.disabled = coinData.spinning;
        tails.disabled = coinData.spinning;
        controls.append(heads, tails);
      }

      const stakes = el("div", "coin-stakes");
      for (const [name, text] of [["성공", coinData.success], ["실패", coinData.failure]]) {
        const line = el("div", "coin-stake-line");
        line.append(el("strong", "", name), el("span", "", text));
        stakes.append(line);
      }
      details.append(result, stakes, controls);
      coinData.view = { coin, result, stakes, controls };
      layout.append(space, details);
      root.append(layout);
      root.querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
    }

    async function tossCoin(chosen) {
      if (!coinData || coinData.spinning || coinData.result) return;
      const data = coinData;
      data.spinning = true;
      const { coin, result: label, stakes, controls } = data.view;
      controls.querySelectorAll("button").forEach(b => { b.disabled = true; });
      label.textContent = "…";

      const bytes = new Uint8Array(1);
      const result = globalThis.crypto?.getRandomValues
        ? (crypto.getRandomValues(bytes), bytes[0] < 128 ? "heads" : "tails")
        : Math.random() < 0.5 ? "heads" : "tails";

      Sound.play("coin");
      coin.parentElement.classList.add("tossing");
      controls.querySelector(chosen === "heads" ? ".heads-choice" : ".tails-choice")?.classList.add("chosen");
      void Sound.unlock().then(() => {
        if (coinData !== data || !data.spinning) return;
        Sound.resumeWet();
      }).catch(() => {});
      const angle = result === "heads" ? 1800 : 1980;
      const frames = motionOn() ? [
        { transform: "translateY(0) rotateX(0deg) scale(1)", offset: 0 },
        { transform: "translateY(12px) rotateX(-25deg) scale(.94)", offset: .07 },
        { transform: "translateY(-80px) rotateX(720deg) scale(.83)", offset: .32 },
        { transform: "translateY(-96px) rotateX(1080deg) scale(.78)", offset: .48 },
        { transform: "translateY(-66px) rotateX(1440deg) scale(.87)", offset: .64 },
        { transform: "translateY(0) rotateX(" + angle + "deg) scale(1)", offset: .84 },
        { transform: "translateY(-12px) rotateX(" + (angle + 18) + "deg) scale(1.04)", offset: .9 },
        { transform: "translateY(0) rotateX(" + angle + "deg) scale(1)", offset: 1 }
      ] : [{ transform: "rotateX(" + angle + "deg)", opacity: .5 }, { transform: "rotateX(" + angle + "deg)", opacity: 1 }];
      const animation = coin.animate(frames, { duration: motionOn() ? 1900 : 120, easing: "linear", fill: "forwards" });
      await animation.finished.catch(() => {});
      coin.style.transform = "rotateX(" + (result === "heads" ? 0 : 180) + "deg)";
      animation.cancel();
      if (coinData !== data) return;

      coin.parentElement.classList.remove("tossing");
      coin.classList.add("landed");
      label.classList.add(result === chosen ? "coin-success" : "coin-failure");
      data.spinning = false;
      data.result = result;
      data.won = result === chosen;
      addLog(`동전 ${result === "heads" ? "앞면" : "뒷면"} · ${data.won ? "성공" : "실패"}.`);
      label.textContent = (result === "heads" ? "HEADS" : "TAILS") + " · " + (data.won ? "성공" : "실패");
      stakes.textContent = data.won ? data.success : data.failure;
      controls.replaceChildren(button("계속", finishCoin, "button primary"));
      controls.querySelector("button").focus({ preventScroll: true });
    }

    function finishCoin() {
      if (!coinData?.result || coinData.spinning) return;
      const won = coinData.won;
      const resolve = coinResolver;
      coinData = null;
      coinResolver = null;
      closeModal();
      resolve?.(won);
    }

    function showReward() {
      openModal({
        type: "loot",
        title: "전리품",
        subtitle: null,
        items: rules.rollLoot(state)
      });
    }

    function equip(uid, slot) {
      present(rules.equip(state, uid, slot));
    }

    function unequip(slot) {
      rules.unequip(state, slot);
    }

    function preparationRecovery(item) {
      const events = [];
      if (!rules.useRecovery(state, item, events)) return false;
      present(events);
      Sound.play("heal");
      return true;
    }

    function preparationRecoveryInfo(item) {
      return rules.recoveryInfo(state, item);
    }

    // ── 가방 화면 ───────────────────────────────────────────────
    // 격자에 아이템을 끌어 놓는다. 손 슬롯에 놓으면 장착, 버리기에 놓으면 버림.
    // 클릭으로 고른 뒤 칸을 클릭해도 된다. R은 회전.
    let bagSelected = null; // uid | "incoming" | null
    let bagDrag = null;

    function bagItemOf(m, ref) {
      return ref === "incoming" ? m.incoming : state.inventory.find((item) => item.uid === ref) || null;
    }

    function bagMetrics() {
      const grid = document.querySelector(".bag-grid");
      const style = grid ? getComputedStyle(grid) : null;
      const cell = style ? parseFloat(style.getPropertyValue("--bag-cell")) : 92;
      const gap = style ? parseFloat(style.getPropertyValue("--bag-gap")) : 4;
      return { grid, cell, gap, step: cell + gap };
    }

    function bagTile(m, item, ref, rot = null) {
      const data = itemDef(item.key);
      const size = rules.itemSize(item, rot ?? (ref === "incoming" ? m.incomingRot || 0 : item.pos?.rot || 0));
      const tile = el("div", `bag-item rarity-${data.rarity}`);
      tile.style.setProperty("--w", size.w);
      tile.style.setProperty("--h", size.h);
      if (item.pos && ref !== "incoming") {
        tile.style.setProperty("--x", item.pos.x);
        tile.style.setProperty("--y", item.pos.y);
      }
      tile.append(itemArtNode(data, "bag-art"), el("span", "bag-name", data.kind === "resource" ? data.name : rules.itemName(item)));
      // 강화한 장비는 카드와 같은 강화 견장을 단다.
      if (item.upgraded) { tile.classList.add("upgraded"); appendUpgradeMark(tile, true); }
      if (item.uses != null) tile.append(el("span", "bag-uses", `×${item.uses}`));
      if (m.readOnly) tile.classList.add("readonly");
      if (bagSelected === ref) tile.classList.add("selected");
      if (!m.readOnly) tile.addEventListener("pointerdown", (event) => beginBagDrag(event, m, ref));
      bindItemCardTooltip(tile, data);
      return tile;
    }

    function bagLayout(m) {
      const wrap = el("section", "bag-layout");

      const hands = el("div", "bag-hands");
      const leftItem = state.inventory.find((item) => item.uid === state.equipment.left) || null;
      const rightItem = state.inventory.find((item) => item.uid === state.equipment.right) || null;
      const handSlot = (slot, label, item) => {
        const injured = slot === "left" ? state.limbs.leftArm : slot === "right" ? state.limbs.rightArm : state.limbs.leftArm || state.limbs.rightArm;
        const box = el("div", `bag-hand${injured ? " injured" : ""}${slot === "both" ? " both" : ""}`);
        box.dataset.slot = slot === "both" ? "left" : slot;
        box.append(el("small", "", label));
        if (item) box.append(bagTile(m, item, item.uid, 0));
        else box.append(el("span", "hand-empty", !rules.canEquip(state) ? "팔 없음" : injured ? "부상" : "빈손"));
        if (!m.readOnly) box.addEventListener("click", (event) => {
          if (event.target.closest(".bag-item") || bagSelected == null || bagDrag) return;
          equipRef(m, bagSelected, box.dataset.slot);
        });
        return box;
      };
      if (leftItem && leftItem === rightItem) hands.append(handSlot("both", "양손", leftItem));
      else hands.append(handSlot("left", "왼손", leftItem), handSlot("right", "오른손", rightItem));

      const grid = el("div", "bag-grid");
      grid.style.setProperty("--cols", state.bag.cols);
      grid.style.setProperty("--rows", state.bag.rows);
      for (let y = 0; y < state.bag.rows; y++) {
        for (let x = 0; x < state.bag.cols; x++) {
          const cell = el("div", "bag-cell");
          cell.dataset.x = x;
          cell.dataset.y = y;
          if (!m.readOnly) cell.addEventListener("click", () => { if (bagSelected != null && !bagDrag) dropAt(m, bagSelected, x, y); });
          grid.append(cell);
        }
      }
      for (const item of state.inventory) if (item.pos) grid.append(bagTile(m, item, item.uid));

      const side = el("div", "bag-side");
      if (m.incoming && !m.readOnly) {
        const box = el("div", "bag-incoming");
        box.append(el("small", "", "전리품"), bagTile(m, m.incoming, "incoming"));
        side.append(box);
      }
      const column = el("div", "bag-side-col");
      if (m.readOnly) {
        const note = el("div", "bag-readonly-note");
        note.append(uiIcon("eye"), el("strong", "", "현재 소지품"), el("p", "", "아이템에 마우스를 올리면 제공 카드와 크기를 확인할 수 있습니다."));
        column.append(note);
      } else {
        const trash = el("div", "bag-trash");
        trash.append(uiIcon("discard"), el("span", "", "버리기"));
        trash.addEventListener("click", () => { if (bagSelected != null && !bagDrag) discardRef(m, bagSelected); });
        column.append(trash, bagDetail(m));
      }
      side.append(column);

      wrap.append(hands, grid, side);
      return wrap;
    }

    function bagDetail(m) {
      const panel = el("div", "bag-detail");
      const ref = bagSelected;
      const item = ref == null ? null : bagItemOf(m, ref);
      if (!item) {
        panel.append(el("p", "bag-hint", "끌어서 옮기기 · R 회전"));
        return panel;
      }
      const data = itemDef(item.key);
      panel.append(el("strong", "", rules.itemLabel(item)));
      if (data.cards.length) panel.append(el("p", "", data.cards.map((key) => CARDS[key].name + (item.upgraded ? "+" : "")).join(" · ")));
      const row = el("div", "row");
      if (data.kind === "hand" && rules.canEquip(state)) {
        const slots = data.hands === 2 ? [["left", "양손 장착"]] : [["left", "왼손 장착"], ["right", "오른손 장착"]];
        for (const [slot, label] of slots) {
          const node = button(label, () => equipRef(m, ref, slot));
          const already = ref !== "incoming" && rules.isEquipped(state, item.uid) && (data.hands === 2 || state.equipment[slot] === item.uid);
          const reason = ref === "incoming" ? null : rules.equipBlockReason(state, item.uid, slot);
          node.disabled = already || Boolean(reason);
          if (reason) node.title = reason;
          row.append(node);
        }
      }
      const size = rules.itemSize(item, 0);
      if (size.w !== size.h && (item.pos || ref === "incoming")) row.append(button("회전 · R", () => rotateBag()));
      const recovery = preparationRecoveryInfo(item);
      if (recovery && !m.combatDone && !m.readOnly && ref !== "incoming") {
        const effects = [recovery.heal ? `체력 +${recovery.heal}` : null, recovery.cure ? `감염 −${recovery.cure}` : null].filter(Boolean).join(" · ");
        const use = button(`1회 사용 · ${effects}`, () => { preparationRecovery(item); renderModal(); });
        const noArms = !rules.hasWorkingArm(state);
        use.disabled = noArms || !recovery.useful;
        if (noArms) use.title = "사용할 수 있는 팔이 없습니다.";
        else if (!recovery.useful) use.title = "회복하거나 줄일 수 있는 상태가 없습니다.";
        row.append(use);
      }
      row.append(button("버리기", () => discardRef(m, ref)));
      panel.append(row);
      return panel;
    }

    function dropAt(m, ref, x, y, rot = null) {
      const item = bagItemOf(m, ref);
      if (!item) return;
      const r = rot ?? (ref === "incoming" ? m.incomingRot || 0 : item.pos?.rot || 0);
      const events = [];
      let ok;
      if (ref === "incoming") {
        ok = rules.addLoot(state, item, events, { x, y, rot: r });
        if (ok) { m.incoming = null; bagSelected = item.uid; }
      } else {
        ok = rules.placeItem(state, item.uid, x, y, r, events);
      }
      if (!ok) { notify("거기엔 놓을 수 없다."); renderModal(); return; }
      present(events);
      Sound.play("inventoryMove");
      renderModal();
    }

    function equipRef(m, ref, slot) {
      const item = bagItemOf(m, ref);
      if (!item) return;
      const events = [];
      if (ref === "incoming") {
        if (!rules.takeLootToHand(state, item, slot, events)) { notify(rules.equipBlockReason(state, item.uid, slot) || "들 수 없다."); renderModal(); return; }
        m.incoming = null;
        bagSelected = item.uid;
      } else {
        const reason = rules.equipBlockReason(state, item.uid, slot);
        if (reason) { notify(reason); renderModal(); return; }
        rules.equip(state, item.uid, slot, events);
      }
      present(events);
      Sound.play("inventoryMove");
      renderModal();
    }

    function discardRef(m, ref) {
      const item = bagItemOf(m, ref);
      if (!item) return;
      const events = [];
      if (ref === "incoming") { rules.dropLoot(state, item, events); m.incoming = null; }
      else rules.discardItem(state, item.uid, events);
      bagSelected = null;
      present(events);
      Sound.play("inventoryMove");
      renderModal();
    }

    function dropIncoming(m) {
      if (!m?.incoming) return;
      present(rules.dropLoot(state, m.incoming));
      m.incoming = null;
    }

    function rotateBag() {
      const m = modal;
      if (bagDrag) {
        bagDrag.rot ^= 1;
        [bagDrag.grabDx, bagDrag.grabDy] = [bagDrag.grabDy, bagDrag.grabDx];
        refreshGhost(bagDrag);
        return;
      }
      if (!m || bagSelected == null) return;
      const item = bagItemOf(m, bagSelected);
      if (!item) return;
      if (bagSelected === "incoming") { m.incomingRot = (m.incomingRot || 0) ^ 1; renderModal(); return; }
      if (!item.pos) return;
      const rot = item.pos.rot ^ 1;
      if (!rules.canPlace(state, item, item.pos.x, item.pos.y, rot)) { notify("여기서는 돌릴 수 없다."); return; }
      rules.placeItem(state, item.uid, item.pos.x, item.pos.y, rot);
      renderModal();
    }

    function beginBagDrag(event, m, ref) {
      if (event.button !== 0 || bagDrag) return;
      const item = bagItemOf(m, ref);
      if (!item) return;
      event.preventDefault();
      hideTooltip();
      const tile = event.currentTarget;
      const rect = tile.getBoundingClientRect();
      const { step } = bagMetrics();
      const rot = ref === "incoming" ? m.incomingRot || 0 : item.pos?.rot || 0;
      const size = rules.itemSize(item, rot);
      bagDrag = {
        m, ref, item, rot, moved: false, ghost: null,
        startX: event.clientX, startY: event.clientY,
        grabDx: clamp(Math.floor((event.clientX - rect.left) / step), 0, size.w - 1),
        grabDy: clamp(Math.floor((event.clientY - rect.top) / step), 0, size.h - 1)
      };
      const move = (e) => {
        const d = bagDrag;
        if (!d) return;
        if (!d.moved) {
          if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 5) return;
          d.moved = true;
          document.body.classList.add("bag-dragging");
          refreshGhost(d);
        }
        d.x = e.clientX;
        d.y = e.clientY;
        positionGhost(d);
        highlightDrop(d);
      };
      const up = (e) => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", up);
        const d = bagDrag;
        bagDrag = null;
        if (!d) return;
        d.ghost?.remove();
        document.body.classList.remove("bag-dragging");
        clearDropMarks();
        if (!d.moved) {
          bagSelected = bagSelected === d.ref ? null : d.ref;
          renderModal();
          return;
        }
        if (d.ref === "incoming") d.m.incomingRot = d.rot;
        const target = dropTargetAt(d, e.clientX, e.clientY);
        if (!target) { renderModal(); return; }
        if (target.kind === "cell") dropAt(d.m, d.ref, target.x, target.y, d.rot);
        else if (target.kind === "hand") equipRef(d.m, d.ref, target.slot);
        else discardRef(d.m, d.ref);
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", up);
    }

    function refreshGhost(d) {
      if (!d.moved) return;
      d.ghost?.remove();
      const ghost = bagTile(d.m, d.item, "__ghost__", d.rot);
      ghost.classList.add("bag-ghost");
      ghost.style.removeProperty("--x");
      ghost.style.removeProperty("--y");
      document.body.append(ghost);
      d.ghost = ghost;
      positionGhost(d);
      highlightDrop(d);
    }

    function positionGhost(d) {
      if (!d.ghost || d.x == null) return;
      const { step } = bagMetrics();
      d.ghost.style.left = `${d.x - d.grabDx * step - step / 2}px`;
      d.ghost.style.top = `${d.y - d.grabDy * step - step / 2}px`;
    }

    function dropTargetAt(d, x, y) {
      const under = document.elementFromPoint(x, y);
      const hit = under?.closest(".bag-grid, .bag-hand, .bag-trash");
      if (!hit) return null;
      if (hit.classList.contains("bag-trash")) return { kind: "trash" };
      if (hit.classList.contains("bag-hand")) return { kind: "hand", slot: hit.dataset.slot };
      const { cell, gap, step } = bagMetrics();
      const rect = hit.getBoundingClientRect();
      const cx = Math.floor((x - rect.left - gap) / step) - d.grabDx;
      const cy = Math.floor((y - rect.top - gap) / step) - d.grabDy;
      void cell;
      return { kind: "cell", x: cx, y: cy };
    }

    function clearDropMarks() {
      for (const node of document.querySelectorAll(".drop-ok, .drop-bad")) node.classList.remove("drop-ok", "drop-bad");
    }

    function highlightDrop(d) {
      clearDropMarks();
      if (d.x == null) return;
      const target = dropTargetAt(d, d.x, d.y);
      if (!target) return;
      if (target.kind === "trash") { document.querySelector(".bag-trash")?.classList.add("drop-ok"); return; }
      if (target.kind === "hand") {
        const slot = document.querySelector(`.bag-hand[data-slot="${target.slot}"]`);
        const data = itemDef(d.item.key);
        const ok = data.kind === "hand" && rules.canEquip(state) && (d.ref === "incoming" || !rules.equipBlockReason(state, d.item.uid, target.slot));
        slot?.classList.add(ok ? "drop-ok" : "drop-bad");
        return;
      }
      const ok = d.ref === "incoming"
        ? rules.canPlace(state, d.item, target.x, target.y, d.rot)
        : rules.canPlace(state, d.item, target.x, target.y, d.rot);
      const size = rules.itemSize(d.item, d.rot);
      for (let dy = 0; dy < size.h; dy++) {
        for (let dx = 0; dx < size.w; dx++) {
          document.querySelector(`.bag-cell[data-x="${target.x + dx}"][data-y="${target.y + dy}"]`)?.classList.add(ok ? "drop-ok" : "drop-bad");
        }
      }
    }

    function showInventory(continueAction = null, backAction = null, combatDone = null, incoming = null, noReturn = false, readOnly = false) {
      bagSelected = incoming ? "incoming" : null;
      bagDrag = null;
      openModal({
        type: "inventory",
        title: readOnly ? "현재 장비와 물자" : combatDone ? "개인 정비" : "장비와 물자",
        subtitle: readOnly ? "COMBAT INVENTORY" : combatDone ? "IN COMBAT" : "PREPARATION",
        continue: typeof continueAction === "function" ? continueAction : null,
        back: typeof backAction === "function" ? backAction : null,
        // 전투 중 장비 교체: 닫으면 카드 실행이 이어진다.
        combatDone: typeof combatDone === "function" ? combatDone : null,
        // 가방에 자리가 없어 아직 못 넣은 전리품. 놓거나 손에 들거나 버려야 한다.
        incoming: incoming || null,
        incomingRot: 0,
        // 경로를 이미 골랐다: 되돌아갈 곳이 없다.
        noReturn,
        readOnly
      });
    }

    function showCombatInventory() {
      if (ready()) showInventory(null, null, null, null, false, true);
    }

    // Esc는 항상 직전 준비 화면으로 돌아간다. 다음 구역 이동은 버튼으로만 실행한다.
    function inventoryBack() {
      if (modal?.type !== "inventory" || modal.noReturn) return;
      if (modal.readOnly) { closeModal(); return; }
      dropIncoming(modal);
      if (modal.combatDone) { const done = modal.combatDone; closeModal(); done(); }
      else if (modal.back) modal.back();
      else chooseRoute();
    }

    // 정비소 선택: 장비는 단독 선택, 스킬은 최대 skillUpgradeCount장. 다시 누르면 해제, 넘치면 가장 오래된 것부터 뺀다.
    function nextUpgradeSelection(ids, card, isItem) {
      if (isItem) return ids.length === 1 && ids[0] === card.id ? [] : [card.id];
      const skills = ids.filter((id) => state.deck.some((c) => c.id === id && c.sourceItem == null));
      if (skills.includes(card.id)) return skills.filter((id) => id !== card.id);
      return [...skills, card.id].slice(-rules.skillUpgradeCount(state));
    }

    function showAcquisition(card, next, title = "카드 획득", added = true) {
      Sound.play("gatherCards");
      openModal({
        type: "acquisition",
        title,
        subtitle: added ? "SUPPLY ACQUIRED" : "FIELD WORKSHOP",
        card,
        added,
        continue: next
      });
    }

    function nextStage() {
      rules.nextStage(state);
      closeModal();
      startBattle();
    }

    // 전투 사이 행동을 끝낸 뒤에는 예외 없이 장비·물자를 다시 정리하고 다음 전투로 간다.
    function prepareNextBattle() {
      showInventory(nextStage, null, null, null, true);
    }

    function chooseRoute() {
      openModal({
        type: "route",
        title: "벽 뒤의 발소리가 멎었다",
        subtitle: "CHOOSE YOUR PATH",
        options: [
          {
            title: "은신처",
            art: "/assets/art/route-shelter-v1.webp",
            tone: "shelter",
            text: "체력 15 회복 · 감염 2 감소.\n사지 부상 1곳 치료.",
            action: () => {
              const injured = rules.shelter(state);
              Sound.play("heal");

              if (!injured.length) {
                prepareNextBattle();
                return;
              }

              openModal({
                type: "options",
                title: "어디부터 묶을 것인가",
                description: "치료할 사지를 선택하세요.",
                options: injured.map((limb) => ({
                  title: limb.name,
                  text: limb.type === "arm" ? "공격 피해 감소 제거." : "턴 시작 드로우 감소 제거.",
                  action: () => {
                    present(rules.healLimb(state, limb.key));
                    // 팔이 돌아오면 다시 들 수 있으니 장비부터 정리하게 한다.
                    prepareNextBattle();
                  }
                }))
              });
            }
          },
          {
            title: "정비소",
            art: "/assets/art/route-workshop-v1.webp",
            tone: "workshop",
            text: "카드 1장 영구 강화.",
            disabled: !rules.canUpgradeAny(state),
            action: () => openModal({
              type: "upgrade",
              title: "금속은 아직 말을 듣는다",
              subtitle: "FIELD WORKSHOP",
              description: "장비 하나를 강화하거나, 장비에 속하지 않은 스킬을 묶어서 강화합니다. 후보마다 강화 결과가 바로 표시됩니다."
            })
          },
          {
            title: "낯선 생존자",
            art: "/assets/art/route-stranger-v1.webp",
            tone: "stranger",
            text: "스킬 카드 3장 중 1장 획득.\n장비 없이 덱에 영구 추가.",
            action: offerSkill
          },
          {
            title: "군수 창고 · 동전",
            art: "/assets/art/route-armory-v1.webp",
            tone: "armory",
            text: "성공: 장비·탄약 선택\n실패: 체력 −6",
            disabled: !rules.canSearchWarehouse(state),
            action: searchWarehouse
          }
        ]
      });
    }

    // 낯선 생존자: 장비에 묶이지 않은 스킬 카드를 하나 고른다.
    function offerSkill() {
      openModal({
        type: "skillPick",
        title: "누군가 먼저 다녀갔다",
        subtitle: "STRANGER'S CACHE",
        description: "하나만 가져갈 수 있다.",
        cards: rules.rollSkills(state),
        next: prepareNextBattle
      });
    }

    async function searchWarehouse() {
      const won = await requestCoin({
        title: "문고리 안쪽의 동전",
        description: "창고로 들어서자 문이 닫혔습니다.",
        success: "장비·탄약 확보.",
        failure: "체력 6 손실."
      });

      if (won) {
        openModal({
          type: "loot",
          title: "군수 창고",
          subtitle: "ARMORY CACHE",
          items: rules.rollArmory(state),
          afterAction: true
        });
      } else {
        present(rules.warehouseFail(state));
        openModal({
          type: "options",
          title: "빈손으로 돌아왔다",
          subtitle: "WAREHOUSE SEARCH",
          description: `체력 6 손실 · 남은 체력 ${state.hp}/${state.maxHp}`,
          options: [
            { title: "재정비", text: "장비와 물자를 정리한 뒤 이동합니다.", action: prepareNextBattle }
          ]
        });
      }
    }

    function showDeck() {
      if (!ready()) return;
      openModal({
        type: "deck",
        title: `생존 덱 / ${state.deck.length}장`,
        closable: true
      });
    }

    function showCombatPile(kind) {
      const cards = kind === "draw" ? state.draw : kind === "exhausted" ? state.exhausted : state.discard;
      openModal({
        type: "deck",
        title: `${kind === "draw" ? "뽑기 더미" : kind === "exhausted" ? "소멸 더미" : "버림 더미"} / ${cards.length}장`,
        cards,
        closable: true
      });
    }

    function showCodex() {
      if (ready()) openModal({ type: "codex", title: "생존 물자 도감", subtitle: "FIELD ARCHIVE", closable: true });
    }

    function showBody() {
      if (!ready()) return;
      openModal({
        type: "body",
        title: "아직 당신의 몸이다",
        description: `공격 피해 −${injuredCount("arm") * 2} · 턴 시작 드로우 ${5 - injuredCount("leg")}장`,
        closable: true
      });
    }

    function showHelp() {
      if (ready()) openModal({ type: "help", title: "조작과 생존 규칙", closable: true });
    }

    function showLog() {
      if (ready()) openModal({ type: "log", title: "생존 기록", closable: true });
    }

    function showSettings() {
      if (ready()) openModal({ type: "settings", title: "소리·연출", closable: true });
    }

    function syncMotion() {
      document.body.classList.toggle("low-motion", !motionOn());
      if (!motionOn()) {
        shake = 0;
        heroRecoil = 0;
      }
    }

    function hideTooltip() {
      $("tooltip").hidden = true;
    }

    function tooltip(title, text, anchor) {
      if (modal) return;
      const root = $("tooltip");
      root.className = "tooltip";
      root.replaceChildren(...(title ? [el("strong", "", title)] : []), el("div", "", text));
      root.hidden = false;
      root.style.left = "8px";
      root.style.top = "8px";
      const rect = anchor.getBoundingClientRect();
      const box = root.getBoundingClientRect();
      let top = rect.top - box.height - 8;
      if (top < 8) top = rect.bottom + 8;
      root.style.left = `${clamp(rect.left + rect.width / 2 - box.width / 2, 8, Math.max(8, innerWidth - box.width - 8))}px`;
      root.style.top = `${clamp(top, 8, Math.max(8, innerHeight - box.height - 8))}px`;
    }

    function bindTip(node, title, text) {
      node.addEventListener("pointerenter", () => {
        if (finePointer.matches) tooltip(title, text, node);
      });
      node.addEventListener("pointerleave", hideTooltip);
      node.addEventListener("focus", () => {
        if (node.matches(":focus-visible")) tooltip(title, text, node);
      });
      node.addEventListener("blur", hideTooltip);
    }

    function bindDynamicTip(node, title, text) {
      node.dataset.tipTitle = title;
      node.dataset.tipText = text;
      if (node.dataset.tipBound) return;
      node.dataset.tipBound = "true";
      node.addEventListener("pointerenter", () => {
        if (finePointer.matches) tooltip(node.dataset.tipTitle, node.dataset.tipText, node);
      });
      node.addEventListener("pointerleave", hideTooltip);
      node.addEventListener("focus", () => {
        if (node.matches(":focus-visible")) tooltip(node.dataset.tipTitle, node.dataset.tipText, node);
      });
      node.addEventListener("blur", hideTooltip);
    }

    function itemCardTooltip(item, anchor) {
      const root = $("tooltip");
      root.className = "tooltip item-preview-tooltip";
      root.replaceChildren();
      const shape = itemShape(item);
      const meta = el("div", "item-preview-meta");
      const grip = item.kind === "hand" ? `${item.hands === 2 ? "양손" : "한손"} 장비` : item.kind === "consumable" ? `소모품 · ${item.uses}회` : "자원";
      const shapeGrid = el("span", "item-shape-grid");
      shapeGrid.setAttribute("aria-label", `가방 ${shape.w}×${shape.h}칸`);
      for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
        shapeGrid.append(el("i", x < shape.w && y < shape.h ? "occupied" : ""));
      }
      const metaCopy = el("span", "item-preview-meta-copy");
      metaCopy.append(el("strong", "item-preview-kind", grip), el("small", "", `가방 ${shape.w}×${shape.h}칸`));
      meta.append(shapeGrid, metaCopy);
      root.append(meta);
      const rail = el("div", "item-preview-cards");
      const counts = new Map();
      for (const key of item.cards) counts.set(key, (counts.get(key) || 0) + 1);
      for (const [key, count] of counts) {
        const data = CARDS[key];
        const card = el("article", `item-preview-card rarity-${data.rarity}`);
        appendArt(card, key);
        card.append(el("strong", "", `${data.name}${count > 1 ? ` ×${count}` : ""} · ${data.cost} AP`), el("p", "", summary({ key, upgraded: false })));
        rail.append(card);
      }
      if (rail.childElementCount) root.append(rail);
      root.hidden = false;
      root.style.left = "8px";
      root.style.top = "8px";
      const rect = anchor.getBoundingClientRect();
      const box = root.getBoundingClientRect();
      let top = rect.top - box.height - 10;
      if (top < 8) top = rect.bottom + 10;
      root.style.left = `${clamp(rect.left + rect.width / 2 - box.width / 2, 8, Math.max(8, innerWidth - box.width - 8))}px`;
      root.style.top = `${clamp(top, 8, Math.max(8, innerHeight - box.height - 8))}px`;
    }

    function bindItemCardTooltip(node, item) {
      node.addEventListener("pointerenter", () => { if (finePointer.matches) itemCardTooltip(item, node); });
      node.addEventListener("pointerleave", hideTooltip);
      node.addEventListener("focus", () => itemCardTooltip(item, node));
      node.addEventListener("blur", hideTooltip);
    }

    function upgradeItemTooltip(item, anchor) {
      const root = $("tooltip");
      root.className = "tooltip item-preview-tooltip upgrade-item-tooltip";
      root.replaceChildren();
      const heading = el("div", "upgrade-tooltip-heading");
      heading.append(
        el("span", "upgrade-kind", "장비 강화"),
        el("strong", "", item.name),
        el("small", "", `${item.hands === 2 ? "양손" : "한손"} 장비 · 카드 ${item.cards.length}장 동시 강화`)
      );
      root.append(heading);
      const rail = el("div", "upgrade-tooltip-cards");
      for (const key of item.cards) {
        const data = CARDS[key];
        const card = el("article", `upgrade-tooltip-card rarity-${data.rarity}`);
        appendArt(card, key);
        const copy = el("div", "upgrade-tooltip-copy");
        copy.append(
          el("strong", "", `${data.name} · ${data.cost} AP`),
          el("span", "before", summary({ key, upgraded: false }, false)),
          el("b", "upgrade-arrow", "→"),
          el("span", "after", summary({ key, upgraded: true }, false))
        );
        card.append(copy);
        rail.append(card);
      }
      root.append(rail);
      root.hidden = false;
      root.style.left = "8px";
      root.style.top = "8px";
      const rect = anchor.getBoundingClientRect();
      const box = root.getBoundingClientRect();
      let top = rect.top - box.height - 10;
      if (top < 8) top = rect.bottom + 10;
      root.style.left = `${clamp(rect.left + rect.width / 2 - box.width / 2, 8, Math.max(8, innerWidth - box.width - 8))}px`;
      root.style.top = `${clamp(top, 8, Math.max(8, innerHeight - box.height - 8))}px`;
    }

    function bindUpgradeItemTooltip(node, item) {
      node.addEventListener("pointerenter", () => { if (finePointer.matches) upgradeItemTooltip(item, node); });
      node.addEventListener("pointerleave", hideTooltip);
    }

    function summary(card, includeTemporaryStrength = ["combat", "playing", "resolving"].includes(state?.phase)) {
      const data = CARDS[card.key];
      const u = card.upgraded;
      const shownDamage = data.damage
        ? includeTemporaryStrength
          ? attackDamage(card)
          : Math.max(0, data.damage(u) + attackBonus() - (state.strength || 0))
        : 0;
      const gambleLines = [];
      if (data.gamble) {
        const resolveEffect = (value) => typeof value === "function" ? value(u) : value || {};
        const win = effectSummary(resolveEffect(data.gamble.win));
        const lose = effectSummary(resolveEffect(data.gamble.lose));
        if (data.gamble.before) gambleLines.push("동전 성공 시 발동 · 실패 시 불발");
        else {
          if (win) gambleLines.push(`동전 성공: ${win}`);
          if (lose) gambleLines.push(`동전 실패: ${lose}`);
        }
      }

      if (data.type === "attack") {
        const details = [];
        if (data.burn) details.push(`화상 ${data.burn(u)}`);
        if (data.block) details.push(`방어도 +${data.block(u) + rules.blockBonus(state)}`);
        if (data.heal) details.push(`체력 +${data.heal(u)}`);
        if (data.stagger) details.push("경직");
        if (data.limbBonus) details.push(`사지 +${data.limbBonus(u)}`);
        const extra = details.length ? ` · ${details.join(" · ")}` : card.key === "axe" ? "\n처치 시 행동력 +1" : "";
        const hits = hitCount(card);
        const prefix = data.delayed ? "예약 · " : "";
        const costs = [];
        if (data.noise) costs.push(`소음 +${data.noise}`);
        if (data.ammo) costs.push(`탄약 −${data.ammo} (${ammoCount()}발)`);
        if (data.exhaust) costs.push("소멸");
        const main = data.damage
          ? `${prefix}${data.target === "all" ? "모든 적 " : ""}피해 ${shownDamage}${hits > 1 ? `×${hits}` : ""}${extra}`
          : `${prefix}${data.target === "all" ? "모든 적 " : ""}${details.join(" · ")}`;
        return [main, ...gambleLines, costs.join(" · ")].filter(Boolean).join("\n");
      }
      return [skillSummary(card), ...gambleLines].filter(Boolean).join("\n");
    }

    function aimText(card) {
      const data = CARDS[card.key];
      if (state.energy < rules.cardCost(card)) return `행동력 부족 · 필요 ${rules.cardCost(card)}`;
      if (data.target === "self") return "전투 화면을 클릭하면 사용.";
      if (data.target === "all") return "전투 화면을 클릭하면 전체 공격.";

      const enemy = state.enemies.find((e) => e.id === (hoverAim?.enemyId ?? state.target));
      if (!enemy) return "몸통 또는 사지를 선택하세요.";
      const limb = enemy.parts.find((p) => p.key === hoverAim?.partKey && p.hp > 0);
      const damage = attackDamage(card, limb ? limb.key : null) * hitCount(card);

      const when = data.delayed ? "다음 턴 시작에 " : "";
      if (limb) {
        return `${enemy.name} / ${limb.name}\n${when}내구도 ${limb.hp} → ${Math.max(0, limb.hp - damage)}${limb.hp <= damage ? " · 파괴" : ""}\n몸통 체력 ${enemy.hp} 유지\n파괴: ${limb.effect}`;
      }

      return `${enemy.name} / 몸통\n${when}체력 ${enemy.hp} → ${Math.max(0, enemy.hp - damage)}${enemy.hp <= damage ? " · 처치" : ""}`;
    }

    function updatePreview() {
      if (!state) return;
      const selected = selectedCard();
      const card = selected || state.hand.find((c) => c.id === hoverCard);
      const root = $("preview");
      // The hand card itself lifts and reveals its full effect text.
      if (card && document.querySelector(`[data-focus="card-${card.id}"]`)) {
        root.hidden = true;
        return;
      }

      if (!card || modal || state.phase !== "combat") {
        root.hidden = true;
        return;
      }

      const data = CARDS[card.key];
      root.replaceChildren();
      appendArt(root, card.key);
      const content = el("div", "content");
      content.append(
        el("div", "eyebrow", `${rules.cardCost(card)} AP / ${data.target === "self" ? "즉시 사용" : "대상 선택"}`),
        el("h3", "", data.name + (card.upgraded ? "+" : "")),
        el("p", "", summary(card)),
        el("p", "instruction", selected ? aimText(card) : data.target === "self" ? "카드 선택 후 전투 화면을 클릭." : "카드 선택 후 대상을 클릭.")
      );

      if (data.noise && state.noise + data.noise >= 6) {
        content.append(el("p", "instruction", `사용 후 소음 ${state.noise + data.noise} · 증원 주의`));
      }

      root.append(content);
      root.hidden = false;
      const anchor = document.querySelector(`[data-focus="card-${card.id}"]`);
      const scene = $("scene").getBoundingClientRect();
      const box = root.getBoundingClientRect();
      const rect = anchor?.getBoundingClientRect();
      const center = rect ? rect.left + rect.width / 2 : scene.left + scene.width / 2;
      root.style.left = `${clamp(center - box.width / 2, 8, Math.max(8, innerWidth - box.width - 8))}px`;
      root.style.top = `${Math.max(8, (rect?.top ?? scene.bottom) - box.height - 10)}px`;
    }

    function render() {
      const focusKey = document.activeElement?.dataset.focus;
      const selected = selectedCard();
      const data = selected ? CARDS[selected.key] : null;
      const combat = state.phase === "combat";

      $("location").textContent = STAGES[state.stage].name;
      const phaseText = combat
        ? selected ? (data.target === "self" ? "사용 위치 선택" : "공격 대상 선택") : "내 행동"
        : state.phase === "resolving" ? "적 행동 중" : state.phase === "playing" ? "카드 사용 중" : "전투 종료";
      $("phase").replaceChildren(
        el("span", "turn-count", `TURN ${String(state.turn).padStart(2, "0")}`),
        el("strong", "turn-state", phaseText)
      );
      $("selectionLabel").textContent = selected
        ? `${data.name} — ${data.target === "self" || data.target === "all" ? "전투 화면 클릭" : "대상 선택"}`
        : "";
      const piles = $("piles");
      piles.replaceChildren();
      const ammo = el("div", `hud-ammo${ammoCount() < 2 ? " danger" : ""}`);
      ammo.append(uiIcon("ammo"), el("strong", "", ammoCount()));
      ammo.setAttribute("aria-label", `탄약 ${ammoCount()}발`);
      bindTip(ammo, "공용 탄약", `총기 카드가 소모합니다. 현재 ${ammoCount()}발.`);
      ammo.tabIndex = 0;
      piles.append(ammo);
      const drawPile = $("drawPile");
      const exhaustPile = $("exhaustPile");
      const discardPile = $("discardPile");
      drawPile.replaceChildren(uiIcon("cards"), el("strong", "", state.draw.length));
      exhaustPile.replaceChildren(uiIcon("exhaust"), el("strong", "", state.exhausted.length));
      discardPile.replaceChildren(uiIcon("discard"), el("strong", "", state.discard.length));
      bindDynamicTip(drawPile, "뽑기 더미", `${state.draw.length}장 남음\n클릭해서 펼치기`);
      bindDynamicTip(exhaustPile, "소멸 더미", `${state.exhausted.length}장\n클릭해서 펼치기`);
      bindDynamicTip(discardPile, "버림 더미", `${state.discard.length}장\n클릭해서 펼치기`);

      for (const id of ["endTurn", "bodyButton", "inventoryButton", "deckButton", "codexButton", "helpButton", "settingsButton", "logButton", "heroButton"]) {
        $(id).disabled = !combat;
      }
      $("allTarget").hidden = true;
      $("allTarget").disabled = !combat;

      $("stats").replaceChildren();
      const vitals = el("div", "player-vitals");
      const health = button("", () => tooltip("체력", "0이 되면 탈출에 실패합니다.", health), `vital health${state.hp < 20 ? " danger" : ""}`);
      health.setAttribute("aria-label", `체력 ${state.hp} / ${state.maxHp}`);
      const healthTrack = el("span", "health-track");
      healthTrack.style.setProperty("--health", `${clamp(state.hp / state.maxHp * 100, 0, 100)}%`);
      health.append(uiIcon("heart"), el("strong", "", state.hp), el("small", "", `/ ${state.maxHp}`), healthTrack);
      bindTip(health, "체력", "0이 되면 탈출에 실패합니다.");
      const energy = button("", () => tooltip("행동력", `카드를 사용할 때 소비하며 매 턴 ${rules.BASE_ENERGY}으로 회복합니다.`, energy), "vital energy");
      energy.setAttribute("aria-label", `행동력 ${state.energy} / ${rules.BASE_ENERGY}`);
      const energyTrack = el("span", "health-track energy-track");
      energyTrack.style.setProperty("--health", `${clamp(state.energy / rules.BASE_ENERGY * 100, 0, 100)}%`);
      energy.append(uiIcon("energy"), el("strong", "", state.energy), el("small", "", `/ ${rules.BASE_ENERGY}`), energyTrack);
      bindTip(energy, "행동력", `카드를 사용할 때 소비하며 매 턴 ${rules.BASE_ENERGY}으로 회복합니다.`);
      vitals.append(health, energy);

      $("stats").append(vitals);

      $("targets").replaceChildren();
      $("statuses").replaceChildren();

      // 지속 상태는 대상별 한 줄에 같은 문법(그림 / 스택 / 툴팁)으로 표시한다.
      const statusToken = ({ kind, icon, title, value, label, tip, action }) => {
        const token = button("", () => action ? action() : tooltip(title, tip, token), `status-token status-${kind}`);
        token.append(uiIcon(icon));
        if (value != null && value !== "") token.append(el("b", "status-value", value));
        token.dataset.label = label || title;
        token.setAttribute("aria-label", `${label || title}${value != null && value !== "" ? ` ${value}` : ""}. ${tip}`);
        bindTip(token, title, tip);
        return token;
      };
      const heroStatusStack = el("div", "status-stack status-stack-hero");
      heroStatusStack.dataset.hero = "true";
      const pendingEffect = (entry) => {
        const info = CARDS[entry.key];
        const card = { key: entry.key, upgraded: entry.upgraded };
        const parts = [];
        if (info.damage) parts.push(`${info.target === "all" ? "전체 " : ""}피해 ${attackDamage(card, entry.partKey)}`);
        if (info.burn) parts.push(`화상 ${info.burn(entry.upgraded)}`);
        const fx = skillEffects(entry.key, entry.upgraded);
        if (fx.block) parts.push(`방어 ${fx.block + rules.blockBonus(state)}`);
        if (fx.heal) parts.push(`회복 ${fx.heal}`);
        if (fx.draw) parts.push(`드로우 ${fx.draw}`);
        return parts.join(" · ") || info.text(entry.upgraded, attackBonus()).split("\n")[0];
      };
      const playerStatuses = [];
      if (state.strength > 0) {
        playerStatuses.push(["strength", `공격 피해 +${state.strength}`, "힘", "이번 전투 동안 모든 직접 공격 피해가 증가합니다."]);
      }
      if (state.block > 0) {
        playerStatuses.push(["block", `방어도 ${state.block}`, "방어도", "적 공격 피해를 먼저 흡수합니다. 다음 내 턴 시작에 사라집니다."]);
      }
      if (injuredCount() > 0) {
        playerStatuses.push(["injury", `사지 훼손 ${injuredCount()}`, "사지 훼손", `훼손된 사지 ${injuredCount()}곳. 팔은 공격 피해를 낮추고 다리는 턴 시작 드로우를 줄입니다.`]);
      }
      if (state.noise > 0) {
        playerStatuses.push(["noise", `소음 ${state.noise}/6`, "소음", "턴 종료 시 6 이상이면 소음 6을 소비하고 증원 1마리가 합류합니다. 적은 최대 5마리입니다."]);
      }
      if (state.infection > 0) {
        const tick = rules.infectionTick(state);
        const fever = rules.hasFever(state);
        playerStatuses.push(["infection", `감염 ${state.infection}${fever ? " · 고열" : ""}`, fever ? "감염 · 고열" : "감염",
          `감염 ${rules.INFECTION_DIVISOR}마다 내 턴 시작에 체력 피해 1. 방어 무시.
현재: 다음 턴 피해 ${tick}.
감염 ${rules.FEVER_THRESHOLD} 이상이면 고열 · 턴 시작 행동력 −1${fever ? " (적용 중)" : ""}.
응급 처치·항생제·은신처로 줄일 수 있습니다.`]);
      }
      if (state.numb) {
        playerStatuses.push(["numb", "진통제 · 이번 턴 부상 무시", "진통제", "이번 턴 동안 팔 부상의 공격 −2가 사라지고, 팔 부상으로 잠긴 장비 카드를 쓸 수 있습니다. 턴이 끝나면 해제."]);
      }
      if (state.drawPenalty > 0) {
        playerStatuses.push(["grab", `붙잡힘 · 다음 턴 드로우 −${state.drawPenalty}`, "붙잡힘", "다음 턴 시작 드로우가 줄어듭니다. 그 턴이 끝나면 해제."]);
      } else if (state.grabbed > 0) {
        playerStatuses.push(["grab", `붙잡힘 · 이번 턴 드로우 −${state.grabbed}`, "붙잡힘", "붙잡힌 여파로 이번 턴 드로우가 줄었습니다. 턴이 끝나면 해제."]);
      }
      for (const entry of state.pending || []) {
        if (entry.targetId == null || CARDS[entry.key].target === "all") {
          const effect = pendingEffect(entry);
          playerStatuses.push(["pending", "예약", `예약 · ${CARDS[entry.key].name}${entry.upgraded ? "+" : ""}`, `${effect}\n다음 내 턴 시작에 발동합니다.`, effect.match(/\d+/)?.[0] || null]);
        }
      }
      playerStatuses.forEach(([kind, label, title, tip, pendingValue]) => {
        heroStatusStack.append(statusToken({
          kind: kind === "infection" && rules.hasFever(state) ? "fever" : kind,
          icon: `status-${kind}`,
          value: kind === "strength" ? `+${state.strength}` : kind === "block" ? state.block : kind === "injury" ? injuredCount() : kind === "noise" ? state.noise : kind === "infection" ? state.infection : kind === "grab" ? state.drawPenalty || state.grabbed : kind === "pending" ? pendingValue : null,
          label, title, tip,
          action: kind === "injury" ? showBody : null
        }));
      });
      if (heroStatusStack.childElementCount) $("statuses").append(heroStatusStack);

      for (const enemy of state.enemies) {
        const group = el("div", "enemy-group");
        const world = enemyPosition(enemy);
        const groupTop = Math.max(70, world.y - 230 * world.scale - 112);
        const enemyStatusStack = el("div", "status-stack status-stack-enemy");
        enemyStatusStack.dataset.enemy = enemy.id;

        if (enemy.block > 0) {
          enemyStatusStack.append(statusToken({
            kind: "block", icon: "status-block", value: enemy.block, label: "방어도",
            title: "방어도", tip: "받는 공격 피해를 먼저 흡수합니다."
          }));
        }

        if (enemy.strength > 0) {
          enemyStatusStack.append(statusToken({
            kind: "strength", icon: "status-strength", value: `+${enemy.strength}`, label: "힘",
            title: "힘", tip: "이 적의 모든 기본 공격 피해가 증가합니다."
          }));
        }

        for (const entry of (state.pending || []).filter((p) => p.targetId === enemy.id && CARDS[p.key].target === "single")) {
          const card = { key: entry.key, upgraded: entry.upgraded };
          const dmg = attackDamage(card, entry.partKey);
          enemyStatusStack.append(statusToken({
            kind: "pending", icon: "status-pending", value: dmg, label: "예약",
            title: `예약 · ${CARDS[entry.key].name}${entry.upgraded ? "+" : ""}`,
            tip: `다음 내 턴 시작에 이 적의 ${entry.partKey === "arm" ? "팔" : entry.partKey === "leg" ? "다리" : "몸통"}에 피해 ${dmg}. 대상이 죽으면 다른 적에게 옮겨갑니다.`
          }));
        }

        if (enemy.burn > 0) {
          enemyStatusStack.append(statusToken({ kind: "burn", icon: "status-burn", value: enemy.burn, label: "화상", title: "화상", tip: BURN_TEXT }));
        }

        if (enemy.parts.length) {
          const parts = el("div", "parts");

          for (const limb of enemy.parts) {
            const canAimLimb = Boolean(selected && data.target === "single");
            const aimedDamage = canAimLimb ? attackDamage(selected, limb.key) * hitCount(selected) : 0;
            const effectiveDamage = Math.max(0, aimedDamage - (enemy.block || 0));
            const afterHp = Math.max(0, limb.hp - effectiveDamage);
            const node = button(
              "",
              () => {
                if (selected && data.target === "single") onEnemyClick(enemy.id, limb.key);
                else tooltip(`${limb.name} ${limb.hp}/${limb.maxHp}`, `파괴: ${limb.effect}\n사지 피해는 몸통 체력을 깎지 않습니다.`, node);
              },
              `part-button${canAimLimb && limb.hp > 0 ? " aimable" : ""}`
            );
            node.setAttribute("aria-label", `${limb.name} ${limb.hp > 0 ? limb.hp : "파괴"}. ${limb.effect}`);
            const partCopy = el("span", "part-copy");
            const limbBar = el("span", "limb-hp-bar");
            const limbFill = el("i", "limb-hp-fill");
            limbFill.style.width = `${clamp(limb.hp / limb.maxHp * 100, 0, 100)}%`;
            const limbLoss = el("i", "limb-hp-loss");
            limbLoss.style.left = `${clamp(afterHp / limb.maxHp * 100, 0, 100)}%`;
            limbLoss.style.width = `${clamp((limb.hp - afterHp) / limb.maxHp * 100, 0, 100)}%`;
            limbBar.append(limbFill, limbLoss);
            partCopy.append(
              el("strong", "", limb.name),
              limbBar,
              el("small", "", canAimLimb ? `${limb.hp} → ${afterHp}` : `${limb.hp}/${limb.maxHp}`)
            );
            node.replaceChildren(uiIcon(limb.key === "arm" ? "arm" : "leg"), partCopy);
            const limbWorld = partPosition(enemy, limb);
            node.style.left = `calc(50% + ${limbWorld.x - world.x}px)`;
            node.style.top = `${limbWorld.y - groupTop}px`;
            node.disabled = !combat || limb.hp === 0;
            node.dataset.focus = `part-${enemy.id}-${limb.key}`;
            node.addEventListener("pointerenter", () => {
              node.classList.add("is-aimed");
              hoverAim = { enemyId: enemy.id, partKey: limb.key };
              if (selectedCard()) updatePreview();
              tooltip(
                `${limb.name} ${limb.hp}/${limb.maxHp}`,
                `파괴 시: ${limb.effect}`,
                node
              );
            });
            node.addEventListener("focus", () => {
              hoverAim = { enemyId: enemy.id, partKey: limb.key };
              updatePreview();
              tooltip(
                `${limb.name} ${limb.hp}/${limb.maxHp}`,
                `파괴 시: ${limb.effect}`,
                node
              );
            });
            node.addEventListener("pointerleave", () => {
              node.classList.remove("is-aimed");
              hoverAim = null;
              hideTooltip();
              updatePreview();
            });
            parts.append(node);
          }

          group.append(parts);
        }

        const target = button("", () => onEnemyClick(enemy.id), `target${selected ? " aimable" : ""}`);
        target.disabled = !combat;
        target.setAttribute("aria-label", `${enemy.name} · 체력 ${enemy.hp}/${enemy.maxHp} · ${rules.intentsHidden(state) ? "다음 행동 알 수 없음" : intentLabel(enemy)}`);
        target.dataset.focus = `enemy-${enemy.id}`;
        const hpFill = el("i", "enemy-hp-fill");
        hpFill.style.width = `${Math.max(0, enemy.hp / enemy.maxHp * 100)}%`;
        const hpBar = el("span", "enemy-hp-bar");
        hpBar.append(hpFill);
        const aimingLimb = selected && data.target === "single" && hoverAim?.enemyId === enemy.id && hoverAim.partKey;
        if (selected && data.damage && !aimingLimb) {
          const rawDamage = attackDamage(selected) * hitCount(selected);
          const effectiveDamage = Math.max(0, rawDamage - (enemy.block || 0));
          const afterHp = Math.max(0, enemy.hp - effectiveDamage);
          const hpLoss = el("i", "enemy-hp-loss");
          hpLoss.style.left = `${clamp(afterHp / enemy.maxHp * 100, 0, 100)}%`;
          hpLoss.style.width = `${clamp((enemy.hp - afterHp) / enemy.maxHp * 100, 0, 100)}%`;
          hpLoss.title = enemy.block > 0 ? `방어도 ${Math.min(enemy.block, rawDamage)} 흡수 · 체력 피해 ${effectiveDamage}` : `체력 피해 ${effectiveDamage}`;
          hpBar.append(hpLoss);
        }
        const hpReadout = el("span", "enemy-hp-readout");
        hpReadout.append(el("b", "", enemy.hp), document.createTextNode(` / ${enemy.maxHp}`));
        const intent = el("span", `enemy-intent${enemy.intent?.coin && !rules.intentsHidden(state) ? " lethal" : ""}`);
        let intentIcon;
        const intentType = rules.intentsHidden(state) && enemy.intent ? "hidden" : enemy.intent?.type;
        const intentSymbol = {
          hidden: "intent-hidden",
          attack: "intent-attack",
          guard: "intent-guard",
          buff: "intent-charge",
          regen: "intent-regen",
          charge: "intent-charge",
          scream: "intent-scream",
          stagger: "intent-stagger",
          summon: "intent-summon",
        }[intentType] || "intent-attack";
        intentIcon = uiIcon(intentSymbol);
        intentIcon.classList.add("intent-icon");
        if (intentType) intent.classList.add(`intent-${intentType}`);
        const intentValue = intentType === "hidden" ? "?"
          : intentType === "guard" ? enemy.intent.block
          : intentType === "stagger" ? ""
            : intentType === "scream" ? `+${enemy.intent.noise}`
            : intentType === "summon" ? "+1"
              : intentType === "regen" ? `+${enemy.intent.heal}`
              : intentType === "buff" ? `+${enemy.intent.strength}`
                : enemy.intent?.damage ? `${enemy.intent.damage}${enemy.intent.hits > 1 ? `×${enemy.intent.hits}` : ""}` : "…";
        const primaryIntent = el("span", "intent-token intent-primary");
        primaryIntent.append(intentIcon);
        if (intentValue) primaryIntent.append(el("b", "intent-value", intentValue));
        intent.append(primaryIntent);
        if (enemy.intent?.infection && !rules.intentsHidden(state)) {
          const infectionToken = el("span", "intent-token intent-infection-token");
          infectionToken.setAttribute("aria-label", `감염 ${enemy.intent.infection}`);
          infectionToken.append(uiIcon("intent-infection"), el("b", "intent-value", `+${enemy.intent.infection}`));
          intent.append(infectionToken);
        }
        if (enemy.intent?.grab && !rules.intentsHidden(state)) {
          const grabIcon = uiIcon("intent-grab");
          grabIcon.classList.add("intent-icon");
          const grabToken = el("span", "intent-token intent-grab-token");
          grabToken.append(grabIcon);
          intent.append(grabToken);
        }
        // 복합 의도(방어 + 힘 모으기): 방어 옆에 힘 모으기도 보인다.
        if (enemy.intent?.charge && !rules.intentsHidden(state)) {
          const chargeIcon = uiIcon("intent-charge");
          chargeIcon.classList.add("intent-icon");
          const chargeToken = el("span", "intent-token intent-charge-token");
          chargeToken.append(chargeIcon);
          intent.append(chargeToken);
        }
        if (enemy.intent?.coin && !rules.intentsHidden(state)) {
          const coinToken = el("span", "intent-token intent-coin-token");
          coinToken.setAttribute("aria-label", "동전 판정");
          coinToken.append(uiIcon("intent-coin"), el("b", "intent-value", "?"));
          intent.append(coinToken);
        }
        intent.title = rules.intentsHidden(state) ? "알 수 없음" : intentLabel(enemy);
        target.append(
          el("span", "enemy-name", enemy.name),
          hpBar,
          hpReadout,
          intent
        );
        target.addEventListener("pointerenter", () => {
          hoverAim = { enemyId: enemy.id, partKey: null };
          if (selectedCard()) updatePreview();
          else tooltip("", rules.intentsHidden(state) ? "다음 행동 알 수 없음" : intentLabel(enemy), target);
        });
        target.addEventListener("focus", () => {
          hoverAim = { enemyId: enemy.id, partKey: null };
          updatePreview();
        });
        target.addEventListener("pointerleave", () => {
          hoverAim = null;
          hideTooltip();
          updatePreview();
        });
        group.append(target);
        if (enemyStatusStack.childElementCount) group.append(enemyStatusStack);
        group.style.left = `${clamp(world.x, view.w <= 600 ? 48 : 78, view.w - (view.w <= 600 ? 48 : 78))}px`;
        group.style.top = `${groupTop}px`;
        group.style.setProperty("--enemy-name-top", `${world.y - groupTop + 8}px`);
        $("targets").append(group);
      }
      positionStatuses();

      const hand = $("hand");
      const scroll = hand.scrollLeft;
      hand.replaceChildren();
      hand.style.setProperty("--hand-count", Math.max(1, state.hand.length));
      hand.classList.toggle("has-selection", Boolean(selected));

      state.hand.forEach((card, index) => {
        const info = CARDS[card.key];
        const source = card.sourceItem ? sourceItem(card) : null;
        const sourceData = source ? itemDef(source.key) : null;
        const remainingUses = sourceData?.kind === "consumable" ? source.uses : null;
        const detailText = summary(card);
        const rarity = rarityOf(card);
        const injuryLock = cardLockReason(card);
        const fan = index - (state.hand.length - 1) / 2;
        const node = button("", () => selectCard(card.id), `card rarity-${rarity}${card.id === state.selected ? " selected" : ""}${state.energy < rules.cardCost(card) ? " unavailable" : ""}${injuryLock ? " limb-disabled" : ""}${dealtCards.has(card.id) ? " dealt" : ""}`);
        node.style.setProperty("--fan", fan);
        node.style.setProperty("--fan-abs", Math.abs(fan));
        node.disabled = !combat;
        if (injuryLock) node.setAttribute("aria-disabled", "true");
        node.dataset.focus = `card-${card.id}`;
        node.setAttribute("aria-pressed", String(card.id === state.selected));
        node.setAttribute("aria-label", `${index === 9 ? 0 : index + 1}번 ${info.name}. ${RARITIES[rarity].name}. 행동력 ${rules.cardCost(card)}.${remainingUses != null ? ` 사용 횟수 ${remainingUses}/${sourceData.uses}.` : ""} ${detailText} 선택 후 전투 화면에서 사용.`);
        appendArt(node, card.key);
        appendUpgradeMark(node, card.upgraded);
        const cardTitle = el("strong", "card-title", info.name + (card.upgraded ? "+" : ""));
        const body = el("div", "card-body");
        body.append(
          el("p", "card-summary sr-only", summary(card)),
          metricStrip(cardMetrics(info, card.upgraded, { damage: info.damage ? attackDamage(card) : 0, hits: hitCount(card), effects: skillEffects(card.key, card.upgraded), blockBonus: rules.blockBonus(state) })),
          card.sourceItem ? el("small", "item-source", source ? rules.itemName(source) : "소진") : el("small", "item-source", "스킬"),
          el("p", "card-detail", detailText)
        );
        if (injuryLock) body.append(el("span", "injury-lock", injuryLock));
        node.append(el("span", "cost", rules.cardCost(card)));
        if (remainingUses != null) {
          const uses = el("span", "uses-badge");
          uses.append(el("small", "", "사용"), el("strong", "", `${remainingUses}/${sourceData.uses}`));
          node.append(uses);
        }
        node.append(el("kbd", "shortcut", index === 9 ? "0" : index + 1), cardTitle, body);
        node.addEventListener("pointerenter", (event) => {
          if (event.pointerType === "touch") return;
          if (injuryLock) {
            tooltip("사용 불가", injuryLock, node);
            return;
          }
          if (selectedCard()) return;
          hoverCard = card.id;
          updatePreview();
        });
        node.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          event.stopPropagation();
          openModal({ type: "cardDetail", title: info.name, subtitle: "CARD DETAIL", card, closable: true });
        });
        node.addEventListener("pointerleave", () => {
          if (injuryLock) hideTooltip();
          if (!selectedCard()) {
            hoverCard = null;
            updatePreview();
          }
        });
        node.addEventListener("focus", () => {
          if (!selectedCard() && node.matches(":focus-visible")) {
            hoverCard = card.id;
            updatePreview();
          }
        });
        const slot = el("div", "hand-slot");
        slot.style.setProperty("--fan", fan);
        slot.append(node);
        hand.append(slot);
      });

      hand.scrollLeft = scroll;
      dealtCards.clear();
      if (focusKey) {
        document.querySelector(`[data-focus="${focusKey}"]`)?.focus({ preventScroll: true });
      }
      updatePreview();
    }

    function hitTest(x, y) {
      const selected = selectedCard();

      if (selected && CARDS[selected.key].target === "single") {
        for (const enemy of [...state.enemies].reverse()) {
          for (const part of enemy.parts.filter((p) => p.hp > 0)) {
            const p = partPosition(enemy, part);
            if (Math.hypot(x - p.x, y - p.y) <= p.radius + 4) {
              return { kind: "enemy", enemyId: enemy.id, partKey: part.key };
            }
          }
        }
      }

      for (const enemy of [...state.enemies].reverse()) {
        const p = enemyPosition(enemy);
        if (Math.abs(x - p.x) < Math.max(23, 44 * p.scale) && y > p.y - 205 * p.scale && y < p.y + 15) {
          return { kind: "enemy", enemyId: enemy.id, partKey: null };
        }
      }

      const g = geometry();
      if (Math.abs(x - g.heroX) < Math.max(24, 45 * g.scale) && y > g.ground - 190 * g.scale && y < g.ground + 15) {
        return { kind: "self" };
      }
      return null;
    }

    canvas.addEventListener("pointermove", (event) => {
      if (!ready() || !selectedCard()) return;
      const rect = canvas.getBoundingClientRect();
      const hit = hitTest(event.clientX - rect.left, event.clientY - rect.top);
      const next = hit?.kind === "enemy" ? hit : null;
      if (hoverAim?.enemyId !== next?.enemyId || hoverAim?.partKey !== next?.partKey) {
        hoverAim = next;
        updatePreview();
      }
      canvas.style.cursor = next ? "crosshair" : "default";
    });

    canvas.addEventListener("pointerleave", () => {
      hoverAim = null;
      canvas.style.cursor = "default";
      updatePreview();
    });

    canvas.addEventListener("click", (event) => {
      if (!ready()) return;
      const selected = selectedCard();
      if (selected && CARDS[selected.key].target === "all") {
        executeCard("all");
        return;
      }
      if (selected && CARDS[selected.key].target === "self") {
        executeCard("self");
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const hit = hitTest(event.clientX - rect.left, event.clientY - rect.top);
      if (hit?.kind === "enemy") onEnemyClick(hit.enemyId, hit.partKey);
    });

    function digitIndex(event) {
      const match = event.code.match(/^(?:Digit|Numpad)(\d)$/);
      return match ? match[1] === "0" ? 9 : Number(match[1]) - 1 : -1;
    }

    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
      if (event.target?.matches?.("input, textarea, select, [contenteditable='true']")) return;

      if (event.code === "KeyM" && !event.repeat) {
        event.preventDefault();
        settings.muted = !settings.muted;
        Sound.updateVolume();
        Music.updateVolume();
        saveSettings();
        notify(settings.muted ? "음소거." : "소리 켜짐.");
        if (modal?.type === "settings") renderModal();
        return;
      }

      const digit = digitIndex(event);
      const recognized = digit >= 0 || [
        "Space", "Escape", "KeyD", "KeyB", "KeyI", "KeyC", "KeyH", "KeyL",
        "KeyO"
      ].includes(event.code);

      if (recognized) event.preventDefault();
      if (event.repeat) return;

      if (modal) {
        if (modal.type === "inventory" && event.code === "KeyR") {
          rotateBag();
          return;
        }
        if (modal.type === "codex" && event.code === "KeyC") {
          closeModal();
          return;
        }
        if (modal.type === "coin") {
          if (event.code === "Space") finishCoin();
          return;
        }

        if (modal.type === "acquisition" && event.code === "Space") {
          modal.continue();
          return;
        }

        if (event.code === "Escape") {
          if (modal.type === "deck" && modal.backToInventory) modal.backToInventory();
          else if (modal.type === "inventory") inventoryBack();
          else if (modal.closable) closeModal();
          else if (modal.type === "upgrade") chooseRoute();
        } else if (["deck", "upgrade"].includes(modal.type) && ["ArrowUp", "ArrowDown"].includes(event.code)) {
          event.preventDefault();
          scrollDeck(event.code === "ArrowUp" ? -1 : 1);
        }
        return;
      }

      if (event.code === "Escape") {
        if (ready() && state.selected !== null) cancelSelection();
        else hideTooltip();
        return;
      }

      if (!ready()) return;

      if (digit >= 0) {
        const card = state.hand[digit];
        if (card) selectCard(card.id);
        return;
      }

      switch (event.code) {
        case "Space":
          endTurn();
          break;
        case "KeyD":
          showDeck();
          break;
        case "KeyC":
          showCodex();
          break;
        case "KeyB":
          showBody();
          break;
        case "KeyI":
          showCombatInventory();
          break;
        case "KeyH":
          showHelp();
          break;
        case "KeyO":
          showSettings();
          break;
        case "KeyL":
          showLog();
          break;
      }
    });

    document.addEventListener("contextmenu", (event) => {
      if (ready() && state.selected !== null) {
        event.preventDefault();
        cancelSelection();
      }
    });

    $("overlay").addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const nodes = [...$("modal").querySelectorAll(
        "button:not(:disabled), input:not(:disabled), [tabindex='0']"
      )];

      if (!nodes.length) {
        event.preventDefault();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    $("endTurn").addEventListener("click", endTurn);
    $("deckButton").addEventListener("click", showDeck);
    $("inventoryButton").addEventListener("click", showCombatInventory);
    $("drawPile").addEventListener("click", () => showCombatPile("draw"));
    $("exhaustPile").addEventListener("click", () => showCombatPile("exhausted"));
    $("discardPile").addEventListener("click", () => showCombatPile("discard"));
    $("codexButton").addEventListener("click", showCodex);
    $("bodyButton").addEventListener("click", showBody);
    $("heroButton").replaceChildren(el("kbd", "", "B"), uiIcon("body"));
    $("heroButton").setAttribute("aria-label", "생존자 신체 상태");
    $("heroButton").setAttribute("aria-keyshortcuts", "B");
    bindTip($("heroButton"), "생존자 · 신체", "사지 상태와 부상을 확인합니다. 단축키 B");
    $("heroButton").addEventListener("click", showBody);
    $("helpButton").addEventListener("click", showHelp);
    $("logButton").addEventListener("click", showLog);
    $("settingsButton").addEventListener("click", showSettings);
    $("allTarget").addEventListener("click", () => executeCard("all"));

    motionPreference.addEventListener("change", syncMotion);

    new ResizeObserver(() => {
      resizeCanvas();
      if (state) render();
      hideTooltip();
      updatePreview();
    }).observe($("scene"));

    window.addEventListener("resize", () => {
      positionStatuses();
      updatePreview();
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) resumeFrames();
    });

    syncMotion();
    paintBackground();
    resizeCanvas();
    // 첫 화면·첫 전투 그림을 다 받은 뒤 시작한다. 나머지는 preloadArt가 뒤에서 받는다.
    openModal({ type: "options", title: "불러오는 중", subtitle: "LOADING", description: "그림 준비 중", options: [] });
    preloadArt((done, total) => {
      const line = $("modal").querySelector(".description");
      if (line) line.textContent = `그림 준비 중 · ${done} / ${total}`;
    }).then(boot);

    function boot() {
    Music.play("explore");
    const savedRun = loadRun();
    if (savedRun) {
      openModal({
        type: "options",
        title: "벽 너머에서 신호가 남아 있다",
        subtitle: "SIGNAL FOUND",
        description: `${STAGES[savedRun.state.stage]?.name ?? "알 수 없는 구역"} · TURN ${savedRun.state.turn} · 체력 ${savedRun.state.hp}/${savedRun.state.maxHp}`,
        options: [
          { title: "이어하기", text: "마지막 턴 시작 시점으로 복귀.", action: () => restoreGame(savedRun) },
          { title: "새로 시작", text: "저장된 탈출을 버립니다.", action: () => { clearRun(); chooseClass(); } }
        ]
      });
    } else {
      chooseClass();
    }
    }
    resumeFrames();
  
