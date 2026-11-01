# Changelog

## [0.15.0] - 2026-11-02
### Added
- Shared language-independent constructs for declarations, calls, flow, mutations, components, routes, handlers, validation, authorization and server/client boundaries.
- Extensible language and framework adapter registries, with first-pass local recognition for common full-stack framework conventions.
- Centralized VS Code language IDs and documented how to add coverage.

### Improved
- JS/TS framework import recognition avoids creating a TypeScript program and skips framework tree traversal when no relevant framework is detected.
- Combined conventional-language keyword scanning and cached construct/category spans.
- Viewport span indexes reduce full-file scanning while scrolling large documents.

## [0.14.0] - 2026-10-08
### Changed
- Neutral geometric logo and gold-and-purple branding for the extension icon, README, installation page and promotional artwork.
- Organized assets into `media/icons`, `media/branding` and `media/store`, with repeatable PNG generation.
- README now describes the audience: programming students and beginners, developers reading unfamiliar or complex code, and people who benefit from visual cues for focus and navigation.
- Usage documentation follows the current Code Highlighting sidebar controls.

### Fixed
- The main highlighting toggle updates an existing folder-level setting instead of an ineffective workspace setting.
- Unexpected analysis-worker exits reject active and queued requests instead of leaving analysis promises pending.

### Verification
- 63 automated tests and lint passed; branded PNGs were visually inspected and VSIX asset inclusion was checked.
- Live VS Code interaction and Marketplace publication are separate from local build and package verification.

## [0.12.1] - 2026-10-05
### Fixed
- Highlight Guide and Quick Adjustments now appear as expanded groups directly inside the existing Code Views panel, avoiding dependence on separate view placement or visibility.
- Added Bloom: Show Sidebar to reveal and focus the existing panel.

## [0.12.0] - 2026-10-05
### Added
- Highlight Guide below the view controls: active language, coverage level, selected view, on/off state and category examples from the language schema.
- Theme-aware color swatches for the default palette and tooltips with the active definition's pattern/color. Custom definition colors use text to avoid showing an incorrect swatch.
- Quick Adjustments for dimming presets and instant view switching. The previous nonzero delay is restored when instant switching is turned off.
- Sidebar refreshes on file, view, settings and definition changes; empty, unsupported, disabled and large-file states are explained.

## [0.11.1] - 2026-10-05
### Fixed
- Structural and Interfaces semantic ranges no longer expand from a declaration keyword through its entire scope body.
- Structural removes full-scope background washes so declarations remain distinct from implementation code.
- Regression coverage checks Dart, Python and TypeScript body exclusion, split views and declarations outside the viewport.

## [0.11.0] - 2026-10-05
### Added
- Dedicated Dart categories and lexical handling for nested comments, raw/multiline strings and executable interpolation.
- Baseline cognitive views for Java, C#, Go, Rust, Kotlin, Swift, Scala, Groovy, PHP, D, Zig, Solidity, CUDA, HLSL, GLSL, F#, OCaml, shell, PowerShell, Perl, R, Julia, Elixir, CoffeeScript, Lua, SQL, Clojure, Lisp, Scheme, Haskell, Erlang and MATLAB.
- Startup activation makes baseline language views available without first opening a previously supported language.
- Regression checks for Dart rendering/activation and baseline comment/string profiles. Baseline coverage is conservative, not full semantic parsing.

## [0.10.1] - 2026-10-05
### Added
- Bloom Activity Bar icon with native sidebar controls for views, highlighting toggle and definition reload.
- Installation, everyday usage and improvements documentation included in the VSIX.

## [0.10.0] - 2026-10-05
### Added
- Parser-based React/JSX/TSX, Vue and Svelte awareness, including imported aliases, directives and Svelte 5 runes.
- Background worker analysis with version caching, draft replacement and stale-result cancellation.
- Plain-text view picker and status control, workspace view persistence, highlighting toggle and definition reload commands.
- Configurable dimming, framework recognition and file-size limits; viewport-limited decorations and light-theme colors.
- Regression coverage for parsing, matching, scopes, split editors, rendering delays and worker lifecycle.

### Fixed
- Disabling Bloom now clears decorations; unsupported languages retain normal highlighting.
- Comments, literal strings, template prose and CSS are excluded from code highlighting and dimming.
- Corrected mutation operators, bare returns, Ruby logic and C/C++ preprocessor matching.
- Python indentation, Ruby blocks and multiline declarations now use language-aware scope ranges.
- Schema reloads refresh decoration styles; visible split editors update together and pending work is cancelled during cleanup.
- The speed setting controls view-change delays; distinctive shortcut chords preserve common editor keys.
- Build and runtime share validated Markdown parsing; tests, lint and definition watching now run actual checks.

### Verification
- Build and all 31 automated tests passed. Editor behavior is covered with a mocked VS Code API; live extension-host visual verification remains outstanding.

