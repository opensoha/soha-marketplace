import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const require = createRequire(import.meta.url);
const validator = new Ajv2020({ allErrors: true, strict: false });
addFormats(validator);
const schema = (name) => require(`@opensoha/contracts/plugins/${name}.schema.json`);
validator.addSchema(schema('companion-pack'));
const validateManifest = validator.compile(schema('plugin-manifest'));
const validateIndex = validator.compile(schema('marketplace-catalog'));

function assertSchema(validate, document, label) {
  if (!validate(document)) throw new Error(`${label}: ${validator.errorsText(validate.errors)}`);
}

export async function validateCatalog(catalog, readSnapshot = readFile, root) {
  assertSchema(validateIndex, catalog, 'catalog');
  assert.equal(catalog.sourceId, 'opensoha-official');
  const pluginIDs = new Set();
  const paths = new Set();
  for (const plugin of catalog.plugins) {
    assert.ok(!pluginIDs.has(plugin.id), `duplicate plugin ID: ${plugin.id}`);
    pluginIDs.add(plugin.id);
    assertSchema(validateManifest, plugin.manifest, plugin.id);
    assert.equal(plugin.manifest.runtime?.mode, 'manifest-only', `${plugin.id}: unsupported runtime`);
    assert.ok(plugin.versions?.length > 0, `${plugin.id}: at least one snapshot is required`);
    assert.equal(plugin.version, plugin.latestVersion, `${plugin.id}: top-level and latest versions differ`);
    for (const version of plugin.versions) {
      const manifest = await validateSnapshot(plugin, version, paths, readSnapshot, root);
      if (version.version === plugin.latestVersion) {
        assert.deepEqual(plugin.manifest, manifest, `${plugin.id}: latest snapshot differs from catalog manifest`);
      }
    }
    assert.ok(plugin.versions.some((version) => version.version === plugin.latestVersion), `${plugin.id}: latest snapshot missing`);
  }
  return paths;
}

async function validateSnapshot(plugin, version, paths, readSnapshot, root) {
  const label = `${plugin.id}@${version.version}`;
  assert.match(version.version, /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*)?$/, `${label}: unsafe snapshot version`);
  const expectedPath = `plugins/${plugin.id}/${version.version}/plugin.manifest.json`;
  assert.equal(version.manifestUrl, expectedPath, `${label}: version must reference its local immutable snapshot`);
  assert.ok(!paths.has(expectedPath), `${label}: duplicate version`);
  paths.add(expectedPath);
  assert.ok(!version.package && !version.packageUrl, `${label}: executable packages are outside B1`);
  const bytes = await readSnapshot(root ? new URL(expectedPath, root) : expectedPath);
  const checksum = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  assert.equal(version.checksum, checksum, `${label}: raw snapshot checksum mismatch`);
  const manifest = JSON.parse(bytes);
  assertSchema(validateManifest, manifest, label);
  assert.equal(manifest.runtime?.mode, 'manifest-only', `${label}: unsupported runtime`);
  assert.equal(manifest.id, plugin.id, `${label}: manifest ID differs`);
  assert.equal(manifest.version, version.version, `${label}: manifest version differs`);
  for (const field of ['publisher', 'type']) {
    assert.equal(manifest[field], plugin[field], `${label}: manifest ${field} differs`);
  }
  return manifest;
}
