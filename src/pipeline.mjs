import {db,themes,trends,companies,saveCompany,evidence,documents,setting} from './store.mjs';
import {assess,technical,keywordTrend,obs} from './engine.mjs';
import {sec,market,universe} from './providers.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {enrich,changeSignals,themeProposals} from './signals.mjs';
import {filingDocument,extractSnippets} from './documents.mjs';
export const extraKeywords=['AI','hyperscaler','robotics','machine vision','AI agent security','defense','space','power quality','advanced manufacturing','long-term agreement','bookings','book-to-bill'];
export function snapshot({duringUpdate=false}={}){
 const previous=JSON.parse(db.prepare('SELECT payload FROM snapshots ORDER BY id DESC LIMIT 1 OFFSET ?').get(duringUpdate?0:1)?.payload||'null');
 const all=companies().map(base=>{const ev=evidence(base.ticker),c=enrich(base,ev);
 const assessment=assess(c,ev),prior=previous?.companies.find(x=>x.ticker===c.ticker);const delta=prior?.assessment?.score!=null&&assessment.score!=null?assessment.score-prior.assessment.score:null;
 const docs=documents(c.ticker);const narrative=['earnings-call','IR','10-Q','10-K'].flatMap(kind=>keywordTrend(docs.filter(d=>d.kind===kind),[...new Set(themes.flatMap(x=>x.keywords).concat(extraKeywords,trends))]).map(n=>({...n,documentKind:kind})));
 const generic=new Set(['data center','AI','backlog','bookings','capacity','capacity expansion','supply agreement']);
 const related=themes.filter(t=>narrative.some(n=>!generic.has(n.keyword)&&t.keywords.includes(n.keyword)&&n.counts.some(x=>x.count>=2))).map(t=>t.id);
 const discovery=prior?'Existing':'New Discoveries';const signal=changeSignals({...c,assessment},prior),change=signal.change||(delta>=5?'Thesis Strengthening':delta<=-5?'Thesis Weakening':null);
 return {...c,themes:[...new Set([...(c.themes||[]),...related])],evidence:ev,narrative,assessment,delta,discovery,change,changeReasons:signal.reasons,catalysts:ev.filter(x=>x.type==='catalyst'&&x.reviewed&&new Date(x.eventDate)>=new Date(new Date().toISOString().slice(0,10))&&new Date(x.eventDate)<=new Date(Date.now()+30*864e5))};});
 return {generatedAt:new Date().toISOString(),mode:'snapshot',marketContext:'전력·광통신·첨단 패키징으로 이어지는 AI 인프라 병목 가설을 추적합니다. 최신 시장 방향은 검증된 시장 자료가 수집된 뒤 판단합니다.',themes,companies:all,watchlist:setting('watchlist')||[],runs:db.prepare('SELECT * FROM runs ORDER BY id DESC LIMIT 8').all().map(r=>({...r,payload:JSON.parse(r.payload||'{}')})),proposedThemes:[...new Set(all.flatMap(c=>c.narrative.filter(n=>n.shift&&!themes.some(t=>t.keywords.includes(n.keyword))).map(n=>n.keyword)))],macro:setting('macro')||null};
}
export async function exportSnapshot(options={}){const s=snapshot(options);s.themeProposals=themeProposals(companies().flatMap(c=>documents(c.ticker).map(d=>({...d,ticker:c.ticker}))),themes.flatMap(t=>t.keywords));s.reportText=daily(s);await writeFile(new URL('../dist/snapshot.json',import.meta.url),JSON.stringify(s,null,2));return s;}
let busy=false;
export async function update({expand=false}={}){
 if(busy)throw Error('Update already running');busy=true;const started=new Date().toISOString(),id=db.prepare('INSERT INTO runs(started,status,payload) VALUES(?,?,?)').run(started,'running','{}').lastInsertRowid;const failures=[];let updated=0;
 try{
 if(expand){for(const c of await universe())if(!companies().some(x=>x.ticker===c.ticker))saveCompany({...c,metrics:{},bars:[],filings:[]});}
 const list=companies().sort((a,b)=>(a.updatedAt||'').localeCompare(b.updatedAt||''));
 for(const c of list.slice(0,Math.max(1,Number(process.env.MAX_COMPANIES_PER_RUN)||20))){
  try{const f=await sec(c);Object.assign(c,{name:f.name,exchange:f.exchange,quarters:f.quarters,filings:f.filings});c.metrics={...c.metrics,...f.metrics};
   if(process.env.COLLECT_FILINGS!=='0')for(const filing of f.filings.filter(x=>['10-Q','10-K'].includes(x.form)).slice(0,4)){if(documents(c.ticker).some(d=>d.source===filing.source))continue;try{const d=await filingDocument(filing);db.prepare('INSERT INTO documents(ticker,payload) VALUES(?,?)').run(c.ticker,JSON.stringify(d));for(const e of extractSnippets(d))db.prepare('INSERT INTO evidence(ticker,payload) VALUES(?,?)').run(c.ticker,JSON.stringify(e));}catch(e){failures.push({ticker:c.ticker,provider:'SEC document',message:e.message});}}
  }catch(e){failures.push({ticker:c.ticker,provider:'SEC',message:e.message});}
  const m=await market(c.ticker);if(m.bars.length){c.bars=m.bars;c.technical={...technical(m.bars,m.adjusted),source:m.source,rawClose:m.rawClose};}c.metrics={...c.metrics,...m.metrics};failures.push(...m.failures.map(x=>({...x,ticker:c.ticker})));c.updatedAt=new Date().toISOString();saveCompany(c);updated++;
 }
 db.prepare('UPDATE runs SET status=?,payload=? WHERE id=?').run(failures.length?'partial':'succeeded',JSON.stringify({updated,failures}),id);
 const s=await exportSnapshot({duringUpdate:true});db.prepare('INSERT INTO snapshots(created,payload) VALUES(?,?)').run(s.generatedAt,JSON.stringify(s));await report(s);return {updated,failures};
 }catch(e){db.prepare('UPDATE runs SET status=?,payload=? WHERE id=?').run('failed',JSON.stringify({message:e.message}),id);throw e;}finally{busy=false;}
}
export function daily(s=snapshot()){
 const selected=s.companies.filter(c=>c.assessment.eligible&&c.assessment.score!==null).sort((a,b)=>b.assessment.score-a.assessment.score).slice(0,7);
 const describe=c=>`- ${c.ticker} — ${c.assessment.status} · score ${c.assessment.score??'DATA UNAVAILABLE'} · coverage ${c.assessment.coverage}%${c.change?' · '+c.change:''}`;
 const group=xs=>xs.length?xs.map(describe).join('\n'):'DATA UNAVAILABLE — 검증된 후보가 없어 목록을 채우지 않습니다.';
 return `# US MIDCAP NEXT BOTTLENECK DAILY\n\n${s.generatedAt}\n\n## 1. 오늘 시장 배경\n${s.marketContext}\n금리 / S&P 500 / Nasdaq / AI Capex / 중요 뉴스: ${s.macro?JSON.stringify(s.macro):'DATA UNAVAILABLE'}\n\n## 2. 오늘 새롭게 나타난 병목\n${s.proposedThemes.length?s.proposedThemes.join(', ')+' — 검토 대기':'신규 검증 신호 없음. 기본 병목 카드는 연구 가설입니다.'}\n\n## 3. 새로 발견된 기업\n${group(selected.filter(c=>c.discovery==='New Discoveries'))}\n\n## 4. 기존 후보 업데이트\n${group(selected.filter(c=>c.change))}\n\n## 5. 실적 대비 주가 괴리\n${group(s.companies.filter(c=>c.assessment.divergence))}\n\n## 6. 밸류에이션 과열 후보\n${group(s.companies.filter(c=>c.assessment.status==='Fully Priced'))}\n\n## 7. 중국 리스크 제외\n${group(s.companies.filter(c=>c.assessment.chinaRisk==='HIGH'))}\n\n## 8. 오늘의 Catalyst / 다음 30일\n${s.companies.flatMap(c=>c.catalysts.map(e=>`- ${c.ticker}: ${e.eventDate} ${e.note} (${e.source})`)).join('\n')||'DATA UNAVAILABLE'}\n\n## 9. 차트 상태\n${selected.map(c=>`- ${c.ticker}: RSI ${c.technical?.rsi14??'DATA UNAVAILABLE'}, 52W ${c.technical?.performance52??'DATA UNAVAILABLE'}% · ${c.technical?.source||'DATA UNAVAILABLE'}`).join('\n')||'DATA UNAVAILABLE'}\n\n## 10. 추가 연구 대상\n${group(selected)}\n\n${selected.map(c=>`### ${c.ticker}\n${c.evidence.filter(e=>e.reviewed).map(e=>`${e.note} — ${e.source} (${e.date})`).join('\n')||'검증된 상세 증거 없음'}\n누락 항목: ${c.assessment.missing.join(', ')}`).join('\n\n')}\n`;
}
export async function report(s=snapshot()){const dir=new URL('../data/reports/',import.meta.url);await mkdir(dir,{recursive:true});const p=new URL(s.generatedAt.slice(0,10)+'.md',dir);await writeFile(p,daily(s));return p.pathname;}
