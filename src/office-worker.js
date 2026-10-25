/* Office package engine. Runs only in a terminable Worker in the application. */
(function(root){
'use strict';
function createEngine(JSZip,sax,progress=()=>{}){
 const MiB=1048576, limits=Object.freeze({input:1024*MiB,session:2048*MiB,output:1024*MiB,warn:256*MiB,entries:100000,inflated:2048*MiB,image:512*MiB,xml:32*MiB,metadata:128*MiB,pixels:32000000});
 const fail=(code)=>{throw Object.assign(new Error(code),{code});};
 const size=f=>f.size??f.byteLength;
 const slice=async(f,a,b)=>f instanceof Uint8Array?f.subarray(a,b):new Uint8Array(await f.slice(a,b).arrayBuffer());
 function validateInputs(files){if(files.some(f=>size(f)>limits.input))fail('INPUT_LIMIT');if(files.reduce((n,f)=>n+size(f),0)>limits.session)fail('SESSION_LIMIT');}
 function canonical(path){if(!path||/[\\\0?#]/.test(path))return null;const out=[];for(const x of path.split('/')){if(!x||x==='.')continue;if(x==='..'){if(!out.length)return null;out.pop();}else out.push(x);}return out.join('/');}
 function resolveTarget(part,target){try{target=decodeURIComponent(target);}catch{return null;}if(/^[a-z][a-z\d+.-]*:/i.test(target)||target.startsWith('//'))return null;return canonical(target.startsWith('/')?target:part.slice(0,part.lastIndexOf('/')+1)+target);}
 async function preflight(file){
  validateInputs([file]);const n=size(file);if(n<22)fail('CORRUPT');const start=Math.max(0,n-65557),tail=await slice(file,start,n),d=new DataView(tail.buffer,tail.byteOffset,tail.byteLength);let e=-1;
  for(let i=tail.length-22;i>=0;i--)if(d.getUint32(i,true)===0x06054b50&&i+22+d.getUint16(i+20,true)===tail.length){e=i;break;}if(e<0){const sig=await slice(file,0,8);if(sig[0]===0xd0&&sig[1]===0xcf)fail('OLE');fail('CORRUPT');}
  const count=d.getUint16(e+10,true),length=d.getUint32(e+12,true),offset=d.getUint32(e+16,true);if(count===65535||length===0xffffffff||offset===0xffffffff)fail('ZIP64');if(d.getUint16(e+4,true)||d.getUint16(e+6,true)||d.getUint16(e+8,true)!==count)fail('CORRUPT');if(count>limits.entries||length>128*MiB)fail('RESOURCE_LIMIT');if(offset+length>start+e)fail('CORRUPT');
  const bytes=await slice(file,offset,offset+length),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),entries=new Map();let p=0,total=0;const decoder=new TextDecoder('utf-8',{fatal:true});
  for(let i=0;i<count;i++){
   if(p+46>bytes.length||v.getUint32(p,true)!==0x02014b50)fail('CORRUPT');const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),crc=v.getUint32(p+16,true),compressed=v.getUint32(p+20,true),uncompressed=v.getUint32(p+24,true),nl=v.getUint16(p+28,true),el=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),local=v.getUint32(p+42,true);
   if(flags&1)fail('ENCRYPTED');if([compressed,uncompressed,local].includes(0xffffffff))fail('ZIP64');if(![0,8].includes(method))fail('COMPRESSION');if(p+46+nl+el+cl>bytes.length)fail('CORRUPT');let name;try{name=decoder.decode(bytes.subarray(p+46,p+46+nl));}catch{fail('CORRUPT');}
   const key=canonical(name);if(!key||name.startsWith('/')||name.split('/').some(x=>x==='..'||x==='.')||/[\\\0]/.test(name)||entries.has(key))fail('CORRUPT');
   const header=await slice(file,local,Math.min(local+30+nl,offset));if(header.length<30+nl)fail('CORRUPT');const h=new DataView(header.buffer,header.byteOffset,header.byteLength),extra=h.getUint16(28,true);
   if(h.getUint32(0,true)!==0x04034b50||h.getUint16(6,true)!==flags||h.getUint16(8,true)!==method||h.getUint16(26,true)!==nl||decoder.decode(header.subarray(30,30+nl))!==name||local+30+nl+extra+compressed>offset)fail('CORRUPT');
   if(!(flags&8)&&(h.getUint32(14,true)!==crc||h.getUint32(18,true)!==compressed||h.getUint32(22,true)!==uncompressed))fail('CORRUPT');
   total+=uncompressed;if(total>limits.inflated)fail('RESOURCE_LIMIT');entries.set(key,{name,crc,compressed,uncompressed,dir:name.endsWith('/')});p+=46+nl+el+cl;
  }if(p!==bytes.length)fail('CORRUPT');return {entries,total,count};
 }
 const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
 async function open(file){const meta=await preflight(file);let zip;try{zip=await JSZip.loadAsync(await slice(file,0,size(file)));}catch{fail('CORRUPT');}return {zip,...meta};}
 function read(ctx,path,max=limits.image,prefix=false){
  const meta=ctx.entries.get(path),entry=ctx.zip.file(path);if(!meta||!entry)fail('MISSING');if(!prefix&&meta.uncompressed>max)fail('RESOURCE_LIMIT');
  return new Promise((resolve,reject)=>{let chunks=[],total=0,crc=0xffffffff,done=false;const stream=entry.internalStream('uint8array');const stop=(err)=>{if(done)return;done=true;stream.pause();chunks=[];reject(Object.assign(new Error(err),{code:err}));};
   stream.on('data',chunk=>{if(done)return;total+=chunk.length;if(total>meta.uncompressed||(!prefix&&total>max)){stop('CORRUPT');return;}for(let i=0;i<chunk.length;i++)crc=crcTable[(crc^chunk[i])&255]^(crc>>>8);
    const remaining=max-(total-chunk.length);chunks.push(prefix?chunk.subarray(0,Math.max(0,remaining)):chunk);
    if(prefix&&total>=max){done=true;stream.pause();finish();}
   }).on('error',()=>stop('CORRUPT')).on('end',()=>{if(done)return;if(total!==meta.uncompressed||((crc^0xffffffff)>>>0)!==meta.crc){stop('CORRUPT');return;}done=true;finish();}).resume();
   function finish(){const count=chunks.reduce((n,c)=>n+c.length,0),out=new Uint8Array(count);let at=0;for(const c of chunks){out.set(c,at);at+=c.length;}chunks=[];resolve(out);}
  });
 }
 function dimensions(b){const dv=new DataView(b.buffer,b.byteOffset,b.byteLength),none={width:null,height:null,mime:''};if(b.length>=24&&b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[12]===73&&b[13]===72&&b[14]===68&&b[15]===82)return {width:dv.getUint32(16),height:dv.getUint32(20),mime:'image/png'};
  if(b.length>=10&&String.fromCharCode(...b.subarray(0,6)).match(/^GIF8[79]a$/))return {width:dv.getUint16(6,true),height:dv.getUint16(8,true),mime:'image/gif'};
  if(b.length>=26&&b[0]===66&&b[1]===77&&dv.getUint32(14,true)>=40)return {width:Math.abs(dv.getInt32(18,true)),height:Math.abs(dv.getInt32(22,true)),mime:'image/bmp'};
  if(b.length>4&&b[0]===255&&b[1]===216){let p=2;while(p+4<=b.length){if(b[p++]!==255)break;const tag=b[p++];if(tag===216||tag===1)continue;if(tag===217||tag===218)break;const len=dv.getUint16(p);if(len<2||p+len>b.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(tag)&&len>=7)return {width:dv.getUint16(p+5),height:dv.getUint16(p+3),mime:'image/jpeg'};p+=len;}}
  if(b.length>=30&&String.fromCharCode(...b.subarray(0,4))==='RIFF'&&String.fromCharCode(...b.subarray(8,12))==='WEBP'){const type=String.fromCharCode(...b.subarray(12,16));if(type==='VP8X')return {width:1+b[24]+(b[25]<<8)+(b[26]<<16),height:1+b[27]+(b[28]<<8)+(b[29]<<16),mime:'image/webp'};if(type==='VP8 '&&b[23]===157&&b[24]===1&&b[25]===42)return {width:dv.getUint16(26,true)&16383,height:dv.getUint16(28,true)&16383,mime:'image/webp'};if(type==='VP8L'&&b[20]===47)return {width:1+(dv.getUint32(21,true)&16383),height:1+((dv.getUint32(21,true)>>>14)&16383),mime:'image/webp'};}
  return none;
 }
 function parseXML(bytes,onTag,onClose=()=>{}){let text;if(bytes[0]===255&&bytes[1]===254)text=new TextDecoder('utf-16le',{fatal:true}).decode(bytes);else if(bytes[0]===254&&bytes[1]===255)text=new TextDecoder('utf-16be',{fatal:true}).decode(bytes);else text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(/<!\s*(DOCTYPE|ENTITY)/i.test(text))fail('METADATA');let depth=0,nodes=0;const p=sax.parser(true,{xmlns:true,strictEntities:true});p.ondoctype=()=>fail('METADATA');p.onerror=()=>fail('METADATA');p.onopentag=t=>{if(++depth>256||++nodes>1000000)fail('METADATA');onTag(t,depth);};const stack=[];const opened=p.onopentag;p.onopentag=t=>{stack.push(t);opened(t);};p.onclosetag=()=>{onClose(stack.pop());depth--;};sax.MAX_BUFFER_LENGTH=1048576;for(let i=0;i<text.length;i+=16384)p.write(text.slice(i,i+16384));p.close();}
 const attr=(t,n)=>t.attributes[n]?.value??'';
 async function inspect(file){const ctx=await open(file),warnings=[];if(size(file)>limits.warn||ctx.count>5000||ctx.total>64*MiB&&ctx.total/Math.max(1,size(file))>200)warnings.push('LARGE');let metadataBytes=0;
  const xml=async(path,fn,close)=>{if(!ctx.entries.has(path))return false;const n=ctx.entries.get(path).uncompressed;if(n>limits.xml||(metadataBytes+=n)>limits.metadata)fail('METADATA');parseXML(await read(ctx,path,limits.xml),fn,close);return true;};
  const defaults=new Map(),overrides=new Map();try{await xml('[Content_Types].xml',t=>{if(t.uri!=='http://schemas.openxmlformats.org/package/2006/content-types')return;if(t.local==='Default')defaults.set(attr(t,'Extension').toLowerCase(),attr(t,'ContentType').toLowerCase());if(t.local==='Override'){let p=attr(t,'PartName');try{p=decodeURIComponent(p);}catch{}overrides.set(p.replace(/^\//,''),attr(t,'ContentType').toLowerCase());}});}catch{warnings.push('METADATA');}
  const typeFor=p=>overrides.get(p)||defaults.get(p.split('.').pop().toLowerCase())||'';
  const images=[],media=[...ctx.entries.entries()].filter(([p,m])=>!m.dir&&/^(xl|ppt|word)\/media\/[^/\\]+$/i.test(p));
  for(const [path,m] of media){const contentType=typeFor(path);if(contentType?!contentType.startsWith('image/'):!(/\.(png|jpe?g|jfif|gif|webp|svg|emf|wmf|tiff?|bmp|dib|ico|avif|heic|heif|jxr|wdp)$/i.test(path)))continue;let dim={width:null,height:null,mime:''},readError=null;try{dim=dimensions(await read(ctx,path,65536,true));}catch(e){readError=e.code||'CORRUPT';}images.push({path,name:path.split('/').pop(),contentType,bytes:m.uncompressed,compressedBytes:m.compressed,...dim,usages:[],readError});}
  try{await mapUsages(ctx,images,xml);}catch{warnings.push('METADATA');}
  return {images,skippedMedia:media.length-images.length,warnings:[...new Set(warnings)]};
 }
 async function mapUsages(ctx,images,xml){
  const imageByPath=new Map(images.map(i=>[i.path,i])),cache=new Map();let uses=0;
  const relNS=u=>/^http:\/\/(schemas\.openxmlformats\.org\/officeDocument\/2006|purl\.oclc\.org\/ooxml\/officeDocument)\/relationships$/.test(u);
  const relationIds=t=>Object.values(t.attributes).filter(a=>relNS(a.uri)&&['id','embed','link'].includes(a.local)).map(a=>a.value);
  async function relationships(part){if(cache.has(part))return cache.get(part);const map=new Map(),at=part.lastIndexOf('/'),p=part.slice(0,at+1)+'_rels/'+part.slice(at+1)+'.rels';await xml(p,t=>{if(t.local!=='Relationship'||!/^http:\/\/(schemas\.openxmlformats\.org\/package\/2006|purl\.oclc\.org\/ooxml\/package)\/relationships$/.test(t.uri))return;const id=attr(t,'Id');if(map.has(id))fail('METADATA');map.set(id,{path:attr(t,'TargetMode')==='External'?null:resolveTarget(part,attr(t,'Target')),kind:attr(t,'Type').split('/').pop()});});cache.set(part,map);return map;}
  const followKinds=new Set(['drawing','vmlDrawing','slideLayout','slideMaster','notesSlide','notesMaster','header','footer','footnotes','endnotes','comments']);
  async function walk(part,context,seen=new Set()){
   const key=part+'|'+context.kind+'|'+context.order;if(seen.has(key))return;if(seen.size>=10000)fail('METADATA');seen.add(key);
   if(!ctx.entries.has(part))fail('METADATA');const rel=await relationships(part),references=[];let currentSection=1;
   await xml(part,t=>{for(const id of relationIds(t))references.push({id,section:currentSection});},tag=>{if(tag.local==='sectPr'&&context.kind==='body')currentSection++;});
   for(const edge of rel.values())if(['slideLayout','slideMaster','notesSlide','notesMaster','footnotes','endnotes','comments'].includes(edge.kind))references.push({edge,section:null});
   const handled=new Set();for(const reference of references){const edge=reference.edge||rel.get(reference.id);if(!edge){continue;}if(!edge.path)continue;const dedupe=edge.path+'|'+reference.section;if(handled.has(dedupe))continue;handled.add(dedupe);
    const image=imageByPath.get(edge.path);if(edge.kind==='image'&&image){const usage={...context,part,order:context.kind==='body'?reference.section:context.order};if(++uses>200000)fail('METADATA');if(!image.usages.some(u=>u.kind===usage.kind&&u.part===usage.part&&u.label===usage.label&&u.order===usage.order))image.usages.push(usage);}
    else if(followKinds.has(edge.kind)){const kind=['header','footer','footnotes','endnotes','comments'].includes(edge.kind)?edge.kind:context.kind;await walk(edge.path,{...context,kind,detail:edge.kind,order:context.kind==='body'?reference.section:context.order},seen);}
   }
  }
  if(ctx.entries.has('ppt/presentation.xml')){const rel=await relationships('ppt/presentation.xml'),slides=[];await xml('ppt/presentation.xml',t=>{if(t.local==='sldId'&&/\/presentationml\//.test(t.uri)){const id=relationIds(t)[0];if(id)slides.push(id);}});for(let i=0;i<slides.length;i++){const e=rel.get(slides[i]);if(e?.path)await walk(e.path,{kind:'slide',label:'',order:i+1});}}
  if(ctx.entries.has('xl/workbook.xml')){const rel=await relationships('xl/workbook.xml'),sheets=[];await xml('xl/workbook.xml',t=>{if(t.local==='sheet'&&/\/spreadsheetml\//.test(t.uri))sheets.push({id:relationIds(t)[0],label:attr(t,'name')+(attr(t,'state')&&attr(t,'state')!=='visible'?' (hidden)':'')});});for(let i=0;i<sheets.length;i++){const e=rel.get(sheets[i].id);if(e?.path)await walk(e.path,{kind:'sheet',label:sheets[i].label,order:i+1});}}
  if(ctx.entries.has('word/document.xml'))await walk('word/document.xml',{kind:'body',label:'',order:1});
 }
 async function exportImages(items,options={}){
  const output=new JSZip(),failed=[],outputs=[],folders=new Map(),usedFolders=new Set(),usedPaths=new Set(),fingerprints=new Map();let total=0,selectedTotal=0,ctx=null,current=null,count=0;
  const clean=s=>(s||'document').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').replace(/[. ]+$/,'').slice(0,160)||'document';
  const reserve=(base,set)=>{let name=base,n=2;while(set.has(name.toLowerCase())){const d=base.lastIndexOf('.'),slash=base.lastIndexOf('/');name=d>slash+1?base.slice(0,d)+' ('+n+++')'+base.slice(d):base+' ('+n+++')';}set.add(name.toLowerCase());return name;};
  for(const item of items){try{
   if(current!==item.documentId){ctx=null;ctx=await open(item.file);current=item.documentId;}
   const bytes=await read(ctx,item.path);selectedTotal+=bytes.length;if(selectedTotal>limits.output)fail("OUTPUT_LIMIT");progress({stage:"images",percent:Math.round((count+failed.length)/Math.max(1,items.length)*80)});let duplicate=null;
   if(options.unique){let crc=0xffffffff;for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);const key=bytes.length+':'+(crc>>>0),bucket=fingerprints.get(key)||[];duplicate=bucket.find(x=>x.bytes.length===bytes.length&&x.bytes.every((b,i)=>b===bytes[i]));if(!duplicate){duplicate={bytes,output:null};bucket.push(duplicate);fingerprints.set(key,bucket);}}
   const source={document:item.documentName,path:item.path,id:item.id,usages:item.usages||[]};
   if(duplicate?.output){duplicate.output.sources.push(source);count++;continue;}
   total+=bytes.length;if(total>limits.output)fail('OUTPUT_LIMIT');
   if(!folders.has(item.documentId)){const base=clean(item.documentName.replace(/\.[^.]+$/,''));let name=base,n=2;while(usedFolders.has(name.toLowerCase()))name=base+' ('+n+++')';usedFolders.add(name.toLowerCase());folders.set(item.documentId,name);}
   const path=reserve(folders.get(item.documentId)+'/'+clean(item.name),usedPaths),description={path,bytes:bytes.length,sources:[source]};outputs.push(description);if(duplicate)duplicate.output=description;output.file(path,bytes);count++;
  }catch(e){if(e.code==='OUTPUT_LIMIT'||e.code==='RESOURCE_LIMIT')throw e;failed.push({id:item.id,document:item.documentName,path:item.path,code:e.code||'UNKNOWN'});}}
  ctx=null;
  if(!count)return {blob:null,failed,count};
  if(options.unique||failed.length){const text=JSON.stringify({version:1,outputs,omitted:failed},null,2);total+=new TextEncoder().encode(text).length;if(total>limits.output)fail('OUTPUT_LIMIT');output.file('_office-image-provenance.json',text);}
  const blob=await new Promise((resolve,reject)=>{const chunks=[];let actual=0;const stream=output.generateInternalStream({type:'uint8array',compression:'STORE',streamFiles:true});stream.on('data',chunk=>{actual+=chunk.length;if(actual>limits.output){stream.pause();chunks.length=0;reject(Object.assign(new Error('OUTPUT_LIMIT'),{code:'OUTPUT_LIMIT'}));return;}chunks.push(chunk);progress({stage:'zip',percent:Math.min(99,80+Math.round(actual/Math.max(1,total)*19))});}).on('error',()=>reject(Object.assign(new Error('EXPORT'),{code:'EXPORT'}))).on('end',()=>resolve(new Blob(chunks,{type:'application/zip'}))).resume();});
  return {blob,failed,count};
 }
 async function identifyDuplicates(candidates){
  const buckets=new Map(),groups=[];
  for(const item of candidates){const bytes=await readImage(item.file,item.path);let crc=0xffffffff;for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);const key=bytes.length+':'+(crc>>>0),bucket=buckets.get(key)||[];let found=null;
   for(const candidate of bucket){const other=await readImage(candidate.item.file,candidate.item.path);if(other.length===bytes.length&&other.every((v,i)=>v===bytes[i])){found=candidate.group;break;}}
   if(found)found.push(item.id);else{const group=[item.id];groups.push(group);bucket.push({item,group});buckets.set(key,bucket);}
  }return groups;
 }
 async function readImage(file,path){return read(await open(file),path);}
 return {exportImages,identifyDuplicates,limits,validateInputs,resolveTarget,preflight,inspect,readImage,dimensions,parseXML,open,read,fail};
}
if(typeof module==='object'&&module.exports)module.exports={createEngine};
else {root.onmessage=async({data:m})=>{const engine=createEngine(root.JSZip,root.sax,progress=>root.postMessage({jobId:m.jobId,sessionId:m.sessionId,progress}));try{const result=await engine[m.operation](...m.payload);root.postMessage({jobId:m.jobId,sessionId:m.sessionId,result});}catch(e){root.postMessage({jobId:m.jobId,sessionId:m.sessionId,error:{code:e.code||'UNKNOWN'}});}};}
})(typeof self==='undefined'?globalThis:self);
