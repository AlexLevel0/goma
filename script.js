// script.js

//── SVG 要素取得＆サイズ設定 ─────────────────────────
const svg       = document.getElementById('map-svg');
const DISPLAY_W = +svg.getAttribute('width');   // 800
const DISPLAY_H = +svg.getAttribute('height');  // 400

// マップ本体サイズ（viewBox に合わせる）
const MAP_W = 3000;
const MAP_H = 400;
const M     = 50;  // 地面厚み

//── カメラ＆ズーム設定 ─────────────────────────
const ZOOM  = 2;
const viewW = DISPLAY_W / ZOOM;
const viewH = DISPLAY_H / ZOOM;

//── 地形点生成 ─────────────────────────
function generatePoints(count) {
  const pts = [];
  const groundY = MAP_H - M;
  const usableH = MAP_H - 2 * M;
  const maxElev = M + usableH * 0.6;
  const dx      = MAP_W / (count - 1);

  // 左端 3 点
  for (let i = 0; i < 3; i++) {
    pts.push({ x: dx * i, y: groundY });
  }

  // 中央ブロック
  let remain = count - 6;
  let lastOne = false;
  const blocks = [];
  while (remain > 0) {
    let len = lastOne
      ? Math.min(remain, 2 + Math.floor(Math.random() * 2))
      : (Math.random() < 0.5
         ? 1
         : 2 + Math.floor(Math.random() * 2));
    len = Math.min(len, remain);
    blocks.push(len);
    remain -= len;
    lastOne = (len === 1);
  }
  // 末尾が 1 なら直前に吸収
  if (blocks.length > 1 && blocks.at(-1) === 1) {
    blocks[blocks.length - 2] += 1;
    blocks.pop();
  }

  let idx = 3;
  blocks.forEach(len => {
    const base = maxElev + Math.random() * (groundY - maxElev) * (len === 1 ? 1 : 0.5);
    for (let i = 0; i < len; i++, idx++) {
      pts.push({ x: dx * idx, y: base });
    }
  });

  // 右端 3 点
  for (let i = 0; i < 3; i++) {
    pts.push({ x: MAP_W - dx * (2 - i), y: groundY });
  }

  return pts;
}
const points = generatePoints(60);

//── グラデーション定義 ─────────────────────────
function defineSkyGradient(svg) {
  const NS   = svg.namespaceURI;
  const defs = document.createElementNS(NS, 'defs');
  const grad = document.createElementNS(NS, 'linearGradient');
  grad.setAttribute('id', 'skyGrad');
  grad.setAttribute('gradientUnits', 'userSpaceOnUse');
  grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
  grad.setAttribute('x2', '0'); grad.setAttribute('y2', String(MAP_H - M));
  [
    ['0%',   '#4FC3F7'],
    ['40%',  '#81D4FA'],
    ['60%',  '#B3E5FC'],
    ['100%', '#E1F5FE']
  ].forEach(([offset, color]) => {
    const stop = document.createElementNS(NS, 'stop');
    stop.setAttribute('offset', offset);
    stop.setAttribute('stop-color', color);
    grad.appendChild(stop);
  });
  defs.appendChild(grad);
  svg.appendChild(defs);
}

function defineGroundGradient(svg) {
  const NS   = svg.namespaceURI;
  const defs = document.createElementNS(NS, 'defs');
  const grad = document.createElementNS(NS, 'linearGradient');
  grad.setAttribute('id', 'groundGrad');
  grad.setAttribute('gradientUnits', 'userSpaceOnUse');
  grad.setAttribute('x1', '0');
  grad.setAttribute('y1', String(Math.min(...points.map(p => p.y))));
  grad.setAttribute('x2', '0'); grad.setAttribute('y2', String(MAP_H));
  [
    ['0%',  '#AED581'],
    ['20%', '#AED581'],
    ['20%', '#719550'],
    ['40%', '#719550'],
    ['40%', '#4E7B28'],
    ['60%', '#4E7B28'],
    ['60%', '#2A3E14'],
    ['80%', '#2A3E14'],
    ['80%', '#7E5E3A']
  ].forEach(([offset, color]) => {
    const stop = document.createElementNS(NS, 'stop');
    stop.setAttribute('offset', offset);
    stop.setAttribute('stop-color', color);
    grad.appendChild(stop);
  });
  defs.appendChild(grad);
  svg.appendChild(defs);
}

