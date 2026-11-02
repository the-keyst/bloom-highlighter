# Bloom Syntax Highlighter

[Build status](https://github.com/theokeist/bloom-highlighter/actions/workflows/ci.yml)

![Bloom Highlighter: Clearer code. Easier reading.](media/branding/bloom-gold-purple-banner.png)

Make code easier to read. Bloom brings flow, functions and structure into focus while you code in VS Code.

## Who Bloom Highlighter is for

- Students and beginners learning programming.
- Developers reading unfamiliar or complex code.
- People who find additional visual cues helpful for focus and navigation.

<!-- install-links:start -->
[Install from VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=theokeist-hcode-org.bloom-highlighter) · [Open in VS Code](vscode:extension/theokeist-hcode-org.bloom-highlighter) · [Releases](https://github.com/theokeist/bloom-highlighter/releases) · [Installation guide](INSTALL.md)

Marketplace links activate after the listing is published.
<!-- install-links:end -->

## Pick your view

- **Operational** — follow conditions, returns and state changes.
- **Interfaces** — find functions, calls, contracts and components.
- **Structural** — spot declarations, imports and stable values.
- **Dangerous** — review potentially risky operations, with optional stronger focus.

![Illustrated Dart example showing Operational, Interfaces, Structural and Dangerous highlighting](media/store/bloom-views.png)

Open the Bloom icon in the Activity Bar and select one of the four view buttons. Below the divider, adjust dimming, timing and other settings. Expand **Categories and colors** to change category switches or colors for the current language.

## Get started

Download the build artifact (GitHub sign-in may be required), unzip it, and run **Extensions: Install from VSIX…** in VS Code. Select the `.vsix`, then run **Developer: Reload Window** and **Bloom: Show Sidebar**.

Supports Dart/Flutter, JavaScript/TypeScript, Python, Rust, Go and many more. Includes local framework cues for FastAPI, React, Vue, Svelte, Express-family routers, NestJS, Angular, Next.js, Nuxt, SvelteKit and Astro. Browse the [language and framework examples](samples/README.md). Requires desktop VS Code 1.95+.

Bloom is a reading aid: lexical rules can be approximate, and Dangerous highlights are review cues.

Tags: syntax highlighting, code reading, functions, Dart, Flutter, JavaScript, TypeScript, React, Vue, Svelte.

[Usage](docs/USAGE.md) · [Improvements](docs/IMPROVEMENTS.md) · [Contributing](CONTRIBUTING.md)

The language independent analysis model and current framework recognition levels are documented in [Shared construct analysis](docs/CONSTRUCTS.md).


Four view buttons sit at the top of the Bloom sidebar. **Adjustments** and **Manual categories** follow below dividers, with language controls, dimming, timing, framework cues and category colors.
View switching is instant by default (`bloom.speed: 0`). If you configure a delay,
Bloom keeps the previous highlights visible until their replacements are ready.
Scrolling reuses analyzed category spans and scope layers; unchanged decoration
ranges are not sent to the editor again.


Run `npm run test:large` for the 3,600 / 6,000 / 12,000-line TypeScript,
Dart, and Python rendering stress suite. It exercises split editors, scrolling,
all views, delayed updates, stale edits, unchanged repaints, and category replacement.
Timing diagnostics describe cached decoration preparation and submission, not display frame times.

For native editor API checks, launch an isolated VS Code extension test host with
`--extensionDevelopmentPath=<repo> --extensionTestsPath=<repo>/tests/host`, a temporary
workspace, and separate `--user-data-dir` / `--extensions-dir` under `.vscode-test`.
The host test checks real scrolling and edits and writes `tests/host/result.json`.
An empty-decoration-state check is separate from visual frame capture; these tests
alone do not certify zero visible flicker.

### Pattern-based classification

Dart and JavaScript/TypeScript (including Vue/Svelte script regions) classify ordinary calls, constructors and callbacks without recognizing custom library names. Interfaces includes composition and callable boundaries; Operational shows decisions, flow and writes. Declaration initializers, named-argument colons, type brackets and arrow boundaries are excluded from misleading Operational matches. Flutter widget construction follows the same rules as custom DSL composition; nested callbacks retain their own operations. Optional framework enrichment distinguishes derived values from lifecycle effects. Dart uses bounded syntax heuristics rather than semantic type resolution; other languages retain their lexical profiles.
