# OpenSoha Marketplace

This repository serves the official [repository index](https://marketplace.opensoha.com/marketplace/repositories.json) as static files. Soha Core reads releases from the registered repositories on demand. The legacy [versioned catalog](https://marketplace.opensoha.com/marketplace/index.json) serves earlier Soha versions.

The repository index at `marketplace/repositories.json` lists reviewed plugin repositories. Each plugin repository owns its versions and releases; this index does not scan releases. The canonical repository-index schema is owned by Soha Contracts; until it is available in the published dependency, this repository performs minimal static validation.

The legacy `marketplace/index.json` and its published `0.1.0` and `0.1.1` snapshots are frozen for compatibility. The legacy catalog lists reviewed, versioned manifests such as the [Soha Example Skill Pack](https://github.com/opensoha/soha-plugin-example-skill-pack). GitHub repository direct installation does not require catalog inclusion.

## Validate locally

```sh
npm ci --ignore-scripts
npm test
python3 -m http.server 18736 --bind 127.0.0.1 --directory site
```

Configure an isolated Soha instance to use `http://127.0.0.1:18736/marketplace/repositories.json` before publishing. Use `/marketplace/index.json` for legacy compatibility checks. Both indexes keep the `opensoha-official` source ID.

## Publish

1. Select **GitHub Actions** as the GitHub Pages source. The workflow validates pull requests and deploys the validated `site/` artifact only from `main`. Once bootstrapped, require the `validate` check on `main` and block direct and force pushes so unpublished changes cannot bypass snapshot checks. If the first deployment ran before Pages was enabled, rerun that workflow run after enabling Pages.
2. Add a reviewed public GitHub repository to `site/marketplace/repositories.json`. Publish plugin updates in the author repository as GitHub Releases.
3. Keep the legacy index and its snapshots available at their original paths for compatibility. Check the published HTTPS indexes and snapshot digests after a site change.

GitHub Pages deploys `site/`. The custom domain and HTTPS enforcement are configured in Pages settings.
