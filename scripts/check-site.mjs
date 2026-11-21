import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { assertPublishedProvenance, validateCatalog } from './validate-catalog.mjs';

const repositoryRoot = new URL('../', import.meta.url);
const catalogRoot = new URL('site/marketplace/', repositoryRoot);

async function listFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...await listFiles(new URL(`${encodeURIComponent(entry.name)}/`, directory), `${relativePath}/`));
    } else {
      assert.ok(entry.isFile(), `not a regular file: ${relativePath}`);
      files.push(relativePath);
    }
  }
  return files;
}

const siteFiles = await listFiles(new URL('site/', repositoryRoot));
const index = JSON.parse(await readFile(new URL('index.json', catalogRoot)));
const snapshots = await validateCatalog(index, readFile, catalogRoot);
const expectedFiles = ['marketplace/index.json', ...[...snapshots].map((path) => `marketplace/${path}`)];
assert.deepEqual(siteFiles.sort(), expectedFiles.sort(), 'site must contain only the catalog and referenced snapshots');

const baseRevision = process.env.MARKETPLACE_BASE_SHA;
if (baseRevision && !/^0{40}$/.test(baseRevision)) {
  assert.match(baseRevision, /^[a-f0-9]{40}$/);
  const published = JSON.parse(execFileSync('git', [
    'show', `${baseRevision}:site/marketplace/index.json`,
  ], { cwd: repositoryRoot, encoding: 'utf8' }));
  assertPublishedProvenance(published, index);
  const modifiedSnapshots = execFileSync('git', [
    'diff', '--name-only', '--diff-filter=DMRT', '--no-renames',
    baseRevision, 'HEAD', '--', 'site/marketplace/plugins/',
  ], { cwd: repositoryRoot, encoding: 'utf8' });
  assert.equal(modifiedSnapshots, '', `previous snapshots may not be replaced or removed:\n${modifiedSnapshots}`);
}

console.log(`Validated ${index.plugins.length} plugins and ${snapshots.size} immutable snapshots`);
