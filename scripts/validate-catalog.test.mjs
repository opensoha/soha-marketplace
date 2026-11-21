import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { assertPublishedProvenance, validateCatalog } from './validate-catalog.mjs';

function createFixture() {
  const manifest = {
    id: 'example.test', name: 'Example', version: '0.1.0', publisher: 'example',
    type: 'skill-pack', runtime: { mode: 'manifest-only' },
  };
  const bytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  const version = {
    version: manifest.version,
    manifestUrl: `plugins/${manifest.id}/${manifest.version}/plugin.manifest.json`,
    checksum: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
  };
  const plugin = {
    id: manifest.id, name: manifest.name, version: manifest.version, publisher: manifest.publisher,
    type: manifest.type, source: 'marketplace:example.test', latestVersion: manifest.version,
    versions: [version], manifest,
  };
  const catalog = {
    schemaVersion: 'marketplace.opensoha.io/v1', generatedAt: '2026-11-21T00:00:00Z',
    sourceId: 'opensoha-official', plugins: [plugin],
  };
  return { catalog, bytes, manifest, version };
}

test('a static snapshot is validated using its exact bytes', async () => {
  const { catalog, bytes, version } = createFixture();
  version.metadata = { commitSha: 'a'.repeat(40), repository: 'https://github.com/opensoha/example' };
  const paths = await validateCatalog(catalog, async (path) => {
    assert.equal(path, version.manifestUrl);
    return bytes;
  });
  assert.deepEqual([...paths], [version.manifestUrl]);
});

test('release provenance requires a full commit', async () => {
  const { catalog, version } = createFixture();
  version.metadata = { commitSha: 'main' };
  await assert.rejects(validateCatalog(catalog, () => assert.fail('invalid release must not be read')), /full lowercase release commit/);
});

test('release provenance requires a repository and cannot be rewritten', async () => {
  const { catalog, bytes, version } = createFixture();
  version.metadata = { commitSha: 'a'.repeat(40) };
  await assert.rejects(validateCatalog(catalog, async () => bytes), /expected a GitHub repository URL/);
  version.metadata.repository = 'https://github.com/opensoha/example';
  const published = structuredClone(catalog);
  assertPublishedProvenance(published, catalog);
  version.metadata.commitSha = 'b'.repeat(40);
  assert.throws(() => assertPublishedProvenance(published, catalog), /published provenance may not change/);
});

test('a change of formatting alone invalidates a published digest', async () => {
  const { catalog, manifest } = createFixture();
  await assert.rejects(validateCatalog(catalog, async () => Buffer.from(JSON.stringify(manifest))), /checksum mismatch/);
});

test('catalog entries cannot point outside the local version directory', async () => {
  const { catalog, version } = createFixture();
  version.manifestUrl = 'https://example.com/plugin.manifest.json';
  const readSnapshot = () => assert.fail('external snapshot should not be read');
  await assert.rejects(validateCatalog(catalog, readSnapshot), /local immutable snapshot/);
});

test('the catalog cannot list a runtime package', async () => {
  const { catalog, version } = createFixture();
  version.packageUrl = 'https://example.com/plugin.tar.gz';
  await assert.rejects(validateCatalog(catalog, () => assert.fail('package must not be read')), /outside B1/);
});
