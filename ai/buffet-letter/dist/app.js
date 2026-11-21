import {makeKeywordIndex,rankKeywords,rankVectors,distinctResults,tokenize} from './search-core.mjs';
const $=id=>document.getElementById(id);
let corpus,index,matrix,mode='semantic',runtime={mode:'browser'},worker,taskNumber=0,searchNumber=0,lastResults=[],lastQuery='',ready=false;
const pending=new Map();
const number=new Intl.NumberFormat('en');
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function escapeHTML(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function readJSON(url){const r=await fetch(url);if(!r.ok)throw Error(`Could not load ${url} (${r.status})`);return r.json();}
async function initialize(){
  try{
    [corpus,runtime]=await Promise.all([readJSON('corpus.json'),readJSON('runtime.json')]);
    index=makeKeywordIndex(corpus.chunks);ready=true;
    $('collection-summary').textContent=`1977–2025 · ${corpus.metadata.documents.length} annual letters`;
    $('letter-count').textContent=corpus.metadata.documents.length;
    $('passage-count').textContent=number.format(corpus.chunks.length);
    $('about-coverage').textContent=`${corpus.metadata.documents.length} annual letters covering reporting years 1977–2025, with ${number.format(corpus.chunks.length)} searchable passages. Prepared ${new Date(corpus.metadata.prepared_at).toLocaleDateString('en',{year:'numeric',month:'long',day:'numeric'})}. ${corpus.metadata.missing.length} missing years.`;
    if(runtime.mode==='chroma')$('engine-status').textContent='Python and ChromaDB · local search';
    const params=new URLSearchParams(location.search);
    if(params.get('q')){$('query').value=params.get('q').slice(0,500);if(params.get('mode')==='keyword')setMode('keyword');await search();}
  }catch(e){status('The collection could not be loaded. Reload the page to try again. '+e.message,true);$('collection-summary').textContent='Collection unavailable';}
}
function getFilters(){
  const from=Number($('year-from').value),to=Number($('year-to').value);
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<1977||to>2025||from>to)throw Error('Choose a valid year range between 1977 and 2025, with the starting year first.');
  return {from,to,author:$('author').value,contains:$('contains').value.trim()};
}
function setMode(next){mode=next;for(const m of ['semantic','keyword']){$(`${m}-mode`).classList.toggle('selected',m===next);$(`${m}-mode`).setAttribute('aria-pressed',String(m===next));}$('engine-status').textContent=next==='keyword'?'Keyword ranking · no model download':runtime.mode==='chroma'?'Python and ChromaDB · local search':'Meaning search · runs on your device';}
function queryEmbedding(text){
  if(!worker){worker=new Worker('./semantic-worker.js?v=2',{type:'module'});worker.onmessage=({data})=>{const item=pending.get(data.id);if(!item)return;if(data.status){status(data.status+' The first search can take a little longer.');return;}clearTimeout(item.timer);pending.delete(data.id);data.error?item.reject(Error(data.error)):item.resolve(data.vector);};worker.onerror=()=>{for(const item of pending.values()){clearTimeout(item.timer);item.reject(Error('The browser could not start the meaning search engine.'));}pending.clear();worker.terminate();worker=null;};}
  return new Promise((resolve,reject)=>{const id=++taskNumber;const timer=setTimeout(()=>{pending.delete(id);worker?.terminate();worker=null;reject(Error('The search model took too long to load.'));},180000);pending.set(id,{resolve,reject,timer});worker.postMessage({id,text});});
}
async function search(){
  if(!ready){status('The letters are still loading. Please try again in a moment.');return;}
  const query=$('query').value.trim();if(!query){status('Enter a question or topic to search the letters.',true);$('query').focus();return;}
  let filters;try{filters=getFilters();}catch(e){status(e.message,true);return;}
  const request=++searchNumber;const selectedMode=mode;
  $('search-button').disabled=true;status(selectedMode==='semantic'?'Finding passages by meaning…':'Searching the letters…');
  try{
    let ranked;
    if(selectedMode==='keyword')ranked=rankKeywords(corpus.chunks,index,query,filters);
    else if(runtime.mode==='chroma'){
      const r=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,...filters})});
      const result=await r.json();if(!r.ok)throw Error(result.error||'The local search server failed');
      const ids=new Map(corpus.chunks.map((c,i)=>[c.id,i]));ranked=result.results.map(r=>({index:ids.get(r.id),score:r.score})).filter(r=>r.index!==undefined);
    }else{
      const embedding=await queryEmbedding(query);
      if(!matrix){const r=await fetch('vectors.f32');if(!r.ok)throw Error('The vector index could not be loaded');matrix=new Float32Array(await r.arrayBuffer());}
      ranked=rankVectors(corpus.chunks,matrix,embedding,filters);
    }
    if(request!==searchNumber)return;
    lastResults=distinctResults(ranked,corpus.chunks,40);lastQuery=query;
    renderResults(selectedMode,filters);status('');
    const params=new URLSearchParams({q:query,mode:selectedMode});history.replaceState(null,'',`${location.pathname}?${params}`);
    $('engine-status').textContent=selectedMode==='keyword'?'Keyword ranking · no model download':runtime.mode==='chroma'?'Python and ChromaDB · local search':'Meaning search ready · on your device';
  }catch(e){if(request!==searchNumber)return;status(selectedMode==='semantic'?`Meaning search is unavailable: ${e.message} You can switch to By keywords and search immediately.`:e.message,true);}
  finally{if(request===searchNumber)$('search-button').disabled=false;}
}
function markText(text,query){
  const terms=[...new Set(tokenize(query))].filter(t=>t.length>3).slice(0,10);
  const safe=escapeHTML(text);if(!terms.length)return safe;
  return safe.replace(new RegExp(`\\b(${terms.join('|')})\\b`,'gi'),'<mark>$1</mark>');
}
function sourceURL(c){return c.url+(c.page?`#page=${c.page}`:'');}
function renderResults(selectedMode,filters){
  $('welcome').hidden=true;$('results-section').hidden=false;
  const shown=lastResults.slice(0,Number($('limit').value));
  $('results-title').textContent=shown.length?`${shown.length} passages to explore`:'No matching passages';
  $('results-description').textContent=`${selectedMode==='semantic'?'Ranked by meaning':'Ranked by keywords'} · ${filters.from}–${filters.to} · ${filters.author==='all'?'All authors':filters.author}`;
  $('export-results').disabled=!shown.length;
  $('results').replaceChildren();
  if(!shown.length){const el=document.createElement('div');el.className='empty-state';el.innerHTML='<h3>Try a wider lens.</h3><p>Broaden the years, change the author, or remove the exact-text filter.</p>';$('results').append(el);}
  shown.forEach((r,n)=>{
    const c=corpus.chunks[r.index];const card=document.createElement('article');card.className='result-card';
    const short=c.text.length>660?c.text.slice(0,660).replace(/\s+\S*$/,'')+'…':c.text;
    card.innerHTML=`<div class="result-top"><span class="year-badge">${c.year}</span><span class="result-author">${escapeHTML(c.author)}${c.page?` · PDF page ${c.page}`:''}</span><span class="result-score">${selectedMode==='semantic'?`Relevance ${r.score.toFixed(3)}`:`Keyword rank ${n+1}`}</span></div><p class="passage">${markText(short,lastQuery)}</p><div class="result-actions"><a class="source-link" href="${sourceURL(c)}" target="_blank" rel="noopener">Read original letter ↗</a>${short!==c.text?'<button class="expand">Read full passage</button>':''}<button class="copy">Copy citation</button></div>`;
    const exp=card.querySelector('.expand');if(exp)exp.onclick=()=>{const full=exp.textContent==='Read full passage';card.querySelector('.passage').innerHTML=markText(full?c.text:short,lastQuery);exp.textContent=full?'Show less':'Read full passage';};
    card.querySelector('.copy').onclick=async e=>{try{await navigator.clipboard.writeText(`${c.author}, Berkshire Hathaway ${c.year} shareholder letter${c.page?`, PDF page ${c.page}`:''}. ${sourceURL(c)}`);e.target.textContent='Copied';}catch{e.target.textContent='Use the source link to copy';}};
    $('results').append(card);
  });
  renderChart(lastResults);
}
function renderChart(results){
  $('year-chart').hidden=!results.length;$('bars').replaceChildren();
  $('chart-caption').textContent=`Top ${results.length} passages · click a year`;
  const counts=new Map();results.forEach(r=>{const y=corpus.chunks[r.index].year;counts.set(y,(counts.get(y)||0)+1);});
  const max=Math.max(1,...counts.values());
  for(let y=1977;y<=2025;y++){const count=counts.get(y)||0;const bar=document.createElement('button');bar.style.height=`${count?Math.max(8,count/max*100):3}%`;bar.title=`${y}: ${count} retrieved passages`;bar.setAttribute('aria-label',bar.title);bar.disabled=!count;bar.onclick=()=>{$('year-from').value=y;$('year-to').value=y;search();};$('bars').append(bar);}
}
$('search-form').addEventListener('submit',e=>{e.preventDefault();search();});
for(const next of ['semantic','keyword'])$(`${next}-mode`).onclick=()=>{setMode(next);if($('query').value.trim())search();};
for(const id of ['author','year-from','year-to','contains','limit'])$(id).addEventListener('change',()=>{if(id==='author'){const a=$('author').value;if(a==='Greg Abel'){$('year-from').value=2025;$('year-to').value=2025;}else if(a==='Charlie Munger'){$('year-from').value=2014;$('year-to').value=2014;}else if(a==='Warren Buffett'){$('year-from').value=1977;$('year-to').value=2024;}else{$('year-from').value=1977;$('year-to').value=2025;}}if(lastQuery)search();});
document.querySelectorAll('[data-query]').forEach(b=>b.onclick=()=>{$('query').value=b.dataset.query;search();});
document.querySelectorAll('[data-era]').forEach(b=>b.onclick=()=>{const [a,z]=b.dataset.era.split(',');$('year-from').value=a;$('year-to').value=z;if(lastQuery)search();});
$('reset').onclick=()=>{$('author').value='Warren Buffett';$('year-from').value=1977;$('year-to').value=2024;$('contains').value='';$('limit').value='6';if(lastQuery)search();else status('');};
$('export-results').onclick=()=>{const selected=lastResults.slice(0,Number($('limit').value));const rows=[['Query','Year','Author','PDF page','Score','Source','Passage'],...selected.map(r=>{const c=corpus.chunks[r.index];return [lastQuery,c.year,c.author,c.page||'',r.score.toFixed(5),sourceURL(c),c.text];})];const csv=rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='berkshire-letter-search.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('about-open').onclick=()=>$('about-dialog').showModal();$('about-close').onclick=()=>$('about-dialog').close();$('about-dialog').addEventListener('click',e=>{if(e.target===$('about-dialog'))$('about-dialog').close();});
initialize();
