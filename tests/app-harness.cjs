const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(process.env.APP_HTML || path.join(__dirname, '../src/index.template.html'), 'utf8');
const artifact = fs.readFileSync(path.join(__dirname, '../office-image-extractor.html'), 'utf8');
const bundle = JSON.parse(Buffer.from(artifact.match(/const EMBEDDED_ASSET_BUNDLE_BASE64 = '([^']+)'/)[1], 'base64').toString());
const vendor = { exports: {} };
vm.runInNewContext(Buffer.from(bundle.dependencies.jszip.assets.main.base64, 'base64').toString(), {
  module: vendor, exports: vendor.exports, Buffer, setTimeout, clearTimeout, setImmediate, Uint8Array, ArrayBuffer, DataView, Promise, Blob,
});
const JSZip = vendor.exports;
// A small DOM adapter keeps these Node tests dependency-free. Real browser/XML
// parsing and keyboard behavior also need the documented browser smoke test.
class Element {
  constructor(doc, attrs = {}) { this.doc = doc; this.attrs = attrs; this.dataset = {}; this.listeners = {}; this.children = []; this.disabled = 'disabled' in attrs; this.checked = 'checked' in attrs; this.open = false; this.isConnected = true; this.textContent = ''; this.value = ''; this.classList = { add() {}, remove() {}, toggle() {} }; for (const [key,value] of Object.entries(attrs)) if(key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())] = value; }
  setAttribute(k,v) { this.attrs[k]=String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  async dispatch(type, extra={}) { const event={target:this,preventDefault(){},stopPropagation(){},...extra}; for(const fn of this.listeners[type]||[]) await fn(event); }
  click() { if (this.tag === 'a') this.doc.downloads.push({name:this.download,blob:this.doc.blobs.get(this.href)}); else return this.dispatch('click'); }
  focus() { if (!this.disabled) this.doc.activeElement=this; }
  contains(node) { return this === node || this.children.includes(node); }
  matches(selector) { const m=selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/); return !!m && m[1] in this.attrs && (m[2]===undefined || this.attrs[m[1]]===m[2]); }
  closest(selector) { return this.matches(selector) ? this : null; }
  querySelector(selector) { return this.children.find(x=>x.matches(selector)) || null; }
  querySelectorAll(selector) { return this.children.filter(x=>x.matches(selector)); }
  set innerHTML(value) { this.renderCount=(this.renderCount||0)+1; this._html=value; for(const child of this.children) child.isConnected=false; this.children=[]; for(const match of value.matchAll(/<(?:button|input)\b([^>]*)>/g)) { const attrs={}; for(const attr of match[1].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attrs[attr[1]]=attr[2]||''; this.children.push(new Element(this.doc,attrs)); } }
  get innerHTML() { return this._html || ''; }
  showModal() { this.open=true; }
  close() { this.open=false; }
}
class XMLParser {
  parseFromString(text) {
    const nodes=[]; for(const match of text.matchAll(/<(?:\w+:)?(Default|Override)\b([^>]*)\/?\s*>/g)) { const attrs={}; for(const a of match[2].matchAll(/([\w:]+)\s*=\s*["']([^"']*)["']/g)) attrs[a[1]]=a[2].replace(/&amp;/g,'&'); nodes.push({localName:match[1],getAttribute:key=>attrs[key]??null}); }
    return { querySelector:sel=>sel==='parsererror' && !/<(?:\w+:)?Types\b[^>]*>[\s\S]*<\/(?:\w+:)?Types>/.test(text) ? {} : null, getElementsByTagNameNS:(_,tag)=>nodes.filter(x=>x.localName===tag) };
  }
}
async function fixture() {
  const elements=new Map(); const downloads=[]; const blobs=new Map(); const errors=[];
  const document={downloads,blobs,activeElement:null,documentElement:{lang:'en'},querySelector:selector=>get(selector),querySelectorAll:()=>[],createElement:tag=>Object.assign(new Element(document),{tag}),getElementById:id=>get('#'+id)};
  function get(selector) { if(!elements.has(selector)) elements.set(selector,new Element(document)); return elements.get(selector); }
  const context={JSZip,Blob,Uint8Array,ArrayBuffer,DataView,DOMParser:XMLParser,document,HTMLElement:Element,navigator:{language:'en'},localStorage:{getItem(){return null;},setItem(){}},console:{error:e=>errors.push(e)},setTimeout,clearTimeout,requestAnimationFrame:fn=>fn(),alert:message=>errors.push(message),URL:{createObjectURL(blob){const key='blob:'+blobs.size;blobs.set(key,blob);return key;},revokeObjectURL(){}},Intl};
  context.window={StandaloneAssets:{loadClassicScript:async()=>{}},AppBuild:{config:{version:'1.0.0'},manifest:{generatedAtUtc:'2026-10-04T00:00:00Z',dependencies:[]}},setTimeout:()=>0,clearTimeout(){},addEventListener(){}};
  const script=html.match(/<script>\s*(\(async \(\) => \{[\s\S]*?)<\/script>/)[1];
  const injection='globalThis.api = { records, pendingInspections, inspectOfficeFile, addFiles, render, applyLanguage, downloadExtractedImages, translations, setLanguage: value => { language=value; applyLanguage(); }, get activeInspections() { return activeInspections; }, get exporting() { return isGeneratingZip; } };';
  vm.runInNewContext(script.replace(/      applyLanguage\(\);\n    \}\)\(\)/,injection+'\n      applyLanguage();\n    })()'),context);
  for(let i=0;i<10&&!context.api;i++) await new Promise(resolve=>setImmediate(resolve));
  if (!context.api) throw errors[0] || Error('App did not initialize');
  return {api:context.api,document,get,downloads,errors,JSZip};
}
async function office(name='sample.pptx', entries={'ppt/media/image1.png':Uint8Array.from([137,80,78,71,13,10,26,10])}, types='<Default Extension="png" ContentType="image/png"/>', zipOptions={}) {
  const zip=new JSZip(); if(types!==null)zip.file('[Content_Types].xml',`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${types}</Types>`,{date:new Date('2026-01-01T00:00:00Z')}); for(const [key,value] of Object.entries(entries))zip.file(key,value,{date:new Date('2026-01-01T00:00:00Z')}); zip.forEach((_,entry)=>{entry.date=new Date('2026-01-01T00:00:00Z');}); const file=await zip.generateAsync({type:'uint8array',...zipOptions}); return syntheticFile(file, {name});
}
function syntheticFile(bytes, {name='sample.pptx',lastModified=1}={}) {
  const file=Uint8Array.from(bytes);
  Object.assign(file,{name,size:file.length,lastModified});
  // Real Blob slices exercise the production bounded asynchronous read API;
  // JSZip still receives the byte array in this dependency-free Node adapter.
  file.slice=(start,end)=>new Blob([file.subarray(start,end)]);
  return file;
}
async function settled(f) { for(let i=0;i<200 && f.api.records.some(r=>!r.completed&&!r.error);i++)await new Promise(resolve=>setImmediate(resolve)); if(f.api.records.some(r=>!r.completed&&!r.error))throw Error('Inspection did not finish'); }
async function action(f, selector, type='click', extra={}) { const node=f.get('#file-list').querySelector(selector); if(!node)throw Error('Missing control: '+selector); if(type==='change')node.checked=extra.checked; await f.get('#file-list').dispatch(type,{target:node,...extra}); }
module.exports={fixture,office,settled,action,JSZip,html,syntheticFile};
