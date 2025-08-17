const list = document.getElementById('exam-list');

function getOngoing(){
  const ids = [];
  for(let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i);
    if(k.startsWith('settings-')) ids.push(k.slice('settings-'.length));
  }
  return ids;
}

async function render(){
  const ids = getOngoing();
  if(!ids.length){
    list.innerHTML = '<p>Nenhuma prova em andamento.</p>';
    return;
  }
  for(const id of ids){
    try{
      const data = await fetch('/api/exams/'+id).then(r=>r.json());
      const card = document.createElement('div');
      card.className='card';
      const title=document.createElement('p');
      title.textContent=data.exam.title;
      const btn=document.createElement('button');
      btn.textContent='Retomar';
      btn.addEventListener('click', ()=>location.href=`/take.html?examId=${id}`);
      card.append(title, btn);
      list.appendChild(card);
    }catch(e){
      console.error('Falha ao carregar prova', e);
    }
  }
}

render();
