const $=s=>document.querySelector(s);
let data=[],view='active',busy=false,page=1,browsing=false;
const fmt=d=>{if(!d)return 'Not specified';const date=new Date(d);return Number.isNaN(date.valueOf())?'Not specified':date.toLocaleString('en-MY',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});};
const dateMs=d=>d&&Number.isFinite(Date.parse(d))?Date.parse(d):Infinity;
let toastTimer;
function show(message, isError = false, undo) {
  const toast = $('#status');
  const button = $('#toast-undo');
  clearTimeout(toastTimer);
  $('#toast-message').textContent = message;
  $('#toast-icon').textContent = isError ? '!' : '✓';
  toast.classList.remove('hidden');
  toast.classList.toggle('error', isError);
  button.classList.toggle('hidden', !undo);
  button.onclick = undo ? async () => {
    button.onclick = null;
    try { await undo(); } catch { show('Couldn’t undo that change. Please try again.', true); }
  } : null;
  if (!undo && !isError) toastTimer = setTimeout(() => toast.classList.add('hidden'), 5500);
}
function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function safeSource(url){try{const u=new URL(url);return u.protocol==='https:'&&['ukmfoliov2.ukm.my','ukmfolio.ukm.my','ukmfolio.ukm.qa'].includes(u.hostname)?u.href:'';}catch{return '';}}
async function refresh(){data=await FolioDB.all();render();}
const dueThisWeek = (record, now) => {
  const due = dateMs(record.due);
  return !record.completed && due >= now && due <= now + 7 * 86_400_000;
};
function render() {
  const now = Date.now();
  const active = data.filter(r => r.del !== 1);
  const hidden = data.filter(r => r.del === 1);
  const todo = active.filter(r => !r.completed);
  const done = active.filter(r => r.completed);
  const soon = active.filter(r => dueThisWeek(r, now));
  const views = { active, hidden, todo, done, soon, all: data };
  for (const [id, value] of Object.entries({
    'count-active': active.length, 'count-hidden': hidden.length, 'count-all': data.length
  })) $('#' + id).textContent = value;
  const pct = active.length ? Math.round(100 * done.length / active.length) : 0;
  $('#progress-count').textContent = `${done.length} of ${active.length} done`;
  $('#progress-pct').textContent = `${pct}% complete`;
  $('#progress').max = active.length || 1;
  $('#progress').value = done.length;
  const queue = FolioFocus.queue(data, now);
  $('#focus-items').replaceChildren(...queue.map(record => assignmentCard(record, now, true)));
  $('#focus-empty').classList.toggle('hidden', queue.length > 0);
  $('#focus-empty').textContent = active.length ? 'You’re caught up.' : 'Open UKMFolio to bring in your assignments, or add one here.';
  $('#focus-summary').textContent = todo.length ? `Showing ${queue.length} of ${todo.length} to do` : '';
  $('#browse-more').classList.toggle('hidden', !data.length);
  $('#focus-panel').classList.toggle('hidden', browsing);
  $('#browse-panel').classList.toggle('hidden', !browsing);
  for (const [id, selected] of [['focus-tab', !browsing], ['browse-tab', browsing]]) {
    $('#' + id).classList.toggle('selected', selected);
    $('#' + id).setAttribute('aria-pressed', selected);
  }
  $('#view-title').textContent = { active: 'Assignments', hidden: 'Hidden assignments', todo: 'To do', done: 'Done', soon: 'Due in the next 7 days', all: 'All assignments' }[view];
  document.querySelectorAll('[data-view]').forEach(button => {
    const selected = button.dataset.view === view;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', selected);
  });
  const course = $('#course');
  const selected = course.value;
  const courses = [...new Set(data.map(r => r.course || 'Unknown course'))].sort();
  course.replaceChildren(new Option('All courses', ''), ...courses.map(c => new Option(c, c)));
  if (courses.includes(selected)) course.value = selected;
  const query = $('#search').value.trim().toLowerCase();
  const order = $('#sort').value;
  const rows = views[view].filter(r => (!course.value || (r.course || 'Unknown course') === course.value) &&
    (!query || `${r.title} ${r.course} ${r.type}`.toLowerCase().includes(query)));
  rows.sort((a, b) => order === 'course' ? (a.course || '').localeCompare(b.course || '') :
    order === 'title' ? a.title.localeCompare(b.title) : order === 'updated' ? (b.lastSeen || '').localeCompare(a.lastSeen || '') :
    (dateMs(a.due) - dateMs(b.due)) || a.title.localeCompare(b.title));
  const shown = FolioFocus.paginate(rows, page);
  page = shown.page;
  $('#list-count').textContent = rows.length ? `Showing ${shown.start + 1}–${shown.end} of ${rows.length} assignments` : '';
  $('#pager').classList.toggle('hidden', shown.pages === 1);
  $('#page-label').textContent = `Page ${page} of ${shown.pages}`;
  $('#previous').disabled = page === 1;
  $('#next').disabled = page === shown.pages;
  const empty = $('#empty');
  empty.classList.toggle('hidden', rows.length > 0);
  empty.textContent = query || course.value ? 'No matches. Try a different search or course.' :
    ({ hidden: 'Nothing hidden. You can bring back hidden assignments here.', done: 'Check off an assignment and it will appear here.',
      soon: 'Nothing due in the next 7 days.', todo: 'Nothing to do here. You’re all caught up!' }[view] || 'No assignments yet. Open UKMFolio or add one yourself.');
  const body = $('#rows');
  body.replaceChildren(...shown.rows.map(record => assignmentCard(record, now)));
}
function assignmentCard(record, now, isFocus = false) {
  const card = el('article', 'assignment');
  const details = el('div');
  const url = safeSource(record.url);
  const title = el(url ? 'a' : 'div', 'task-title', record.title);
  if (url) {
    title.href = url;
    title.target = '_blank';
    title.rel = 'noopener noreferrer';
  }
  const type = { assign: 'Assignment', quiz: 'Quiz', workshop: 'Workshop' }[record.type] || record.type || 'Assignment';
  const meta = el('p', 'task-meta', `${record.course || 'Unknown course'} · ${type} · `);
  const deadline = FolioFocus.deadline(record, now);
  if (Number.isFinite(dateMs(record.due))) meta.append(el('span', '', fmt(record.due)));
  else meta.append(el('span', '', 'No due date'));
  if (isFocus || deadline.tone !== 'neutral') {
    details.append(el('span', 'deadline ' + deadline.tone, deadline.label));
  }
  details.append(title, meta);
  const actions = el('div', 'row-actions');
  const complete = el('button', 'complete', record.completed ? '✓ Done' : 'Mark done');
  complete.setAttribute('aria-pressed', Boolean(record.completed));
  complete.setAttribute('aria-label', `${record.completed ? 'Mark as to do' : 'Mark done'}: ${record.title}`);
  complete.addEventListener('click', () => updateAssignment(record, 'completed', !record.completed, record.completed ? 'Moved back to To do.' : 'Marked done. Nice work!'));
  const hidden = record.del === 1;
  const visibility = el('button', '', hidden ? 'Restore' : 'Hide');
  visibility.setAttribute('aria-label', `${hidden ? 'Restore' : 'Hide'}: ${record.title}`);
  visibility.addEventListener('click', () => updateAssignment(record, 'del', hidden ? 0 : 1, hidden ? 'Assignment restored.' : 'Assignment hidden. Find it under Hidden.'));
  actions.append(complete, visibility);
  card.append(details, actions);
  return card;
}
async function updateAssignment(record, field, value, message) {
  try {
    await FolioDB.patch(record.id, { [field]: value });
    await refresh();
    show(message, false, async () => {
      await FolioDB.patch(record.id, { [field]: record[field] });
      await refresh();
      show('Change undone.');
    });
  } catch {
    show('Couldn’t save that change. Please try again.', true);
  }
}
const FOLIO_HOSTS=['ukmfoliov2.ukm.my','ukmfolio.ukm.my','ukmfolio.ukm.qa'];
const hostFromUrl=url=>{try{return new URL(url).hostname.toLowerCase();}catch{return '';}};
async function activeSiteTab(){
 const tabs=await chrome.tabs.query({});
 const active=await chrome.tabs.query({active:true,currentWindow:true});
 const allowed=t=>FOLIO_HOSTS.includes(hostFromUrl(t.url));
 return active.find(allowed)||tabs.find(allowed);
}
async function sync() {
  if (busy) return;
  busy = true;
  const button = $('#sync');
  button.disabled = true;
  button.textContent = 'Refreshing…';
  try {
    const tab = await activeSiteTab();
    if (!tab || new URL(tab.url).pathname.startsWith('/login/')) {
      show('Open UKMFolio, sign in, then try refreshing again.', true);
      return;
    }
    const permitted = await chrome.permissions.contains({ origins: [`https://${hostFromUrl(tab.url)}/*`] });
    if (!permitted) {
      show('Allow Folio Organizer on UKMFolio from Chrome’s Extensions menu, then try again.', true);
      return;
    }
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['extractor.js', 'auto-sync.js'] });
    const [response] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => globalThis.__folioSync(true) });
    const result = response?.result;
    if (result?.state === 'busy') show('UKMFolio is already syncing in another tab.');
    else if (result?.state !== 'done') show('Couldn’t refresh assignments. Check that you’re signed in and try again.', true);
    else if (!result.count) show('No assignments found. Try opening My courses on UKMFolio first.', true);
    else if (result.partial) show(`Found ${result.count} activities. Some pages couldn’t be read.`);
    else show(result.added ? `Added ${result.added} new ${result.added === 1 ? 'activity' : 'activities'}.` : 'Your assignments are up to date.');
    await refresh();
    await loadMeta();
  } catch {
    show('Couldn’t open your UKMFolio tab. Reload it and try again.', true);
  } finally {
    busy = false;
    button.disabled = false;
    button.textContent = 'Refresh assignments';
  }
}
function exportExcel(){const keys=['Course','Title','Type','Due Date (ISO)','Completed','del','Source URL','Source','ID','Last Seen','Notes'];const row=r=>[r.course,r.title,r.type,r.due||'',r.completed?'1':'0',String(r.del===1?1:0),r.url||'',r.source||'',r.id,r.lastSeen||'',r.notes||''];const tabs=[{name:'Active Assignments',records:data.filter(r=>r.del!==1)},{name:'Hidden Assignments',records:data.filter(r=>r.del===1)},{name:'All Records',records:data}].map(t=>({name:t.name,rows:[keys,...t.records.map(row)]}));download(FolioXLSX.build(tabs),`UKMFolio-Assignments-${new Date().toISOString().slice(0,10)}.xlsx`);show('Your Excel download is ready.');}
function backup(){download(new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),records:data},null,2)],{type:'application/json'}),`UKMFolio-Backup-${new Date().toISOString().slice(0,10)}.json`);}
async function restore(file){try{const json=JSON.parse(await file.text());if(!Array.isArray(json.records)||json.records.length>10000)throw Error('Invalid or oversized backup');let count=0;for(const r of json.records){if(typeof r.id!=='string'||typeof r.title!=='string'||r.id.length>400||r.title.length>1000)continue;const clean={id:r.id,course:String(r.course||'Unknown').slice(0,250),courseId:String(r.courseId||''),title:r.title,type:String(r.type||'Assignment').slice(0,50),due:String(r.due||''),url:safeSource(r.url),source:String(r.source||'Backup'),del:r.del===1?1:0,completed:!!r.completed,notes:String(r.notes||'').slice(0,2000),lastSeen:String(r.lastSeen||''),createdAt:String(r.createdAt||'')};await FolioDB.save(clean);count++;}await refresh();show(`Restored ${count} assignments from your backup.`);}catch(e){show(`Couldn’t restore this backup. Choose a backup from Folio Organizer.`,true);}}
async function loadMeta(){
 const {lastSync}=await chrome.storage.local.get('lastSync');
 const {folioSyncLease}=await chrome.storage.session.get('folioSyncLease');
 $('#stat-sync').textContent=folioSyncLease?.expires>Date.now()?'Checking UKMFolio for assignments…':lastSync?'Last synced '+fmt(lastSync):'Open UKMFolio while signed in to sync automatically.';
}
chrome.storage.onChanged.addListener((changes, area) => {
 if (area==='session' && changes.folioSyncLease) loadMeta();
 if (area==='local' && (changes.lastSync || changes.folioSyncRevision)) { refresh(); loadMeta(); }
});
document.addEventListener('DOMContentLoaded',async()=>{

 function openView(value) {
   browsing = value;
   render();
   $(value ? '#view-title' : '#focus-title').focus();
 }
 $('#focus-tab').addEventListener('click', () => openView(false));
 $('#browse-tab').addEventListener('click', () => openView(true));
 $('#browse-more').addEventListener('click', () => openView(true));
 $('#manual-focus').addEventListener('click', () => $('#manual-dialog').showModal());
 for (const [id, step] of [['previous', -1], ['next', 1]]) {
   $('#' + id).addEventListener('click', () => {
     page += step;
     render();
     if ($('#' + id).disabled) $(step < 0 ? '#next' : '#previous').focus();
   });
 }
 $('#toast-close').addEventListener('click',()=>$('#status').classList.add('hidden'));
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;page=1;render();}));
 ['search','course','sort'].forEach(id=>$('#'+id).addEventListener(id==='search'?'input':'change',()=>{page=1;render();}));
 $('#sync').addEventListener('click',sync);$('#export').addEventListener('click',exportExcel);$('#backup').addEventListener('click',backup);$('#restore-file').addEventListener('click',()=>$('#import').click());$('#import').addEventListener('change',async e=>{if(e.target.files[0])await restore(e.target.files[0]);e.target.value='';});
 $('#manual').addEventListener('click',()=>$('#manual-dialog').showModal());$('#cancel-manual').addEventListener('click',()=>$('#manual-dialog').close());
 $('#manual-form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),id=`manual:${crypto.randomUUID()}`;await FolioDB.save({id,course:String(f.get('course')).trim(),title:String(f.get('title')).trim(),due:f.get('due')?new Date(f.get('due')).toISOString():'',url:safeSource(String(f.get('url'))),type:'Assignment',source:'Manual',del:0,completed:false,notes:'',lastSeen:new Date().toISOString()});$('#manual-dialog').close();e.target.reset();await refresh();show('Assignment added.');});
 await refresh();await loadMeta();if(new URLSearchParams(location.search).has('sync'))sync();
});
