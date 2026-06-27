/* 유통기한 관리 - 로컬 전용 앱
 * 모든 데이터는 IndexedDB(이 기기)에만 저장됩니다. 외부 전송 없음.
 */
(() => {
  'use strict';

  const DB_NAME = 'food-expiry-db';
  const STORE = 'items';
  const SOON_DAYS = 3; // 유통기한 임박 기준(일)

  // ---------- IndexedDB ----------
  let dbPromise = null;
  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function tx(mode, fn) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      let result;
      Promise.resolve(fn(store)).then((r) => { result = r; });
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }

  const dbAll = () => tx('readonly', (s) => new Promise((res) => {
    const out = [];
    s.openCursor().onsuccess = (e) => {
      const cur = e.target.result;
      if (cur) { out.push(cur.value); cur.continue(); } else { res(out); }
    };
  }));
  const dbPut = (item) => tx('readwrite', (s) => s.put(item));
  const dbDelete = (id) => tx('readwrite', (s) => s.delete(id));

  // ---------- 유틸 ----------
  const $ = (sel) => document.querySelector(sel);
  const todayStr = () => new Date().toISOString().slice(0, 10);

  function daysUntil(dateStr) {
    const today = new Date(todayStr());
    const target = new Date(dateStr);
    return Math.round((target - today) / 86400000);
  }

  function statusOf(dateStr) {
    const d = daysUntil(dateStr);
    if (d < 0) return { cls: 'expired', label: `${Math.abs(d)}일 지남`, badge: 'expired' };
    if (d === 0) return { cls: 'soon', label: '오늘까지', badge: 'soon' };
    if (d <= SOON_DAYS) return { cls: 'soon', label: `${d}일 남음`, badge: 'soon' };
    return { cls: 'ok', label: `${d}일 남음`, badge: 'ok' };
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
  }

  // ---------- 탭 ----------
  function switchTab(name) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    $(`#view-${name}`).classList.add('active');
    if (name === 'list') render();
  }
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));

  // ---------- 목록 렌더 ----------
  async function render() {
    let items = await dbAll();
    const q = $('#search').value.trim().toLowerCase();
    if (q) {
      items = items.filter((i) =>
        (i.name || '').toLowerCase().includes(q) || (i.barcode || '').toLowerCase().includes(q));
    }
    const sort = $('#sort').value;
    items.sort((a, b) => {
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sort === 'purchase') return (b.purchase || '').localeCompare(a.purchase || '');
      return (a.expiry || '').localeCompare(b.expiry || ''); // expiry 기본
    });

    const ul = $('#items');
    ul.innerHTML = '';
    $('#empty').classList.toggle('hidden', items.length > 0);

    let expired = 0, soon = 0;
    for (const it of items) {
      const st = statusOf(it.expiry);
      if (st.badge === 'expired') expired++;
      else if (st.badge === 'soon') soon++;

      const li = document.createElement('li');
      li.className = `item ${st.cls}`;

      const thumb = it.photo
        ? `<img class="thumb" src="${URL.createObjectURL(it.photo)}" alt="" />`
        : `<div class="thumb">🍱</div>`;

      li.innerHTML = `
        ${thumb}
        <div class="info">
          <h3>${escapeHtml(it.name || '(이름 없음)')}</h3>
          <div class="meta">
            <span class="badge ${st.badge}">${st.label}</span>
            <span class="facts">
              <span class="nowrap">유통기한 ${it.expiry}</span>
              <span class="nowrap">수량 ${it.quantity}</span>
              <span class="nowrap">구매 ${it.purchase || '-'}</span>
            </span>
            ${it.barcode ? `<span class="barcode">${escapeHtml(it.barcode)}</span>` : ''}
          </div>
        </div>
        <div class="actions">
          <button class="icon-btn" data-edit="${it.id}">✏️</button>
          <button class="icon-btn" data-del="${it.id}">🗑️</button>
        </div>`;
      ul.appendChild(li);
    }

    const parts = [`총 ${items.length}개`];
    if (expired) parts.push(`만료 ${expired}`);
    if (soon) parts.push(`임박 ${soon}`);
    $('#summary').textContent = parts.join(' · ');

    ul.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', () => removeItem(b.dataset.del)));
    ul.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => editItem(b.dataset.edit)));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  $('#search').addEventListener('input', render);
  $('#sort').addEventListener('change', render);

  async function removeItem(id) {
    if (!confirm('이 항목을 삭제할까요?')) return;
    await dbDelete(id);
    toast('삭제했습니다');
    render();
  }

  async function editItem(id) {
    const items = await dbAll();
    const it = items.find((x) => x.id === id);
    if (!it) return;
    $('#item-id').value = it.id;
    $('#barcode').value = it.barcode || '';
    $('#name').value = it.name || '';
    $('#expiry').value = it.expiry || '';
    $('#quantity').value = it.quantity || 1;
    $('#purchase').value = it.purchase || todayStr();
    setPhoto(it.photo || null);
    $('#save-btn').textContent = '수정 저장';
    switchTab('add');
  }

  // ---------- 폼 ----------
  const form = $('#form');
  let currentPhoto = null;

  function setPhoto(blob) {
    currentPhoto = blob;
    const wrap = $('#photo-preview');
    const img = $('#photo-img');
    if (blob) {
      img.src = URL.createObjectURL(blob);
      wrap.classList.remove('hidden');
    } else {
      img.removeAttribute('src');
      wrap.classList.add('hidden');
      $('#photo').value = '';
    }
  }

  $('#photo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) setPhoto(file);
  });
  $('#photo-remove').addEventListener('click', () => setPhoto(null));

  function resetForm() {
    form.reset();
    $('#item-id').value = '';
    $('#purchase').value = todayStr();
    $('#quantity').value = 1;
    setPhoto(null);
    $('#save-btn').textContent = '저장';
    stopScan();
  }

  $('#cancel-btn').addEventListener('click', () => { resetForm(); switchTab('list'); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#item-id').value || uid();
    const item = {
      id,
      barcode: $('#barcode').value.trim(),
      name: $('#name').value.trim(),
      expiry: $('#expiry').value,
      quantity: parseInt($('#quantity').value, 10) || 1,
      purchase: $('#purchase').value,
      photo: currentPhoto || null,
      updatedAt: Date.now(),
    };
    await dbPut(item);
    toast('저장했습니다');
    resetForm();
    switchTab('list');
  });

  // ---------- 바코드 스캔 ----------
  let stream = null;
  let detector = null;
  let scanLoop = null;

  async function startScan() {
    const box = $('#scanner');
    const hint = $('#scan-hint');
    box.classList.remove('hidden');

    if (!('BarcodeDetector' in window)) {
      hint.textContent = '이 브라우저는 바코드 자동 인식을 지원하지 않습니다. 바코드 번호를 직접 입력하세요.';
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      const video = $('#video');
      video.srcObject = stream;
      await video.play();

      if ('BarcodeDetector' in window) {
        const formats = await BarcodeDetector.getSupportedFormats();
        detector = new BarcodeDetector({ formats });
        hint.textContent = '바코드를 화면 중앙에 맞춰주세요…';
        scanFrame(video, hint);
      }
    } catch (err) {
      hint.textContent = '카메라를 사용할 수 없습니다: ' + err.message;
    }
  }

  function scanFrame(video, hint) {
    scanLoop = async () => {
      if (!detector || !stream) return;
      try {
        const codes = await detector.detect(video);
        if (codes && codes.length) {
          const value = codes[0].rawValue;
          stopScan();
          handleScanned(value);
          return;
        }
      } catch (_) { /* 무시하고 계속 */ }
      requestAnimationFrame(scanLoop);
    };
    requestAnimationFrame(scanLoop);
  }

  // 스캔/입력된 코드 처리: GS1이면 유통기한 등 추출, 아니면 숫자 바코드로 취급
  async function handleScanned(value) {
    const gs1 = parseGS1(value);
    let code = value;
    if (gs1) {
      if (gs1.gtin) code = gs1.gtin;
      $('#barcode').value = code;
      const msgs = ['GS1 인식'];
      if (gs1.expiry) { $('#expiry').value = gs1.expiry; msgs.push('유통기한 ' + gs1.expiry); }
      if (gs1.lot) msgs.push('로트 ' + gs1.lot);
      toast(msgs.join(' · '));
    } else {
      $('#barcode').value = value;
      toast('바코드 인식: ' + value);
    }
    await lookupProductName(code);
    if (!$('#name').value) $('#name').focus();
  }

  // GS1 바코드(괄호표기 또는 FNC1 구분) 파싱 → { gtin, expiry(YYYY-MM-DD), lot }
  function parseGS1(raw) {
    if (!raw) return null;
    const GS = String.fromCharCode(29);
    let s = String(raw).replace(/^\][A-Za-z]\d/, ''); // 심볼로지 식별자 제거
    const out = {};
    if (s.indexOf('(') !== -1) {
      const re = /\((\d{2,4})\)([^(]*)/g; let m;
      while ((m = re.exec(s))) out[m[1]] = m[2].split(GS).join('').trim();
    } else {
      if (s.indexOf(GS) === -1 && !/^(01|02|17|10|11|15)/.test(s)) return null;
      const fixed = { '00': 18, '01': 14, '02': 14, '11': 6, '12': 6, '13': 6, '15': 6, '16': 6, '17': 6, '20': 2 };
      let i = 0;
      while (i < s.length) {
        if (s[i] === GS) { i++; continue; }
        const ai = s.substr(i, 2);
        if (fixed[ai] != null) {
          out[ai] = s.substr(i + 2, fixed[ai]);
          i += 2 + fixed[ai];
        } else {
          let j = s.indexOf(GS, i + 2);
          if (j === -1) j = s.length;
          out[ai] = s.substring(i + 2, j);
          i = j;
        }
      }
    }
    if (!Object.keys(out).length) return null;
    const res = {};
    if (out['01']) res.gtin = out['01'].replace(/^0+(?=\d{13})/, ''); // GTIN-14 앞 0 제거
    if (out['02']) res.gtin = res.gtin || out['02'];
    const exp = out['17'] || out['15'];
    if (exp) res.expiry = gs1DateToISO(exp);
    if (out['10']) res.lot = out['10'];
    return (res.gtin || res.expiry || res.lot) ? res : null;
  }

  function gs1DateToISO(d) {
    if (!/^\d{6}$/.test(d)) return '';
    const yy = +d.slice(0, 2), mm = +d.slice(2, 4);
    let dd = +d.slice(4, 6);
    const year = 2000 + yy;
    if (mm < 1 || mm > 12) return '';
    if (dd === 0) dd = new Date(year, mm, 0).getDate(); // DD=00 → 그 달 말일
    return `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  }

  // 제품명 조회: 국내(식약처) 우선 → Open Food Facts 폴백
  async function lookupProductName(code) {
    const digits = String(code).replace(/\D/g, '');
    if (digits.length < 8) return;
    if ($('#name').value.trim()) return; // 이미 이름 있으면 건드리지 않음

    const krName = await lookupKorean(digits);
    if (krName) {
      $('#name').value = krName;
      toast('국내 제품명: ' + krName);
      return;
    }

    try {
      const url = `https://world.openfoodfacts.org/api/v2/product/${digits}.json?fields=product_name,product_name_ko,brands`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const p = data.product || {};
      const name = (p.product_name_ko || p.product_name || '').trim();
      if (name) {
        $('#name').value = p.brands ? `${name} (${String(p.brands).split(',')[0].trim()})` : name;
        toast('제품명 조회: ' + name);
      }
    } catch (_) { /* 네트워크 없음 등 무시 */ }
  }

  // 식약처 식품안전나라 바코드제품정보(C005) 조회
  // 직접 호출 → 공개 프록시 순차 시도 (한 곳이 죽어도 다음으로)
  const DEFAULT_API_KEY = '98a4f9141aad46aa87b1';
  const PROXIES = [
    (u) => u,                                                                  // 직접(HTTPS)
    (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
    (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ];

  async function lookupKorean(barcode) {
    const key = (localStorage.getItem('mfds_api_key') || DEFAULT_API_KEY).trim();
    if (!key) return '';
    const api = `https://openapi.foodsafetykorea.go.kr/api/${key}/C005/json/1/5/BAR_CD=${barcode}`;
    for (const wrap of PROXIES) {
      try {
        const res = await fetch(wrap(api));
        if (!res.ok) continue;
        const data = JSON.parse(await res.text());
        if (!data || !data.C005) continue;          // 형식이 다르면 다음 프록시
        const rows = data.C005.row || [];
        if (!rows.length) return '';                // 정상 응답이나 제품 없음 → 종료
        const r = rows[0];
        const nm = (r.PRDLST_NM || r.PRDT_NM || '').trim();
        const mfr = (r.BSSH_NM || '').trim();
        return nm ? (mfr ? `${nm} (${mfr})` : nm) : '';
      } catch (_) { /* 다음 프록시로 */ }
    }
    return '';
  }

  // ---------- 설정 (API 키) ----------
  const settingsPanel = $('#settings');
  $('#settings-btn').addEventListener('click', () => {
    $('#api-key').value = localStorage.getItem('mfds_api_key') || '';
    settingsPanel.classList.toggle('hidden');
  });
  $('#settings-close').addEventListener('click', () => settingsPanel.classList.add('hidden'));
  $('#settings-save').addEventListener('click', () => {
    const v = $('#api-key').value.trim();
    if (v) localStorage.setItem('mfds_api_key', v);
    else localStorage.removeItem('mfds_api_key');
    settingsPanel.classList.add('hidden');
    toast(v ? 'API 키 저장됨' : 'API 키 삭제됨');
  });

  // 바코드를 직접 입력/수정했을 때도 조회 시도
  $('#barcode').addEventListener('change', () => {
    const v = $('#barcode').value.trim();
    if (v) handleScanned(v);
  });

  function stopScan() {
    scanLoop = null;
    detector = null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    $('#scanner').classList.add('hidden');
  }

  $('#scan-btn').addEventListener('click', startScan);
  $('#scan-stop').addEventListener('click', stopScan);

  // ---------- 초기화 ----------
  $('#purchase').value = todayStr();
  render();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
