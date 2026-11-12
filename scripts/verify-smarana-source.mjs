import { createHash } from 'node:crypto';
import { appendFileSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const lockPath = new URL('../tooling/smarana-source.lock.json', import.meta.url);
const digest = (algorithm, bytes) => createHash(algorithm).update(bytes).digest('hex');

export function validateSmaranaManifest(manifest) {
  if (manifest?.schemaVersion !== 1 || manifest.repository !== 'puramapro-oss/purama-smarana'
      || !/^[a-f0-9]{40}$/.test(manifest.commit ?? '') || /^0+$/.test(manifest.commit)
      || !Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length > 128) {
    throw new Error('An immutable SMARANA source manifest is required.');
  }
  const paths = new Set();
  let totalBytes = 0;
  for (const file of manifest.files) {
    const parts = typeof file.path === 'string' ? file.path.split('/') : [];
    if (!parts.length || parts.some(part => !/^[A-Za-z0-9_.-]+$/.test(part) || ['.', '..', '.git'].includes(part))
        || paths.has(file.path) || !Number.isSafeInteger(file.bytes) || file.bytes < 0
        || !/^[a-f0-9]{64}$/.test(file.sha256 ?? '') || !/^[a-f0-9]{40}$/.test(file.gitBlob ?? '')) {
      throw new Error('Invalid or duplicate SMARANA source entry.');
    }
    paths.add(file.path);
    totalBytes += file.bytes;
  }
  if (totalBytes > 4 * 1024 * 1024 || !['package.json', 'package-lock.json', 'src/index.ts'].every(name => paths.has(name))) {
    throw new Error('SMARANA source manifest is incomplete or exceeds its bound.');
  }
  return manifest;
}

export function verifySmaranaSource(sourceRoot, manifest) {
  validateSmaranaManifest(manifest);
  const root = path.resolve(sourceRoot);
  if (realpathSync(root) !== root || !lstatSync(root).isDirectory()) throw new Error('SMARANA source directory must be plain.');
  const expected = new Map(manifest.files.map(file => [file.path, file]));
  const found = new Set();
  function walk(directory, prefix = '') {
    for (const name of readdirSync(directory)) {
      // Git metadata is checked separately before dependency scripts run.
      if (!prefix && name === '.git') continue;
      const relative = prefix ? `${prefix}/${name}` : name;
      const filename = path.join(directory, name);
      const stat = lstatSync(filename);
      if (stat.isSymbolicLink()) throw new Error('SMARANA source contains a symlink.');
      if (stat.isDirectory()) { walk(filename, relative); continue; }
      const file = expected.get(relative);
      if (!stat.isFile() || !file || stat.size !== file.bytes) throw new Error('SMARANA source has an unlisted or inconsistent file.');
      const bytes = readFileSync(filename);
      const gitBytes = Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]);
      if (bytes.length !== file.bytes || digest('sha256', bytes) !== file.sha256 || digest('sha1', gitBytes) !== file.gitBlob) {
        throw new Error('SMARANA source digest mismatch.');
      }
      found.add(relative);
    }
  }
  walk(root);
  if (found.size !== expected.size) throw new Error('SMARANA source has missing files.');
  return { sourceCommit: manifest.commit, verifiedFiles: found.size };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const manifest = validateSmaranaManifest(JSON.parse(readFileSync(lockPath, 'utf8')));
    if (process.argv.length === 3 && process.argv[2] === '--github-output') {
      if (!process.env.GITHUB_OUTPUT) throw new Error('GitHub output file is unavailable.');
      appendFileSync(process.env.GITHUB_OUTPUT, `smarana_commit=${manifest.commit}\n`);
    } else if (process.argv.length === 3) {
      process.stdout.write(`${JSON.stringify(verifySmaranaSource(process.argv[2], manifest))}\n`);
    } else throw new Error('Usage: node scripts/verify-smarana-source.mjs SOURCE_DIRECTORY');
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
