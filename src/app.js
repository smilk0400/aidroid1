import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { channels, totals, meta, maxRevenue, maxAbsOp } from './data.js';

/* ---------------------------------------------------------------- 유틸 */
const fmt = (n) => n.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
const pct = (n) => (n * 100).toFixed(1) + '%';
// 영업이익률 → 색 (손실 빨강 · 저마진 앰버 · 고마진 그린)
function marginColor(m) {
  if (m < 0) return new THREE.Color('#ff4d5e');
  if (m < 0.12) return new THREE.Color('#f6b93b');
  if (m < 0.22) return new THREE.Color('#7bd88f');
  return new THREE.Color('#2ecc71');
}

/* ---------------------------------------------------------------- 씬 기본 */
const stage = document.getElementById('stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a0e1a');
scene.fog = new THREE.Fog('#0a0e1a', 24, 60);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 9, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

// CSS2D 라벨용 오버레이 렌더러
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.className = 'label-layer';
stage.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, labelRenderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 10;
controls.maxDistance = 42;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 2.5, 0);
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;

/* ---------------------------------------------------------------- 조명 */
scene.add(new THREE.HemisphereLight('#9fb4ff', '#0a0e1a', 0.55));
const key = new THREE.DirectionalLight('#ffffff', 1.6);
key.position.set(8, 18, 10);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -20; key.shadow.camera.right = 20;
key.shadow.camera.top = 20; key.shadow.camera.bottom = -20;
key.shadow.bias = -0.0004;
scene.add(key);
const rim = new THREE.DirectionalLight('#5b8cff', 0.7);
rim.position.set(-10, 6, -12);
scene.add(rim);

/* ---------------------------------------------------------------- 바닥 */
const grid = new THREE.GridHelper(60, 60, 0x2a3a6a, 0x16203c);
grid.material.transparent = true;
grid.material.opacity = 0.5;
scene.add(grid);
// 그림자만 받는 투명 바닥
const shadowFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.ShadowMaterial({ opacity: 0.35 })
);
shadowFloor.rotation.x = -Math.PI / 2;
shadowFloor.position.y = 0.001;
shadowFloor.receiveShadow = true;
scene.add(shadowFloor);

/* ---------------------------------------------------------------- 막대 생성 */
const HEIGHT_SCALE = 7 / maxRevenue; // 최대매출 → 7 유닛
const GAP = 3.4;
const bars = [];
const group = new THREE.Group();
scene.add(group);

channels.forEach((c, i) => {
  const x = (i - (channels.length - 1) / 2) * GAP;
  const g = new THREE.Group();
  g.position.x = x;

  // 외곽 막대: 매출(유리질 반투명)
  const revH = c.revenue * HEIGHT_SCALE;
  const outer = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, revH, 1.7),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(c.color),
      metalness: 0.1, roughness: 0.15,
      transmission: 0.6, transparent: true, opacity: 0.5,
      thickness: 1.2, clearcoat: 1, clearcoatRoughness: 0.2,
    })
  );
  outer.position.y = revH / 2;
  outer.castShadow = true;
  g.add(outer);

  // 내부 막대: 영업이익(솔리드). 손실은 지면 아래로.
  const opH = Math.abs(c.op) * HEIGHT_SCALE;
  const inner = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, opH, 1.0),
    new THREE.MeshStandardMaterial({
      color: marginColor(c.margin),
      emissive: marginColor(c.margin),
      emissiveIntensity: 0.35,
      metalness: 0.2, roughness: 0.4,
    })
  );
  inner.position.y = c.op >= 0 ? opH / 2 : -opH / 2;
  inner.castShadow = true;
  g.add(inner);

  // 바닥 발광 링
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.25, 1.5, 40),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(c.color), transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  g.add(ring);

  // CSS2D 라벨 (채널명 + 매출)
  const el = document.createElement('div');
  el.className = 'bar-label';
  el.innerHTML = `<b>${c.short}</b><span>${fmt(c.revenue)}억 · ${pct(c.margin)}</span>`;
  const label = new CSS2DObject(el);
  label.position.set(0, revH + 0.9, 0);
  g.add(label);

  group.add(g);
  bars.push({ data: c, group: g, outer, inner, ring, baseY: g.position.y, revH });
});

/* ---------------------------------------------------------------- 상호작용 */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = null;
let selected = null;

function pickables() {
  return bars.flatMap((b) => [b.outer, b.inner]);
}
function barOf(obj) {
  return bars.find((b) => b.outer === obj || b.inner === obj);
}

