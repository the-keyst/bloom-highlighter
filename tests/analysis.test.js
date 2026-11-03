const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { analyzeCode } = require('../out/core/languageAnalysis');
const { ConventionalLanguageIds } = require('../out/core/languageIds');
const { parseMarkdown } = require('../out/core/schemaParser');
const { UniversalLoader } = require('../out/core/loader');
const schemas = require('../out/core/definitions.json');

function matches(language, category, text) {
    return [...text.matchAll(new RegExp(schemas[language][category].regex, 'g'))].map(match => match[0]);
}
function tokens(text, language, key, fileName) {
    return analyzeCode(text, language, true, fileName).tokens.filter(t => !key || t.key === key)
        .map(t => text.slice(t.start, t.end));
}

test('Dart preserves interpolation while excluding raw strings, nested comments and multiline prose', () => {
    const text = `/* outer if { /* inner return */ throw } */
class Counter {
  final raw = r'if \u0024count throw';
  final prose = '''return { \u{1f33a} text''';
  String render() => 'hello \u0024{count > 0 ? "literal throw" : count} \u0024count';
  void increment() { if (count > 0) return; count += 1; }
}`;
    const result = analyzeCode(text, 'dart');
    assert.equal(result.code.length, text.length);
    assert.equal(result.code.includes('throw'), false);
    assert.equal(result.code.includes('hello'), false);
    assert.ok(result.code.includes('count > 0 ?'));
    assert.ok(result.code.includes('if (count > 0) return; count += 1;'));
    assert.deepEqual(matches('dart', 'anchor', result.code), ['final', 'final']);
    assert.deepEqual(matches('dart', 'structural', result.code), ['class']);
    assert.deepEqual(matches('dart', 'mutation', result.code), ['=', '=', '+=']);
    assert.ok(result.scopes.some(scope => text.slice(scope.start, scope.headerEnd).startsWith('class Counter')));
    assert.equal(analyzeCode(`final s = 'unfinished throw`, 'dart').code.includes('throw'), false);
});

test('baseline language coverage is automatic and comments/literals use appropriate profiles', () => {
    const { additionalLanguages } = require('../out/core/languageSupport');
    UniversalLoader.loadStatic(schemas);
    assert.equal(UniversalLoader.getSchema('dart').id, 'dart');
    for (const language of additionalLanguages) {
        assert.equal(UniversalLoader.getSchema(language).id, language, language);
    }
    for (const [language, text] of [
        ['java', '// throw\nString s = "return"; value += 1;'],
        ['shellscript', '# throw\nvalue="return"'],
        ['powershell', '<# throw #>\n# return\nvalue += 1'],
        ['lua', '--[=[ throw ]=]\nlocal s = [==[ return ]==]; value += 1'],
        ['sql', '-- throw\nSELECT name FROM things WHERE value > 1;'],
        ['clojure', '; throw\n(def s "return")'],
        ['haskell', '{- throw -}\nvalue = "return"'],
        ['erlang', '% throw\nvalue = "return"'],
        ['fsharp', '(* throw *)\nlet s = "return"'],
        ['cpp', 'auto s = R"tag(throw " return)tag"; value += 1;']
    ]) {
        const result = analyzeCode(text, language);
        assert.equal(result.code.includes('throw'), false, language);
        assert.equal(result.code.includes('return'), false, language);
    }
    for (const language of ['markdown', 'plaintext', 'json', 'yaml', 'html', 'css']) {
        assert.equal(UniversalLoader.getSchema(language), null);
    }
    assert.ok(require('../package.json').activationEvents.includes('onStartupFinished'));
});

test('compiled definitions match the shared Markdown parser, including CRLF', () => {
    for (const language of Object.keys(schemas)) {
        const source = fs.readFileSync(path.join(__dirname, '../src/core/definitions', language + '.md'), 'utf8');
        assert.deepEqual(parseMarkdown(language, source.replace(/\r?\n/g, '\r\n')), schemas[language]);
    }
});

test('mutation operators match their entire range in every supplied language', () => {
    for (const language of ['dart', 'typescript', 'javascript', 'python', 'ruby', 'cpp', 'java', 'rust']) {
        assert.deepEqual(matches(language, 'mutation', 'x += 1; y -= 2; z *= 3; a /= 2;'), ['+=', '-=', '*=', '/=']);
        assert.deepEqual(matches(language, 'mutation', 'x == y; x != y; x <= y; x >= y;'), []);
    }
    assert.deepEqual(matches('typescript', 'mutation', 'n++; --n; a ??= b; a &&= b; a **= b'), ['++', '--', '??=', '&&=', '**=']);
});

