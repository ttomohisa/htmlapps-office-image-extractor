const test=require('node:test');
const assert=require('node:assert/strict');
const {fixture,office,settled,action,JSZip}=require('./app-harness.cjs');
const plain=value=>JSON.parse(JSON.stringify(value));
const bytes=Uint8Array.from([0,1,128,255,4,9]);
test('uses real embedded JSZip 3.10.1',()=>assert.equal(JSZip.version,'3.10.1'));
test('mixed PowerPoint media only counts the image and explains skipped audio/video',async()=>{
  const f=await fixture(); f.api.addFiles([await office('mixed.pptx',{'ppt/media/image1.png':bytes,'ppt/media/video1.mp4':'video','ppt/media/audio1.m4a':'audio'},'<Default Extension="png" ContentType="image/png"/><Default Extension="mp4" ContentType="video/mp4"/><Default Extension="m4a" ContentType="audio/mp4"/>')]); await settled(f);
  assert.deepEqual(plain(f.api.records[0].images.map(i=>i.name)),['image1.png']); assert.equal(f.api.records[0].skippedMedia,2); assert.match(f.get('#file-list').innerHTML,/2 non-image/);
});
test('content-type overrides beat extensions and defaults; declared uncommon images survive',async()=>{
  const f=await fixture(); f.api.addFiles([await office('override.docx',{'word/media/a.png':bytes,'word/media/b.bin':bytes,'word/media/c.mp4':bytes},'<Default Extension="png" ContentType="image/png"/><Default Extension="bin" ContentType="application/octet-stream"/><Override PartName="/word/media/a.png" ContentType="video/mp4"/><Override PartName="/word/media/b.bin" ContentType="image/x-custom"/><Override PartName="/word/media/c.mp4" ContentType="image/png"/>')]); await settled(f);
  assert.deepEqual(plain(f.api.records[0].images.map(i=>i.name)),['b.bin','c.mp4']);
});
test('missing metadata falls back to known image extensions including uppercase and vector formats',async()=>{
  const f=await fixture(),formats=['PNG','jpeg','jpg','WEBP','GIF','SVG','EMF','WMF','TIFF','tif','bmp']; const entries=Object.fromEntries(formats.map(ext=>['xl/media/image.'+ext,bytes])); entries['xl/media/movie.mp4']=bytes; entries['xl/media/unknown.bin']=bytes;
  f.api.addFiles([await office('fallback.xlsx',entries,null)]);await settled(f);assert.equal(f.api.records[0].images.length,formats.length);assert.equal(f.api.records[0].skippedMedia,2);
});
test('untyped entries use fallback without treating declared non-images as images',async()=>{
  const f=await fixture();f.api.addFiles([await office('partial.xlsx',{'xl/media/yes.WEBP':bytes,'xl/media/no.png':bytes,'xl/media/unknown.dat':bytes},'<Default Extension="png" ContentType="application/octet-stream"/>')]);await settled(f);assert.deepEqual(plain(f.api.records[0].images.map(i=>i.name)),['yes.WEBP']);
});
for(const extension of ['xlsx','xlsm','xltx','xltm','pptx','pptm','potx','potm','ppsx','ppsm','docx','docm','dotx','dotm'])test(`inspects ${extension} with every image selected initially`,async()=>{
  const f=await fixture();const root=/^x/.test(extension)?'xl':/^(p)/.test(extension)?'ppt':'word';f.api.addFiles([await office('file.'+extension,{[root+'/media/original.PNG']:bytes})]);await settled(f);assert.equal(f.api.records[0].images.length,1);assert.equal(f.api.records[0].images[0].selected,true);assert.equal(f.get('#download-button').disabled,false);
});
test('selected ZIP contains only selected images with unchanged bytes',async()=>{
  const f=await fixture();f.api.addFiles([await office('slides.pptx',{'ppt/media/a.png':bytes,'ppt/media/b.png':'second'})]);await settled(f);await action(f,'[data-expand-index="0"]');await action(f,'[data-image-index="1"]','change',{checked:false});await f.api.downloadExtractedImages();assert.equal(f.downloads.length,1);const zip=await JSZip.loadAsync(await f.downloads[0].blob.arrayBuffer());assert.deepEqual(Object.keys(zip.files).filter(k=>!zip.files[k].dir),['slides/a.png']);assert.deepEqual(await zip.file('slides/a.png').async('uint8array'),bytes);
});
test('none disables ZIP; all restores selection and per-document/overall totals',async()=>{
  const f=await fixture();f.api.addFiles([await office()]);await settled(f);await action(f,'[data-expand-index="0"]');await action(f,'[data-select-none="0"]');assert.equal(f.get('#download-button').disabled,true);await f.api.downloadExtractedImages();assert.equal(f.downloads.length,0);assert.match(f.get('#selected-summary').textContent,/0/);await action(f,'[data-select-all="0"]');assert.equal(f.get('#download-button').disabled,false);
});
test('individual download preserves original name and bytes without changing selection',async()=>{
  const f=await fixture();f.api.addFiles([await office('one.docx',{'word/media/original.svg':bytes},'<Default Extension="svg" ContentType="image/svg+xml"/>')]);await settled(f);await action(f,'[data-expand-index="0"]');await action(f,'[data-select-none="0"]');await action(f,'[data-download-image="0"]');assert.equal(f.downloads[0].name,'original.svg');assert.deepEqual(new Uint8Array(await f.downloads[0].blob.arrayBuffer()),bytes);assert.equal(f.api.records[0].images[0].selected,false);
});
test('multi-document duplicate names and case-insensitive media names remain collision-safe',async()=>{
  const f=await fixture();const one=await office('same.docx',{'word/media/image.png':bytes,'word/media/IMAGE.PNG':'other'});const two=await office('same.pptx',{'ppt/media/image.png':'third'});f.api.addFiles([one,two]);await settled(f);await f.api.downloadExtractedImages();const zip=await JSZip.loadAsync(await f.downloads[0].blob.arrayBuffer());const paths=Object.keys(zip.files).filter(k=>!zip.files[k].dir);assert.equal(new Set(paths.map(p=>p.toLowerCase())).size,3);assert.deepEqual(await zip.file('same/image.png').async('uint8array'),bytes);assert.equal(await zip.file('same (2)/image.png').async('string'),'third');
});
test('expansion, selection and keyboard focus survive progress renders and language switching',async()=>{
  const f=await fixture();f.api.addFiles([await office()]);await settled(f);await action(f,'[data-expand-index="0"]');await action(f,'[data-image-index="0"]','change',{checked:false});const checkbox=f.get('#file-list').querySelector('[data-image-index="0"]');checkbox.focus();const key=checkbox.dataset.focusKey;f.api.render();assert.equal(f.document.activeElement.isConnected,true);assert.equal(f.document.activeElement.dataset.focusKey,key);f.api.setLanguage('ja');assert.equal(f.api.records[0].expanded,true);assert.equal(f.api.records[0].images[0].selected,false);assert.equal(f.document.activeElement.dataset.focusKey,key);assert.match(f.get('#file-list').innerHTML,/すべて選択/);
});
test('remove and clear discard selection and stale async inspection cannot reappear',async()=>{
  const f=await fixture();const file=await office();f.api.addFiles([file]);await action(f,'[data-remove-index="0"]');await new Promise(resolve=>setImmediate(resolve));assert.equal(f.api.records.length,0);assert.equal(f.get('#download-button').disabled,true);f.api.addFiles([file]);await settled(f);await action(f,'[data-expand-index="0"]');await action(f,'[data-select-none="0"]');const clear=f.get('#clear-button').dispatch('click');await f.get('#appConfirmOk').dispatch('click');await clear;assert.equal(f.api.records.length,0);f.api.addFiles([file]);await settled(f);assert.equal(f.api.records[0].images[0].selected,true);
});
test('malformed packages report an error and do not block a valid document',async()=>{
  const f=await fixture();const bad=Object.assign(Uint8Array.from([1,2,3]),{name:'bad.pptx',size:3,lastModified:1});f.api.addFiles([bad,await office()]);await settled(f);assert.equal(f.api.records[0].error,true);assert.equal(f.api.records[1].images.length,1);assert.equal(f.get('#download-button').disabled,false);
});
test('language dictionaries stay in sync and filenames are escaped',async()=>{
  const f=await fixture();assert.deepEqual(Object.keys(f.api.translations.ja).sort(),Object.keys(f.api.translations.en).sort());f.api.addFiles([await office('<unsafe>.pptx',{'ppt/media/<unsafe>.png':bytes})]);await settled(f);await action(f,'[data-expand-index="0"]');assert.doesNotMatch(f.get('#file-list').innerHTML,/<unsafe>/);assert.match(f.get('#file-list').innerHTML,/&lt;unsafe&gt;/);
});
test('extensionless image collisions stay inside dotted document folders',async()=>{
  const f=await fixture();f.api.addFiles([await office('report.v1.docx',{'word/media/IMAGE':bytes,'word/media/image':'second'},'<Override PartName="/word/media/IMAGE" ContentType="image/png"/><Override PartName="/word/media/image" ContentType="image/png"/>')]);await settled(f);await f.api.downloadExtractedImages();const zip=await JSZip.loadAsync(await f.downloads[0].blob.arrayBuffer());assert.deepEqual(Object.keys(zip.files).filter(k=>!zip.files[k].dir),['report.v1/IMAGE','report.v1/image (2)']);assert.equal(await zip.file('report.v1/image (2)').async('string'),'second');
});
test('ZIP export freezes selection, blocks repeated export and refuses new input',async()=>{
  const f=await fixture(),file=await office();f.api.addFiles([file]);await settled(f);await action(f,'[data-expand-index="0"]');const first=f.api.downloadExtractedImages();assert.equal(f.api.exporting,true);assert.equal(f.get('#clear-button').disabled,true);assert.equal(f.get('#choose-button').disabled,true);await action(f,'[data-select-none="0"]');f.api.addFiles([await office('other.docx')]);await f.api.downloadExtractedImages();await first;assert.equal(f.downloads.length,1);assert.equal(f.api.records.length,1);assert.equal(f.api.records[0].images[0].selected,true);
});
test('inspection concurrency stays at two and pending work blocks both export routes',async()=>{
  const f=await fixture();const files=await Promise.all(['a.pptx','b.docx','c.xlsx'].map(name=>office(name)));f.api.addFiles(files);assert.equal(f.api.activeInspections,2);assert.equal(f.api.pendingInspections.length,1);assert.equal(f.get('#download-button').disabled,true);await f.api.downloadExtractedImages();assert.equal(f.downloads.length,0);await settled(f);assert.equal(f.api.records.length,3);
});
test('a clear during inspection discards pending work and cannot restore old results',async()=>{
  const f=await fixture();const files=await Promise.all(['a.pptx','b.docx','c.xlsx'].map(name=>office(name)));f.api.addFiles(files);const clear=f.get('#clear-button').dispatch('click');await f.get('#appConfirmOk').dispatch('click');await clear;for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(f.api.records.length,0);assert.equal(f.api.pendingInspections.length,0);assert.equal(f.api.activeInspections,0);assert.equal(f.get('#download-button').disabled,true);
});
test('individual Save restores keyboard focus after its temporary disabled state',async()=>{
  const f=await fixture();f.api.addFiles([await office()]);await settled(f);await action(f,'[data-expand-index="0"]');const save=f.get('#file-list').querySelector('[data-download-image="0"]');save.focus();await action(f,'[data-download-image="0"]');assert.equal(f.document.activeElement.dataset.focusKey,save.dataset.focusKey);assert.equal(f.document.activeElement.isConnected,true);
});
test('invalid backslash media paths cannot produce traversal paths in the output ZIP',async()=>{
  const f=await fixture();f.api.addFiles([await office('safe.docx',{'word/media/ok.png':bytes,'word/media/..\\..\\outside.png':'bad'})]);await settled(f);await f.api.downloadExtractedImages();const zip=await JSZip.loadAsync(await f.downloads[0].blob.arrayBuffer());assert.deepEqual(Object.keys(zip.files).filter(k=>!zip.files[k].dir),['safe/ok.png']);
});
test('ZIP progress does not rebuild every selectable image row',async()=>{
  const f=await fixture();f.api.addFiles([await office('many.pptx',Object.fromEntries(Array.from({length:20},(_,i)=>['ppt/media/image'+i+'.png',bytes])))]);await settled(f);const before=f.get('#file-list').renderCount;await f.api.downloadExtractedImages();assert.equal(f.get('#file-list').renderCount-before,2);assert.equal(f.downloads.length,1);
});

