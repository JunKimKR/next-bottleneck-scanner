import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {db,companies,saveCompany,setting} from './store.mjs';
import {snapshot,update,daily,exportSnapshot} from './pipeline.mjs';
import {validateEvidence,technical} from './engine.mjs';
const port=Number(process.env.PORT)||4317,root=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
let job=null;
const server=http.createServer(async(req,res)=>{
 const json=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 try{
 const url=new URL(req.url,`http://127.0.0.1:${port}`);
 if(!['127.0.0.1','localhost'].includes((req.headers.host||'').split(':')[0]))return json({error:'Invalid host'},403);
 if(req.method==='POST'){
  const origin=req.headers.origin;if(origin!==`http://${req.headers.host}`)return json({error:'Same-origin request required'},403);
  if(!req.headers['content-type']?.includes('application/json'))return json({error:'JSON required'},415);
  let body='';for await(const chunk of req){body+=chunk;if(body.length>1e6)return json({error:'Body too large'},413);}const p=JSON.parse(body||'{}');
  if(url.pathname==='/api/update'){if(job)return json({error:'Update already running'},409);job=update({expand:!!p.expand}).catch(e=>console.error(e.message)).finally(()=>job=null);return json({status:'running'},202);}
  if(url.pathname==='/api/watchlist'){if(!Array.isArray(p.tickers)||p.tickers.some(t=>!companies().some(c=>c.ticker===t)))return json({error:'Unknown ticker'},400);setting('watchlist',p.tickers);return json({ok:true});}
  if(url.pathname==='/api/company'){if(!/^[A-Z0-9.-]{1,12}$/.test(p.ticker)||!/^\d{1,10}$/.test(p.cik)||!p.name)return json({error:'Ticker, name, numeric CIK required'},400);if(companies().some(c=>c.ticker===p.ticker))return json({error:'Already exists'},409);saveCompany({ticker:p.ticker,cik:p.cik.padStart(10,'0'),name:p.name,themes:[],metrics:{},bars:[],filings:[]});return json({ok:true});}
  const c=companies().find(c=>c.ticker===p.ticker);if(!c)return json({error:'Unknown ticker'},400);
  if(url.pathname==='/api/evidence'){const e=validateEvidence(p.evidence);db.prepare('INSERT INTO evidence(ticker,payload) VALUES(?,?)').run(c.ticker,JSON.stringify({...e,recordedAt:new Date().toISOString()}));await exportSnapshot();return json({ok:true});}
  if(url.pathname==='/api/document'){const d=p.document;if(!d?.text||!/^https:\/\//.test(d.source)||!Number.isFinite(Date.parse(d.period))||!['earnings-call','10-Q','10-K','IR'].includes(d.kind))return json({error:'Document text, source, period and kind required'},400);db.prepare('INSERT INTO documents(ticker,payload) VALUES(?,?)').run(c.ticker,JSON.stringify({...d,recordedAt:new Date().toISOString()}));return json({ok:true});}
  if(url.pathname==='/api/bars'){if(!Array.isArray(p.bars)||!p.bars.length||!/^https:\/\//.test(p.source)||typeof p.adjusted!=='boolean'||p.bars.some(b=>!Number.isFinite(Date.parse(b.date))||!['open','high','low','close','volume'].every(k=>Number.isFinite(b[k]))||b.low<=0||b.high<b.low||b.close>b.high||b.close<b.low||b.volume<0))return json({error:'Invalid OHLCV or provenance'},400);c.bars=p.bars;c.technical={...technical(p.bars,p.adjusted),source:p.source};saveCompany(c);return json({ok:true});}
  return json({error:'Not found'},404);
 }
 if(req.method!=='GET')return json({error:'Method not allowed'},405);
 if(url.pathname==='/api/snapshot')return json({...snapshot(),mode:'local',updating:!!job});
 if(url.pathname==='/api/report'){res.writeHead(200,{'Content-Type':'text/markdown; charset=utf-8'});return res.end(daily());}
 const path=resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
 if(!path.startsWith(root+sep)&&path!==root)return json({error:'Forbidden'},403);
 const content=await readFile(path);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(content);
 }catch(e){json({error:e.code==='ENOENT'?'Not found':e.message},e.code==='ENOENT'?404:400);}
});
server.listen(port,'127.0.0.1',()=>console.log(`NEXT BOTTLENECK SCANNER http://127.0.0.1:${port}`));