test('bare returns, Ruby gates and C++ directives are recognized', () => {
    for (const language of ['typescript', 'python', 'ruby']) {
        assert.deepEqual(matches(language, 'guards', 'return;'), ['return']);
    }
    assert.deepEqual(matches('ruby', 'logic', 'a && b || !c'), ['&&', '||', '!']);
    assert.deepEqual(matches('cpp', 'structural', '#include <vector>\n#define X 1'), ['#include', '#define']);
});

test('unsupported languages have no fallback and failed reloads retain valid schemas', () => {
    UniversalLoader.loadStatic(schemas);
    assert.equal(UniversalLoader.getSchema('markdown'), null);
    assert.equal(UniversalLoader.getSchema('plaintext'), null);
    assert.equal(UniversalLoader.getSchema('vue').id, 'typescript');
    const before = UniversalLoader.getSchema('typescript');
    assert.throws(() => UniversalLoader.loadStatic({ broken: { logic: { regex: '[', style: {} } } }));
    assert.equal(UniversalLoader.getSchema('typescript'), before);
});

test('invalid, unknown and empty-match definitions fail validation', () => {
    const definition = (key, regex) => `## ${key}\nregex: \`${regex}\`\nstyle: {"color":"red"}`;
    assert.throws(() => parseMarkdown('test', definition('logic', '[')));
    assert.throws(() => parseMarkdown('test', definition('logic', 'a*')));
    assert.throws(() => parseMarkdown('test', definition('typo', 'a')));
});

test('JS comments, strings, regex literals and JSX prose do not become code', () => {
    const text = '// if {\n/** throw if return { */\nconst text = "throw {"; const regex = /if[{}]/g;\nconst node = <><Card title="return">throw if {ok && run()}</Card></>;';
    const result = analyzeCode(text, 'typescriptreact');
    assert.equal(result.code.length, text.length);
    assert.equal(result.code.includes('throw'), false);
    assert.equal(result.code.includes('return'), false);
    assert.equal(result.code.includes('if'), false);
    assert.ok(result.code.includes('ok && run()'));
    assert.equal(result.scopes.length, 0);
});

test('template interpolation remains executable while literal content stays masked', () => {
    const text = 'const message = `throw ${ok ? run() : "if"}`;';
    const code = analyzeCode(text, 'typescript').code;
    assert.ok(code.includes('ok ? run()'));
    assert.equal(code.includes('throw'), false);
    assert.equal(code.includes('if'), false);
});

test('React hooks follow import aliases and namespace bindings, excluding shadows', () => {
    const text = 'import React, {useState as state} from "react"; state(0); React.useEffect(() => {}); function local(state: Function, React: any) { state(1); React.useEffect(); }';
    assert.deepEqual(tokens(text, 'typescript'), ['state', 'React.useEffect']);
    assert.deepEqual(tokens('function useState() {} useState();', 'typescript'), []);
    assert.deepEqual(tokens('import {useState} from "something-else"; useState();', 'typescript'), []);
});

test('JSX components and events are categorized without treating attributes as source', () => {
    const text = '<Card onClick={() => count++} title="if return">Text</Card>';
    assert.deepEqual(tokens(text, 'typescriptreact', 'interface'), ['Card', 'Card']);
    assert.deepEqual(tokens(text, 'typescriptreact', 'mutation'), ['onClick']);
    assert.ok(analyzeCode(text, 'typescriptreact').code.includes('count++'));
});

test('Vue setup macros, aliased APIs, directives and expressions preserve offsets', () => {
    const text = '<script setup lang="ts">import {ref as signal} from "vue"; const n = signal(0); defineProps<{ok:boolean}>()</script><template><Card v-if="n > 0" @click="n++">throw {{ n }}</Card></template><style>.if { color: red }</style>';
    const result = analyzeCode(text, 'vue');
    assert.deepEqual(tokens(text, 'vue', 'mutation'), ['signal', '@click']);
    assert.ok(tokens(text, 'vue', 'interface').includes('defineProps'));
    assert.ok(tokens(text, 'vue', 'guards').includes('v-if'));
    assert.equal(result.code.includes('color'), false);
    assert.equal(result.code.includes('throw'), false);
    assert.ok(result.code.includes('n > 0'));
    assert.equal(result.code.length, text.length);
});