const zlib = require('node:zlib');
function crc32(bytes) { let crc=~0; for(const b of bytes) { crc^=b; for(let i=0;i<8;i++) crc=(crc>>>1)^(0xedb88320&-(crc&1)); } return (crc^~0)>>>0; }
function chunk(tag,data) { const body=Buffer.concat([Buffer.from(tag),data]),head=Buffer.alloc(4),tail=Buffer.alloc(4); head.writeUInt32BE(data.length);tail.writeUInt32BE(crc32(body));return Buffer.concat([head,body,tail]); }
function png(r,g,b) { const header=Buffer.alloc(13);header.writeUInt32BE(1,0);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;return Uint8Array.from(Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(Buffer.from([0,r,g,b,255]),{level:0})),chunk('IEND',Buffer.alloc(0))])); }
test('distinct Office documents sharing name, size and mtime must both import and export',async()=>{
 const f=await fixture(),red=png(255,0,0),blue=png(0,0,255);
 const first=await office('report.docx',{'word/media/image1.png':red});
 const second=await office('report.docx',{'word/media/image1.png':blue});
 assert.equal(first.name,second.name);assert.equal(first.size,second.size);assert.equal(first.lastModified,second.lastModified);
 assert.notDeepEqual(Buffer.from(first),Buffer.from(second));
 f.api.addFiles([first,second]);await settled(f);
 assert.equal(f.api.records.length,2,'different bytes must not be discarded as duplicate documents');
 await f.api.downloadExtractedImages();
 const zip=await JSZip.loadAsync(await f.downloads[0].blob.arrayBuffer());
 assert.deepEqual(Object.keys(zip.files).filter(p=>!zip.files[p].dir),['report/image1.png','report (2)/image1.png']);
 assert.deepEqual(await zip.file('report/image1.png').async('uint8array'),red);
 assert.deepEqual(await zip.file('report (2)/image1.png').async('uint8array'),blue);
});


