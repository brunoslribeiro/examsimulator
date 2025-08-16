const api = (u, o={}) => fetch(u, o).then(r => r.json());
const examId = new URLSearchParams(location.search).get('examId');
if(!examId){ document.body.innerHTML = '<p class="container">examId obrigatório.</p>'; throw new Error('no examId'); }

const state = {
  all: [],
  filtered: [],
  selected: new Set(),
  currentPage: 1,
  perPage: 10,
  filters: { search:'', type:'all', status:'all', hasImage:'all', topic:'', updatedSince:'', sort:'updated' },
  dirty:false
};

function debounce(fn, delay){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), delay); }; }

async function loadList(){
  state.all = await api('/api/questions?examId='+examId);
  applyFilters();
}

function applyFilters(){
  state.filtered = filterQuestions(state.all, state.filters);
  renderList();
}

function renderList(){
  const list = document.getElementById('list');
  list.innerHTML='';
  const start = (state.currentPage-1)*state.perPage;
  const items = state.filtered.slice(start, start+state.perPage);
  if(!items.length){ list.innerHTML='<p class="muted">Nenhuma questão.</p>'; }
  items.forEach(q=>{
    const row=document.createElement('div'); row.className='q-row';
    row.innerHTML = `<input type="checkbox" class="sel" data-id="${q._id}" ${state.selected.has(q._id)?'checked':''}/>`+
      `<div style="flex:1"><div>${(q.text||'').slice(0,80)}</div>`+
      `<div class="meta">${q._id} • ${q.type}${q.topic?' • '+q.topic:''} • ${q.status} • ${new Date(q.updatedAt).toLocaleDateString()} ${q.imagePath?'📷':''}</div></div>`+
      `<button class="rowMenu" data-id="${q._id}">⋮</button>`;
    list.appendChild(row);
  });
  const totalPages = Math.ceil(state.filtered.length/state.perPage)||1;
  renderPagination(totalPages);
  toggleBulk();
}

function renderPagination(total){
  const box=document.getElementById('pagination');
  if(total<=1){ box.innerHTML=''; return; }
  box.innerHTML='';
  const prev=document.createElement('button'); prev.textContent='◀️'; prev.disabled=state.currentPage===1; prev.onclick=()=>{if(state.currentPage>1){state.currentPage--;renderList();}}; box.appendChild(prev);
  const span=document.createElement('span'); span.textContent=`${state.currentPage}/${total}`; box.appendChild(span);
  const next=document.createElement('button'); next.textContent='▶️'; next.disabled=state.currentPage===total; next.onclick=()=>{if(state.currentPage<total){state.currentPage++;renderList();}}; box.appendChild(next);
}

function toggleBulk(){
  document.getElementById('bulkActions').classList.toggle('hidden', state.selected.size===0);
}

function addOptRow(data={}){
  const div=document.createElement('div');
  div.className='opt';
  div.draggable=true;
  div.innerHTML=`<div class="row"><span class="drag" style="cursor:grab">↕</span>
    <label>Texto <input class="t" value="${data.text||''}"/></label>
    <label>Imagem <input type="file" class="f" accept="image/*"/></label>
    <label>Correta? <input type="checkbox" class="c" ${data.isCorrect?'checked':''}/></label>
    <button type="button" class="danger remove">✖️</button></div>
    <img class="preview" ${data.imagePath?`src="${data.imagePath}"`:'style="display:none"'} />`;
  const file=div.querySelector('.f');
  const img=div.querySelector('.preview');
  file.onchange=async()=>{
    const f=file.files&&file.files[0]; if(!f) return;
    const fd=new FormData(); fd.append('file',f);
    const res=await fetch('/api/upload',{method:'POST',body:fd}).then(r=>r.json());
    if(res.path){ div.dataset.imagePath=res.path; img.src=res.path; img.style.display='block'; toast('Imagem enviada'); }
  };
  if(data.imagePath) div.dataset.imagePath=data.imagePath;
  div.querySelector('.remove').onclick=()=>{ div.remove(); state.dirty=true; };
  // drag & drop
  div.addEventListener('dragstart',e=>{ div.classList.add('dragging'); });
  div.addEventListener('dragend',e=>{ div.classList.remove('dragging'); });
  document.getElementById('opts').appendChild(div);
}

