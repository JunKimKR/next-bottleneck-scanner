export const WEIGHTS={structure:20,exposure:15,growth:15,orders:10,underfollowed:10,valuation:10,moat:10,technical:10};
export const PENALTIES={hype:15,china:20,dilution:10,concentration:10,cyclical:10,valuation:15};
export const BLOCKED=new Set(['NVDA','MSFT','GOOGL','GOOG','AMZN','META','AVGO']);
export const finite=x=>typeof x==='number'&&Number.isFinite(x);
export const growth=(a,b)=>finite(a)&&finite(b)&&b>0?(a/b-1)*100:null;
export const obs=(value,unit,source,period_end,kind='Reported',inputs=[])=>({value:finite(value)?value:null,unit,source,period_end,observed_at:new Date().toISOString(),kind,inputs});
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const days=(a,b)=>Math.round((new Date(a)-new Date(b))/864e5);
export function quarters(facts,tags,unit='USD',asof=new Date().toISOString().slice(0,10)){
 const candidates=tags.map(tag=>({tag,values:(facts?.facts?.['us-gaap']?.[tag]?.units?.[unit]||[]).filter(x=>x.filed<=asof&&['10-Q','10-K','10-Q/A','10-K/A'].includes(x.form))})).filter(x=>x.values.length);
 candidates.sort((a,b)=>b.values.reduce((s,x)=>x.end>s?x.end:s,'').localeCompare(a.values.reduce((s,x)=>x.end>s?x.end:s,'')));
 const values=(candidates[0]?.values||[]).map(x=>({...x,tag:candidates[0].tag}));
 const exact=new Map();
 for(const v of values.filter(x=>x.start&&days(x.end,x.start)>=70&&days(x.end,x.start)<=110).sort((a,b)=>a.filed.localeCompare(b.filed))){exact.set(v.end,{...v,kind:'Reported'});}
 for(const a of values.filter(x=>unit!=='USD/shares'&&x.start&&days(x.end,x.start)>=150&&days(x.end,x.start)<=380).sort((a,b)=>a.filed.localeCompare(b.filed))){
  if(exact.has(a.end))continue;
  const nine=values.filter(x=>x.start===a.start&&days(a.end,x.end)>=70&&days(a.end,x.end)<=110&&x.filed<=a.filed).sort((a,b)=>b.filed.localeCompare(a.filed))[0];
  if(nine)exact.set(a.end,{...a,start:new Date(new Date(nine.end).getTime()+864e5).toISOString().slice(0,10),val:a.val-nine.val,kind:'Calculated',inputs:[a.accn,nine.accn]});
 }
 return [...exact.values()].sort((a,b)=>a.end.localeCompare(b.end));
}
export function fundamentals(facts,source){
 const tags={revenue:['RevenueFromContractWithCustomerExcludingAssessedTax','RevenueFromContractWithCustomerIncludingAssessedTax','Revenues','SalesRevenueNet','SalesRevenueGoodsNet'],grossProfit:['GrossProfit'],operatingIncome:['OperatingIncomeLoss'],eps:['EarningsPerShareDiluted'],capex:['PaymentsToAcquirePropertyPlantAndEquipment'],operatingCashFlow:['NetCashProvidedByUsedInOperatingActivities']};
 const series=Object.fromEntries(Object.entries(tags).map(([k,t])=>[k,quarters(facts,t,k==='eps'?'USD/shares':'USD')]));
 const out={},r=series.revenue;
 for(const [k,s]of Object.entries(series)){const x=s.at(-1);out[k]={...obs(x?.val,k==='eps'?'USD/share':'USD',source,x?.end,x?.kind||'Reported',x?.inputs||[]),tag:x?.tag,filed:x?.filed,accession:x?.accn};}
 const end=r.at(-1)?.end,previousYear=r.filter(x=>days(end,x.end)>=340&&days(end,x.end)<=390).at(-1);
 out.revenueGrowth=obs(growth(r.at(-1)?.val,previousYear?.val),'%',source,end,'Calculated');
 out.revenueQoQ=obs(r.length>1&&days(end,r.at(-2).end)<120?growth(r.at(-1)?.val,r.at(-2)?.val):null,'%',source,end,'Calculated');
 const last4=r.slice(-4);
 const contiguous=last4.length===4&&last4.every((x,i)=>!i||(days(x.end,last4[i-1].end)>=70&&days(x.end,last4[i-1].end)<=110));
 out.revenueTTM=obs(contiguous?last4.reduce((s,x)=>s+x.val,0):null,'USD',source,end,'Calculated');
 for(const [k,n]of [['grossMargin','grossProfit'],['operatingMargin','operatingIncome']]){const v=series[n].find(x=>x.end===end);out[k]=obs(r.at(-1)?.val>0&&v?v.val/r.at(-1).val*100:null,'%',source,end,'Calculated');}
 const e=series.eps.at(-1),ep=series.eps.find(x=>days(e?.end,x.end)>=340&&days(e?.end,x.end)<=390);out.epsGrowth=obs(growth(e?.val,ep?.val),'%',source,e?.end,'Calculated');
 const cf=series.operatingCashFlow.at(-1),cap=series.capex.find(x=>x.end===cf?.end);out.freeCashFlow=obs(cf&&cap?cf.val-cap.val:null,'USD',source,cf?.end,'Calculated');
 const cp=series.capex.at(-1),cpp=series.capex.find(x=>days(cp?.end,x.end)>=340&&days(cp?.end,x.end)<=390);out.capexGrowth=obs(growth(cp?.val,cpp?.val),'%',source,cp?.end,'Calculated');
 const instant=(tags,unit='USD',ns='us-gaap')=>{for(const tag of tags){const xs=(facts?.facts?.[ns]?.[tag]?.units?.[unit]||[]).filter(x=>!x.start&&x.filed<=new Date().toISOString().slice(0,10)).sort((a,b)=>a.end.localeCompare(b.end)||a.filed.localeCompare(b.filed));if(xs.length)return xs.at(-1);}return null;};
 for(const [k,t,u,ns]of [['cash',['CashAndCashEquivalentsAtCarryingValue'],'USD','us-gaap'],['totalDebt',['LongTermDebtAndFinanceLeaseObligationsIncludingCurrentMaturities','LongTermDebtCurrent','LongTermDebt'],'USD','us-gaap'],['sharesOutstanding',['EntityCommonStockSharesOutstanding'],'shares','dei']]){const x=instant(t,u,ns);out[k]=obs(x?.val,u,source,x?.end);}
 // Only the comprehensive debt tag is suitable for total debt / EV; partial tags are not total debt.
 const debt=instant(['LongTermDebtAndFinanceLeaseObligationsIncludingCurrentMaturities']);out.totalDebt=obs(debt?.val,'USD',source,debt?.end);
 out.netDebt=obs(debt&&out.cash.period_end===debt.end&&finite(out.cash.value)?debt.val-out.cash.value:null,'USD',source,debt?.end,'Calculated');
 const changes=last4.map(x=>{const prior=r.find(y=>days(x.end,y.end)>=340&&days(x.end,y.end)<=390);return {period:x.end,revenue:x.val,yoy:growth(x.val,prior?.val),grossMargin:series.grossProfit.find(y=>y.end===x.end)?.val/x.val*100};});
 out.acceleration=obs(changes.length>=2&&finite(changes.at(-1).yoy)&&finite(changes.at(-2).yoy)?changes.at(-1).yoy-changes.at(-2).yoy:null,'pp',source,end,'Calculated');
 out.marginChange=obs(changes.length>=2&&finite(changes.at(-1).grossMargin)&&finite(changes.at(-2).grossMargin)?changes.at(-1).grossMargin-changes.at(-2).grossMargin:null,'pp',source,end,'Calculated');
 for(const [key,m]of Object.entries(out))if(m.kind==='Calculated'&&!m.inputs.length)m.inputs=[{series:key==='revenueGrowth'||key==='revenueQoQ'||key==='revenueTTM'?'revenue':key,period_end:m.period_end,source}];
 return {metrics:out,quarters:changes.map(x=>({...x,grossMargin:finite(x.grossMargin)?x.grossMargin:null})),series};
}
export function technical(bars,adjusted=true){
 const b=bars.filter(x=>['open','high','low','close','volume'].every(k=>finite(x[k]))).sort((a,b)=>a.date.localeCompare(b.date));const c=b.map(x=>x.close),last=b.at(-1);if(!last)return {};
 const sma=n=>c.length>=n?avg(c.slice(-n)):null;
 let rsi=null,atr=null;
 if(b.length>=15){let gain=0,loss=0,tr=0;for(let i=1;i<b.length;i++){const d=c[i]-c[i-1],t=Math.max(b[i].high-b[i].low,Math.abs(b[i].high-c[i-1]),Math.abs(b[i].low-c[i-1]));if(i<=14){gain+=Math.max(d,0)/14;loss+=Math.max(-d,0)/14;tr+=t/14;}else{gain=(gain*13+Math.max(d,0))/14;loss=(loss*13+Math.max(-d,0))/14;tr=(tr*13+t)/14;}}rsi=loss===0?(gain===0?50:100):100-100/(1+gain/loss);atr=tr;}
 const year=b.slice(-252),full=b.length>=252,hi=full?Math.max(...year.map(x=>x.high)):null,lo=full?Math.min(...year.map(x=>x.low)):null,vol=b.length>=21?avg(b.slice(-21,-1).map(x=>x.volume)):null;
 const ema=n=>{if(c.length<n)return null;let v=avg(c.slice(0,n));for(const x of c.slice(n))v=x*2/(n+1)+v*(1-2/(n+1));return v;};
 const mean=sma(20),sd=mean===null?null:Math.sqrt(avg(c.slice(-20).map(x=>(x-mean)**2)));
 return {adjusted,asOf:last.date,close:last.close,sma20:sma(20),sma50:sma(50),sma200:sma(200),rsi14:rsi,atr14:atr,volume:last.volume,averageVolume:vol,relativeVolume:vol?last.volume/vol:null,high52:hi,low52:lo,performance52:full?growth(last.close,year[0].close):null,distanceHigh:hi?growth(last.close,hi):null,gap:b.length>1?growth(last.open,b.at(-2).close):null,support:b.length>=20?Math.min(...b.slice(-20).map(x=>x.low)):null,resistance:b.length>=20?Math.max(...b.slice(-20).map(x=>x.high)):null,macd:c.length>=26?ema(12)-ema(26):null,bollingerUpper:sd===null?null:mean+2*sd,bollingerLower:sd===null?null:mean-2*sd};
}
export function keywordTrend(documents,keywords){const unique=new Map();for(const d of documents)unique.set(d.period,d);return keywords.map(keyword=>{const escaped=keyword.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const counts=[...unique.values()].sort((a,b)=>a.period.localeCompare(b.period)).slice(-4).map(d=>{const words=d.text.split(/\s+/).length,count=(d.text.match(new RegExp('(?<![a-z0-9])'+escaped+'(?![a-z0-9])','gi'))||[]).length;return {period:d.period,count,per10k:count/Math.max(words,1)*10000,source:d.source};});const first=counts[0],last=counts.at(-1);return {keyword,counts,shift:counts.length>=2&&last.count>=5&&last.per10k>=Math.max(1,first.per10k)*2};});}
export function assess(company,evidence=[],now=new Date()){
 const metrics=company.metrics||{},tech=company.technical||{},points={},penalties={};let coverage=0;
 const valid=evidence.filter(x=>x.source?.startsWith('https://')&&x.reviewed&&days(now,x.date)<=180&&days(now,x.date)>=0);
 for(const [k,w]of Object.entries(WEIGHTS)){const e=valid.filter(x=>x.type==='score'&&x.key===k).at(-1);points[k]=e?Math.max(0,Math.min(w,e.value)):null;if(e)coverage+=w;}
 const fresh=m=>finite(m?.value)&&days(now,m.period_end)>=0&&days(now,m.period_end)<=180;
 const growthMetrics=['revenueGrowth','dataCenterRevenueGrowth','aiRevenueGrowth','newProductRevenueGrowth'].map(k=>metrics[k]).filter(fresh);
 if(points.growth===null&&growthMetrics.length){points.growth=Math.max(0,Math.min(15,Math.max(...growthMetrics.map(m=>m.value))/3));coverage+=15;}
 if(points.orders===null&&fresh(metrics.backlogGrowth)&&fresh(metrics.bookingsGrowth)){points.orders=Math.max(0,Math.min(10,(metrics.backlogGrowth.value+metrics.bookingsGrowth.value)/8));coverage+=10;}
 if(points.exposure===null&&fresh(metrics.growthSegmentShare)){points.exposure=Math.max(0,Math.min(15,metrics.growthSegmentShare.value/4));coverage+=15;}
 if(points.technical===null&&tech.adjusted&&finite(tech.sma200)&&days(now,tech.asOf)<=7){points.technical=(tech.close>tech.sma200?4:0)+(tech.sma50>tech.sma200?3:0)+(tech.relativeVolume>1?3:0);coverage+=10;}
 const china=valid.filter(x=>x.type==='china').at(-1),risk=china?.level||null,cap=metrics.marketCap;
 const capFresh=cap?.period_end&&days(now,cap.period_end)<=7&&days(now,cap.period_end)>=0;
 const universe=BLOCKED.has(company.ticker)?'Excluded':!finite(cap?.value)||!capFresh?'Unverified':cap.value>=3e9&&cap.value<=15e9?'Core':cap.value>=2e9&&cap.value<=20e9?'Extended':'Excluded';
 for(const [k,max]of Object.entries(PENALTIES)){const e=valid.filter(x=>x.type==='penalty'&&x.key===k).at(-1);penalties[k]=e?Math.max(0,Math.min(max,e.value)):0;}
 penalties.china=risk==='HIGH'?20:risk==='MEDIUM'?8:0;
 if(tech.adjusted&&tech.performance52>=200)penalties.hype=Math.max(penalties.hype,15);
 const gross=Object.values(points).reduce((s,v)=>s+(v||0),0),score=coverage>=60?Math.max(0,gross-Object.values(penalties).reduce((s,v)=>s+v,0)):null;
 const eligible=['Core','Extended'].includes(universe)&&/Nasdaq|NYSE|CBOE/i.test(company.exchange||'')&&!!risk&&risk!=='HIGH';
 let status='Watch';if(risk==='HIGH')status='Risk Elevated';else if(penalties.hype>=15||penalties.valuation>=12)status='Fully Priced';else if(eligible&&coverage>=75&&score>=65&&points.structure>0&&points.exposure>0&&points.growth>0)status='Research Priority';
 const divergence=tech.adjusted&&metrics.revenueGrowth?.value>10&&metrics.backlogGrowth?.value>10&&tech.distanceHigh<=-15&&tech.distanceHigh>=-40?'Potential Fundamental/Price Divergence':tech.adjusted&&metrics.revenueGrowth?.value<0&&metrics.backlogGrowth?.value<0&&tech.performance52>100?'Potential Expectation Risk':null;
 return {points,penalties,coverage,score,gross,chinaRisk:risk,chinaReason:china?.note||'중국 생산·매출·허가·공급망에 대한 검토 자료가 없습니다.',universe,eligible,status,divergence,missing:Object.keys(WEIGHTS).filter(k=>points[k]===null)};
}
export function validateEvidence(e){
 if(!e||!['score','penalty','china','metric','catalyst','note'].includes(e.type))throw Error('Invalid evidence type');
 if(e.reviewed!==undefined&&typeof e.reviewed!=='boolean')throw Error('Reviewed must be a boolean');
 if(!/^https:\/\//.test(e.source||'')||!Number.isFinite(Date.parse(e.date))||!e.note?.trim())throw Error('Source, date and explanation required');
 if(e.type==='score'&&(!(e.key in WEIGHTS)||!finite(e.value)||e.value<0||e.value>WEIGHTS[e.key]))throw Error('Invalid score');
 if(e.type==='penalty'&&(!(e.key in PENALTIES)||!finite(e.value)||e.value<0||e.value>PENALTIES[e.key]))throw Error('Invalid penalty');
 if(e.type==='china'&&!['LOW','MEDIUM','HIGH'].includes(e.level))throw Error('Invalid China risk');
 if(e.type==='metric'&&(!/^[a-zA-Z][a-zA-Z0-9]{0,50}$/.test(e.key)||!finite(e.value)||!e.unit))throw Error('Invalid metric');
 if(e.type==='catalyst'&&!Number.isFinite(Date.parse(e.eventDate)))throw Error('Invalid event date');
 return e;
}
