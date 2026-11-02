# Bloom examples

Open these files in VS Code to compare Bloom's views across languages and frameworks. Choose **Operational** to follow conditions and state changes, **Interfaces** for calls and components, and **Structural** for imports and declarations. The examples are standalone reading fixtures; framework samples may rely on types or runtime services provided by a host project.

![Bloom highlighting examples in Dart, Python, Go, Rust, Java and C#](../media/store/bloom-language-examples.png)

![Bloom framework examples for Flutter, React, Vue, Svelte, FastAPI, Express, NestJS, Angular, Next.js, Nuxt, SvelteKit and Astro](../media/store/bloom-framework-examples.png)

## Languages

| Example | What to follow |
| --- | --- |
| [Dart / Flutter counter](frameworks/Counter.dart) | Widget composition, state changes, an async reset, and a mounted guard. |
| [Python task queue](languages/task_queue.py) | A class, loop, guard, mutation, exception and comprehension. |
| [Go task queue](languages/task_queue.go) | Slice updates, branching, iteration and result formatting. |
| [Rust task queue](languages/task_queue.rs) | Mutable borrowing, `Result`, iterator filters and early return. |
| [Java task queue](languages/TaskQueue.java) | Record values, a mutable collection and a stream pipeline. |
| [C# task queue](languages/TaskQueue.cs) | Records, a collection update, a guard and a LINQ projection. |

## Frameworks

| Example | What to follow |
| --- | --- |
| [Flutter](frameworks/Counter.dart) | Declarative widgets around state and event callbacks. |
| [FastAPI](frameworks/fastapi/tasks.py) | Decorated routes, an async handler, a lookup guard and a state update. |
| [React](frameworks/Counter.tsx) | Imported hooks, JSX composition, an event callback and an effect. |
| [Vue](frameworks/Counter.vue) | A computed value, template branches, events and reactive state. |
| [Svelte](frameworks/Counter.svelte) | Svelte 5 runes, markup blocks, events and lifecycle setup. |
| [Express](frameworks/express/tasks.ts) | Route declarations, request handlers, a lookup guard and a write. |
| [NestJS](frameworks/nest/tasks.controller.ts) | Controller and route decorators, request validation and mutation. |
| [Angular](frameworks/angular/tasks.component.ts) | Component metadata, lifecycle setup, template binding and state. |
| [Next.js](frameworks/next/app/tasks/page.tsx) | File-convention rendering, server data access and JSX output. |
| [Nuxt](frameworks/nuxt/pages/tasks.vue) | `useFetch`, refresh actions and template loading/error branches. |
| [SvelteKit](frameworks/sveltekit/src/routes/tasks/+page.server.ts) | A server `load` handler and guarded data parsing. |
| [Astro](frameworks/astro/src/pages/tasks.astro) | Frontmatter data loading and component markup. |

Framework recognition is local to the open file and uses supported syntax cues. These examples show patterns Bloom can emphasize; they do not demonstrate complete framework semantics or runtime behavior.
