export const tokenize=s=>(s.toLowerCase().match(/[a-z0-9]+/g)||[]).filter(t=>t.length>1);
const stop=new Set('the a an and or is are was were be been to of for in on at by with from how what why when does do did it its he his they their this that as'.split(' '));
export function makeKeywordIndex(chunks){
  const counts=new Map(),docs=chunks.map(c=>{const tf=new Map();for(const t of tokenize(c.text))tf.set(t,(tf.get(t)||0)+1);for(const t of tf.keys())counts.set(t,(counts.get(t)||0)+1);return {tf,length:tokenize(c.text).length};});
  return {docs,counts,average:docs.reduce((s,d)=>s+d.length,0)/docs.length};
}
export function eligible(c,f){return c.year>=f.from&&c.year<=f.to&&(f.author==='all'||c.author===f.author)&&(!f.contains||c.text.includes(f.contains));}
export function rankKeywords(chunks,index,query,filters){
  const terms=[...new Set(tokenize(query).filter(t=>!stop.has(t)))];
  const ranked=[];
  for(let i=0;i<chunks.length;i++){
    if(!eligible(chunks[i],filters))continue;
    const d=index.docs[i];let score=0;
    for(const t of terms){const tf=d.tf.get(t)||0;if(!tf)continue;const df=index.counts.get(t)||0;const idf=Math.log(1+(chunks.length-df+.5)/(df+.5));score+=idf*tf*2.2/(tf+1.2*(.25+.75*d.length/index.average));}
    if(score>0)ranked.push({index:i,score});
  }
  return ranked.sort((a,b)=>b.score-a.score||a.index-b.index);
}
export function rankVectors(chunks,matrix,query,filters){
  if(query.length!==384||matrix.length!==chunks.length*384)throw Error('Search index dimensions do not match');
  const ranked=[];
  for(let i=0;i<chunks.length;i++){
    if(!eligible(chunks[i],filters))continue;
    let score=0;for(let j=0;j<384;j++)score+=matrix[i*384+j]*query[j];
    ranked.push({index:i,score});
  }
  return ranked.sort((a,b)=>b.score-a.score||a.index-b.index);
}
export function distinctResults(ranked,chunks,max=40){
  const chosen=[];
  for(const r of ranked){const c=chunks[r.index];const offset=Number(c.id.split('-')[2]);if(chosen.some(x=>{const p=chunks[x.index];return p.year===c.year&&p.page===c.page&&Math.abs(Number(p.id.split('-')[2])-offset)<128;}))continue;chosen.push(r);if(chosen.length>=max)break;}
  return chosen;
}