test('Vue macros are restricted to setup and respect local declarations', () => {
    assert.deepEqual(tokens('<script>defineProps()</script>', 'vue'), []);
    assert.deepEqual(tokens('<script setup>function defineProps(){} defineProps()</script>', 'vue'), []);
});

test('Svelte runes, components, bindings and block expressions exclude CSS/prose', () => {
    const text = '<script lang="ts">let n = $state(0); const twice = $derived(n * 2);</script>{#if n}<Card bind:value={n}>throw {twice}</Card>{/if}<style>.if { color:red }</style>';
    const result = analyzeCode(text, 'svelte');
    assert.ok(tokens(text, 'svelte', 'mutation').includes('$state'));
    assert.ok(tokens(text, 'svelte', 'mutation').includes('bind:value'));
    assert.ok(tokens(text, 'svelte', 'logic').includes('$derived'));
    assert.ok(tokens(text, 'svelte', 'guards').includes('{#if'));
    assert.equal(result.code.includes('color'), false);
    assert.equal(result.code.includes('throw'), false);
    assert.equal(result.code.length, text.length);
});

test('Svelte runes in .svelte.ts are enabled only in the corresponding file context', () => {
    assert.deepEqual(tokens('let n = $state(0)', 'typescript', 'mutation', '/store.svelte.ts'), ['$state']);
    assert.deepEqual(tokens('let n = $state(0)', 'typescript', 'mutation', '/store.ts'), []);
});

test('disabling framework categories retains safe component region parsing', () => {
    const text = '<script setup>const n = ref(0)</script><style>.if { color:red }</style>';
    const result = analyzeCode(text, 'vue', false);
    assert.equal(result.code.includes('color'), false);
    assert.deepEqual(result.tokens, []);
});

test('incomplete component edits and astral characters preserve safe offsets', () => {
    for (const language of ['vue', 'svelte']) {
        const text = '<!-- 🌱 -->\r\n<script>let n = "if";</script><Card value={';
        const result = analyzeCode(text, language);
        assert.equal(result.code.length, text.length);
        assert.ok(result.tokens.every(t => t.start >= 0 && t.end <= text.length));
    }
});

test('multiline declarations map to their actual body, including next-line braces', () => {
    const text = 'class Example\n{\n  method() { return 1; }\n}';
    const scope = analyzeCode(text, 'typescript').scopes.find(s => s.start === 0);
    assert.equal(scope.end, text.length);
    assert.equal(text[scope.headerEnd], '{');
});

test('Python indentation and Ruby keyword scopes ignore strings/comments', () => {
    const python = 'def f():\n    if True:\n        return "{"\noutside = 1';
    const scopes = analyzeCode(python, 'python').scopes;
    assert.equal(scopes.length, 2);
    assert.ok(scopes.every(s => s.end < python.indexOf('outside')));
    const ruby = 'def f\n  if ok\n    puts "end {"\n  end\nend';
    assert.equal(analyzeCode(ruby, 'ruby').scopes.length, 2);
    const cpp = 'const auto text = R"tag({ if })tag"; // {\nint n = 0;';
    assert.equal(analyzeCode(cpp, 'cpp').scopes.length, 0);
});

test('Lisp-family form heads emit shared constructs and ignore comments and strings', () => {
    const cases = [
        ['lisp', '(defpackage :app)\n(defstruct task)\n(defun run () (when ready (setf done t)))\n; (defun ignored () nil)\n(format t "(defclass fake)")', ['module', 'type', 'function', 'branch', 'mutation']],
        ['scheme', '(define-library (app) (export run))\n(define (run x) (if x (set! x #t)))\n(define-syntax when (syntax-rules () ...))\n; (define fake 0)', ['module', 'declaration', 'function', 'branch', 'mutation']],
        ['clojure', '(ns app)\n(defn run [] (when ready (swap! state inc)))\n;; (defn fake [])', ['module', 'function', 'branch', 'mutation']],
    ];
    for (const [language, text, expected] of cases) {
        const result = analyzeCode(text, language);
        const actual = result.constructs.map(c => c.kind);
        for (const kind of expected) assert.ok(actual.includes(kind), `${language} missing ${kind}`);
        assert.equal(text.slice(result.constructs.find(c => c.kind === 'function' && c.adapter === `${language}-forms`)?.start ?? 0,
            result.constructs.find(c => c.kind === 'function' && c.adapter === `${language}-forms`)?.end ?? 0), language === 'lisp' ? 'defun' : language === 'scheme' ? 'define-syntax' : 'defn');
    }
});

