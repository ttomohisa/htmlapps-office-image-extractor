const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { gunzipSync } = require('node:zlib');
const root = path.resolve(__dirname, '..');
const expected = {"sha256": "72bb80ddccf196b809da4d7d92daa7aa582385b5f24d1fb4d2e81823990a8bb9", "viewBox": "0 0 1095 1095", "alias": "office-image-extractor.html", "imageHeader": false, "faviconPlaceholder": false};
const asset = fs.readFileSync(path.join(root, 'assets/favicon.svg'));
assert.equal(createHash('sha256').update(asset).digest('hex'), expected.sha256, 'Keep the supplied icon bytes unchanged');
assert.equal(asset.toString().match(/viewBox="([^"]+)"/)[1], expected.viewBox, 'Preserve the supplied viewBox');
const decode = uri => {
  assert.match(uri, /^data:image\/svg\+xml[;,]/, 'Embed the SVG without a network request');
  return uri.startsWith('data:image/svg+xml;base64,') ? Buffer.from(uri.split(',')[1], 'base64') : Buffer.from(decodeURIComponent(uri.slice(uri.indexOf(',') + 1)));
};
const favicon = html => {
  const tag = html.match(/<link\b[^>]*rel=["']icon["'][^>]*>/);
  assert.ok(tag, 'Favicon link exists');
  const href = tag[0].match(/href=(["'])(.*?)\1/s);
  assert.ok(href, 'Favicon href exists');
  assert.deepEqual(decode(href[2]), asset, 'Favicon contains the exact canonical asset');
};
const header = html => {
  const mark = html.match(/<div class="brand-mark"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(mark, 'Brand mark exists');
  if (expected.imageHeader) {
    const src = mark[1].match(/src="([^"]+)"/);
    assert.ok(src, 'Brand image exists');
    assert.deepEqual(decode(src[1]), asset, 'Header contains the exact canonical asset');
  } else {
    assert.equal(mark[1].trim(), asset.toString().trim(), 'Inline header preserves the supplied SVG');
  }
};
const source = fs.readFileSync(path.join(root, 'src/index.template.html'), 'utf8');
if (!expected.imageHeader) header(source);
if (!expected.faviconPlaceholder) favicon(source);
const readable = fs.readFileSync(path.join(root, 'dist/index.html'));
for (const file of ['dist/index.html', expected.alias]) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  favicon(html); header(html);
}
const wrapper = fs.readFileSync(path.join(root, 'dist/index.self-extract.html'), 'utf8');
favicon(wrapper);
const payload = wrapper.match(/<script id="self-extract-payload"[^>]*>([A-Za-z0-9+/=\s]+)<\/script>/);
assert.ok(payload, 'Self-extract payload exists');
assert.deepEqual(gunzipSync(Buffer.from(payload[1], 'base64')), readable, 'Self-extract restores exact readable bytes');
console.log('Icon asset, source, readable, download alias, loader favicon, and restored payload parity passed.');
