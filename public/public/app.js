const $ = s => document.querySelector(s);
const state = { page: 1, query: '', items: [], saved: readStore('dwk_saved', []), mode: 'popular', hls: null };
function readStore(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function writeStore(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2300); }
function esc(value='') { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function updateSavedCount() { $('#savedCount').textContent = state.saved.length; }
async function loadAnime({ reset = true } = {}) {
  if (reset) { state.page = 1; state.items = []; }
  $('#statusLine').textContent = 'Đang tải thư viện anime...';
  const q = state.query.trim();
  try {
    const res = await fetch(`/api/anime/search?q=${encodeURIComponent(q)}&page=${state.page}&perPage=18`);
    const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Không thể tải dữ liệu');
    const incoming = data.items || [];
    state.items = reset ? incoming : [...state.items, ...incoming];
    renderCards();
    $('#statusLine').textContent = `${data.pageInfo.total.toLocaleString('vi-VN')} kết quả trong thư viện anime · Dữ liệu từ AniList`;
    $('#loadMore').hidden = !data.pageInfo.hasNextPage;
  } catch (error) {
    $('#statusLine').textContent = `Không tải được dữ liệu: ${error.message}. Kiểm tra kết nối hoặc thử lại.`;
    if (!state.items.length) $('#animeGrid').innerHTML = '<div class="empty-state">Chưa kết nối được thư viện. Hãy thử tải lại sau.</div>';
  }
}
function renderCards() {
  const year = $('#yearFilter').value, genre = $('#genreFilter').value, format = $('#formatFilter').value;
  const items = state.items.filter(a => (!year || String(a.year) === year) && (!genre || a.genres.includes(genre)) && (!format || a.format === format));
  $('#animeGrid').innerHTML = items.map(a => `<article class="anime-card" data-id="${a.id}"><div class="poster"><img loading="lazy" src="${esc(a.cover)}" alt="${esc(a.title)}" onerror="this.style.opacity='.2'"><span class="format-label">${esc(a.format || 'ANIME')}</span>${a.score ? `<span class="score">★ ${a.score.toFixed(1)}</span>` : ''}<button class="save-btn ${state.saved.includes(a.id)?'saved':''}" data-save="${a.id}" aria-label="Lưu anime">${state.saved.includes(a.id)?'♥':'♡'}</button></div><div class="card-title">${esc(a.title)}</div><div class="card-meta">${a.year || '—'} · ${esc(a.status || 'UNKNOWN')}</div></article>`).join('') || '<p class="muted">Không tìm thấy anime phù hợp bộ lọc.</p>';
}
async function showDetail(id) {
  const a = state.items.find(x => x.id === id) || state.items.find(x => String(x.id) === String(id));
  if (!a) return;
  $('#detailContent').innerHTML = `<div class="detail-layout"><img src="${esc(a.cover)}" alt=""><div><span class="eyebrow">ANIME INFORMATION</span><h2>${esc(a.title)}</h2><p class="muted">${esc(a.titleRomaji)} ${a.year ? '· '+a.year : ''} ${a.score ? '· ★ '+a.score.toFixed(1) : ''}</p><div class="genre-list">${a.genres.map(g=>`<span>${esc(g)}</span>`).join('')}</div><p>${esc((a.description || 'Chưa có mô tả.').replace(/<[^>]*>/g,' ').slice(0,900))}</p><p class="muted">${a.episodes ? a.episodes+' tập dự kiến' : 'Số tập chưa cập nhật'} · ${esc(a.format)}</p><div class="detail-actions"><button class="primary-btn" id="detailPlay">▶ Xem phim</button><button class="outline-btn" id="detailSave">${state.saved.includes(a.id)?'♥ Đã lưu':'♡ Thêm vào tủ phim'}</button></div></div></div>`;
  openModal('detailModal'); $('#detailPlay').onclick = () => openPlayer(a); $('#detailSave').onclick = () => toggleSave(a.id);
}
function toggleSave(id) { state.saved = state.saved.includes(id) ? state.saved.filter(x=>x!==id) : [...state.saved,id]; writeStore('dwk_saved',state.saved); updateSavedCount(); renderCards(); const btn=$('#detailSave'); if(btn) btn.textContent=state.saved.includes(id)?'♥ Đã lưu':'♡ Thêm vào tủ phim'; toast(state.saved.includes(id)?'Đã thêm vào tủ phim':'Đã bỏ khỏi tủ phim'); }
function openModal(id) { $('#'+id).classList.add('open'); $('#'+id).setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
function closeModal(id) { $('#'+id).classList.remove('open'); $('#'+id).setAttribute('aria-hidden','true'); if(!document.querySelector('.modal.open')) document.body.style.overflow=''; }
function openPlayer(a) { closeModal('detailModal'); $('#playerTitle').textContent=a.title; $('#playerSubtitle').textContent='Chưa có tập phim được xuất bản'; $('#playerEmpty').style.display='flex'; $('#videoPlayer').removeAttribute('src'); $('#videoPlayer').load(); if(state.hls){state.hls.destroy();state.hls=null;} openModal('playerModal'); }
$('#animeGrid').addEventListener('click', e => { const save=e.target.closest('[data-save]'); if(save){e.stopPropagation();toggleSave(Number(save.dataset.save));return;} const card=e.target.closest('[data-id]'); if(card) showDetail(Number(card.dataset.id)); });
$('#searchForm').addEventListener('submit', e=>{e.preventDefault();state.query=$('#searchInput').value;$('#sectionTitle').textContent=state.query?`Kết quả: ${state.query}`:'Anime nổi bật';loadAnime();});
$('#clearSearch').onclick=()=>{$('#searchInput').value='';state.query='';loadAnime();}; $('#refreshBtn').onclick=()=>loadAnime(); $('#loadMore').onclick=()=>{state.page++;loadAnime({reset:false});};
['yearFilter','genreFilter','formatFilter'].forEach(id=>$('#'+id).addEventListener('change',renderCards));
document.querySelectorAll('[data-mode]').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('[data-mode]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');state.mode=btn.dataset.mode;state.query='';$('#searchInput').value='';$('#sectionTitle').textContent=btn.textContent+' anime';loadAnime();});
document.querySelectorAll('[data-close]').forEach(btn=>btn.onclick=()=>closeModal(btn.dataset.close));document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id);}));
function openDrawer(){ $('#drawer').classList.add('open');$('#scrim').classList.add('show'); } function closeDrawer(){ $('#drawer').classList.remove('open');$('#scrim').classList.remove('show'); }
$('#menuBtn').onclick=openDrawer;$('#mobileMenu').onclick=openDrawer;$('#closeDrawer').onclick=closeDrawer;$('#scrim').onclick=closeDrawer;
$('#savedTop').onclick=()=>{if(!state.saved.length){toast('Tủ phim của bạn đang trống');return;}state.query='';$('#sectionTitle').textContent='Tủ phim của tôi';const saved=state.items.filter(a=>state.saved.includes(a.id));$('#animeGrid').innerHTML=saved.map(a=>`<article class="anime-card" data-id="${a.id}"><div class="poster"><img src="${esc(a.cover)}"><span class="score">♥ Đã lưu</span></div><div class="card-title">${esc(a.title)}</div></article>`).join('')||'<p class="muted">Các anime đã lưu sẽ hiện tại đây sau khi tải vào thư viện.</p>';$('#statusLine').textContent=`${state.saved.length} anime đã lưu trên thiết bị này`;window.scrollTo({top:document.querySelector('.content-section').offsetTop-80,behavior:'smooth'});};
$('#accountBtn').onclick=()=>toast('Đăng nhập Google sẽ được bật sau khi cấu hình Cloudflare Access / OAuth.');
updateSavedCount();loadAnime();
