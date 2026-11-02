# Media assets

| Folder | Purpose |
| --- | --- |
| `icons/` | Packaged extension PNG icon, its SVG export, and the monochrome Activity Bar icon |
| `branding/` | Neutral gold-and-purple logo, wide banner, and square social artwork; SVG sources and PNG exports |
| `store/` | Marketplace overview, Dart code-view illustration, and language/framework example grids |
| `publisher/`, `publisher-personal/` | Local publisher artwork, ignored by Git and excluded from the VSIX |

The palette uses deep purple `#2E164B`, gold `#E8BC59`, lavender `#AA87D5`, and warm white `#FBF8F1`. The Activity Bar mark stays monochrome for VS Code theme compatibility. Syntax category colors retain their existing meanings and customization.

Run `node scripts/render-store-icon.js` to regenerate the 512-pixel extension icon and promotional PNGs from the SVG sources. Run `npm run render-doc-images` to regenerate the illustrated store images.

Use ordinary text for descriptions and audience labels, without badges or notification lights.