function gatherForm(){
  const options=[...document.querySelectorAll('#opts .opt')].map(div=>({
    text:(div.querySelector('.t').value||'').trim(),
    imagePath:div.dataset.imagePath||'',
    isCorrect:div.querySelector('.c').checked
  }));
  return {
    _id: document.getElementById('qid').value,
    text: document.getElementById('qtext').value.trim(),
    topic: document.getElementById('qtopic').value.trim(),
    status: document.getElementById('qstatus').value,
    type: document.getElementById('qtype').value,
    imagePath: document.getElementById('qimg').dataset.imagePath || '',
    options
  };
}

function resetForm(){
  document.getElementById('qid').value='';
  document.getElementById('qForm').reset();
  document.getElementById('opts').innerHTML='';
  document.getElementById('qimgPreview').style.display='none';
  addOptRow(); addOptRow();
  state.dirty=false;
}

function editQuestion(q){
  resetForm();
  document.getElementById('qid').value=q._id;
  document.getElementById('qtext').value=q.text||'';
  document.getElementById('qtopic').value=q.topic||'';
  document.getElementById('qstatus').value=q.status||'draft';
  document.getElementById('qtype').value=q.type||'single';
  if(q.imagePath){ document.getElementById('qimgPreview').src=q.imagePath; document.getElementById('qimgPreview').style.display='block'; document.getElementById('qimg').dataset.imagePath=q.imagePath; }
  document.getElementById('opts').innerHTML='';
  (q.options||[]).forEach(o=>addOptRow(o));
  state.dirty=false;
}

function duplicateQuestion(q){
  const copy=JSON.parse(JSON.stringify(q)); delete copy._id; editQuestion(copy);
}

function previewQuestion(q){
  const box=document.getElementById('previewPane');
  box.style.display='block';
  const opts=q.options.map((o,i)=>`<div class="option-card"><input type="${q.type==='single'?'radio':'checkbox'}" disabled/><span>${o.text||''}</span></div>`).join('');
  box.innerHTML=`<h3>Prévia</h3><p>${q.text}</p>${opts}`;
}

