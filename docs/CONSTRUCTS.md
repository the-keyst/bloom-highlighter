# Shared construct analysis

Bloom analysis now emits language independent constructs with source offsets. Each result includes a construct kind, origin (`language`, `framework`, or `generic`), and optional adapter ID. Existing Bloom category tokens remain the presentation layer, so the construct model can grow without tying parsers to view colors.

## Construct kinds

The shared vocabulary covers declarations, functions, calls, types, modules, branches, loops, returns, async work, mutations, error handling, components, routes, handlers, middleware, authorization, validation, data access, rendering, server/client boundaries, lifecycle hooks, and scopes.

Language adapters are registered in `src/core/languageAnalysis.ts`. The TypeScript adapter uses the TypeScript syntax tree; Vue and Svelte use their compiler trees; other configured languages use conservative lexical constructs and language-family masking. The analyzer has a generic fallback for unknown IDs, while the extension UI still requires a loaded language definition before it enables highlighting.

## Framework recognition currently implemented

- React, Vue, and Svelte retain their existing import, component, directive, and lifecycle recognition.
- JavaScript/TypeScript adds local patterns for Next.js file conventions and client/server directives, Express-family route calls, NestJS decorators, Angular decorators and lifecycle hooks, Nuxt composables, SvelteKit handlers, and Astro rendering/static path calls.
- Conventional adapters recognize common route/controller conventions for FastAPI, Flask, Django, ASP.NET Core and Blazor, Spring MVC/Boot, Laravel, Symfony, and Rails route files.

These are local syntax cues, not project-wide semantic resolution. Recognition does not follow aliases across files, resolve dependency injection, prove a database operation, or understand every framework extension. Framework recognition can be disabled independently of language constructs.

## Extending coverage

Implement a `LanguageAdapter` for syntax-specific parsing and emit constructs with `addConstruct`. Add a framework adapter when a framework has distinctive conventions. Keep ranges in UTF-16 offsets, matching VS Code document offsets. Prefer parser nodes for source ranges; regex-based recognition should be restricted to a known language/framework context and should avoid comments and literals.

## Processing notes

The JS/TS analyzer resolves framework imports from syntax bindings and cached lexical scopes, without creating a TypeScript program for each document. Full-stack AST recognition skips its tree walk unless an import or file convention indicates a supported framework. Conventional language constructs share a combined keyword scan. The painter caches sorted span indexes and binary-searches the visible viewport on scroll, rather than scanning every cached span each time.
