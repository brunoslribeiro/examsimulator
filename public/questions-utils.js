(function(exports){
  function filterQuestions(list, opts={}){
    let res = Array.from(list);
    const term = (opts.search || '').trim().toLowerCase();
    if(term) res = res.filter(q => (q.text || '').toLowerCase().includes(term));
    if(opts.type && opts.type !== 'all') res = res.filter(q => q.type === opts.type);
    if(opts.status && opts.status !== 'all') res = res.filter(q => q.status === opts.status);
    if(opts.hasImage === 'yes') res = res.filter(q => !!q.imagePath);
    if(opts.hasImage === 'no') res = res.filter(q => !q.imagePath);
    if(opts.topic) res = res.filter(q => (q.topic || '').toLowerCase().includes(opts.topic.toLowerCase()));
    if(opts.updatedSince){
      const since = new Date(opts.updatedSince).getTime();
      res = res.filter(q => new Date(q.updatedAt).getTime() >= since);
    }
    const sort = opts.sort || 'updated';
    if(sort === 'alpha') res.sort((a,b)=>(a.text||'').localeCompare(b.text||''));
    else res.sort((a,b)=> new Date(b.updatedAt) - new Date(a.updatedAt));
    return res;
  }

  function dryRunReplace(list, find, replace, opts={}){
    const { caseSensitive=false, wholeWord=false, regex=false } = opts;
    let pattern;
    if(regex){
      pattern = new RegExp(find, caseSensitive ? 'g' : 'gi');
    } else {
      const esc = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const word = wholeWord ? `\\b${esc}\\b` : esc;
      pattern = new RegExp(word, caseSensitive ? 'g' : 'gi');
    }
    const out = [];
    for(const q of list){
      const before = q.text || '';
      if(!pattern.test(before)) continue;
      out.push({ id:q._id, before, after: before.replace(pattern, replace) });
      pattern.lastIndex = 0;
    }
    return { count: out.length, questions: out };
  }

  function validateQuestion(q){
    const errors = [];
    if(!q.text || !q.text.trim()) errors.push('text');
    if(!Array.isArray(q.options) || q.options.length < 2) errors.push('options');
    const correct = Array.isArray(q.options) ? q.options.filter(o=>o.isCorrect) : [];
    if(q.type === 'single'){
      if(correct.length !== 1) errors.push('singleCorrect');
    } else if(q.type === 'multiple'){
      if(correct.length < 1) errors.push('multiCorrect');
    }
    return { ok: errors.length === 0, errors };
  }

  exports.filterQuestions = filterQuestions;
  exports.dryRunReplace = dryRunReplace;
  exports.validateQuestion = validateQuestion;
})(typeof module !== 'undefined' ? module.exports : window);
