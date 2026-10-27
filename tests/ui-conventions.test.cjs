const test=require('node:test');
const assert=require('node:assert/strict');
const {fixture,office,settled,action}=require('./app-harness.cjs');
const sharedKey='browser-kitty:ui-language:v1';

test('URL language wins without overwriting shared or legacy preference',async()=>{
  const storage=new Map([[sharedKey,'en'],['office-image-extractor:language','en']]);
  const f=await fixture({url:'https://example.test/office.html?lang=ja',storage});
  assert.equal(f.document.documentElement.lang,'ja');
  assert.equal(storage.get(sharedKey),'en');
  assert.equal(storage.get('office-image-extractor:language'),'en');
});

test('explicit language choice persists suite preference and preserves loaded images',async()=>{
  const f=await fixture({url:'https://example.test/office.html?lang=en'});
  await f.api.addFiles([await office()]);await settled(f);
  const original=f.api.records[0];
  await f.get('#languageButton').dispatch('click');
  assert.equal(f.storage.get(sharedKey),'ja');
  assert.equal(new URL(f.location.href).searchParams.get('lang'),'ja');
  assert.equal(f.api.records[0],original);
  assert.equal(f.api.records[0].images[0].selected,true);
});

test('storage refusal still switches language and explains session-only preference',async()=>{
  const f=await fixture({storageBlocked:true});
  await f.get('#languageButton').dispatch('click');
  assert.equal(f.document.documentElement.lang,'ja');
  assert.match(f.get('#toast').textContent,/この画面/);
});

test('session retention and prerequisite reason remain visible before import',async()=>{
  const f=await fixture();
  assert.match(f.get('#session-save-status').textContent,/tab|session/i);
  assert.match(f.get('#export-reason').textContent,/file|document/i);
  assert.equal(f.get('#download-button').disabled,true);
  assert.equal(f.get('#download-button').getAttribute('data-bk-state'),'unavailable');
});

test('selected originals export changes the primary state without changing selection',async()=>{
  const f=await fixture();await f.api.addFiles([await office()]);await settled(f);
  assert.equal(f.get('#download-button').getAttribute('data-bk-state'),'ready');
  assert.match(f.get('#export-reason').textContent,/1/);
  await f.api.downloadExtractedImages();
  assert.equal(f.downloads.length,1);
  assert.equal(f.api.records[0].images[0].selected,true);
  assert.match(f.get('#toast').textContent,/started/i);
  assert.equal(f.get('#download-button').getAttribute('data-bk-state'),'ready');
});

test('clear confirmation states document count and cancellation preserves originals',async()=>{
  const f=await fixture();await f.api.addFiles([await office()]);await settled(f);
  const action=f.get('#clear-button').dispatch('click');
  assert.match(f.get('#appConfirmMessage').textContent,/1/);
  assert.equal(f.document.activeElement,f.get('#appConfirmCancel'));
  await f.get('#appConfirmCancel').dispatch('click');await action;
  assert.equal(f.api.records.length,1);
  assert.equal(f.api.records[0].images[0].selected,true);
});

test('single-document removal requires confirmation and cancel preserves selection',async()=>{
  const f=await fixture();await f.api.addFiles([await office()]);await settled(f);
  const pending=action(f,'[data-remove-index="0"]');
  assert.match(f.get('#appConfirmMessage').textContent,/sample.pptx/);
  assert.match(f.get('#appConfirmMessage').textContent,/original file is not deleted/);
  await f.get('#appConfirmCancel').dispatch('click');await pending;
  assert.equal(f.api.records.length,1);assert.equal(f.api.records[0].images[0].selected,true);
});