async function saveQuestion(andNew){
  const data=gatherForm();
  const val=validateQuestion(data);
  if(!val.ok){ alert('Preencha corretamente: '+val.errors.join(',')); return; }
  const method=data._id?'PUT':'POST';
  const url=data._id?'/api/questions/'+data._id:'/api/questions';
  const payload={ examId, text:data.text, topic:data.topic, status:data.status, type:data.type, options:data.options, imagePath:data.imagePath };
  await api(url,{method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
  toast('Salvo');
  if(andNew){ resetForm(); } else { state.dirty=false; }
  loadList();
}

// events

document.getElementById('search').addEventListener('input', debounce(e=>{ state.filters.search=e.target.value; state.currentPage=1; applyFilters(); },300));
['filterType','filterStatus','filterImage','filterTopic','filterUpdated','sort'].forEach(id=>{
  document.getElementById(id).addEventListener('change', e=>{
    const val=e.target.value;
    if(id==='filterTopic') state.filters.topic=val; else if(id==='filterUpdated') state.filters.updatedSince=val; else if(id==='filterType') state.filters.type=val; else if(id==='filterStatus') state.filters.status=val; else if(id==='filterImage') state.filters.hasImage=val; else if(id==='sort') state.filters.sort=val;
    state.currentPage=1; applyFilters();
  });
});

document.getElementById('list').addEventListener('change',e=>{
  if(e.target.classList.contains('sel')){
    const id=e.target.dataset.id; if(e.target.checked) state.selected.add(id); else state.selected.delete(id); toggleBulk();
  }
});

document.getElementById('list').addEventListener('click',e=>{
  if(e.target.classList.contains('rowMenu')){
    const id=e.target.dataset.id; const q=state.all.find(x=>x._id===id); const act=prompt('a=editar, d=duplicar, p=preview, x=excluir');
    if(act==='a'){ editQuestion(q); }
    else if(act==='d'){ duplicateQuestion(q); }
    else if(act==='p'){ previewQuestion(q); }
    else if(act==='x'){ if(confirm('Excluir?')){ api('/api/questions/'+id,{method:'DELETE'}).then(()=>{toast('Excluída'); loadList();}); } }
  }
});

// drag and drop ordering
const optsBox=document.getElementById('opts');
optsBox.addEventListener('dragover', e=>{
  const dragging=document.querySelector('.opt.dragging');
  if(!dragging) return;
  e.preventDefault();
  const after=[...optsBox.querySelectorAll('.opt:not(.dragging)')].find(el=> e.clientY <= el.getBoundingClientRect().top + el.offsetHeight/2);
  if(after) optsBox.insertBefore(dragging, after); else optsBox.appendChild(dragging);
});

// image preview for question statement
const qimg=document.getElementById('qimg');
qimg.onchange=async()=>{
  const f=qimg.files && qimg.files[0]; if(!f) return;
  const fd=new FormData(); fd.append('file',f);
  const res=await fetch('/api/upload',{method:'POST',body:fd}).then(r=>r.json());
  if(res.path){ qimg.dataset.imagePath=res.path; const img=document.getElementById('qimgPreview'); img.src=res.path; img.style.display='block'; toast('Imagem enviada'); }
};

// counters
const qtext=document.getElementById('qtext');
const qtextCount=document.getElementById('qtextCount');
const updateCount=()=>{ qtextCount.textContent=qtext.value.length+'/1000'; };
qtext.addEventListener('input',()=>{ updateCount(); state.dirty=true; });
updateCount();

// form events

document.getElementById('qForm').addEventListener('submit',e=>{ e.preventDefault(); saveQuestion(false); });
document.getElementById('saveNew').onclick=()=>saveQuestion(true);
document.getElementById('duplicate').onclick=()=>{ const id=document.getElementById('qid').value; if(!id) return; const q=state.all.find(x=>x._id===id); if(q) duplicateQuestion(q); };
document.getElementById('cancel').onclick=()=>{ if(state.dirty && !confirm('Descartar alterações?')) return; resetForm(); };
document.getElementById('preview').onclick=()=>{ previewQuestion(gatherForm()); };

document.getElementById('addOpt').onclick=()=>{ addOptRow(); state.dirty=true; };

// bulk actions
async function bulk(action){
  const ids=[...state.selected];
  if(action==='delete'){
    if(!confirm('Excluir '+ids.length+'?')) return;
    await api('/api/questions/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids,action:'delete'})});
  } else if(action==='publish' || action==='unpublish'){
    await api('/api/questions/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids,action})});
  }
  toast('Concluído');
  state.selected.clear(); toggleBulk(); loadList();
}

document.getElementById('bulkDelete').onclick=()=>bulk('delete');
document.getElementById('bulkPublish').onclick=()=>bulk('publish');
document.getElementById('bulkUnpublish').onclick=()=>bulk('unpublish');
document.getElementById('bulkExport').onclick=()=>{
  const rows=state.all.filter(q=>state.selected.has(q._id));
  const csv=['id,text,type,topic,status'].concat(rows.map(q=>`"${q._id}","${(q.text||'').replace(/"/g,'""')}",${q.type},${q.topic||''},${q.status}`)).join('\n');
  const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='questions.csv'; a.click();
};

document.getElementById('bulkReplace').onclick=()=>{ document.getElementById('replaceModal').classList.remove('hidden'); };

document.getElementById('repClose').onclick=()=>{ document.getElementById('replaceModal').classList.add('hidden'); document.getElementById('repPreview').innerHTML=''; };

function getScopeList(){
  const scope=document.getElementById('repScope').value;
  if(scope==='selected') return state.all.filter(q=>state.selected.has(q._id));
  if(scope==='filtered') return state.filtered;
  return state.all;
}

document.getElementById('repRun').onclick=()=>{
  const find=document.getElementById('repFind').value;
  const replace=document.getElementById('repReplace').value;
  const list=getScopeList();
  const res=dryRunReplace(list, find, replace, {caseSensitive:document.getElementById('repCase').checked, wholeWord:document.getElementById('repWhole').checked, regex:document.getElementById('repRegex').checked});
  const box=document.getElementById('repPreview');
  if(!res.count){ box.textContent='Nenhuma questão afetada.'; document.getElementById('repApply').style.display='none'; return; }
  box.innerHTML=res.questions.map(q=>`<p><strong>${q.before}</strong><br/>➡️ ${q.after}</p>`).join('');
  document.getElementById('repApply').style.display='inline-block';
};

document.getElementById('repApply').onclick=async()=>{
  const find=document.getElementById('repFind').value;
  const replace=document.getElementById('repReplace').value;
  const list=dryRunReplace(getScopeList(), find, replace, {caseSensitive:document.getElementById('repCase').checked, wholeWord:document.getElementById('repWhole').checked, regex:document.getElementById('repRegex').checked}).questions;
  for(const q of list){
    await api('/api/questions/'+q.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:q.after})});
  }
  toast('Atualizado em '+list.length+' questões');
  document.getElementById('replaceModal').classList.add('hidden');
  state.selected.clear(); toggleBulk(); loadList();
};

window.addEventListener('beforeunload',e=>{ if(state.dirty){ e.preventDefault(); e.returnValue=''; } });

// init
resetForm();
loadList();
