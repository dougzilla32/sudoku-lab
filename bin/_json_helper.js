const mode=process.argv[2]||'check';
const arg=process.argv[3]||'';
const d=[];
process.stdin.on('data',c=>d.push(c));
process.stdin.on('end',()=>{
  const raw=d.join('');
  const s=raw.indexOf('['), e=raw.lastIndexOf(']')+1;
  let data;
  try{ data=JSON.parse(raw.slice(s,e)); }
  catch(e){ process.exit(1); }

  if(mode==='check'){
    process.exit(0);
  } else if(mode==='has_name'){
    process.exit(data.some(x=>x.name===arg)?0:1);
  } else if(mode==='get_id_by_name'){
    const item=data.find(x=>x.name===arg);
    if(item){ console.log(item.id||item.ref||''); process.exit(0); }
    process.exit(1);
  } else if(mode==='first_id'){
    if(data.length){ console.log(data[0].id||''); }
    process.exit(0);
  } else if(mode==='anon_key'){
    const item=data.find(x=>x.name==='anon');
    if(item){ console.log(item.api_key||''); process.exit(0); }
    process.exit(1);
  }
});
