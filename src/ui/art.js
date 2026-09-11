// Simple hash function to map strings to consistent indices
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export const ANIMALS = {
  fox:      {body:'#e8772e', belly:'#fff1e0', ears:'point', earIn:'#3b2a1a', cheeks:'#f5a15b', extra:'foxmask'},
  otter:    {body:'#8a5a34', belly:'#d9b48f', ears:'round', earIn:'#c99a6c', cheeks:'#a9784f', extra:'whiskers'},
  badger:   {body:'#5f5f66', belly:'#e9e9ee', ears:'round', earIn:'#ccc', cheeks:'#7c7c85', extra:'badgerstripe'},
  hedgehog: {body:'#c99a6c', belly:'#f3dfc2', ears:'round', earIn:'#e2b48c', cheeks:'#e0a679', extra:'spikes'},
  beaver:   {body:'#7d4b26', belly:'#c48b5a', ears:'round', earIn:'#a86d3e', cheeks:'#a86d3e', extra:'teeth'},
  owl:      {body:'#8c6a4a', belly:'#e6d3b3', ears:'tuft', earIn:'#8c6a4a', cheeks:'#c9a97f', extra:'owleyes'},
  bear:     {body:'#6b4423', belly:'#c5936a', ears:'round', earIn:'#c5936a', cheeks:'#8a5a34', extra:'hat'},
  squirrel: {body:'#b8672a', belly:'#f6dfc4', ears:'point', earIn:'#f0a86f', cheeks:'#d98a4e', extra:'acorn'},
  mole:     {body:'#4f4a5a', belly:'#8f8aa0', ears:'none', earIn:'#000', cheeks:'#6c6680', extra:'nose'},
  mouse:    {body:'#a9a1b8', belly:'#eee9f5', ears:'biground', earIn:'#f4bccb', cheeks:'#c7b8d6', extra:'berry'},
  goat:     {body:'#d9d2c2', belly:'#f7f3ea', ears:'droop', earIn:'#e2b48c', cheeks:'#e5dccc', extra:'horns'},
  deer:     {body:'#c98f5a', belly:'#f3dfc2', ears:'droop', earIn:'#f0c9a8', cheeks:'#d9a06e', extra:'antlers'},
  raccoon:  {body:'#8a8a94', belly:'#e9e9ee', ears:'point', earIn:'#ccc', cheeks:'#a0a0aa', extra:'mask'},
  magpie:   {body:'#2f2f3a', belly:'#f5f5f5', ears:'none', earIn:'#000', cheeks:'#3d3d4a', extra:'beak'},
  wolf:     {body:'#6d7480', belly:'#d9dde3', ears:'point', earIn:'#3b2a1a', cheeks:'#8891a0', extra:'howl'},
  skunk:    {body:'#2b2b33', belly:'#f5f5f5', ears:'round', earIn:'#555', cheeks:'#3d3d4a', extra:'skunkstripe'},
  crow:     {body:'#23232b', belly:'#3a3a45', ears:'none', earIn:'#000', cheeks:'#33333d', extra:'beak'},
  sloth:    {body:'#a08a6a', belly:'#d8c8a8', ears:'none', earIn:'#000', cheeks:'#b59d7c', extra:'sleep'},
  rabbit:   {body:'#d9b08c', belly:'#fff3e6', ears:'long', earIn:'#f4bccb', cheeks:'#e8a89a', extra:'clover'},
};