//── 描画ヘルパー ─────────────────────────
function drawGround(g) {
  const coords = [`0,${MAP_H}`, `0,${points[0].y}`];
  points.forEach(p => coords.push(`${p.x},${p.y}`));
  coords.push(
    `${MAP_W},${points.at(-1).y}`,
    `${MAP_W},${MAP_H}`,
    `0,${MAP_H}`
  );
  const poly = document.createElementNS(svg.namespaceURI, 'polygon');
  poly.setAttribute('points', coords.join(' '));
  poly.setAttribute('fill', 'url(#groundGrad)');
  poly.setAttribute('stroke', '#2E8B57');
  poly.setAttribute('stroke-width', '3');
  poly.setAttribute('shape-rendering', 'crispEdges');
  g.appendChild(poly);
}

function drawEdges(g) {
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1], p1 = points[i];
    const line = document.createElementNS(svg.namespaceURI, 'line');
    line.setAttribute('x1', p0.x); line.setAttribute('y1', p0.y);
    line.setAttribute('x2', p1.x); line.setAttribute('y2', p1.y);
    line.setAttribute('stroke', '#2E8B57');
    line.setAttribute('stroke-width', '3');
    g.appendChild(line);
  }
}

function drawBorders(g) {
  const groundY = MAP_H - M;
  [points[0], points.at(-1)].forEach(p => {
    const line = document.createElementNS(svg.namespaceURI, 'line');
    line.setAttribute('x1', p.x); line.setAttribute('y1', p.y);
    line.setAttribute('x2', p.x); line.setAttribute('y2', groundY);
    line.setAttribute('stroke', '#2E8B57');
    line.setAttribute('stroke-width', '3');
    g.appendChild(line);
  });
}

function addCloud(g, x, y, w, h) {
  const NS = g.ownerSVGElement.namespaceURI;
  [[x - 0.3 * w, y, 0.6 * w, 0.6 * h],
   [x + 0.3 * w, y, 0.6 * w, 0.6 * h],
   [x, y - 0.2 * h, 0.7 * w, 0.7 * h]
  ].forEach(([cx, cy, rx, ry]) => {
    const e = document.createElementNS(NS, 'ellipse');
    e.setAttribute('cx', cx); e.setAttribute('cy', cy);
    e.setAttribute('rx', rx); e.setAttribute('ry', ry);
    e.setAttribute('fill', 'white');
    g.appendChild(e);
  });
}

//── キャラクター＆ゴール画像設定 ─────────────────────────
const charW    = 30;
const charH    = 40;
const charURL  = 'img/char.png';
const goalW    = 50;
const goalH    = 50;

// キャラ要素
const char = document.createElementNS(svg.namespaceURI, 'image');
char.setAttributeNS('http://www.w3.org/1999/xlink', 'href', charURL);
char.setAttribute('width', charW);
char.setAttribute('height', charH);

//── 物理変数＆ジャンプ制御 ─────────────────────────
let charX      = 50;
let vx         = 0;
let vy         = 0;
let onGround   = false;
let jumpCount  = 0;
const speed    = 2;
const gravity  = 0.3;
const jumpP    = 6;
const maxJumps = 2;

