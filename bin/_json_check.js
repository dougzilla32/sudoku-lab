const d=[];
process.stdin.on('data',c=>d.push(c));
process.stdin.on('end',()=>{
  const raw=d.join('');
  const s=raw.indexOf('['), e=raw.lastIndexOf(']')+1;
  try{ JSON.parse(raw.slice(s,e)); process.exit(0); }
  catch(e){ process.exit(1); }
});
