/* Runs only within an existing UKMFolio tab during manual or automatic sync.
   No credentials, session tokens or passwords leave the tab. */
(() => {
  if (globalThis.__folioExtractor) return;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const normalize=s=>(s||'').replace(/\s+/g,' ').trim();
  const getId=(href,key='id')=>{try{return new URL(href,location.origin).searchParams.get(key)||'';}catch{return '';}};
  const fullUrl=s=>{try{const u=new URL(s,location.origin);return u.origin===location.origin?u.href:'';}catch{return '';}};
  const getDoc=async(path)=>{const u=fullUrl(path);if(!u)return null;const r=await fetch(u,{credentials:'same-origin',redirect:'follow',cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error(`HTTP ${r.status} fetching ${new URL(u).pathname}`);if(!new URL(r.url).pathname.startsWith('/login/')&&r.headers.get('content-type')?.includes('html')){const html=await r.text();const doc=new DOMParser().parseFromString(html,'text/html');if(doc.querySelector('form#login, form[action*="/login/index.php"]'))return null;return doc;}return null;};
  const courseName=(doc,courseId)=>normalize(doc.querySelector('.page-header-headings h1, #page-header h1, h1')?.textContent)||`Course ${courseId}`;
  const dateParse=(text)=>{
    if(!text)return '';
    const t=normalize(text);
    const m=t.match(/(?:due(?: date)?|tarikh akhir|tarikh tutup|close(?:s)?|deadline)\s*:?\s*(.{5,90})/i);
    const raw=(m?m[1]:t).replace(/^(?:on|at)\s+/i,'').trim();
    const d=Date.parse(raw);
    if(Number.isFinite(d))return new Date(d).toISOString();
    const short=raw.match(/(?:\d{1,2}\s+)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}(?:,?\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)?/i);
    if(short){const v=Date.parse(short[0]);if(Number.isFinite(v))return new Date(v).toISOString();}
    return '';
  };
  function findDue(scope){
    const candidates=[...scope.querySelectorAll('.activity-dates,.activitydate, .duedate, [data-region="activity-dates"], .description, .cell.c3, .cell.c4, td, .date, .calendar_event_course, .submissionstatustable')].map(e=>normalize(e.textContent)).filter(t=>t.length<650);
    for(const t of candidates){if(/\b(due|deadline|tarikh akhir|tarikh tutup)\b/i.test(t)){const d=dateParse(t);if(d)return d;}}
    const text=normalize(scope.textContent).slice(0,1500);const match=text.match(/(?:due(?: date)?|deadline|tarikh akhir|tarikh tutup)\s*:?\s*([^\n]{8,55})/i);return match?dateParse(match[0]):'';
  }
  const fromLink=(a,course,courseId)=>{
    const url=fullUrl(a.href);if(!url)return null;
    const activityUrl = new URL(url);
    if (activityUrl.searchParams.has('action')) return null;
    const path = activityUrl.pathname;
    const match=path.match(/\/mod\/(assign|quiz|workshop|lesson|forum|choice)\/view\.php$/);
    if(!match)return null;
    if(match[1]==='forum'||match[1]==='choice'||match[1]==='lesson')return null;
    const cmid=getId(url);if(!cmid)return null;
    const type=match[1];
    const item=a.closest('li.activity, .activity-item, .activity, tr, .card, .event, .timeline-event')||a.parentElement;
    let title=normalize(a.querySelector('.instancename')?.textContent||a.textContent).replace(/\s*(Assignment|Quiz|Workshop)\s*$/i,'');
    if(!title||title.length>250)title=normalize(a.textContent).slice(0,200);
    if (!title || /^(?:add submission|edit submission|view submission|submit assignment|attempt quiz|view activity)$/i.test(title)) return null;
    return {id:`${location.host}:cm:${cmid}`,courseId:String(courseId||''),course:course||'Unknown course',title,type,due:findDue(item||a),url,source:'UKMFolio',lastSeen:new Date().toISOString()};
  };
  function scanLinks(doc,course,courseId){const out=[];for(const a of doc.querySelectorAll('a[href*="/mod/"]')){const item=fromLink(a,course,courseId);if(item)out.push(item);}return out;}
  async function run(){
    const errors=[];
    const pathname=location.pathname;
    if(document.querySelector('form#login, form[action*="/login/index.php"]')||pathname.startsWith('/login/'))throw Error('Please log in to UKMFolio first, then sync again.');
    const courses=new Map(),records=new Map();
    const add=r=>{if(!r?.id)return;const old=records.get(r.id);records.set(r.id,old?{...old,...r,title:old.title,due:r.due||old.due,course:r.course==='Unknown course'?old.course:r.course}:r);};
    function findCourses(doc){
      const selectors='a[href*="/course/view.php?id="], a[href*="/course/view.php?"]';
      for(const a of doc.querySelectorAll(selectors)){
        const u=fullUrl(a.href),id=getId(u);if(!u||!id)continue;
        const container=a.closest('.coursebox, .course-info-container, .course-card, .card, .coursename, .course-listitem');
        const title=normalize(a.querySelector('.coursename, .multiline')?.textContent||a.textContent||container?.querySelector('.coursename')?.textContent);
        if(title&&title.length<200&&!/^(course|view course|go to course|enter)$/i.test(title))courses.set(id,{id,name:title,url:u});
      }
    }
    const mainDocs=[document];
    const pages=['/my/','/my/courses.php','/calendar/view.php?view=upcoming'];
    for(const p of pages){try{const d=await getDoc(p);if(d)mainDocs.push(d);else errors.push(`${p}: not accessible or login required`);}catch(e){errors.push(`${p}: ${e.message}`);}await sleep(180);}
    for(const doc of mainDocs)findCourses(doc);
    let scanned=0;
    for(const [id,c] of courses){
      if(scanned>=40){errors.push('Course scan capped at 40 courses per sync');break;}
      scanned++;
      try{
        const d=await getDoc(c.url);if(!d){errors.push(`Course ${id}: not accessible`);continue;}
        const actual=courseName(d,id);if(actual)c.name=actual;
        for(const item of scanLinks(d,c.name,id))add(item);
        await sleep(240);
        // Moodle module indices can expose activities that are not shown in the main course page.
        for(const moduleType of ['assign','quiz']){
          try{const index=await getDoc(`/mod/${moduleType}/index.php?id=${encodeURIComponent(id)}`);if(index)for(const item of scanLinks(index,c.name,id))add(item);}catch(e){errors.push(`Course ${id} ${moduleType} index: ${e.message}`);}await sleep(180);
        }
      }catch(e){errors.push(`Course ${id}: ${e.message}`);}
    }
    // If directly on a course, support sites that don't expose the course in /my/ links.
    const currentCourseId=getId(location.href);
    if(pathname==='/course/view.php'&&currentCourseId&&!courses.has(currentCourseId)){
      for(const item of scanLinks(document,courseName(document,currentCourseId),currentCourseId))add(item);
    }
    // Enrich structured due dates from the activity detail pages (bounded, no submissions or writes).
    let detailed=0;
    for(const item of records.values()){
      if(detailed>=75){errors.push('Detailed activity scan capped at 75 per sync');break;}
      if(item.due)continue;
      detailed++;
      try{const d=await getDoc(item.url);if(d)item.due=findDue(d)||'';}catch(e){errors.push(`${item.id}: ${e.message}`);}await sleep(180);
    }
    // Discover calendar items only if they link to a supported assignment/quiz module.
    for(const doc of mainDocs)for(const item of scanLinks(doc,'Unknown course',''))add(item);
    return{records:[...records.values()],courses:[...courses.values()],scanned,errors:errors.slice(0,20),site:location.origin};
  }
  globalThis.__folioExtractor={run};
})();
