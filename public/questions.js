const api = (u,o={})=>fetch(u,o).then(r=>r.json());
const examId = new URLSearchParams(location.search).get('examId');
if(!examId){ document.body.innerHTML='<p class="container">examId obrigatório.</p>'; throw new Error('no examId'); }

const state = { q:'', topic:'', status:'', hasImage:'', since:'', sort:'recent', page:1, total:0, items:[], dirty:false };
let currentReq = null;
let lastFocus = null;

function loadFromQuery(){
  const p = new URLSearchParams(location.search);
  state.q = p.get('q')||'';
  state.topic = p.get('topic')||'';
  state.status = p.get('status')||'';
  state.hasImage = p.get('hasImage')||'';
  state.since = p.get('since')||'';
  state.sort = p.get('sort')||'recent';
  state.page = parseInt(p.get('page')||'1',10);
  $('#search').val(state.q);
  $('#fTopic').val(state.topic);
  $('#fStatus').val(state.status);
  $('#fImage').val(state.hasImage);
  $('#fSince').val(state.since);
  $('#fSort').val(state.sort);
}

function updateQuery(){
  const p = new URLSearchParams();
  if(state.q) p.set('q',state.q);
  if(state.topic) p.set('topic',state.topic);
  if(state.status) p.set('status',state.status);
  if(state.hasImage) p.set('hasImage',state.hasImage);
  if(state.since) p.set('since',state.since);
  if(state.sort && state.sort!=='recent') p.set('sort',state.sort);
  if(state.page>1) p.set('page',state.page);
  p.set('examId',examId);
  history.replaceState(null,'','?'+p.toString());
}

function showSkeleton(){
  const list = $('#list').empty();
  for(let i=0;i<5;i++) list.append('<div class="skeleton"></div>');
}

function getParams(){
  return { examId, q:state.q, topic:state.topic, status:state.status, hasImage:state.hasImage, since:state.since, sort:state.sort, page:state.page };
}

function fetchList(){
  showSkeleton();
  if(currentReq) currentReq.abort();
  currentReq = $.getJSON('/api/questions', getParams())
    .done(res=>{
      state.items = res.items || [];
      state.total = res.total || 0;
      if(!state.items.length){ $('#list').html('<p class="empty">Nenhum resultado.</p>'); renderPagination(); return; }
      $('#list').html(renderList(state.items, state.q));
      $('#list .q-row').each(function(i){ $(this).delay(i*30).fadeIn(200); });
      renderPagination();
    })
    .fail((xhr,status)=>{
      if(status!=='abort'){
        $('#list').html('<p class="error">Erro ao carregar. <a href="#" id="retry">Tentar novamente</a></p>');
        $('#retry').on('click',e=>{ e.preventDefault(); fetchList(); });
        toast('Erro ao carregar');
      }
    });
}

function renderPagination(){
  const totalPages = Math.max(1, Math.ceil(state.total/20));
  const box = $('#pagination').empty();
  if(totalPages<=1){ return; }
  const prev = $('<button aria-label="Prev">◀️</button>').prop('disabled',state.page===1).on('click',()=>{state.page--;updateQuery();fetchList();});
  const next = $('<button aria-label="Next">▶️</button>').prop('disabled',state.page===totalPages).on('click',()=>{state.page++;updateQuery();fetchList();});
  box.append(prev).append(`<span>${state.page}/${totalPages}</span>`).append(next);
}

function openModal(data){
  lastFocus = document.activeElement;
  resetForm();
  if(data){
    $('#qid').val(data._id||'');
    $('#qtext').val(data.text||'');
    $('#qtopic').val(data.topic||'');
    $('#qstatus').val(data.status||'draft');
    $('#qtype').val(data.type||'single');
    if(data.imagePath){ $('#qimgPreview').attr('src',data.imagePath).show(); $('#qimg').data('imagePath',data.imagePath); }
    $('#opts').empty();
    (data.options||[]).forEach(o=>addOptRow(o));
  } else {
    addOptRow(); addOptRow();
  }
  $('#qtextCount').text($('#qtext').val().length);
  $('#editorModal').addClass('open').attr('aria-hidden','false');
  $('body').addClass('modal-open');
  const focusable = $('#editorModal').find('button, [href], input, select, textarea').filter(':visible');
  focusable.first().focus();
  $('#editorModal').on('keydown.modal',function(e){
    if(e.key==='Escape'){ e.preventDefault(); closeModal(); }
    if(e.key==='Tab'){
      const first=focusable[0], last=focusable[focusable.length-1];
      if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
    }
  });
}

