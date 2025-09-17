// Storage
const STORAGE_KEY = 'domowe-terminy:v3';
const now = () => new Date();
const toISODate = d => d.toISOString().slice(0,10);
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const load = () => { try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){ return []; } };
const save = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

let items = load(); let filter = 'all', catFilter = '', search = '';

const els = {
  form: document.getElementById('form'), title: document.getElementById('title'), date: document.getElementById('date'),
  category: document.getElementById('category'), repeat: document.getElementById('repeat'),
  customDaysWrap: document.getElementById('customDaysWrap'), customDays: document.getElementById('customDays'),
  advance: document.getElementById('advance'), time: document.getElementById('time'), location: document.getElementById('location'),
  duration: document.getElementById('duration'), notes: document.getElementById('notes'), editId: document.getElementById('editId'),
  formHint: document.getElementById('formHint'), resetBtn: document.getElementById('resetBtn'),
  items: document.getElementById('items'), empty: document.getElementById('empty'),
  exportIcsBtn: document.getElementById('exportIcsBtn'), exportJsonBtn: document.getElementById('exportJsonBtn'),
  importJsonBtn: document.getElementById('importJsonBtn'), importJsonInput: document.getElementById('importJsonInput'),
  toast: document.getElementById('toast'), search: document.getElementById('search'), catFilter: document.getElementById('catFilter'),
};
els.date.value = toISODate(now());