export function animalSVG(kind, opts={}) {
  const a = ANIMALS[kind];
  if(!a) return placeholderSVG();
  const bg = opts.bg || 'none';
  let s = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">`;
  if(bg!=='none') s += `<rect width="100" height="100" fill="${bg}"/>`;
  // ears (behind head)
  if(a.ears==='point'){ s += `<polygon points="22,40 30,8 46,34" fill="${a.body}"/><polygon points="78,40 70,8 54,34" fill="${a.body}"/><polygon points="27,36 31,16 41,32" fill="${a.earIn}"/><polygon points="73,36 69,16 59,32" fill="${a.earIn}"/>`; }
  else if(a.ears==='round'){ s += `<circle cx="28" cy="26" r="12" fill="${a.body}"/><circle cx="72" cy="26" r="12" fill="${a.body}"/><circle cx="28" cy="26" r="6" fill="${a.earIn}"/><circle cx="72" cy="26" r="6" fill="${a.earIn}"/>`; }
  else if(a.ears==='biground'){ s += `<circle cx="22" cy="28" r="17" fill="${a.body}"/><circle cx="78" cy="28" r="17" fill="${a.body}"/><circle cx="22" cy="28" r="10" fill="${a.earIn}"/><circle cx="78" cy="28" r="10" fill="${a.earIn}"/>`; }
  else if(a.ears==='droop'){ s += `<ellipse cx="18" cy="48" rx="8" ry="15" fill="${a.body}" transform="rotate(20 18 48)"/><ellipse cx="82" cy="48" rx="8" ry="15" fill="${a.body}" transform="rotate(-20 82 48)"/><ellipse cx="18" cy="49" rx="4" ry="10" fill="${a.earIn}" transform="rotate(20 18 48)"/><ellipse cx="82" cy="49" rx="4" ry="10" fill="${a.earIn}" transform="rotate(-20 82 48)"/>`; }
  else if(a.ears==='tuft'){ s += `<polygon points="26,34 20,10 40,26" fill="${a.body}"/><polygon points="74,34 80,10 60,26" fill="${a.body}"/>`; }
  else if(a.ears==='long'){ s += `<ellipse cx="36" cy="18" rx="8" ry="22" fill="${a.body}"/><ellipse cx="64" cy="18" rx="8" ry="22" fill="${a.body}"/><ellipse cx="36" cy="18" rx="5" ry="18" fill="${a.earIn}"/><ellipse cx="64" cy="18" rx="5" ry="18" fill="${a.earIn}"/>`; }
  if(a.extra==='antlers') s += `<path d="M30 30 L24 8 M24 14 L16 10 M25 20 L18 22 M70 30 L76 8 M76 14 L84 10 M75 20 L82 22" stroke="#6b4423" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  if(a.extra==='horns') s += `<path d="M34 28 Q20 10 30 4 M66 28 Q80 10 70 4" stroke="#8a7256" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  if(a.extra==='spikes') s += `<path d="M20 40 L12 22 L28 30 L26 12 L38 26 L44 8 L50 26 L56 8 L62 26 L74 12 L72 30 L88 22 L80 40 Z" fill="#5a3d24"/>`;
  if(a.extra==='hat') s += `<rect x="30" y="18" width="40" height="14" rx="3" fill="#f0b429"/><rect x="24" y="30" width="52" height="6" rx="3" fill="#d99a1e"/>`;
  // head
  s += `<circle cx="50" cy="55" r="32" fill="${a.body}"/>`;
  if(a.extra==='foxmask') s += `<path d="M50 87 Q30 80 30 60 Q40 72 50 70 Q60 72 70 60 Q70 80 50 87Z" fill="${a.belly}"/>`;
  else if(a.extra==='badgerstripe') s += `<path d="M42 24 Q50 22 58 24 L58 60 Q50 58 42 60Z" fill="${a.belly}"/><ellipse cx="34" cy="55" rx="6" ry="10" fill="#222"/><ellipse cx="66" cy="55" rx="6" ry="10" fill="#222"/>`;
  else if(a.extra==='skunkstripe') s += `<path d="M44 24 Q50 22 56 24 L56 46 Q50 44 44 46Z" fill="${a.belly}"/>`;
  else s += `<ellipse cx="50" cy="66" rx="20" ry="14" fill="${a.belly}"/>`;
  if(a.extra==='mask') s += `<path d="M20 50 Q35 40 50 48 Q65 40 80 50 Q72 62 58 58 Q50 54 42 58 Q28 62 20 50Z" fill="#3b2a1a"/>`;
  // eyes
  if(a.extra==='owleyes'){ s += `<circle cx="38" cy="50" r="12" fill="#fff"/><circle cx="62" cy="50" r="12" fill="#fff"/><circle cx="38" cy="50" r="6" fill="#222"/><circle cx="62" cy="50" r="6" fill="#222"/><circle cx="40" cy="48" r="2" fill="#fff"/><circle cx="64" cy="48" r="2" fill="#fff"/><polygon points="50,54 44,62 56,62" fill="#f0b429"/>`; }
  else if(a.extra==='sleep'){ s += `<path d="M32 50 Q38 56 44 50 M56 50 Q62 56 68 50" stroke="#222" stroke-width="3" fill="none" stroke-linecap="round"/><text x="72" y="30" font-size="16" font-weight="bold" fill="#3f6fb5">z</text><text x="82" y="18" font-size="12" font-weight="bold" fill="#3f6fb5">z</text>`; }
  else { const ey = a.extra==='mask'?50:48; s += `<circle cx="38" cy="${ey}" r="4.5" fill="#222"/><circle cx="62" cy="${ey}" r="4.5" fill="#222"/><circle cx="39.5" cy="${ey-1.5}" r="1.5" fill="#fff"/><circle cx="63.5" cy="${ey-1.5}" r="1.5" fill="#fff"/>`; }
  // cheeks
  s += `<circle cx="28" cy="62" r="5" fill="${a.cheeks}" opacity=".7"/><circle cx="72" cy="62" r="5" fill="${a.cheeks}" opacity=".7"/>`;
  // nose / beak / mouth
  if(a.extra==='beak') s += `<polygon points="50,52 40,62 60,62" fill="#f0b429"/><polygon points="42,62 58,62 50,68" fill="#d99a1e"/>`;
  else if(a.extra==='nose') s += `<ellipse cx="50" cy="66" rx="9" ry="7" fill="#f4a6b0"/><path d="M42 74 Q50 80 58 74" stroke="#222" stroke-width="2.5" fill="none"/>`;
  else if(a.extra==='teeth') s += `<ellipse cx="50" cy="60" rx="5" ry="4" fill="#222"/><rect x="44" y="66" width="5" height="9" fill="#fff" stroke="#999" stroke-width="1"/><rect x="51" y="66" width="5" height="9" fill="#fff" stroke="#999" stroke-width="1"/>`;
  else if(a.extra==='howl') s += `<ellipse cx="50" cy="62" rx="5" ry="4" fill="#222"/><ellipse cx="50" cy="74" rx="6" ry="7" fill="#3b2a1a"/><text x="76" y="26" font-size="14" fill="#666">♪</text>`;
  else if(a.extra!=='owleyes') s += `<ellipse cx="50" cy="61" rx="5" ry="4" fill="#222"/><path d="M42 68 Q46 72 50 68 Q54 72 58 68" stroke="#222" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  if(a.extra==='whiskers') s += `<path d="M28 60 L12 56 M28 66 L12 68 M72 60 L88 56 M72 66 L88 68" stroke="#3b2a1a" stroke-width="2" stroke-linecap="round"/>`;
  if(a.extra==='acorn') s += `<ellipse cx="80" cy="82" rx="10" ry="12" fill="#a0662d"/><path d="M68 76 Q80 66 92 76 Z" fill="#5a3d24"/>`;
  if(a.extra==='berry') s += `<circle cx="80" cy="84" r="8" fill="#c94a52"/><circle cx="90" cy="80" r="6" fill="#e0606a"/><path d="M80 76 L82 68" stroke="#4c9a5f" stroke-width="3"/>`;
  if(a.extra==='antennae') s += `<path d="M40 26 Q30 10 20 12 M60 26 Q70 10 80 12" stroke="#5a3d24" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="20" cy="12" r="4" fill="#5a3d24"/><circle cx="80" cy="12" r="4" fill="#5a3d24"/>`;
  if(a.extra==='clover') s += `<circle cx="75" cy="80" r="3" fill="#4c9a5f"/><circle cx="85" cy="80" r="3" fill="#4c9a5f"/><circle cx="80" cy="88" r="3" fill="#4c9a5f"/><path d="M80 80 L80 92" stroke="#4c9a5f" stroke-width="1.5"/>`;
  return s + `</svg>`;
}

function placeholderSVG() {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#f0ebe5"/></svg>`;
}

