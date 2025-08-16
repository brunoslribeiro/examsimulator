(function(exports){
  function debounce(fn, wait){
    let t; return function(...args){
      clearTimeout(t); t = setTimeout(()=>fn.apply(this,args), wait);
    };
  }

  function escapeRegExp(str){
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlight(text, q){
    if(!q) return text;
    const re = new RegExp('(' + escapeRegExp(q) + ')','ig');
    return text.replace(re,'<mark>$1</mark>');
  }

  function renderList(items, q=''){
    return items.map(it=>{
      const icons = [it.imagePath?'📷':'', it.type==='multiple'?'🔢':''].filter(Boolean).join('');
      const snippet = highlight((it.text||'').slice(0,80), q);
      const meta = `${it.topic||''} • ${it.status} • ${new Date(it.updatedAt).toLocaleDateString()}`;
      return `<div class="q-row" data-id="${it._id}" style="display:none">`
        +`<div class="snippet">${snippet}</div>`
        +`<div class="meta">${meta} ${icons}</div>`
        +`<button class="overflow" aria-label="Ações">⋮</button>`
        +`</div>`;
    }).join('');
  }

  function validateQuestion(q){
    const errors = [];
    if(!q.text || !q.text.trim()) errors.push('text');
    if(!Array.isArray(q.options) || q.options.length < 2) errors.push('options');
    const correct = Array.isArray(q.options) ? q.options.filter(o=>o.isCorrect) : [];
    if(q.type === 'single'){ if(correct.length !== 1) errors.push('singleCorrect'); }
    if(q.type === 'multiple'){ if(correct.length < 1) errors.push('multiCorrect'); }
    return { ok: errors.length===0, errors };
  }

  exports.debounce = debounce;
  exports.highlight = highlight;
  exports.renderList = renderList;
  exports.validateQuestion = validateQuestion;
})(typeof module !== 'undefined' ? module.exports : window);
