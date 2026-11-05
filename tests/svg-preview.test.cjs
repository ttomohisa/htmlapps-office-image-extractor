const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,office,settled}=require('./app-harness.cjs');
const svg=(body)=>'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="20" viewBox="0 0 32 20">'+body+'</svg>';
const make=async(content)=>office('art.pptx',{'ppt/media/vector.svg':content},'<Default Extension="svg" ContentType="image/svg+xml"/>');

test('loading a document switches to compact results while empty session hides controls',async()=>{
 const f=await fixture();
 assert.equal(f.get('#results-ui').hidden,true);
 assert.equal(f.get('#file-list').hidden,true);
 f.api.addFiles([await make(svg('<rect width="32" height="20" fill="#16624f"/>'))]);
 await settled(f);
 assert.equal(f.get('#results-ui').hidden,false);
 assert.equal(f.get('#file-list').hidden,false);
 assert.equal(f.api.records[0].images[0].mime,'image/svg+xml');
 assert.equal(f.get('#dropTitle').textContent,'Add more Office files');
 const source=require('node:fs').readFileSync(__dirname+'/../src/index.template.html','utf8');
 assert.match(source,/\.drop-zone\.has-files/);
 assert.match(source,/<details class="filter-details"/);
});

test('SVG preview returns an image blob with the original bytes; export is unchanged',async()=>{
 const f=await fixture(),markup=svg('<rect width="32" height="20" fill="#16624f"/>');
 const file=await make(markup);
 const output=await f.engine.preview(file,'ppt/media/vector.svg',192);
 assert.equal(output.blob.type,'image/svg+xml');
 assert.equal(await output.blob.text(),markup);
 assert.equal(output.cost,Buffer.byteLength(markup));
});

test('reject SVGs with script, external href, CSS or DTD without affecting extraction',async()=>{
 const f=await fixture();
 for(const markup of [
  svg('<script>alert(1)</script>'),
  svg('<use href="https://example.com/icon.svg#icon"/>'),
  svg('<rect onclick="alert(1)"/>'),
  svg('<style>@import url(https://example.com/x.css)</style>'),
  '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]>'+svg('<text>&x;</text>')
 ]){
  const file=await make(markup);
  await assert.rejects(()=>f.engine.preview(file,'ppt/media/vector.svg',192),error=>error.code==='PREVIEW');
  const original=await f.engine.readImage(file,'ppt/media/vector.svg');
  assert.equal(new TextDecoder().decode(original),markup);
 }
});