function closeModal(){
  if(state.dirty && !confirm('Descartar alterações?')) return;
  $('#editorModal').removeClass('open').attr('aria-hidden','true');
  $('body').removeClass('modal-open');
  $('#editorModal').off('keydown.modal');
  state.dirty=false;
  if(lastFocus) $(lastFocus).focus();
}

function addOptRow(data={}){
  const div=$('<div class="opt row"></div>');
  div.append(`<input class="t" placeholder="Opção" value="${data.text||''}"/>`);
  div.append(`<textarea class="code" placeholder="Código">${data.code||''}</textarea>`);
  const lang=$('<select class="lang"></select>').append(`
    <option value="">Linguagem</option>
    <option value="javascript">JavaScript</option>
    <option value="python">Python</option>
    <option value="java">Java</option>
    <option value="c">C</option>
    <option value="cpp">C++</option>
    <option value="csharp">C#</option>
    <option value="php">PHP</option>
    <option value="ruby">Ruby</option>
    <option value="go">Go</option>`);
  lang.val(data.language||'');
  div.append(lang);
  const file=$('<input type="file" class="f" accept="image/*" />');
  div.append(file);
  const chk=$(`<label>Correta? <input type="checkbox" class="c" ${data.isCorrect?'checked':''}/></label>`);
  div.append(chk);
  const rm=$('<button type="button" class="danger">✖️</button>').on('click',()=>{div.remove();state.dirty=true;});
  div.append(rm);
  const img=$('<img class="preview" style="display:none"/>');
  div.append(img);
  if(data.imagePath){ img.attr('src',data.imagePath).show(); file.data('imagePath',data.imagePath); }
  file.on('change',async function(){ const f=this.files[0]; if(!f) return; const fd=new FormData(); fd.append('file',f); const res=await fetch('/api/upload',{method:'POST',body:fd}).then(r=>r.json()); if(res.path){ file.data('imagePath',res.path); img.attr('src',res.path).show(); toast('Imagem enviada'); } });
  $('#opts').append(div);
}

function gatherForm(){
  const options=[];
  $('#opts .opt').each(function(){
    options.push({
      text:$(this).find('.t').val().trim(),
      code:$(this).find('.code').val(),
      language:$(this).find('.lang').val(),
      imagePath:$(this).find('.f').data('imagePath')||'',
      isCorrect:$(this).find('.c').prop('checked')
    });
  });
  return { _id:$('#qid').val(), text:$('#qtext').val().trim(), topic:$('#qtopic').val().trim(), status:$('#qstatus').val(), type:$('#qtype').val(), imagePath:$('#qimg').data('imagePath')||'', options };
}

function resetForm(){
  $('#qForm')[0].reset();
  $('#qimg').removeData('imagePath');
  $('#qimgPreview').hide().attr('src','');
  $('#opts').empty();
  $('#qtextCount').text('0');
  state.dirty=false;
}

