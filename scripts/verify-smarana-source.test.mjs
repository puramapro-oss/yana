import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateSmaranaManifest, verifySmaranaSource } from './verify-smarana-source.mjs';

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'yana-smarana-proof-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'source');
  mkdirSync(path.join(source, 'src'), { recursive: true });
  const files = [['package.json', '{"name":"@purama/smarana"}'], ['package-lock.json', '{"lockfileVersion":3}'], ['src/index.ts', 'export const fixture = true;\n']].map(([name, text]) => {
    const bytes = Buffer.from(text);
    writeFileSync(path.join(source, name), bytes);
    return { path: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
      gitBlob: createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex') };
  });
  return { root, source, manifest: { schemaVersion: 1, repository: 'puramapro-oss/purama-smarana', commit: 'a'.repeat(40), files } };
}

test('an exact source is verified without executing its code', t => {
  const { source, manifest } = fixture(t);
  assert.deepEqual(verifySmaranaSource(source, manifest), { sourceCommit: manifest.commit, verifiedFiles: 3 });
});

for (const corruption of ['changed', 'missing', 'extra', 'symlink']) {
  test(`a ${corruption} source is rejected`, t => {
    const { source, manifest } = fixture(t);
    const entry = path.join(source, 'src/index.ts');
    if (corruption === 'changed') writeFileSync(entry, 'export const fixture = 1234;\n');
    if (corruption === 'missing') rmSync(entry);
    if (corruption === 'extra') writeFileSync(path.join(source, 'extra.ts'), 'unexpected');
    if (corruption === 'symlink') { rmSync(entry); symlinkSync('../package.json', entry); }
    assert.throws(() => verifySmaranaSource(source, manifest));
  });
}

test('a symlink directory cannot redirect source verification', t => {
  const { root, source, manifest } = fixture(t);
  const redirected = path.join(root, 'redirected');
  symlinkSync(source, redirected);
  assert.throws(() => verifySmaranaSource(redirected, manifest), /must be plain/);
});

test('manifest admission rejects mutable refs, foreign sources, traversal, duplicates and missing package contracts', t => {
  const { manifest } = fixture(t);
  for (const commit of ['main', '0'.repeat(40), null]) assert.throws(() => validateSmaranaManifest({ ...manifest, commit }));
  assert.throws(() => validateSmaranaManifest({ ...manifest, repository: 'foreign/source' }));
  for (const name of ['../escape', '/absolute', '.git/config', 'src/../escape']) {
    assert.throws(() => validateSmaranaManifest({ ...manifest, files: [{ ...manifest.files[0], path: name }, ...manifest.files.slice(1)] }));
  }
  assert.throws(() => validateSmaranaManifest({ ...manifest, files: [...manifest.files, manifest.files[0]] }));
  assert.throws(() => validateSmaranaManifest({ ...manifest, files: manifest.files.slice(1) }));
});

test('the pinned package manifest keeps the existing YANA sibling dependency contract', () => {
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
  const sourceLock = validateSmaranaManifest(JSON.parse(readFileSync(new URL('../tooling/smarana-source.lock.json', import.meta.url), 'utf8')));
  assert.equal(lock.packages['node_modules/@purama/smarana'].resolved, '../packages/smarana');
  assert.equal(lock.packages['node_modules/@purama/smarana'].link, true);
  assert.equal(sourceLock.commit, '531cc653c81ffa3c99ab94667067f217deb5f944');
});
