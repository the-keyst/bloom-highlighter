/** VS Code language IDs supported by Bloom's built-in adapters and schemas. */
export const LanguageId = {
    astro: 'astro', c: 'c', clojure: 'clojure', coffeescript: 'coffeescript', cpp: 'cpp', csharp: 'csharp',
    cudaCpp: 'cuda-cpp', d: 'd', dart: 'dart', elixir: 'elixir', erlang: 'erlang', fsharp: 'fsharp',
    generic: 'generic', glsl: 'glsl', go: 'go', groovy: 'groovy', haskell: 'haskell', hlsl: 'hlsl',
    java: 'java', javascript: 'javascript', javascriptReact: 'javascriptreact', julia: 'julia', kotlin: 'kotlin',
    lisp: 'lisp', lua: 'lua', matlab: 'matlab', objectiveC: 'objective-c', objectiveCpp: 'objective-cpp',
    ocaml: 'ocaml', perl: 'perl', php: 'php', plaintext: 'plaintext', powershell: 'powershell', python: 'python',
    r: 'r', razor: 'razor', ruby: 'ruby', rust: 'rust', scala: 'scala', scheme: 'scheme', shellscript: 'shellscript',
    solidity: 'solidity', sql: 'sql', svelte: 'svelte', swift: 'swift', typescript: 'typescript',
    typescriptReact: 'typescriptreact', vue: 'vue', zig: 'zig',
} as const;

export type BuiltInLanguageId = typeof LanguageId[keyof typeof LanguageId];

export const ScriptLanguageIds = [LanguageId.typescript, LanguageId.javascript, LanguageId.typescriptReact,
    LanguageId.javascriptReact, LanguageId.astro] as const;

export const ConventionalLanguageIds = [
    LanguageId.dart, LanguageId.python, LanguageId.ruby, LanguageId.cpp, LanguageId.c, LanguageId.objectiveC,
    LanguageId.objectiveCpp, LanguageId.java, LanguageId.csharp, LanguageId.go, LanguageId.rust, LanguageId.kotlin,
    LanguageId.swift, LanguageId.scala, LanguageId.groovy, LanguageId.php, LanguageId.d, LanguageId.zig,
    LanguageId.solidity, LanguageId.cudaCpp, LanguageId.hlsl, LanguageId.glsl, LanguageId.fsharp, LanguageId.ocaml,
    LanguageId.shellscript, LanguageId.powershell, LanguageId.perl, LanguageId.r, LanguageId.julia, LanguageId.elixir,
    LanguageId.coffeescript, LanguageId.lua, LanguageId.sql, LanguageId.clojure, LanguageId.lisp, LanguageId.scheme,
    LanguageId.haskell, LanguageId.erlang, LanguageId.matlab, LanguageId.razor,
] as const;

export const AdditionalLanguageIds = [
    LanguageId.java, LanguageId.csharp, LanguageId.go, LanguageId.rust, LanguageId.kotlin, LanguageId.swift,
    LanguageId.scala, LanguageId.groovy, LanguageId.php, LanguageId.d, LanguageId.zig, LanguageId.solidity,
    LanguageId.cudaCpp, LanguageId.hlsl, LanguageId.glsl, LanguageId.fsharp, LanguageId.ocaml, LanguageId.shellscript,
    LanguageId.powershell, LanguageId.perl, LanguageId.r, LanguageId.julia, LanguageId.elixir, LanguageId.coffeescript,
    LanguageId.lua, LanguageId.sql, LanguageId.clojure, LanguageId.lisp, LanguageId.scheme, LanguageId.haskell,
    LanguageId.erlang, LanguageId.matlab,
] as const;

export const LanguageSchemaAliases: Readonly<Record<string, string>> = {
    [LanguageId.javascriptReact]: LanguageId.javascript,
    [LanguageId.typescriptReact]: LanguageId.typescript,
    [LanguageId.vue]: LanguageId.typescript,
    [LanguageId.svelte]: LanguageId.typescript,
    [LanguageId.astro]: LanguageId.typescript,
    [LanguageId.c]: LanguageId.cpp,
    [LanguageId.objectiveC]: LanguageId.cpp,
    [LanguageId.objectiveCpp]: LanguageId.cpp,
    [LanguageId.razor]: LanguageId.csharp,
};

export const NestedCommentLanguageIds = [LanguageId.rust, LanguageId.swift, LanguageId.kotlin, LanguageId.scala,
    LanguageId.d, LanguageId.julia, LanguageId.haskell, LanguageId.fsharp, LanguageId.ocaml] as const;

export const HashCommentLanguageIds = [LanguageId.python, LanguageId.ruby, LanguageId.shellscript, LanguageId.perl,
    LanguageId.r, LanguageId.julia, LanguageId.elixir, LanguageId.coffeescript] as const;

export const SemicolonCommentLanguageIds = [LanguageId.clojure, LanguageId.lisp, LanguageId.scheme] as const;
export const PercentCommentLanguageIds = [LanguageId.erlang, LanguageId.matlab] as const;
export const StarCommentLanguageIds = [LanguageId.fsharp, LanguageId.ocaml] as const;
export const CFamilyLanguageIds = [LanguageId.cpp, LanguageId.c, LanguageId.objectiveC, LanguageId.objectiveCpp] as const;
