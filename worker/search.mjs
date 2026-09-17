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

function monthsCovered(sections, asOf) {
 const intervals=sections.flatMap(section=>{
  const match=section.text.match(/근무 기간\s+(\d{4})-(\d{2})\s*~\s*(?:(\d{4})-(\d{2})|(현재))/);
  if(!match)return [];
  const start=Number(match[1])*12+Number(match[2])-1;
  const end=match[5] ? Number(asOf.slice(0,4))*12+Number(asOf.slice(5,7))-1 : Number(match[3])*12+Number(match[4])-1;
  return end>=start?[[start,end]]:[];
 }).sort((a,b)=>a[0]-b[0]);
 let total=0,end=-Infinity;
 for(const [start,stop] of intervals){total+=Math.max(0,stop-Math.max(start,end));end=Math.max(end,stop);}
 return total;
}

export function selectContext(question,docs,now=new Date()) {
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit'}).formatToParts(now);
 const asOf=`${parts.find(p=>p.type==='year').value}-${parts.find(p=>p.type==='month').value}`;
 const hits=search(question,docs);
 const overviewQuestion=/(총.*경력|전체.*경력|경력.*(기간|요약|소개|얼마|몇|궁금)|몇\s*년|연차|어떤\s*개발자|자기\s*소개|경험.*요약)/.test(question);
 if(hits.length&&!overviewQuestion)return hits;
 const employment=docs.filter(d=>d.url==='/work-history/'&&/근무 기간\s+\d{4}-\d{2}/.test(d.text));
 if(!employment.length)return hits;
 const months=monthsCovered(employment,asOf);
 const regular=monthsCovered(employment.filter(d=>!/역할\s+인턴/.test(d.text)),asOf);
 const catalog=[...new Set(docs.filter(d=>d.url.includes('/projects/')).map(d=>d.title))].join(', ').slice(0,350);
 const summaries=employment.map(d=>d.text.split('\n').filter(line=>/회사 설명|근무 기간|역할|직급|사용 언어|백엔드|프론트엔드/.test(line)).join('\n'));
 const calculation=`문서의 근무 기간을 월 차이로 계산한 참고값: 인턴 포함 ${months}개월, 인턴 제외 ${regular}개월. 같은 기간은 중복 합산하지 않음. 정확한 입퇴사 일자는 없어 대략적인 기간으로 설명할 것. 현재 재직 중인 기간은 ${asOf} 기준으로 계산함. 종료된 근무 이후의 기간과 사이드 프로젝트 기간은 추가 합산하지 말 것.`;
 const text=[calculation,...summaries.map(s=>s.slice(0,Math.floor(1350/employment.length))),`작업 목록: ${catalog}`].join('\n\n').slice(0,2000);
 return [{title:'근무 기록과 경력 요약',url:'/work-history/',text}];
}