## [0.9.1] - 2026-04-02
### Fixed
- **Markdown Parsing**: Fixed a bug where Windows line endings caused cognitive definitions to fail to load.
- **Highlight Refreshing**: Fixed a caching issue in the painter that prevented highlights from updating when a new schema was loaded.
- **Path Reliability**: Improved robust matching for regex and style blocks within definition files.

## [0.9.0] - 2026-04-02
### Added
- **Unified Markdown Loader**: Refactored the architecture to load cognitive definitions directly from `.md` files. This decouples logic from code and allows for rapid language expansion without recompiling.
- **C++/C Support**: Full cognitive mapping for C and C++ (Templates, Namespaces, Preprocessor directives, Smart Pointers).
- **Extensible Schema System**: New languages can now be added by simply creating a structured `.md` file in the `definitions` directory.

### Removed
- **Static Schema Files**: Deleted redundant `.ts` definition files in favor of the new dynamic Markdown system.

## [0.8.1] - 2026-04-02
### Fixed
- **Command Reliability**: Added explicit `onCommand` activation events to ensure View Switching commands work even if the extension hasn't auto-activated.
- **Visual Visibility**: Replaced complex CSS border properties with standard `textDecoration` and `border` styles to fix build errors and ensure highlights are visible across all VS Code versions.
- **User Feedback**: Added toast notifications for errors and warnings to provide immediate feedback if a highlight fails.

## [0.8.0] - 2026-04-02
### Added
- **Defining Palettes**: Each view mode (Operational, Interfaces, Structural) now has a distinct, high-visibility color palette.
- **Dynamic Block Washes**: Background depth indicators now change hue to match the active view mode (Cyan for Operational, Amber for Interfaces, Pink for Structural).
- **Enhanced Visual Cues**: Added borders, underlines, and bold weights to critical semantic elements to improve rapid scanning.

## [0.7.3] - 2026-04-02
### Added
- **Visible Status Notifications**: Added toast notifications for activation and view switching to confirm the extension is running correctly.
- **Enhanced Error Reporting**: Errors and warnings are now surfaced directly in the VS Code UI via notification toasts.

### Changed
- **Targeted Activation**: Refined activation events to trigger only for supported languages (TS, JS, PY, RB, CPP, CS, Java, PHP), ensuring a cleaner environment.

## [0.7.2] - 2026-04-02
### Fixed
- **Activation Stability**: Switched to `onStartupFinished` for more reliable extension loading.
- **Error Resiliency**: Added comprehensive error handling to activation and schema loading stages to prevent silent failures.

## [0.7.1] - 2026-04-02
### Fixed
- **Performance Optimization**: Replaced expensive regexes with high-speed alternatives to prevent editor lag.
- **Activation Fix**: Restored global activation to ensure the extension loads reliably across all environments.
- **Memory Management**: Improved decoration cleanup for a smoother typing experience.

## [0.7.0] - 2026-04-02
### Added
- **Ruby Support**: Full cognitive mapping for Ruby (`def`, `module`, instance variables, etc.).
- **Ruby Sample**: Added `stress_test.rb` to the samples gallery.

### Changed
- **Optimized Activation**: The extension now only activates for supported languages (TS, JS, PY, RB, CPP, CS, Java, PHP) instead of all files, improving VS Code startup performance.

## [0.6.0] - 2026-04-02
### Changed
- **Visual Overhaul**: Lightened the "noise floor" for significantly better readability of non-highlighted code.
- **Enhanced Contrast**: Increased visibility of block depth washes (doubled opacity).
- **Vibrant Highlights**: Updated the color palette to more vibrant "Neon" variants for better clarity in various lighting conditions.
- **Readable Anchors**: Anchors now use light text on dark backgrounds for a clearer visual hierarchy.

## [0.5.2] - 2026-04-02
### Fixed
- Internal improvements and minor bug fixes.

## [0.2.0] - 2026-04-01
### Added
- **Multi-Language Architecture**: Moved from static regexes to a dynamic `LanguageSchema` system.
- **Python Support**: Full cognitive mapping for Python (Logic, Mutation, Control, etc.).
- **Dynamic Schema Loading**: Extension now automatically adjusts highlighting based on the active file's language.

## [0.1.0] - 2026-04-01
### Added
- **Multi-View System**: Dynamic cognitive layers via keyboard shortcuts.
- **Operational View (Ctrl + o)**: Focuses on Logic (Truth) and Mutation (Action). Highlights `const`, `let`, `var`, and mutation operators.
- **Interface View (Ctrl + i)**: Highlights `interface`, `type`, `enum`, native JS objects (Promise, Map, etc.), and prototypes.
- **Structural View (Ctrl + p)**: Focuses on architecture: `class`, `export`, `import`, and variable declarations.
- **New Semantic Categories**: `volatile` (let/var), `interface`, `native`, `prototype`, and `structural`.

### Fixed
- Improved separation of variable types (`const` vs `let`/`var`) for better readability.