test('batch controls select none and all across documents without collapsing panels',async()=>{
 const f=await fixture(); f.api.addFiles(await Promise.all(['one.docx','two.pptx','three.xlsx'].map(name=>office(name)))); await settled(f);
 await action(f,'[data-expand-index="1"]');
 await f.get('#select-none-images').dispatch('click');
 assert.equal(f.api.records.reduce((n,r)=>n+r.images.filter(i=>i.selected).length,0),0);
 assert.equal(f.get('#download-button').disabled,true);
 assert.equal(f.api.records[1].expanded,true);
 await f.get('#select-all-images').dispatch('click');
 assert.equal(f.api.records.reduce((n,r)=>n+r.images.filter(i=>i.selected).length,0),3);
 assert.equal(f.get('#download-button').disabled,false);
});

// Deliberately bounded, controllable File.slice reads exercise admission races.
const {syntheticFile,html}=require('./app-harness.cjs');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate,message='Timed out waiting for state') {
 for(let i=0;i<2000;i++){if(predicate())return;await tick();}throw Error(message);
}
async function drained(f) {await until(()=>f.api.activeInspections===0&&f.api.pendingInspections.length===0);await settled(f);}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function observeSlices(file,hook=async()=>{}) {
 const slice=file.slice.bind(file),reads=[];
 file.slice=(start,end)=>{const blob=slice(start,end);return {async arrayBuffer(){reads.push({start,end});await hook(start,end);return blob.arrayBuffer();}};};
 return reads;
}
async function equalMetadataPair(){return Promise.all([office('report.docx',{'word/media/image1.png':png(255,0,0)}),office('report.docx',{'word/media/image1.png':png(0,0,255)})]);}
async function clear(f){const clearing=f.get('#clear-button').dispatch('click');await f.get('#appConfirmOk').dispatch('click');await clearing;}
function selected(f){return f.api.records.reduce((n,r)=>n+(r.images||[]).filter(i=>i.selected).length,0);}

