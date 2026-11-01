# Bloom 0.15.0

Bloom now analyzes code through a shared construct model. Language adapters report common syntax concepts such as declarations, calls, control flow, mutations and scopes; framework adapters add local cues such as routes, handlers, components, validation and server/client boundaries. These constructs feed Bloom’s existing views and category colors.

This release adds first-pass local framework recognition for common JavaScript/TypeScript, Python, C#, Java, PHP and Ruby stacks. Recognition is conservative and file-local; it does not resolve aliases, dependencies or behavior across a project. See [Shared construct analysis](CONSTRUCTS.md) for the current coverage and limits.

Analysis and scrolling are also more efficient: JS/TS framework import checks no longer create a TypeScript program, irrelevant framework tree walks are skipped, conventional keyword checks use a combined scan, and scrolling uses cached viewport span indexes.

## Quick install

1. Download **bloom-highlighter-0.15.0.vsix** from the assets below.
2. In desktop VS Code, run **Extensions: Install from VSIX…** and select the file.
3. Run **Developer: Reload Window**, open a code file, then run **Bloom: Show Sidebar**.

Requires VS Code 1.95 or newer. [Full installation guide](https://github.com/theokeist/bloom-highlighter/blob/main/INSTALL.md).

Highlights remain lexical reading aids. Framework recognition is not project-wide semantic analysis, and Dangerous view provides review cues rather than security findings.
