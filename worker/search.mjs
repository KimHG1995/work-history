const ignored=new Set(['어떻게','무엇','어떤','했어','했나요','개발','프로젝트','알려줘','내용','대한','관련','사용','설명','있어']);
export function search(question,docs){
 const words=question.toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}+#.]+/gu)||[];
 const terms=[...new Set(words.map(w=>w.replace(/(에서는|에서|으로|까지|했던|했던가|인가요|했나요|했어|은|는|을|를|이|가|와|과|에)$/u,'')).filter(w=>w.length>=2&&!ignored.has(w)))];
 if(!terms.length)return [];
 const scored=docs.map(doc=>{
  const title=doc.title.toLowerCase();const text=doc.text.toLowerCase();
  const score=terms.reduce((s,t)=>s+(title.includes(t)?8:0)+(text.includes(t)?2:0),0);
  return {...doc,score};
 }).filter(d=>d.score>0).sort((a,b)=>b.score-a.score);
 const result=[];const urls=new Set();let size=0;
 for(const d of scored){
  if(urls.has(d.url))continue;
  const sections=scored.filter(part=>part.url===d.url).slice(0,5);
  const text=sections.map(part=>part.text).join('\n\n').slice(0,Math.min(1200,2000-size));
  if(!text)break;result.push({title:d.title,url:d.url,text});urls.add(d.url);size+=text.length;
  if(result.length===3||size>=2000)break;
 }
 return result;
}