async function saveQuestion(andNew){
  if(!document.getElementById('qForm').checkValidity()){ document.getElementById('qForm').reportValidity(); return; }
  const data=gatherForm();
  //const val=validateQuestion(data);
  //if(!val.ok){ alert('Preencha corretamente'); return; }
  const method=data._id?'PUT':'POST';
  const url=data._id?'/api/questions/'+data._id:'/api/questions';
  const payload={ examId, text:data.text, topic:data.topic, status:data.status, type:data.type, options:data.options, imagePath:data.imagePath };
  await api(url,{method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
  toast('Salvo');
  state.dirty=false;
  if(andNew){ resetForm(); addOptRow(); addOptRow(); }
  else { closeModal(); }
  fetchList();
}

// Events
loadFromQuery();
updateQuery();
fetchList();

$('#search').on('input', debounce(function(){ state.q=this.value; state.page=1; updateQuery(); fetchList(); },300));
$('#search').on('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); state.q=this.value; state.page=1; updateQuery(); fetchList(); }});
$('#fTopic').on('input', debounce(function(){ state.topic=this.value; state.page=1; updateQuery(); fetchList(); },300));
$('#fStatus, #fImage, #fSince, #fSort').on('change', function(){
  const id=this.id;
  if(id==='fStatus') state.status=this.value;
  else if(id==='fImage') state.hasImage=this.value;
  else if(id==='fSince') state.since=this.value;
  else if(id==='fSort') state.sort=this.value;
  state.page=1; updateQuery(); fetchList();
});

$('#pagination').on('click','button',function(){ /* handled in renderPagination */ });

$('#list').on('click','.overflow',function(e){
  e.stopPropagation();
  const row=$(this).closest('.q-row');
  const menu=row.find('.row-menu');
  $('.row-menu').not(menu).hide();
  menu.toggle();
  $(this).attr('aria-expanded', menu.is(':visible'));
});

$('#list').on('click','.row-menu .edit',function(e){
  e.stopPropagation();
  const id=$(this).closest('.q-row').data('id');
  const q=state.items.find(x=>x._id===id);
  $(this).parent().hide();
  openModal(q);
});

$('#list').on('click','.row-menu .dup',function(e){
  e.stopPropagation();
  const id=$(this).closest('.q-row').data('id');
  const q=state.items.find(x=>x._id===id);
  const copy=JSON.parse(JSON.stringify(q));
  delete copy._id;
  $(this).parent().hide();
  openModal(copy);
});

$('#list').on('click','.row-menu .del',async function(e){
  e.stopPropagation();
  const id=$(this).closest('.q-row').data('id');
  if(confirm('Excluir?')){
    await api('/api/questions/'+id,{method:'DELETE'});
    const row=$(this).closest('.q-row');
    row.slideUp(200,()=>{ row.remove(); fetchList(); });
  }
});

$(document).on('click',function(){
  $('.row-menu').hide();
  $('.overflow').attr('aria-expanded','false');
});

$('#newBtn').on('click',()=>openModal());
$('#editorModal').on('click',function(e){ if(e.target===this) closeModal(); });
$('#cancel').on('click',e=>{ e.preventDefault(); closeModal(); });
$('#save').on('click',e=>{ e.preventDefault(); saveQuestion(false); });
$('#saveNew').on('click',e=>{ e.preventDefault(); saveQuestion(true); });
$('#addOpt').on('click',()=>{ addOptRow(); state.dirty=true; });
$('#qForm').on('change input',()=>{ state.dirty=true; });
$('#qimg').on('change',async function(){ const f=this.files[0]; if(!f) return; const fd=new FormData(); fd.append('file',f); const res=await fetch('/api/upload',{method:'POST',body:fd}).then(r=>r.json()); if(res.path){ $(this).data('imagePath',res.path); $('#qimgPreview').attr('src',res.path).show(); } });
$('#removeImg').on('click',function(){ $('#qimg').removeData('imagePath'); $('#qimgPreview').hide().attr('src',''); });
$('#qtext').on('input',function(){ $('#qtextCount').text(this.value.length); });

// keyboard shortcuts
$(document).on('keydown',function(e){
  if(e.key==='/' && !$(e.target).is('input,textarea,select')){ e.preventDefault(); $('#search').focus(); }
  if(e.key==='n' && !$(e.target).is('input,textarea,select')){ e.preventDefault(); openModal(); }
  if((e.ctrlKey||e.metaKey) && e.key==='s'){ if($('#editorModal').hasClass('open')){ e.preventDefault(); saveQuestion(false); } }
});
