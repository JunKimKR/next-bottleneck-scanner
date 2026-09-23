import {obs,growth,finite} from './engine.mjs';
const day=(a,b)=>(new Date(a)-new Date(b))/864e5;
export function enrich(company,evidence,now=new Date()){
 const metrics={...company.metrics},history={};
 for(const e of evidence.filter(e=>e.type==='metric'&&e.reviewed&&e.source?.startsWith('https://')&&new Date(e.date)<=now).sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id)){
  history[e.key]??=[];history[e.key].push(e);metrics[e.key]={...obs(e.value,e.unit,e.source,e.date,'Reported'),observed_at:e.recordedAt||e.date};
 }
 const calculated=(key,value,inputs,unit='%')=>{if(!finite(value)||!inputs.length)return;metrics[key]=obs(value,unit,inputs[0].source,inputs[0].date||inputs[0].period_end,'Calculated',inputs.map(x=>({value:x.value,period:x.date||x.period_end,source:x.source})));};
 for(const key of ['backlog','bookings','dataCenterRevenue','aiRevenue','newProductRevenue','capex']){
  const xs=history[key]||[],last=xs.at(-1),prior=xs.filter(x=>day(last?.date,x.date)>=330&&day(last?.date,x.date)<=400).at(-1);
  if(last&&prior&&last.unit===prior.unit)calculated(key+'Growth',growth(last.value,prior.value),[last,prior]);
 }
 const bookings=metrics.bookings,revenue=metrics.revenue;if(bookings?.period_end===revenue?.period_end&&revenue?.value>0)calculated('bookToBill',bookings.value/revenue.value,[bookings,revenue],'x');
 const segment=metrics.newProductRevenue||metrics.dataCenterRevenue;if(segment?.period_end===revenue?.period_end&&revenue?.value>0)calculated('growthSegmentShare',segment.value/revenue.value*100,[segment,revenue]);
 const concentration=history.customerConcentration||[];if(concentration.length>=2)calculated('customerConcentrationChange',concentration.at(-1).value-concentration.at(-2).value,[concentration.at(-1),concentration.at(-2)],'pp');
 const shares=metrics.sharesOutstanding,price=company.technical;
 if(!finite(metrics.marketCap?.value)&&shares?.value>0&&price?.rawClose>0&&day(now,shares.period_end)<=120&&day(now,price.asOf)<=7){calculated('marketCap',shares.value*price.rawClose,[{value:price.rawClose,source:price.source,date:price.asOf},shares],'USD');}
 if(metrics.marketCap?.value>0&&finite(metrics.netDebt?.value)&&day(now,metrics.netDebt.period_end)<=120)calculated('enterpriseValue',metrics.marketCap.value+metrics.netDebt.value,[metrics.marketCap,metrics.netDebt],'USD');
 if(metrics.enterpriseValue?.value>0&&metrics.revenueTTM?.value>0)calculated('evSales',metrics.enterpriseValue.value/metrics.revenueTTM.value,[metrics.enterpriseValue,metrics.revenueTTM],'x');
 const fresh=m=>m&&finite(m.value)&&day(now,m.period_end)>=0&&day(now,m.period_end)<=180;
 const sectorGrowth=['dataCenterRevenueGrowth','aiRevenueGrowth','newProductRevenueGrowth'].map(k=>metrics[k]).filter(fresh);
 const maxGrowth=sectorGrowth.length?Math.max(...sectorGrowth.map(x=>x.value)):null;
 const oldNew=maxGrowth!==null&&fresh(metrics.revenueGrowth)&&maxGrowth>=40&&maxGrowth>=metrics.revenueGrowth.value+25;
 return {...company,metrics,metricHistory:history,oldNewGrowth:oldNew,maxSegmentGrowth:maxGrowth};
}
export function changeSignals(current,previous){
 if(!previous)return {change:null,reasons:[]};const reasons=[],up=[],down=[];
 for(const key of ['revenueGrowth','backlogGrowth','bookingsGrowth','dataCenterRevenueGrowth','newProductRevenueGrowth']){const a=current.metrics?.[key],b=previous.metrics?.[key];if(finite(a?.value)&&finite(b?.value)&&a.period_end!==b.period_end){const delta=a.value-b.value;if(delta>=5)up.push(`${key}: +${delta.toFixed(1)}pp`);if(delta<=-5)down.push(`${key}: ${delta.toFixed(1)}pp`);}}
 if(down.length>=2||current.assessment.chinaRisk==='HIGH'&&previous.assessment.chinaRisk!=='HIGH')return {change:'Thesis Weakening',reasons:down.concat(current.assessment.chinaRisk==='HIGH'?['China risk elevated']:[])};
 if(up.length>=2)return {change:'Thesis Strengthening',reasons:up};return {change:null,reasons};
}
export function themeProposals(documents,knownKeywords){
 const groups=new Map();for(const d of documents){const k=d.ticker+'|'+d.kind;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(d);}
 const candidates=[];const stop=new Set('the and for that with from this our are will was were have has not but company million billion quarter year ended per share fiscal results financial non gaap forward looking statements'.split(' '));
 for(const docs of groups.values()){
  const sorted=docs.sort((a,b)=>a.period.localeCompare(b.period));if(sorted.length<2)continue;const [before,last]=sorted.slice(-2);if(before.period===last.period)continue;
  const phrases=text=>{const words=text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g)||[],m=new Map();for(let i=0;i<words.length-1;i++){if(stop.has(words[i])||stop.has(words[i+1]))continue;const p=words[i]+' '+words[i+1];m.set(p,(m.get(p)||0)+1);}return {m,length:words.length};};const a=phrases(before.text),b=phrases(last.text);
  for(const [phrase,count]of b.m){if(count<5||knownKeywords.some(k=>k.toLowerCase()===phrase))continue;const old=a.m.get(phrase)||0;if(count/Math.max(b.length,1)>=(old+1)/Math.max(a.length,1)*3)candidates.push({phrase,ticker:last.ticker,count,previousCount:old,source:last.source,period:last.period,status:'UNREVIEWED THEME PROPOSAL'});}
 }
 return candidates.sort((a,b)=>b.count-a.count).slice(0,20);
}
