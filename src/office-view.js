(function(root){'use strict';
function previewEligible(i){return ['image/png','image/jpeg','image/gif','image/webp','image/bmp'].includes(i.mime)&&Number.isInteger(i.width)&&Number.isInteger(i.height)&&i.width>0&&i.height>0&&i.width*i.height<=32000000&&i.bytes<=16777216&&!i.readError;}
class PreviewCache {
 constructor(limit=33554432,dispose=v=>URL.revokeObjectURL(v.url)){this.limit=limit;this.dispose=dispose;this.map=new Map();this.bytes=0;}
 get(key){const v=this.map.get(key);if(v){this.map.delete(key);this.map.set(key,v);}return v;}
 set(key,value){this.delete(key);if(value.cost>this.limit){this.dispose(value);return;}while(this.bytes+value.cost>this.limit&&this.map.size)this.delete(this.map.keys().next().value);this.map.set(key,value);this.bytes+=value.cost;}
 delete(key){const v=this.map.get(key);if(v){this.map.delete(key);this.bytes-=v.cost;this.dispose(v);}}
 clear(){for(const key of this.map.keys())this.delete(key);}
}
function visibleOccurrences(images,query={},sort='source'){
 const text=(query.text||'').toLocaleLowerCase();
 const result=images.filter(i=>(!query.documentId||String(i.documentId)===String(query.documentId))&&(!query.format||i.name.split('.').pop().toLowerCase()===query.format)&&(!text||(i.name+' '+i.path+' '+(i.documentName||'')+' '+(i.usages||[]).map(u=>[u.label,u.kind,u.order,u.part].join(' ')).join(' ')).toLocaleLowerCase().includes(text))&&(!query.minWidth||i.width>=query.minWidth)&&(!query.minHeight||i.height>=query.minHeight)&&(!query.minBytes||i.bytes>=query.minBytes)&&(!query.maxBytes||i.bytes<=query.maxBytes));
 if(sort==='name')result.sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 if(sort==='size')result.sort((a,b)=>b.bytes-a.bytes||a.id.localeCompare(b.id));
 if(sort==='dimensions')result.sort((a,b)=>(b.width&&b.height?b.width*b.height:-1)-(a.width&&a.height?a.width*a.height:-1)||a.id.localeCompare(b.id));
 return result;
}
const api={previewEligible,PreviewCache,visibleOccurrences};if(typeof module==='object'&&module.exports)module.exports=api;else root.OfficeView=api;
})(typeof window==='undefined'?globalThis:window);