test('same-metadata differing bytes survive separate settled and overlapping import batches',async()=>{
 for(const overlap of [false,true]){
  const f=await fixture(),[a,b]=await equalMetadataPair();f.api.addFiles([a]);if(!overlap)await drained(f);f.api.addFiles([b]);await drained(f);
  assert.equal(f.api.records.length,2);assert.equal(selected(f),2);assert.equal(f.get('#selection-notice').textContent,'1 file added.');
 }
});
test('same object and independent equal-byte Files dedupe both within and across overlapping batches',async()=>{
 for(const overlap of [false,true]){
  const f=await fixture(),a=await office(),copy=syntheticFile(a,{name:a.name});
  if(overlap){f.api.addFiles([a]);f.api.addFiles([copy]);f.api.addFiles([a]);}else f.api.addFiles([a,copy,a]);
  await drained(f);assert.equal(f.api.records.length,1);assert.equal(f.api.records[0].file,a);
  assert.match(f.get('#selection-notice').textContent,overlap?/1 duplicate skipped/:/1 file added. 2 duplicates skipped/);
 }
});
test('A red, B blue, C blue copy retains A and B once despite delayed overlapping admissions',async()=>{
 const f=await fixture(),[a,b]=await equalMetadataPair(),c=syntheticFile(b,{name:b.name}),gate=deferred();let started=false;
 observeSlices(b,async()=>{started=true;await gate.promise;});f.api.addFiles([a,b]);await until(()=>started);f.api.addFiles([c]);
 assert.equal(f.api.records.length,3);assert.equal(f.api.pendingInspections.length,1);gate.resolve();await drained(f);
 assert.equal(f.api.records.length,2);assert.equal(f.api.records[0].file,a);assert.equal(f.api.records[1].file,b);assert.equal(selected(f),2);
 assert.equal(f.get('#selection-notice').textContent,'1 duplicate skipped.');
});
test('different name, size, or mtime never triggers content-wide deduplication',async()=>{
 for(const key of ['name','size','lastModified']){
  const f=await fixture(),a=await office();const b=key==='size'?await office(a.name,{'ppt/media/image1.png':new Uint8Array(10)}):syntheticFile(a,{name:a.name});
  if(key==='name')b.name='other.pptx';if(key==='lastModified')b.lastModified=2;
  const reads=[observeSlices(a),observeSlices(b)];f.api.addFiles([a,b]);await drained(f);assert.equal(f.api.records.length,2);assert.ok(reads.every(list=>list.length===0));
 }
});
test('identical multi-chunk files dedupe; a late-chunk difference survives with bounded slices',async()=>{
 for(const different of [false,true]){
  const f=await fixture(),data=new Uint8Array(700000);
  const a=await office('large.docx',{'word/media/a.png':data},undefined,{comment:'last-a'}),b=await office('large.docx',{'word/media/a.png':data},undefined,{comment:'last-b'});
  // Equal ZIPs differ only in their final comment byte, after a large STORE payload.
  const copy=different?b:syntheticFile(a,{name:a.name});const readsA=observeSlices(a),readsB=observeSlices(copy);
  f.api.addFiles([a,copy]);await drained(f);assert.equal(f.api.records.length,different?2:1);
  assert.ok(readsA.length>=3);assert.equal(readsA.length,readsB.length);
  for(const read of [...readsA,...readsB])assert.ok(read.end-read.start<=256*1024);
  assert.equal(readsA.at(-1).end,a.size);
 }
});
test('byte comparison stops after the first differing chunk',async()=>{
 const f=await fixture(),[a,b]=await equalMetadataPair();const reads=observeSlices(b);f.api.addFiles([a,b]);await drained(f);assert.equal(reads.length,1);assert.equal(f.api.records.length,2);
});
test('duplicate checks share the max-two slots and do not launch an unbounded batch of reads',async()=>{
 const f=await fixture();const originals=await Promise.all(['a.docx','b.docx','c.docx','d.docx'].map(name=>office(name)));f.api.addFiles(originals);await drained(f);
 const gate=deferred();let active=0,peak=0,reads=0;
 const copies=originals.map(a=>{const b=syntheticFile(a,{name:a.name});observeSlices(b,async()=>{reads++;active++;peak=Math.max(peak,active);await gate.promise;active--;});return b;});
 f.api.addFiles(copies);await until(()=>reads===2);assert.equal(peak,2);assert.equal(f.api.activeInspections,2);assert.equal(f.api.pendingInspections.length,2);gate.resolve();await drained(f);
 assert.equal(peak,2);assert.equal(f.api.records.length,4);assert.equal(f.get('#selection-notice').textContent,'4 duplicates skipped.');
});
test('pending duplicate comparison blocks ZIP, individual Save, and global controls',async()=>{
 const f=await fixture(),a=await office();f.api.addFiles([a]);await drained(f);await action(f,'[data-expand-index="0"]');
 const gate=deferred(),b=syntheticFile(a,{name:a.name});let started=false;observeSlices(b,async()=>{started=true;await gate.promise;});f.api.addFiles([b]);await until(()=>started);
 for(const id of ['download-button','select-all-images','select-none-images'])assert.equal(f.get('#'+id).disabled,true);
 await f.api.downloadExtractedImages();await action(f,'[data-download-image="0"]');await f.get('#select-none-images').dispatch('click');
 assert.equal(f.downloads.length,0);assert.equal(selected(f),1);gate.resolve();await drained(f);assert.equal(f.get('#select-none-images').disabled,false);
});
test('clear during comparison followed immediately by identical import cannot resurrect or reuse old ownership',async()=>{
 const f=await fixture(),a=await office();f.api.addFiles([a]);await drained(f);
 const gate=deferred(),b=syntheticFile(a,{name:a.name});let started=false;observeSlices(b,async()=>{started=true;await gate.promise;});f.api.addFiles([b]);await until(()=>started);
 const old=f.api.records.slice();await clear(f);const fresh=syntheticFile(a,{name:a.name});f.api.addFiles([fresh]);gate.resolve();await drained(f);
 assert.equal(f.api.records.length,1);assert.equal(f.api.records[0].file,fresh);assert.ok(old.every(r=>!f.api.records.includes(r)));assert.equal(selected(f),1);
 assert.equal(f.get('#selection-notice').textContent,'1 file added.');assert.equal(f.api.activeInspections,0);assert.equal(f.api.pendingInspections.length,0);
});
test('removing the comparing candidate suppresses its result and its stale notice',async()=>{
 const f=await fixture(),a=await office();f.api.addFiles([a]);await drained(f);const gate=deferred(),b=syntheticFile(a,{name:a.name});let started=false;
 observeSlices(b,async()=>{started=true;await gate.promise;});f.api.addFiles([b]);await until(()=>started);await action(f,'[data-remove-index="1"]');gate.resolve();await drained(f);
 assert.equal(f.api.records.length,1);assert.equal(f.api.records[0].file,a);assert.equal(f.get('#selection-notice').textContent,'');assert.equal(selected(f),1);
});
test('removing the earlier canonical while comparison awaits admits the remaining candidate',async()=>{
 const f=await fixture(),a=await office();f.api.addFiles([a]);await drained(f);const gate=deferred(),b=syntheticFile(a,{name:a.name});let started=false;
 observeSlices(b,async()=>{started=true;await gate.promise;});f.api.addFiles([b]);await until(()=>started);await action(f,'[data-remove-index="0"]');gate.resolve();await drained(f);
 assert.equal(f.api.records.length,1);assert.equal(f.api.records[0].file,b);assert.equal(selected(f),1);assert.equal(f.get('#selection-notice').textContent,'');
});
test('clear invalidates two active comparisons and all pending candidates without leaking queue slots',async()=>{
 const f=await fixture(),files=await Promise.all(['a.docx','b.docx','c.docx'].map(name=>office(name)));f.api.addFiles(files);await drained(f);const gate=deferred();let reads=0;
 const copies=files.map(a=>{const b=syntheticFile(a,{name:a.name});observeSlices(b,async()=>{reads++;await gate.promise;});return b;});f.api.addFiles(copies);await until(()=>reads===2);
 await clear(f);assert.equal(f.api.pendingInspections.length,0);gate.resolve();await drained(f);assert.equal(f.api.records.length,0);assert.equal(f.api.activeInspections,0);assert.equal(selected(f),0);assert.equal(f.get('#selection-notice').textContent,'');
 f.api.addFiles([await office('after.docx')]);await drained(f);assert.equal(selected(f),1);
});
test('a failed or incomplete comparison keeps the document, shows a warning, and leaves later work usable',async()=>{
 for(const incomplete of [false,true]){
  const f=await fixture(),a=await office(),b=syntheticFile(a,{name:a.name});f.api.addFiles([a]);await drained(f);
  b.slice=()=>({arrayBuffer:async()=>{if(incomplete)return new ArrayBuffer(0);throw Error('synthetic read error');}});
  f.api.addFiles([b,await office('later.docx')]);await drained(f);assert.equal(f.api.records.length,3);assert.equal(f.api.records[1].duplicateCheckFailed,true);assert.equal(selected(f),3);assert.match(f.get('#file-list').innerHTML,/Duplicate check failed/);
  assert.equal(f.api.activeInspections,0);assert.equal(f.get('#download-button').disabled,false);await f.api.downloadExtractedImages();assert.equal(f.downloads.length,1);
 }
});
test('late older-batch decisions never replace a newer batch notice',async()=>{
 const f=await fixture(),a=await office();f.api.addFiles([a]);await drained(f);const gate=deferred(),b=syntheticFile(a,{name:a.name});let started=false;
 observeSlices(b,async()=>{started=true;await gate.promise;});f.api.addFiles([b]);await until(()=>started);f.api.addFiles([await office('newer.docx'),{name:'unsupported.txt'}]);
 gate.resolve();await drained(f);assert.equal(f.get('#selection-notice').textContent,'1 file added. 1 unsupported file skipped.');assert.equal(f.api.records.length,2);
});
test('global controls handle mixed selection, errors, zero images and new later imports',async()=>{
 const f=await fixture();assert.equal(f.get('#select-all-images').disabled,true);assert.equal(f.get('#select-none-images').disabled,true);
 f.api.addFiles([await office('empty.docx',{}),syntheticFile([1,2],{name:'bad.docx'})]);await drained(f);assert.equal(f.get('#select-all-images').disabled,true);
 f.api.addFiles([await office('word.docx',{'word/media/a.svg':bytes},'<Default Extension="svg" ContentType="image/svg+xml"/>'),await office('slides.pptx'),await office('book.xlsx',{'xl/media/a.tiff':bytes},'<Default Extension="tiff" ContentType="image/tiff"/>')]);await drained(f);
 await action(f,'[data-expand-index="2"]');await action(f,'[data-select-none="2"]');assert.equal(selected(f),2);
 for(let i=0;i<3;i++)await f.get('#select-none-images').dispatch('click');assert.equal(selected(f),0);assert.equal(f.api.records[2].expanded,true);
 await action(f,'[data-download-image="0"]');assert.equal(f.downloads.length,1);assert.equal(selected(f),0);
 f.api.addFiles([await office('later.pptx')]);await drained(f);assert.equal(selected(f),1);assert.equal(f.api.records[2].images[0].selected,false);
 for(let i=0;i<3;i++)await f.get('#select-all-images').dispatch('click');assert.equal(selected(f),4);assert.equal(f.api.records[2].expanded,true);
});
test('global buttons are semantic, have explicit all-document scope, retain focus and translate during renders',async()=>{
 assert.match(html,/<button id="select-all-images"[^>]*type="button"/);assert.match(html,/<button id="select-none-images"[^>]*type="button"/);
 assert.match(html,/role="group" data-i18n-aria-label="batchSelection"/);
 const f=await fixture();f.api.addFiles([await office()]);await drained(f);const button=f.get('#select-none-images');button.focus();await button.dispatch('click');f.api.render();f.api.setLanguage('ja');
 assert.equal(f.document.activeElement,button);assert.equal(button.textContent,'全画像の選択を解除');assert.equal(f.get('#select-all-images').textContent,'全画像を選択');assert.equal(selected(f),0);
 f.api.setLanguage('en');assert.equal(button.textContent,'Select none across documents');
});
test('global controls are inert throughout ZIP and individual-image exports',async()=>{
 const f=await fixture();f.api.addFiles([await office()]);await drained(f);await action(f,'[data-expand-index="0"]');
 for(const exportImage of [false,true]){
  const gate=deferred(),image=f.api.records[0].images[0],original=image.entry.async.bind(image.entry);image.entry.async=async type=>{await gate.promise;return original(type);};
  const exporting=exportImage?action(f,'[data-download-image="0"]'):f.api.downloadExtractedImages();
  assert.equal(f.get('#select-none-images').disabled,true);await f.get('#select-none-images').dispatch('click');assert.equal(selected(f),1);gate.resolve();await exporting;image.entry.async=original;
 }
 assert.equal(f.downloads.length,2);assert.equal(f.get('#select-none-images').disabled,false);
});

test('canonical ownership is checked again when an equality result is delivered',async()=>{
 const f=await fixture(),a=await office();f.api.addFiles([a]);await drained(f);const b=syntheticFile(a,{name:a.name}),slice=a.slice;
 a.slice=(start,end)=>({arrayBuffer(){
  const reading=slice(start,end).arrayBuffer();
  // Remove after sameFileBytes resumes but before its caller receives true.
  reading.then(()=>queueMicrotask(()=>queueMicrotask(()=>{void action(f,'[data-remove-index="0"]');})));
  return reading;
 }});
 f.api.addFiles([b]);await drained(f);assert.equal(f.api.records.length,1);assert.equal(f.api.records[0].file,b);assert.equal(selected(f),1);
});