// Helpers
const daysBetween = (a,b)=>Math.floor((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/86400000);
function parseDate(iso){ const [y,m,d]=iso.split('-').map(Number); return new Date(y,m-1,d); }
function addDays(dt,n){ const d=new Date(dt); d.setDate(d.getDate()+n); return d; }
function addMonths(dt,n){ const d=new Date(dt); const day=d.getDate(); d.setMonth(d.getMonth()+n); if(d.getDate()<day){d.setDate(0);} return d; }
function addYears(dt,n){ const d=new Date(dt); d.setFullYear(d.getFullYear()+n); return d; }
function nextOccurrence(base, repeat, customDays){ let d=new Date(base.getTime()); const today=new Date(); today.setHours(0,0,0,0); if(repeat==='none') return d; while(d<today){ if(repeat==='monthly') d=addMonths(d,1); else if(repeat==='yearly') d=addYears(d,1); else if(repeat==='custom') d=addDays(d, Math.max(1, Number(customDays||0))); } return d; }
function repeatLabel(r,x){ return r==='none'?'—':r==='monthly'?'Miesięcznie':r==='yearly'?'Rocznie':`Co ${x} dni`; }
function escapeHtml(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// Render
function render(){
  const today=new Date(); today.setHours(0,0,0,0);
  let list=items.map(it=>({ ...it, due: nextOccurrence(parseDate(it.date), it.repeat, it.customDays) }));
  if(filter==='week'){ const u=addDays(today,7); list=list.filter(i=>i.due<=u && i.due>=today); }
  else if(filter==='month'){ const u=addMonths(today,1); list=list.filter(i=>i.due<=u && i.due>=today); }
  else if(filter==='overdue'){ list=list.filter(i=>i.due<today); }
  if(catFilter) list=list.filter(i=>i.category===catFilter);
  if(search){ const s=search.toLowerCase(); list=list.filter(i=>i.title.toLowerCase().includes(s) || (i.notes||'').toLowerCase().includes(s)); }
  list.sort((a,b)=> a.due-b.due || a.title.localeCompare(b.title));
  els.items.innerHTML=''; els.empty.style.display=list.length?'none':'block';
  for(const it of list){
    const isOverdue = it.due < today; const diff = daysBetween(today,it.due);
    const countdown = isOverdue ? `po terminie ${-diff} d.` : diff===0 ? 'dziś' : `za ${diff} d.`;
    const card=document.createElement('div'); card.className='item ' + (isOverdue?'overdue': diff<=3?'soon':''); card.dataset.id=it.id;
    card.innerHTML=`<div class="item-head"><div class="title">${escapeHtml(it.title)}</div><span class="badge">${countdown}</span></div>
    <div class="item-meta">
      ${it.time?`<span class="tag">${escapeHtml(it.time)}</span>`:''}
      <span class="tag">${escapeHtml(it.category||'—')}</span>
      <span class="tag">${repeatLabel(it.repeat, it.customDays)}</span>
      <span class="tag">${toISODate(it.due)}</span>
    </div>
    ${it.location?`<div class="item-loc">${escapeHtml(it.location)}</div>`:''}
    ${it.notes?`<div class="item-notes">${escapeHtml(it.notes)}</div>`:''}
    <div class="controls"><button class="btn ghost" data-action="edit">Edytuj</button><button class="btn" data-action="ics">.ics</button><button class="btn danger" data-action="del">Usuń</button></div>`;
    els.items.appendChild(card);
  }
}

// Form
els.repeat.addEventListener('change', ()=>{ els.customDaysWrap.style.display = els.repeat.value==='custom' ? '' : 'none'; });
els.form.addEventListener('submit', (e)=>{
  e.preventDefault();
  const id=els.editId.value||uid();
  const rec = {
    id, title: els.title.value.trim(), date: els.date.value,
    time: els.time.value||"", duration: Number(els.duration.value||60), location: els.location.value.trim(),
    category: els.category.value, repeat: els.repeat.value,
    customDays: els.repeat.value==='custom' ? Number(els.customDays.value||0) : 0,
    advance: Number(els.advance.value), notes: els.notes.value.trim(),
    createdAt: els.editId.value ? undefined : new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  if(!rec.title || !rec.date){ toast('Uzupełnij nazwę i datę'); return; }
  const i = items.findIndex(x=>x.id===id);
  if(i>=0) items[i] = {...items[i], ...rec}; else items.push(rec);
  save(items); render(); toast(i>=0?'Zaktualizowano termin':'Dodano termin'); clearForm();
});
els.resetBtn.addEventListener('click', clearForm);
function clearForm(){ els.form.reset(); els.customDaysWrap.style.display='none'; els.date.value=toISODate(now()); els.editId.value=''; els.formHint.textContent='Dodajesz nowy termin'; }

// Item actions
els.items.addEventListener('click', (e)=>{
  const btn=e.target.closest('button'); if(!btn) return;
  const action=btn.dataset.action; const root=e.target.closest('.item'); const id=root?.dataset.id;
  const it=items.find(x=>x.id===id); if(!it) return;
  if(action==='del'){ if(confirm('Usunąć ten termin?')){ items = items.filter(x=>x.id!==id); save(items); render(); toast('Usunięto'); } }
  else if(action==='edit'){
    els.editId.value=it.id; els.title.value=it.title; els.date.value=it.date; els.category.value=it.category;
    els.repeat.value=it.repeat; els.customDaysWrap.style.display=it.repeat==='custom'?'':''; els.customDays.value=it.customDays||30;
    els.advance.value=it.advance||0; els.time.value=it.time||""; els.duration.value=it.duration||60; els.location.value=it.location||""; els.notes.value=it.notes||'';
    els.formHint.textContent='Edytujesz istniejący termin'; window.scrollTo({top:0, behavior:'smooth'});
  } else if(action==='ics'){ downloadIcs([it]); }
});

// Toolbar
document.querySelectorAll('[data-filter]').forEach(btn=> btn.addEventListener('click', ()=>{ filter=btn.dataset.filter; render(); }));
els.search.addEventListener('input', e=>{ search = e.target.value; render(); });
els.catFilter.addEventListener('change', e=>{ catFilter = e.target.value; render(); });

// Import/Export JSON
els.exportJsonBtn.addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(items, null, 2)], {type:'application/json'});
  downloadBlob(blob, 'domowe-terminy.json');
});
els.importJsonBtn.addEventListener('click', ()=> els.importJsonInput.click());
els.importJsonInput.addEventListener('change', (e)=>{
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{ try{ const data=JSON.parse(reader.result); if(Array.isArray(data)){ items=data; save(items); render(); toast('Zaimportowano dane'); } else throw new Error('Zły format'); } catch(err){ alert('Nie udało się zaimportować: ' + err.message); } };
  reader.readAsText(file); e.target.value='';
});

