import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export function htmlText(html){return html.replace(/<(script|style|ix:header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&#(\d+);/g,(_,x)=>{const n=+x;return n<=0x10ffff?String.fromCodePoint(n):' ';}).replace(/&(nbsp|amp|quot|lt|gt);/g,(_,x)=>({nbsp:' ',amp:'&',quot:'"',lt:'<',gt:'>'}[x])).replace(/\s+/g,' ').trim();}
export async function filingDocument(filing){
 if(!filing.source.startsWith('https://www.sec.gov/Archives/edgar/data/'))throw Error('SEC archive URL required');
 const cache=new URL('../data/cache/',import.meta.url);await mkdir(cache,{recursive:true});const p=new URL(createHash('sha256').update(filing.source).digest('hex')+'.txt',cache);let text;
 try{text=await readFile(p,'utf8');}catch{await new Promise(r=>setTimeout(r,250));const r=await fetch(filing.source,{headers:{'User-Agent':process.env.SEC_USER_AGENT},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`SEC document HTTP ${r.status}`);const html=await r.text();if(html.length>15e6)throw Error('Filing too large for inline analysis');text=htmlText(html);await writeFile(p,text);}
 return {kind:filing.form,period:filing.period||filing.date,source:filing.source,text,recordedAt:new Date().toISOString()};
}
export function extractSnippets(document){const terms=/\b(data cent(?:er|re)|hyperscaler|HBM|liquid cooling|800VDC|backlog|bookings|China|Chinese|supply agreement|capacity expansion)\b/ig;const result=[];let match;while((match=terms.exec(document.text))&&result.length<24){const start=Math.max(0,match.index-150),end=Math.min(document.text.length,match.index+300);result.push({type:'note',key:/China|Chinese/i.test(match[0])?'chinaCandidate':'disclosureSignal',date:document.period,source:document.source,note:document.text.slice(start,end),reviewed:false,extraction:'keyword-context; needs human verification'});}return result;}
