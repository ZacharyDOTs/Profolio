(() => {
'use strict';

const PLAY = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2l10 6-10 6z"/></svg>';
const $ = s => document.querySelector(s);
const heroSlot = $('#hero'), grid = $('#grid'), msg = $('#msg');
const dlg = $('#lightbox'), lbImg = $('#lbImg'), lbPrev = $('#lbPrev'), lbNext = $('#lbNext');

let all = [], filter = 'all', lb = { p: null, i: 0 };

// 路徑逐段編碼，中文與空白檔名都能用
const enc = p => p.split('/').map(encodeURIComponent).join('/');
const safeUrl = u => (/^https?:\/\//i.test(u || '') ? u : null);

function el(tag, cls) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  return n;
}

function markOrientation(card, w, h) {
  if (w && h && h > w) card.classList.add('portrait');
}

function makeCard(p, hero) {
  const isVideo = p.type === 'video';
  const card = el('article', 'card' + (hero ? ' hero' : ''));
  const media = el('div', 'media');
  let node;

  if (isVideo) {
    node = el('video');
    node.preload = 'metadata';
    node.playsInline = true;
    node.setAttribute('aria-label', p.title);
    node.addEventListener('loadedmetadata', () => markOrientation(card, node.videoWidth, node.videoHeight));
    node.src = enc(p.video) + '#t=0.001'; // 停在第一個畫面當封面
  } else {
    node = el('img');
    node.alt = p.title;
    node.decoding = 'async';
    node.loading = hero ? 'eager' : 'lazy';
    node.addEventListener('load', () => markOrientation(card, node.naturalWidth, node.naturalHeight));
    node.src = enc(p.images[0]);
  }
  media.append(node);

  const hit = el('button', 'hit');
  hit.type = 'button';
  hit.setAttribute('aria-label', (isVideo ? '播放 ' : '檢視 ') + p.title);
  if (isVideo) {
    const pl = el('span', 'pl');
    pl.innerHTML = PLAY;
    hit.append(pl);
    hit.addEventListener('click', () => {
      document.querySelectorAll('video').forEach(v => { if (v !== node) v.pause(); });
      node.controls = true;
      card.classList.add('started');
      node.play().catch(() => {});
    });
    node.addEventListener('play', () => {
      card.classList.add('started');
      document.querySelectorAll('video').forEach(v => { if (v !== node) v.pause(); });
    });
    node.addEventListener('ended', () => { card.classList.remove('started'); node.controls = false; });
  } else {
    hit.addEventListener('click', () => openLightbox(p, 0));
  }
  media.append(hit);

  const bar = el('div', 'bar');
  const tt = el('span', 'tt'); tt.textContent = p.title;
  const meta = el('span', 'meta');
  const yt = safeUrl(p.youtube);
  if (isVideo && yt) {
    const a = el('a', 'yt');
    a.href = yt; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = 'YouTube ↗';
    a.setAttribute('aria-label', p.title + '：在 YouTube 觀看高畫質版本');
    meta.append(a);
  }
  const cg = el('span', 'cg');
  const kind = isVideo ? 'VIDEO' : 'PHOTO' + (p.images.length > 1 ? ' · ' + p.images.length : '');
  cg.textContent = [p.category, kind].filter(Boolean).join(' / ');
  meta.append(cg);
  bar.append(tt, meta);

  card.append(media, bar);
  return card;
}

function render() {
  const list = all.filter(p => filter === 'all' || p.type === filter);
  heroSlot.replaceChildren();
  grid.replaceChildren();
  msg.hidden = true;
  if (!list.length) {
    say(all.length ? '這個分類目前沒有作品。' : '還沒有作品。把作品資料夾放進 projects/ 之後重新部署即可。');
    return;
  }
  // 主打：全部 = 最前面的動態（右、大橫幅）+ 最前面的平面（左、直式）；單一分類則只放最前面那個
  const v = list.find(p => p.type === 'video'), ph = list.find(p => p.type === 'photo');
  let featured;
  if (filter === 'all' && v && ph) {
    const row = el('div', 'feat-row');
    const left = makeCard(ph, true); left.classList.add('feat-photo');
    const right = makeCard(v, true); right.classList.add('feat-video');
    row.append(left, right);
    heroSlot.append(row);
    featured = [ph, v];
  } else {
    heroSlot.append(makeCard(list[0], true));
    featured = [list[0]];
  }
  list.filter(p => !featured.includes(p)).forEach(p => grid.append(makeCard(p, false)));
}

function say(t) { msg.textContent = t; msg.hidden = false; }

document.querySelectorAll('.f').forEach(b => b.addEventListener('click', () => {
  filter = b.dataset.filter;
  document.querySelectorAll('.f').forEach(x => {
    const on = x === b;
    x.classList.toggle('on', on);
    x.setAttribute('aria-pressed', on);
  });
  render();
}));

/* ---------- 照片燈箱 ---------- */
function showImg(i) {
  const n = lb.p.images.length;
  lb.i = (i + n) % n;
  lbImg.src = enc(lb.p.images[lb.i]);
  lbImg.alt = lb.p.title + ' ' + (lb.i + 1);
  $('#lbCount').textContent = (lb.i + 1) + ' / ' + n;
  lbPrev.hidden = lbNext.hidden = n < 2;
  if (n > 1) [lb.i + 1, lb.i - 1].forEach(j => { new Image().src = enc(lb.p.images[(j + n) % n]); });
}
function openLightbox(p, i) {
  lb.p = p;
  $('#lbTitle').textContent = p.title;
  $('#lbCat').textContent = p.category || '';
  showImg(i);
  document.body.style.overflow = 'hidden';
  dlg.showModal();
}
$('#lbClose').addEventListener('click', () => dlg.close());
lbPrev.addEventListener('click', () => showImg(lb.i - 1));
lbNext.addEventListener('click', () => showImg(lb.i + 1));
dlg.addEventListener('close', () => { document.body.style.overflow = ''; lbImg.removeAttribute('src'); });
dlg.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') showImg(lb.i + 1);
  else if (e.key === 'ArrowLeft') showImg(lb.i - 1);
});
dlg.addEventListener('click', e => {
  if (e.target === dlg || e.target.classList.contains('lb-stage')) dlg.close();
});
let sx = null;
lbImg.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
lbImg.addEventListener('touchend', e => {
  if (sx === null) return;
  const dx = e.changedTouches[0].clientX - sx;
  sx = null;
  if (Math.abs(dx) > 50) showImg(lb.i + (dx < 0 ? 1 : -1));
});

/* ---------- 載入 ---------- */
fetch('projects.json', { cache: 'no-cache' })
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(d => { all = d.projects || []; render(); })
  .catch(() => say('讀不到 projects.json。本機預覽請先執行 python build.py，再用 python -m http.server 開啟，不要直接點開 index.html。'));
})();