// ICS helpers
function icsEscape(t){ return String(t||'').replace(/([,;])/g,'\\$1').replace(/\n/g,'\\n'); }
function icsDateValue(d){ return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; }
function toUtc(d){ const z=new Date(d.getTime()-d.getTimezoneOffset()*60000); return z.toISOString().replace(/[-:]/g,'').slice(0,15)+'Z'; }
function withTime(dateObj,timeStr){ if(!timeStr) return new Date(dateObj); const [hh,mm]=timeStr.split(':').map(Number); const d=new Date(dateObj); d.setHours(hh||0,mm||0,0,0); return d; }

function buildIcs(list){
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//DomoweTerminy//PL//','CALSCALE:GREGORIAN'];
  const dtstamp=new Date();
  for(const it of list){
    const dueDate = (it.due instanceof Date)?it.due:nextOccurrence(parseDate(it.date), it.repeat, it.customDays);
    const start = withTime(dueDate, it.time);
    const summary = icsEscape(it.title);
    const desc = [it.category?`Kategoria: ${it.category}`:null, (it.repeat&&it.repeat!=='none')?`Powtarzanie: ${repeatLabel(it.repeat,it.customDays)}`:null, it.notes?`Notatki: ${it.notes}`:null].filter(Boolean).join('\n');
    const uidVal = it.id + '@domoweterminy.local';
    lines.push('BEGIN:VEVENT'); lines.push(`UID:${uidVal}`); lines.push(`DTSTAMP:${toUtc(dtstamp)}`); lines.push(`SUMMARY:${summary}`);
    if(it.time){ const end=new Date(start.getTime()+(Number(it.duration||60)*60000)); lines.push(`DTSTART:${toUtc(start)}`); lines.push(`DTEND:${toUtc(end)}`); }
    else{ const dateStr=icsDateValue(start); lines.push(`DTSTART;VALUE=DATE:${dateStr}`); }
    if(it.location) lines.push(`LOCATION:${icsEscape(it.location)}`);
    lines.push(`DESCRIPTION:${icsEscape(desc)}`);
    const adv=Number(it.advance||0); if(adv>0){ lines.push('BEGIN:VALARM','ACTION:DISPLAY',`TRIGGER:-P${adv}D`,`DESCRIPTION:${summary}`,'END:VALARM'); }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR'); return lines.join('\r\n');
}

// iOS/Safari handling
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isSafari = /^((?!chrome|crios|fxios|edgios).)*safari/i.test(navigator.userAgent);
const isStandalonePWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
const isIOSWebView = isIOS && !isSafari && !isStandalonePWA;

async function downloadIcs(list, filename='domowe-terminy.ics'){
  if(!list || list.length===0){ toast('Brak pozycji do eksportu'); return; }
  const ics = buildIcs(list);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });

  if (isIOSWebView || isIOS) {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    toast('Na nowej karcie stuknij „Dodaj wszystkie”');
    return;
  }
  if (navigator.canShare) {
    try { const file = new File([ics], filename, { type: 'text/calendar' });
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Domowe terminy' }); toast('Udostępniono plik .ics'); return; }
    } catch(_){}
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url); toast('Wyeksportowano plik .ics');
}

els.exportIcsBtn.addEventListener('click', ()=>{
  const today=new Date(); today.setHours(0,0,0,0);
  let list=items.map(it=>({ ...it, due: nextOccurrence(parseDate(it.date), it.repeat, it.customDays) }));
  if(filter==='week'){ const u=addDays(today,7); list=list.filter(i=>i.due<=u && i.due>=today); }
  else if(filter==='month'){ const u=addMonths(today,1); list=list.filter(i=>i.due<=u && i.due>=today); }
  else if(filter==='overdue'){ list=list.filter(i=>i.due<today); }
  if(catFilter) list=list.filter(i=>i.category===catFilter);
  if(search){ const s=search.toLowerCase(); list=list.filter(i=>i.title.toLowerCase().includes(s) || (i.notes||'').toLowerCase().includes(s)); }
  downloadIcs(list);
});

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function toast(msg){
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(els.toast._t);
  els.toast._t = setTimeout(()=> els.toast.classList.remove('show'), 2200);
}

render();
