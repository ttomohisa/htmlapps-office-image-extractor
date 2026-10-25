const fs=require('node:fs'),vm=require('node:vm');
const {JSZip}=require('./app-harness.cjs');
const artifact=fs.readFileSync(__dirname+'/../office-image-extractor.html','utf8');
const bundle=JSON.parse(Buffer.from(artifact.match(/const EMBEDDED_ASSET_BUNDLE_BASE64 = '([^']+)'/)[1],'base64').toString());
const v={exports:{}};vm.runInNewContext(Buffer.from(bundle.dependencies.sax.assets.main.base64,'base64').toString(),{module:v,exports:v.exports});
module.exports={JSZip,sax:v.exports};