function onMove(e) {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickables(), false)[0];
  const bar = hit ? barOf(hit.object) : null;
  if (bar !== hovered) {
    hovered = bar;
    document.body.style.cursor = bar ? 'pointer' : 'default';
    controls.autoRotate = !bar && !selected;
  }
}
function onClick() {
  if (hovered) select(hovered);
}
renderer.domElement.addEventListener('pointermove', onMove);
renderer.domElement.addEventListener('pointerdown', onClick);

/* ---------------------------------------------------------------- 상세 패널 */
const panel = document.getElementById('detail');
function sparkline(vals) {
  const w = 220, h = 46, pad = 3;
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const pts = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" class="spark" preserveAspectRatio="none">
    <polyline points="${pts.join(' ')}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}
function row(label, val, cls = '') {
  return `<div class="row"><span>${label}</span><b class="${cls}">${val}</b></div>`;
}
function select(bar) {
  selected = bar;
  controls.autoRotate = false;
  bars.forEach((b) => b.ring.material.opacity = b === bar ? 0.9 : 0.12);
  const c = bar.data;
  const sign = c.op >= 0 ? 'pos' : 'neg';
  panel.innerHTML = `
    <button class="close" aria-label="닫기">✕</button>
    <div class="dot" style="background:${c.color}"></div>
    <h2>${c.name}</h2>
    <p class="note">${c.note}</p>
    <div class="table">
      ${row('매출', fmt(c.revenue) + '억')}
      ${row('매출원가', '−' + fmt(c.cogs) + '억')}
      ${row('마케팅비', '−' + fmt(c.marketing) + '억')}
      ${row('판매관리비', '−' + fmt(c.sga) + '억')}
      <div class="rule"></div>
      ${row('영업이익', (c.op >= 0 ? '' : '−') + fmt(Math.abs(c.op)) + '억', sign)}
      ${row('영업이익률', pct(c.margin), sign)}
    </div>
    <div class="spark-wrap ${sign}">
      <div class="spark-head"><span>월별 매출 추이</span><span>${meta.months[0]}–${meta.months[11]}</span></div>
      ${sparkline(c.monthly)}
    </div>`;
  panel.classList.add('open');
  panel.querySelector('.close').onclick = deselect;
  focusCamera(bar);
}
function deselect() {
  selected = null;
  panel.classList.remove('open');
  bars.forEach((b) => b.ring.material.opacity = 0.35);
  controls.autoRotate = true;
}
document.addEventListener('keydown', (e) => e.key === 'Escape' && deselect());

/* 카메라 포커스 (부드러운 이동) */
let camTween = null;
function focusCamera(bar) {
  const tx = bar.group.position.x;
  const from = { tx: controls.target.x, cx: camera.position.x };
  const to = { tx, cx: tx * 0.4 };
  camTween = { from, to, t: 0 };
}

/* ---------------------------------------------------------------- 헤더 KPI */
document.getElementById('kpi').innerHTML = `
  <div class="k"><span>전사 매출</span><b>${fmt(totals.revenue)}<i>억</i></b></div>
  <div class="k"><span>영업이익</span><b>${fmt(totals.op)}<i>억</i></b></div>
  <div class="k"><span>영업이익률</span><b>${pct(totals.margin)}</b></div>
  <div class="k"><span>채널 수</span><b>${channels.length}<i>개</i></b></div>`;

/* ---------------------------------------------------------------- 루프 */
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  bars.forEach((b, i) => {
    // 호버/선택 시 살짝 떠오르며 발광
    const active = b === hovered || b === selected;
    const targetY = active ? 0.35 : 0;
    b.group.position.y += (targetY - b.group.position.y) * 0.15;
    const glow = active ? 0.85 : 0.35;
    b.inner.material.emissiveIntensity += (glow - b.inner.material.emissiveIntensity) * 0.15;
    // 은은한 상하 부유
    b.group.position.y += Math.sin(t * 0.8 + i) * 0.004;
  });

  if (camTween && camTween.t < 1) {
    camTween.t = Math.min(1, camTween.t + 0.03);
    const e = 1 - Math.pow(1 - camTween.t, 3); // easeOutCubic
    controls.target.x = camTween.from.tx + (camTween.to.tx - camTween.from.tx) * e;
    camera.position.x = camTween.from.cx + (camTween.to.cx - camTween.from.cx) * e;
  }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();

/* ---------------------------------------------------------------- 리사이즈 */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});

// 인트로 로딩 제거
document.getElementById('loading')?.remove();
