import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../Quantum Tech/site/_worker.js', import.meta.url), 'utf8');
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const bytes = new Uint8Array(100).map((_, i) => i);
const env = { ASSETS: { fetch: async (request) => new Response(request.method === 'HEAD' ? null : bytes, {
  headers: { 'Content-Type': 'video/mp4', 'Content-Length': '100', ETag: '"current"' }
}) } };
const request = (headers = {}, path = '/videos/test.mp4', method = 'GET') =>
  new Request(`https://example.com${path}`, { headers, method });

for (const [range, start, end] of [
  ['bytes=20-29', 20, 29], ['bytes=90-', 90, 99], ['bytes=-10', 90, 99],
  ['bytes=90-200', 90, 99], ['bytes=0-', 0, 99], ['bytes=-200', 0, 99]
]) {
  test(range, async () => {
    const response = await worker.fetch(request({ Range: range }), env);
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('Content-Range'), `bytes ${start}-${end}/100`);
    assert.equal(response.headers.get('Content-Length'), String(end - start + 1));
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes.slice(start, end + 1));
  });
}
for (const range of ['bytes=100-', 'bytes=30-20', 'bytes=-0']) {
  test(`unsatisfiable ${range}`, async () => {
    const response = await worker.fetch(request({ Range: range }), env);
    assert.equal(response.status, 416);
    assert.equal(response.headers.get('Content-Range'), 'bytes */100');
  });
}
for (const headers of [{}, { Range: 'invalid' }, { Range: 'bytes=0-1,4-5' },
  { Range: 'bytes=0-1', 'If-Range': '"old"' }]) {
  test(`complete response ${JSON.stringify(headers)}`, async () => {
    const response = await worker.fetch(request(headers), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Accept-Ranges'), 'bytes');
    assert.equal((await response.arrayBuffer()).byteLength, 100);
  });
}
test('matching If-Range permits seeking', async () => {
  assert.equal((await worker.fetch(request({ Range: 'bytes=0-1', 'If-Range': '"current"' }), env)).status, 206);
});
test('HEAD stays bodyless', async () => {
  const response = await worker.fetch(request({ Range: 'bytes=20-29' }, '/videos/test.mp4', 'HEAD'), env);
  assert.equal(response.status, 200);
  assert.equal((await response.arrayBuffer()).byteLength, 0);
});
test('native range handling and missing assets are preserved', async () => {
  for (const status of [206, 404, 416]) {
    const original = new Response(null, { status });
    const native = { ASSETS: { fetch: async () => original } };
    assert.equal(await worker.fetch(request({ Range: 'bytes=20-29' }), native), original);
  }
});
test('non-video requests pass through unchanged', async () => {
  const original = new Response('page');
  assert.equal(await worker.fetch(request({}, '/testimonials'), { ASSETS: { fetch: async () => original } }), original);
});
