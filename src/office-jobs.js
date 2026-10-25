/* One real, disposable Worker per job; no main-thread processing fallback. */
(function(root){'use strict';
class OfficeJobs {
 constructor(source){this.source=source;this.queue=[];this.active=null;this.sequence=0;this.session=1;}
 run(operation,payload,{affectedDocumentIds=[],onProgress}={}){return new Promise((resolve,reject)=>{this.queue.push({operation,payload,affectedDocumentIds,onProgress,resolve,reject,jobId:++this.sequence,sessionId:this.session});this.pump();});}
 dispose(job){if(job.worker)job.worker.terminate();if(job.url)URL.revokeObjectURL(job.url);job.worker=null;job.url=null;if(this.active===job)this.active=null;}
 pump(){if(this.active||!this.queue.length)return;const job=this.active=this.queue.shift();try{job.url=URL.createObjectURL(new Blob([this.source],{type:'text/javascript'}));job.worker=new Worker(job.url);job.worker.onmessage=({data:m})=>{if(this.active!==job||m.jobId!==job.jobId||m.sessionId!==job.sessionId)return;if(m.progress){job.onProgress?.(m.progress);return;}this.dispose(job);if(m.error)job.reject(Object.assign(new Error(m.error.code),m.error));else job.resolve(m.result);this.pump();};job.worker.onerror=()=>{if(this.active!==job)return;this.dispose(job);job.reject(Object.assign(new Error('WORKER'),{code:'WORKER'}));this.pump();};job.worker.postMessage({jobId:job.jobId,sessionId:job.sessionId,operation:job.operation,payload:job.payload});}catch{this.dispose(job);job.reject(Object.assign(new Error('WORKER'),{code:'WORKER'}));this.pump();}}
 cancel(ids=null){const matches=j=>ids===null||j.affectedDocumentIds.some(id=>ids.includes(id));const cancelled=this.queue.filter(matches);this.queue=this.queue.filter(j=>!matches(j));if(this.active&&matches(this.active)){const j=this.active;this.dispose(j);cancelled.push(j);}if(ids===null)this.session++;for(const job of cancelled)job.reject(Object.assign(new Error('CANCELLED'),{code:'CANCELLED'}));this.pump();}
}
root.OfficeJobs=OfficeJobs;
})(typeof window==='undefined'?globalThis:window);
