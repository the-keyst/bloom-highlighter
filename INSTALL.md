# Install Bloom Highlighter

Publisher: **theokeist-hcode-org**. Extension ID: `theokeist-hcode-org.bloom-highlighter`.

If you installed a local Bloom package before 0.13.2, disable or uninstall the older **Bloom Syntax Highlighter** entry before installing this package. Earlier packages used `undefined_publisher`; VS Code treats the new publisher identity as a separate extension, so both copies could otherwise register the same commands.

Bloom 0.15.0 requires desktop VS Code 1.95 or newer. Use the local `bloom-highlighter-0.15.0.vsix` release file. No Marketplace listing is assumed by this guide.

## Install from VS Code

1. Open VS Code and press **Ctrl+Shift+P** on Windows/Linux or **Cmd+Shift+P** on macOS.
2. Run **Extensions: Install from VSIX...**.
3. Select `bloom-highlighter-0.15.0.vsix`.
4. If VS Code asks you to reload, do so.
5. Open a supported code file and run **Bloom: Choose View**. Select **Operational** to start.

These installation methods are documented in the [VS Code extension installation guide](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace#_install-from-a-vsix).

## Install from a terminal

From the folder containing the release:

```powershell
code --install-extension ./bloom-highlighter-0.15.0.vsix
```

For this Windows checkout:

```powershell
code --install-extension "C:\Users\martin\Desktop\bloom-highlighter\bloom-highlighter-0.15.0.vsix"
```

If `code` is unavailable in your terminal, use the VS Code installation steps above. The [VS Code CLI reference](https://code.visualstudio.com/docs/configure/command-line) documents installing and updating from a VSIX path.

## Check that it works

Open a Dart/Flutter, JavaScript/TypeScript, JSX/TSX, Vue, Svelte, Python, Ruby, C/C++ or Objective-C file. Many additional coding languages have baseline coverage; see the [language list and accuracy limits](README.md#languages-and-accuracy). No language-by-language setup is needed. Markdown and plain text intentionally receive no Bloom decorations.

Run **Bloom: Choose View** or click the Bloom text in the status bar. Switch between Operational, Interfaces and Structural. Relevant highlights should change; the selected view is remembered for the workspace. Use **Bloom: Toggle Highlighting** to compare the file with ordinary syntax highlighting.

To check flow and state changes in a small JavaScript file, try:

```javascript
let count = 0;
function increment(enabled) {
  if (!enabled) return;
  count += 1;
  return count;
}
```

Select Operational and look for the conditional, returns and mutation operator. This is a manual check to perform after installation; automated tests do not establish visual rendering in your editor.

## Comfortable settings

Open **Preferences: Open Workspace Settings (JSON)** and merge these properties into the existing object:

```json
{
  "bloom.enabled": true,
  "bloom.frameworks": true,
  "bloom.speed": 0,
  "bloom.dimOpacity": 0.8
}
```

This uses instant view changes and gentle dimming. Set opacity to `1` if you want emphasis without dimming. Defaults and all supported settings are listed in the [README](README.md#settings).

## Update or remove

To update, install the newer VSIX using the same steps and reload if prompted. A manually installed release needs a newer VSIX for subsequent local releases.

To remove Bloom, open Extensions, find **Bloom Syntax Highlighter**, and choose **Uninstall**. To pause it temporarily, use **Bloom: Toggle Highlighting**.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| No Bloom status text | Open a supported file and check its language mode in the VS Code status bar. |
| Highlights are disabled | Set `bloom.enabled` to `true` for the file/workspace or use the toggle command. |
| A large file has no highlights | The default `bloom.maxFileSize` is 500,000 UTF-16 characters. Larger files are intentionally skipped. |
| Shortcuts do nothing | Focus the supported, enabled editor. Press Ctrl+Alt+B, release, then O, I or S; on macOS use Cmd+Alt+B. Alternatively use the view picker. |
| Framework emphasis is missing | Check `bloom.frameworks`. Imported APIs are recognized within the file; project-wide wrappers and auto-imports are not resolved. |
| A definition fails to load | Open **View: Toggle Output** and select **Bloom** for error details. |

Continue with [the everyday usage guide](docs/USAGE.md) and [the improvements overview](docs/IMPROVEMENTS.md).