export function statueSVG(virtue) {
  const colors = ['#e8c4d4', '#d4e8c4', '#c4d4e8', '#e8d4c4', '#d4c4e8', '#e8e4c4'];
  const colorIdx = simpleHash(virtue) % colors.length;
  const starColor = colors[colorIdx];

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="70" width="60" height="20" fill="#5f5f66" rx="2"/>
    <rect x="30" y="45" width="40" height="28" rx="4" fill="#8a8a94"/>
    <circle cx="50" cy="35" r="12" fill="#8a8a94"/>
    <polygon points="50,12 56,26 42,26" fill="${starColor}"/>
  </svg>`;
}

export function marketSVG(kind) {
  const colors = ['#e8c4d4', '#d4e8c4', '#c4d4e8', '#e8d4c4', '#d4c4e8', '#e8e4c4'];
  const colorIdx = simpleHash(kind) % colors.length;
  const sealColor = colors[colorIdx];

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M 20 85 L 20 35 Q 20 25 30 25 L 70 25 Q 80 25 80 35 L 80 85" fill="#f6efe0" stroke="#8a7256" stroke-width="1.5"/>
    <path d="M 20 35 Q 50 22 80 35" stroke="#c78a2f" stroke-width="2" fill="none"/>
    <line x1="30" y1="45" x2="70" y2="45" stroke="#8a7256" stroke-width="1.5"/>
    <line x1="30" y1="57" x2="70" y2="57" stroke="#8a7256" stroke-width="1.5"/>
    <line x1="30" y1="69" x2="70" y2="69" stroke="#8a7256" stroke-width="1.5"/>
    <circle cx="75" cy="75" r="8" fill="${sealColor}"/>
  </svg>`;
}

export function eventSVG() {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M 25 75 L 25 35 L 50 20 L 75 35 L 75 75 Z" fill="#fff3d6" stroke="#8a7256" stroke-width="1.5"/>
    <path d="M 25 35 Q 50 25 75 35" stroke="#c78a2f" stroke-width="2" fill="none"/>
    <path d="M 25 35 L 50 20 L 75 35" stroke="#c78a2f" stroke-width="1.5" fill="none"/>
    <circle cx="65" cy="60" r="6" fill="#c41e3a"/>
    <circle cx="65" cy="60" r="4" fill="#d63043"/>
    <path d="M 60 62 Q 65 68 70 62" stroke="#8a4423" stroke-width="1" fill="none"/>
  </svg>`;
}