//── 入力管理 ─────────────────────────
const active = [];
function updVx() {
  vx = active.length ? active[active.length - 1] * speed : 0;
}
function startDir(d) {
  if (!active.includes(d)) active.push(d);
  updVx();
}
function endDir(d) {
  const i = active.indexOf(d);
  if (i > -1) active.splice(i, 1);
  updVx();
}
[['left', -1], ['right', 1]].forEach(([id, dir]) => {
  const btn = document.getElementById('btn-' + id);
  btn.style.touchAction = 'none';
  btn.addEventListener('pointerdown', e => { e.preventDefault(); startDir(dir); });
  btn.addEventListener('pointerup',   e => { e.preventDefault(); endDir(dir);   });
});
const jb = document.getElementById('btn-jump');
jb.style.touchAction = 'none';
jb.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (onGround || jumpCount < maxJumps) {
    vy = -jumpP;
    jumpCount++;
    onGround = false;
  }
});

//── 地形の高さ取得 ─────────────────────────
function getTerrainY(x) {
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i], p1 = points[i+1];
    if (x >= p0.x && x <= p1.x) {
      const t = (x - p0.x) / (p1.x - p0.x);
      return p0.y + (p1.y - p0.y) * t;
    }
  }
  return MAP_H - M;
}

//── レンダー＆ゲームループ ─────────────────────────
const goalX = points.at(-1).x - goalW;  // 画像左端
const goalY = () => getTerrainY(points.at(-1).x) - goalH;

function render() {
  svg.innerHTML = '';
  defineSkyGradient(svg);
  defineGroundGradient(svg);

  const g = document.createElementNS(svg.namespaceURI, 'g');
  svg.appendChild(g);

  // 空
  const sky = document.createElementNS(svg.namespaceURI, 'rect');
  sky.setAttribute('x', 0);
  sky.setAttribute('y', 0);
  sky.setAttribute('width', MAP_W);
  sky.setAttribute('height', MAP_H - M);
  sky.setAttribute('fill', 'url(#skyGrad)');
  g.appendChild(sky);

  // 地形
  drawGround(g);
  drawEdges(g);
  drawBorders(g);

  // キャラ
  g.appendChild(char);

  // 雲
  addCloud(g, 100,  60, 120, 60);
  addCloud(g, 300, 100, 160, 80);
  addCloud(g, 500,  40, 100, 50);

  // ゴール画像
  const gi = document.createElementNS(svg.namespaceURI, 'image');
  gi.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'img/goal.png');
  gi.setAttribute('width',  goalW);
  gi.setAttribute('height', goalH);
  gi.setAttribute('x', goalX);
  gi.setAttribute('y', goalY());
  g.appendChild(gi);

  // カメラ追従
  const cx = charX + charW / 2;
  const cy = parseFloat(char.getAttribute('y')) + charH / 2;
  let vbX = cx - viewW / 2;
  vbX = Math.max(0, Math.min(MAP_W - viewW, vbX));
  let vbY = cy - viewH / 2;
  vbY = Math.max(0, Math.min(MAP_H - viewH, vbY));
  svg.setAttribute('viewBox', `${vbX} ${vbY} ${viewW} ${viewH}`);
}

function updateChar() {
  const footX  = charX + charW / 2;
  const floorY = getTerrainY(footX) - charH;
  charX = Math.max(0, Math.min(MAP_W - charW, charX + vx));
  vy += gravity;
  let y = parseFloat(char.getAttribute('y') || 0) + vy;
  if (y >= floorY) {
    y = floorY;
    vy = 0;
    onGround = true;
    jumpCount = 0;
  } else {
    onGround = false;
  }
  char.setAttribute('x', charX);
  char.setAttribute('y', y);
}

function gameLoop() {
  updateChar();
  // 判定：キャラ右端が目標画像左端を超えたらゴール
  if (charX + charW >= goalX) {
    alert('ゴール！');
    return;
  }
  render();
  requestAnimationFrame(gameLoop);
}

// 初期配置
char.setAttribute('y', MAP_H - M - charH);

// 開始
gameLoop();
