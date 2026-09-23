import {update,report,exportSnapshot} from './pipeline.mjs';
const command=process.argv[2];
if(command==='update')console.log(JSON.stringify(await update({expand:process.argv.includes('--universe')}),null,2));
else if(command==='report')console.log(await report());
else if(command==='export')console.log('Snapshot exported:',(await exportSnapshot()).generatedAt);
else if(command==='schedule'){
 const hour=Math.max(0,Math.min(23,Number(process.env.UPDATE_HOUR_UTC)||22));let last='';
 console.log(`Daily updates at ${hour}:00 UTC; keep this process running.`);
 setInterval(async()=>{const now=new Date(),day=now.toISOString().slice(0,10);if(now.getUTCHours()===hour&&last!==day){last=day;try{await update();}catch(e){console.error(e.message);}}},30000);
}else throw Error('Commands: update [--universe], report, export, schedule');
