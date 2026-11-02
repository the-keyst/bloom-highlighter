# GitHub and Marketplace release

## Configure the public identity

Bloom uses GitHub repository `theokeist/bloom-highlighter` and Marketplace publisher `theokeist-hcode-org`. Its extension ID is `theokeist-hcode-org.bloom-highlighter`. The first Marketplace upload still needs to be completed through this publisher's account.

```sh
npm run configure-release -- --repository theokeist/bloom-highlighter --publisher theokeist-hcode-org
npm run check-release
```

This updates the manifest repository, homepage, issue tracker, publisher, README install links and `docs/install.html`. Generated Marketplace and VS Code links become usable after publication. The local HTML page already offers a download of the sibling VSIX package; on GitHub it points to the matching asset on the latest release.

## Move to GitHub

Create the desired GitHub repository, then from this folder:

This checkout already has a `main` branch and `origin` set to `git@github.com:theokeist/bloom-highlighter.git`; skip `git init` and `git remote add` here.

```sh
git init -b main
git add .
git commit -m "Prepare Bloom extension for GitHub"
git remote add origin https://github.com/OWNER/bloom-highlighter.git
git push -u origin main
```

The ignore file excludes `node_modules`, compiled output, test profiles, VSIX files and environment credentials. CI installs locked dependencies, runs tests/lint and uploads a VSIX artifact. Keep `package-lock.json` committed.

CI validation builds use SemVer build metadata such as `0.15.0+build.42.attempt.1`. GitLab uses its incrementing pipeline IID; GitHub uses the workflow run number and attempt. The package manifest is restored after packaging, so these artifact identifiers do not change the committed release version. Tagged release packages continue to use the exact version from `package.json`.

For a local numbered artifact, run `npm run package:build -- --build-number 42`. CI provides the build number automatically.

## Release a downloadable package

```sh
npm version patch --no-git-tag-version
npm run configure-release
npm test
npm run lint
npm run package
git add .
git commit -m "Release Bloom"
git tag vVERSION
git push origin main --tags
```

Replace VERSION with the exact package version. The release workflow validates the tag against the manifest, builds the package and attaches it to a GitHub release. The install page's VSIX download depends on that release asset existing.

Pushes to `main` also check for the manifest's existing version tag and create its release if missing. The workflow checks out that tag before building, so the attached package comes from the tagged source. Existing releases are left intact.

## Publish to Visual Studio Marketplace

Create or select your publisher in [publisher management](https://marketplace.visualstudio.com/manage). Follow Microsoft's [publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) to authenticate. Never paste publishing credentials into source files or README examples.

For manual publishing, upload the validated VSIX through publisher management, or authenticate locally with `vsce` and run `npm run publish:marketplace`. The command checks release identity first.

For GitHub publishing, create the `marketplace` environment and store your Marketplace token as the environment secret `VSCE_PAT`. Restrict environment access and optionally require a reviewer. Run **Release Bloom** manually with **publish_marketplace** enabled. Tag releases alone publish to GitHub; Marketplace publishing is explicitly selected. Microsoft also documents identity-based automated publishing if you prefer it to a token.

After the listing is available, verify the Marketplace install link, the `vscode:extension/PUBLISHER.bloom-highlighter` link, a clean installation, dimming settings, sidebar controls and Dart highlighting. Publishing a package does not itself prove the editor interaction works.

## Install page

Open `docs/install.html` locally to preview. It is static HTML and needs no server. To host it on GitHub Pages, publish the repository root so `docs/install.html` and `media/icons/icon.png` retain their relative paths. A Pages URL can be added once the repository exists; this preparation does not enable hosting or publish externally.
