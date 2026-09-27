export function bodyDiagram(limbs) {
  const figure = document.createElement('div');
  figure.className = 'body-diagram';
  figure.setAttribute('aria-hidden', 'true');
  const part = (key, d) => `<path class="body-segment ${limbs[key] ? 'is-injured' : ''}" d="${d}"/>`;
  figure.innerHTML = `<svg viewBox="0 0 200 320" fill="none">
    <circle class="body-orbit" cx="100" cy="155" r="86"/>
    <path class="body-guide" d="M100 8v304M10 155h180"/>
    <path class="body-core" d="M83 69h34l14 19-9 80-22 18-22-18-9-80Z"/>
    <path class="body-core" d="M84 25q16-16 32 0l-3 29-13 10-13-10Z"/>
    ${part('rightArm', 'M66 83 53 91 40 151 32 199 46 204 57 157 75 112Z')}
    ${part('leftArm', 'M134 83 147 91 160 151 168 199 154 204 143 157 125 112Z')}
    ${part('rightLeg', 'M79 177 96 190 92 236 85 295 63 297 67 283 70 231Z')}
    ${part('leftLeg', 'M121 177 104 190 108 236 115 295 137 297 133 283 130 231Z')}
    <path class="body-guide" d="M52 127H9m139 0h43M76 243H9m115 0h67"/>
    </svg>`;
  return figure;
}
