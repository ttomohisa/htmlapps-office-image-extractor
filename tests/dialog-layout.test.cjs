const test=require('node:test');
const assert=require('node:assert/strict');
const {fixture,office,settled,html}=require('./app-harness.cjs');
test('open modal dialogs lock root and page scrolling',()=>assert.match(html,/html:has\(dialog:modal\),\s*body:has\(dialog:modal\)\s*\{\s*overflow:\s*hidden/));
test('confirmation keeps its header fixed and scrolls its constrained body',()=>{assert.match(html,/#appConfirmDialog\[open\]\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column/);assert.match(html,/#appConfirmDialog\s+\.app-confirm-header\s*\{[^}]*flex:\s*0 0 auto/);assert.match(html,/#appConfirmDialog\s+\.app-confirm-body\s*\{[^}]*min-height:\s*0[^}]*overflow:\s*auto/);});
test('narrow title wraps its version without shrinking actions',()=>{assert.match(html,/@media\s*\(max-width:\s*420px\)[\s\S]*?\.brand-name\s*\{[^}]*flex-wrap:\s*wrap[^}]*white-space:\s*normal[^}]*overflow:\s*visible/);assert.match(html,/\.header-actions\s*\{\s*flex-shrink:\s*0/);});
async function begin(){const f=await fixture();f.api.addFiles([await office()]);await settled(f);f.get('#clear-button').focus();const clearing=f.get('#clear-button').dispatch('click');return {f,clearing};}
test('affirmative Clear focuses the enabled Choose files control after rendering',async()=>{const {f,clearing}=await begin();await f.get('#appConfirmOk').dispatch('click');await clearing;assert.equal(f.api.records.length,0);assert.equal(f.get('#clear-button').disabled,true);assert.equal(f.document.activeElement,f.get('#choose-button'));assert.notEqual(f.document.activeElement.focusOptions?.preventScroll,true);});
for(const action of ['#appConfirmCancel','#appConfirmClose'])test(`${action} preserves files and original Clear focus`,async()=>{const {f,clearing}=await begin();await f.get(action).dispatch('click');await clearing;assert.equal(f.api.records.length,1);assert.equal(f.document.activeElement,f.get('#clear-button'));});
for(const blocked of ['modal','hidden','disconnected'])test(`successful Clear does not steal focus when ${blocked}`,async()=>{const {f,clearing}=await begin();const chosen=f.get('#choose-button');if(blocked==='hidden')chosen.hidden=true;if(blocked==='disconnected')chosen.isConnected=false;const owner=f.get('#helpDialog');if(blocked==='modal')owner.showModal();await f.get('#appConfirmOk').dispatch('click');await clearing;assert.notEqual(f.document.activeElement,chosen);});

// These source contracts are paired with native Chromium geometry checks in PR CI.
function mobileHelpMedia(width) {
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const marker = new RegExp('@media\\s*\\(max-width:\\s*' + width + 'px\\)\\s*\\{').exec(css);
  assert.ok(marker, 'existing smartphone media query');
  const start = marker.index + marker[0].length;
  let depth = 1, end = start;
  while (depth && end < css.length) { if (css[end] === '{') depth++; if (css[end] === '}') depth--; end++; }
  return css.slice(start, end - 1);
}
test('informational footer hides at 520px without hiding functional controls', () => {
  assert.match(mobileHelpMedia(520), /(?:^|[}])\s*footer\s*\{[^}]*display:\s*none/);
});
test('existing build information is unique and the final Help body item, not page chrome', () => {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] || '';
  const help = html.match(/<dialog\b[^>]*id="helpDialog"[^>]*>([\s\S]*?)<\/dialog>/)?.[1] || '';
  assert.doesNotMatch(main, /data-i18n="buildInfo"|id="buildInfo"/);
  assert.doesNotMatch(html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)[0], /id="buildInfo"/);
  assert.match(help, /<details class="build-info-details">\s*<summary data-i18n="buildInfo">[\s\S]*?<\/details>\s*(?:<!-- APP:HELP:END -->\s*)?<\/div>\s*$/);
  for (const id of ['buildVersion', 'buildDate', 'buildDeps']) assert.equal(html.split(`id="${id}"`).length, 2, id);
});

test('Help keyboard descendant clicks stay open and genuine backdrop clicks dismiss', () => {
  const handler = html.match(/helpDialog\.addEventListener\(["']click["'], (?:\(event\)|event) => \{([\s\S]*?)\n      \}\);/)[1];
  const dialog = {open:true, getBoundingClientRect:()=>({left:100,top:100,right:740,bottom:700}),close(){this.open=false;}};
  const click = new Function('helpDialog', 'event', handler);
  click(dialog, {target:{},clientX:0,clientY:0}); assert.equal(dialog.open,true);
  click(dialog, {target:dialog,clientX:0,clientY:0}); assert.equal(dialog.open,false);
});

test('Help retains its header while only its allocated body scrolls to build details', () => {
  assert.match(html, /#helpDialog\[open\]\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column/);
  assert.match(html, /#helpDialog \.dialog-header\s*\{[^}]*flex:\s*0 0 auto/);
  assert.match(html, /#helpDialog \.dialog-body\s*\{[^}]*min-height:\s*0[^}]*flex:\s*1 1 auto[^}]*max-height:\s*none[^}]*overflow:\s*auto/);
});
