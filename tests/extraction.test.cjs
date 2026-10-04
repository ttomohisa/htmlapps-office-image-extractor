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
