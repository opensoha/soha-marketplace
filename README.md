# OpenSoha Marketplace

This repository serves the official plugin index and immutable, versioned manifests as static files. Running the marketplace does not require Soha Cloud. The GitHub Pages endpoint, once enabled, is `https://opensoha.github.io/soha-marketplace/marketplace/index.json`.

The repository index at `marketplace/repositories.json` lists reviewed plugin repositories. Each plugin repository owns its versions and releases; this index does not scan releases. The canonical repository-index schema is owned by Soha Contracts; until it is available in the published dependency, this repository performs minimal static validation.

The legacy `marketplace/index.json` and its published `0.1.0` and `0.1.1` snapshots are frozen for compatibility. The legacy catalog lists reviewed, versioned manifests such as the [Soha Example Skill Pack](https://github.com/opensoha/soha-plugin-example-skill-pack). GitHub repository direct installation does not require catalog inclusion.

## Validate locally

```sh
npm ci --ignore-scripts
npm test
python3 -m http.server 18736 --bind 127.0.0.1 --directory site
```

Configure only an isolated Soha instance to use `http://127.0.0.1:18736/marketplace/index.json` before publishing. The site keeps the `opensoha-official` source ID. Never reconfigure a production instance for this smoke test.

## Publish

1. Select **GitHub Actions** as the GitHub Pages source. The workflow validates pull requests and deploys the validated `site/` artifact only from `main`. Once bootstrapped, require the `validate` check on `main` and block direct and force pushes so unpublished changes cannot bypass snapshot checks. If the first deployment ran before Pages was enabled, rerun that workflow run after enabling Pages.
2. For a reviewed legacy B1 declarative release (only if the compatibility freeze is explicitly lifted), place the exact manifest bytes at `site/marketplace/plugins/<id>/<version>/plugin.manifest.json`. In `site/marketplace/index.json`, reference `plugins/<id>/<version>/plugin.manifest.json` and set `checksum` to `sha256:` followed by the SHA-256 of the file bytes. Use the declared `@opensoha/contracts` schemas; update the pin only when the required schema has been released.
3. Record the public repository and full lowercase Git commit in the version's `metadata.repository` and `metadata.commitSha`. Verify that the local snapshot is byte-for-byte equal to the root manifest at that commit.
4. Keep the published snapshot, repository and commit immutable. Add a version or use catalog suspension metadata. Verify the Pages endpoint and the digest from the Soha instance's network before changing a production endpoint or DNS.

Only `site/` is deployed. The existing official domain is not configured by this repository.