test('remaining language families expose their own module, type, and control constructs', () => {
    const cases = [
        ['elixir', 'defmodule Queue do\n defstruct tasks: []\n def run(items), do: if(items, do: items)\nend', ['module', 'type', 'function', 'branch']],
        ['coffeescript', 'class Queue\n  run: ->\n    if ready then for item in items\n      item', ['declaration', 'branch', 'loop']],
        ['objective-c', '@interface Queue : NSObject\n@property id tasks;\n@end', ['type', 'declaration']],
        ['cuda-cpp', '__global__ void kernel() {}\nstruct Item {};', ['function', 'type']],
        ['glsl', 'layout(location=0) in vec3 position;\nstruct Vertex { vec3 pos; };', ['declaration', 'type']],
        ['hlsl', 'cbuffer Frame : register(b0) { float4x4 transform; };\nstruct Vertex { float3 pos; };', ['declaration', 'type']],
        ['r', 'Queue <- function(items) { if (length(items)) for (item in items) print(item) }', ['function', 'branch', 'loop']],
    ];
    for (const [language, text, expected] of cases) {
        const kinds = analyzeCode(text, language).constructs.map(construct => construct.kind);
        for (const kind of expected) assert.ok(kinds.includes(kind), `${language} missing ${kind}`);
    }
});

test('every conventional language has a representative structural fixture', () => {
    const fixtures = {
        dart: 'class Queue {}', python: 'class Queue:\n    pass', ruby: 'module Queue\nend', cpp: 'struct Queue {};',
        c: 'struct Queue {};', 'objective-c': '@interface Queue : NSObject\n@end', 'objective-cpp': '@interface Queue : NSObject\n@end',
        java: 'class Queue {}', csharp: 'record Queue(int Count);', go: 'type Queue struct {}', rust: 'pub struct Queue {}',
        kotlin: 'data class Queue(val count: Int)', swift: 'struct Queue {}', scala: 'object Queue {}', groovy: 'class Queue {}',
        php: '<?php namespace Queue;', d: 'module queue;', zig: 'pub const Queue = struct {};', solidity: 'contract Queue {}',
        'cuda-cpp': '__global__ void run() {}', hlsl: 'cbuffer Params { float value; };', glsl: 'layout(location=0) in vec3 position;',
        fsharp: 'module Queue', ocaml: 'module Queue = struct end', shellscript: 'function run { :; }',
        powershell: 'function Invoke-Queue {}', perl: 'package Queue;', r: 'Queue <- function() {}',
        julia: 'module Queue\nend', elixir: 'defmodule Queue do\nend', coffeescript: 'class Queue',
        lua: 'local function run() end', sql: 'CREATE TABLE Queue (id INT);', clojure: '(ns queue)',
        lisp: '(defpackage :queue)', scheme: '(define-library (queue))', haskell: 'module Queue where',
        erlang: '-module(queue).', matlab: 'classdef Queue\nend', razor: '@using System\nclass Queue {}',
    };
    assert.deepEqual(Object.keys(fixtures).sort(), [...ConventionalLanguageIds].sort());
    const expectedKinds = {
        dart: 'declaration', python: 'declaration', ruby: 'module', cpp: 'type', c: 'type', 'objective-c': 'type', 'objective-cpp': 'type',
        java: 'declaration', csharp: 'type', go: 'type', rust: 'type', kotlin: 'declaration', swift: 'type', scala: 'type', groovy: 'declaration',
        php: 'module', d: 'module', zig: 'type', solidity: 'type', 'cuda-cpp': 'function', hlsl: 'declaration', glsl: 'declaration',
        fsharp: 'module', ocaml: 'module', shellscript: 'declaration', powershell: 'declaration', perl: 'module', r: 'function',
        julia: 'module', elixir: 'module', coffeescript: 'declaration', lua: 'declaration', sql: 'declaration', clojure: 'module',
        lisp: 'module', scheme: 'module', haskell: 'module', erlang: 'module', matlab: 'type', razor: 'declaration',
    };
    for (const [language, source] of Object.entries(fixtures)) {
        const result = analyzeCode(source, language);
        assert.ok(result.constructs.some(item => item.kind === expectedKinds[language]), `${language} missing ${expectedKinds[language]}`);
        assert.ok(result.constructs.every(item => item.start >= 0 && item.end <= source.length), `${language} produced an invalid span`);
    }
    const java = analyzeCode('class Queue {}', 'java').constructs.filter(item => item.start === 0 && item.end === 5);
    assert.deepEqual([...new Set(java.map(item => item.kind))], ['declaration']);
});
