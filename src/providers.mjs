import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {obs,fundamentals} from './engine.mjs';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
export async function request(url,{headers={},ttl=3600}={}){
 const cache=new URL('../data/cache/',import.meta.url);await mkdir(cache,{recursive:true});const path=new URL(createHash('sha256').update(url).digest('hex')+'.json',cache);
 try{const saved=JSON.parse(await readFile(path,'utf8'));if(Date.now()-saved.at<ttl*1000)return saved.body;}catch{}
 for(let attempt=0;attempt<3;attempt++){await delay(250+attempt*1000);try{const r=await fetch(url,{headers,signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error(`HTTP ${r.status}`);const body=await r.json();if(body.Note||body.Information||body['Error Message'])throw Error('Provider quota, plan or symbol unavailable');await writeFile(path,JSON.stringify({at:Date.now(),body}));return body;}catch(e){if(attempt===2)throw Error(e.message.replace(/apikey=[^&\s]+/gi,'apikey=REDACTED'));}}
}
export async function sec(company){
 const ua=process.env.SEC_USER_AGENT;if(!ua||!ua.includes('@'))throw Error('SEC_USER_AGENT에 실제 연락 이메일을 설정하세요.');
 const cik=company.cik.padStart(10,'0'),source=`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,options={headers:{'User-Agent':ua}};
 const facts=await request(source,options),sub=await request(`https://data.sec.gov/submissions/CIK${cik}.json`,options),recent=sub.filings?.recent;
 const filings=(recent?.form||[]).map((form,i)=>({form,date:recent.filingDate[i],period:recent.reportDate[i],source:`https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${recent.accessionNumber[i].replaceAll('-','')}/${recent.primaryDocument[i]}`})).filter(x=>['10-K','10-Q','8-K'].includes(x.form)).slice(0,20);
 return {...fundamentals(facts,source),filings,name:sub.name||company.name,exchange:sub.exchanges?.join(', ')||null};
}
export async function market(ticker){
 const failures=[];let bars=[],source='',adjusted=false,metrics={},rawClose=null;
 try{source=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=2y&interval=1d`;const j=await request(source),r=j.chart?.result?.[0];if(!r)throw Error('No chart');const q=r.indicators.quote[0],adj=r.indicators.adjclose?.[0]?.adjclose;adjusted=!!adj;
 bars=(r.timestamp||[]).map((t,i)=>{const factor=adj&&q.close[i]?adj[i]/q.close[i]:1;return {date:new Date(t*1000).toISOString().slice(0,10),open:q.open[i]*factor,high:q.high[i]*factor,low:q.low[i]*factor,close:adj?adj[i]:q.close[i],volume:q.volume[i]};}).filter(x=>x.close>0&&x.open>0&&x.high>0&&x.low>0);
 if(!bars.length)throw Error('Empty chart');rawClose=q.close.filter(x=>Number.isFinite(x)).at(-1);}catch(e){failures.push({provider:'Yahoo chart',message:e.message});}
 const key=process.env.ALPHA_VANTAGE_API_KEY;
 if(key){try{const url=`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(ticker)}&apikey=${encodeURIComponent(key)}`,j=await request(url,{ttl:86400}),source='https://www.alphavantage.co/documentation/#company-overview';const mapping={marketCap:'MarketCapitalization',forwardPE:'ForwardPE',trailingPE:'PERatio',evSales:'EVToRevenue',evEbitda:'EVToEBITDA',peg:'PEGRatio',institutionalOwnership:'PercentInstitutions'};for(const [k,v]of Object.entries(mapping))metrics[k]=obs(j[v]&&Number.isFinite(+j[v])?+j[v]:null,k==='marketCap'?'USD':k==='institutionalOwnership'?'%':'x',source,new Date().toISOString().slice(0,10));}catch(e){failures.push({provider:'Alpha Vantage overview',message:e.message});}
 if(!bars.length)try{const j=await request(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(ticker)}&outputsize=full&apikey=${encodeURIComponent(key)}`);bars=Object.entries(j['Time Series (Daily)']||{}).map(([date,v])=>({date,open:+v['1. open'],high:+v['2. high'],low:+v['3. low'],close:+v['4. close'],volume:+v['5. volume']})).sort((a,b)=>a.date.localeCompare(b.date));source='https://www.alphavantage.co/documentation/#daily';adjusted=false;if(!bars.length)throw Error('No daily bars');}catch(e){failures.push({provider:'Alpha Vantage daily',message:e.message});}}
 return {bars,source,adjusted,rawClose,metrics,failures};
}
export async function universe(){const ua=process.env.SEC_USER_AGENT;if(!ua)throw Error('SEC_USER_AGENT required');const j=await request('https://www.sec.gov/files/company_tickers_exchange.json',{headers:{'User-Agent':ua},ttl:86400});return j.data.filter(r=>['Nasdaq','NYSE','CBOE'].includes(r[3])).map(r=>({cik:String(r[0]).padStart(10,'0'),name:r[1],ticker:r[2],exchange:r[3],themes:[]}));}
