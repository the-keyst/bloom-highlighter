const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');
const { analyzeCode } = require('../out/core/languageAnalysis');
const { categorySpans } = require('../out/core/patternAnalysis');
const { UniversalLoader } = require('../out/core/loader');
const definitions = require('../out/core/definitions.json');

const projectRoot = path.join(__dirname, '..');
const assetsRoot = path.join(__dirname, 'assets');
UniversalLoader.loadStatic(definitions);

const languageSamples = {
  csharp: 'samples/languages/TaskQueue.cs', cpp: 'samples/all-features/stress_test.cpp',
  dart: 'samples/frameworks/Counter.dart', java: 'samples/languages/TaskQueue.java',
  javascript: 'samples/all-features/stress_test.js', php: 'samples/all-features/stress_test.php',
  python: 'samples/languages/task_queue.py', ruby: 'samples/all-features/stress_test.rb',
  typescript: 'samples/all-features/stress_test.ts', go: 'samples/languages/task_queue.go',
  rust: 'samples/languages/task_queue.rs', c: 'samples/languages/task_queue.c',
  kotlin: 'samples/languages/TaskQueue.kt', swift: 'samples/languages/TaskQueue.swift',
  powershell: 'samples/languages/task_queue.ps1', julia: 'samples/languages/task_queue.jl',
  lua: 'samples/languages/task_queue.lua', sql: 'samples/languages/task_queue.sql',
  scala: 'samples/languages/TaskQueue.scala', elixir: 'samples/languages/task_queue.exs',
  shellscript: 'samples/languages/task_queue.sh', clojure: 'samples/languages/task_queue.clj',
  coffeescript: 'samples/languages/task_queue.coffee', d: 'samples/languages/task_queue.d',
  groovy: 'samples/languages/task_queue.groovy', haskell: 'samples/languages/task_queue.hs',
  perl: 'samples/languages/task_queue.pl', r: 'samples/languages/task_queue.R',
  'cuda-cpp': 'samples/languages/vector_add.cu', glsl: 'samples/languages/color.frag',
  hlsl: 'samples/languages/color.hlsl', 'objective-c': 'samples/languages/TaskQueue.m',
  'objective-cpp': 'samples/languages/TaskQueue.mm', zig: 'samples/languages/task_queue.zig',
  erlang: 'samples/languages/task_queue.erl', fsharp: 'samples/languages/task_queue.fs',
  lisp: 'samples/languages/task_queue.lisp', scheme: 'samples/languages/task_queue.scm',
  ocaml: 'samples/languages/task_queue.ml', matlab: 'samples/languages/task_queue.m',
  solidity: 'samples/languages/TaskQueue.sol'
};
const languages = [
  ['c', 'C'],
  ['cpp', 'C++'],
  ['csharp', 'C#'],
  ['clojure', 'Clojure'],
  ['coffeescript', 'CoffeeScript'],
  ['cuda-cpp', 'CUDA C++'],
  ['d', 'D'],
  ['dart', 'Dart'],
  ['elixir', 'Elixir'],
  ['erlang', 'Erlang'],
  ['fsharp', 'F#'],
  ['glsl', 'GLSL'],
  ['go', 'Go'],
  ['groovy', 'Groovy'],
  ['haskell', 'Haskell'],
  ['hlsl', 'HLSL'],
  ['java', 'Java'],
  ['javascript', 'JavaScript'],
  ['julia', 'Julia'],
  ['kotlin', 'Kotlin'],
  ['lisp', 'Lisp'],
  ['lua', 'Lua'],
  ['matlab', 'MATLAB'],
  ['objective-c', 'Objective-C'],
  ['objective-cpp', 'Objective-C++'],
  ['ocaml', 'OCaml'],
  ['perl', 'Perl'],
  ['php', 'PHP'],
  ['powershell', 'PowerShell'],
  ['python', 'Python'],
  ['r', 'R'],
  ['ruby', 'Ruby'],
  ['rust', 'Rust'],
  ['scala', 'Scala'],
  ['scheme', 'Scheme'],
  ['shellscript', 'Shell Script'],
  ['solidity', 'Solidity'],
  ['sql', 'SQL'],
  ['swift', 'Swift'],
  ['typescript', 'TypeScript'],
  ['zig', 'Zig'],
];
const frameworks = [
  ['react', 'React', 'samples/frameworks/Counter.tsx', 'typescriptreact'],
  ['vue', 'Vue', 'samples/frameworks/Counter.vue', 'vue'],
  ['svelte', 'Svelte', 'samples/frameworks/Counter.svelte', 'svelte'],
  ['flutter', 'Flutter', 'samples/frameworks/Counter.dart', 'dart'],
  ['fastapi', 'FastAPI', 'samples/frameworks/fastapi/tasks.py', 'python'],
  ['express', 'Express', 'samples/frameworks/express/tasks.ts', 'typescript'],
  ['nest', 'NestJS', 'samples/frameworks/nest/tasks.controller.ts', 'typescript'],
  ['angular', 'Angular', 'samples/frameworks/angular/tasks.component.ts', 'typescript'],
  ['next', 'Next.js', 'samples/frameworks/next/app/tasks/page.tsx', 'typescriptreact'],
  ['nuxt', 'Nuxt', 'samples/frameworks/nuxt/pages/tasks.vue', 'vue'],
  ['sveltekit', 'SvelteKit', 'samples/frameworks/sveltekit/src/routes/tasks/+page.server.ts', 'typescript'],
  ['astro', 'Astro', 'samples/frameworks/astro/src/pages/tasks.astro', 'astro']
];

const views = [
  { name: 'Operational', subtitle: 'Follow flow and state changes', keys: ['alert', 'logic', 'guards', 'mutation'], accent: '#34d399' },
  { name: 'Interfaces', subtitle: 'Find functions, calls and APIs', keys: ['alert', 'interface', 'native', 'prototype', 'functions'], accent: '#fbbf24' },
  { name: 'Structural', subtitle: 'Find declarations and stable values', keys: ['alert', 'structural', 'anchor', 'internal'], accent: '#f472b6' },
  { name: 'Dangerous', subtitle: 'Review potentially risky operations', keys: ['danger'], accent: '#ff4d4d' }
];
const xml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
const schemaAliases = { c: 'cpp', 'objective-c': 'cpp', 'objective-cpp': 'cpp', javascriptreact: 'javascript', typescriptreact: 'typescript' };

function rgba(value) {
  const match = value?.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (!match) return null;
  return { color: `rgb(${match[1]},${match[2]},${match[3]})`, opacity: match[4] ?? '1' };
}

function renderCodeLine(line, sourceOffset, mode, spansByKey, schema, x, y, width, charWidth, fontSize) {
  const selected = new Array(line.length).fill(null);
  const activeSpans = [];
  for (const key of mode.keys) {
    const mapping = schema.mapping[key];
    if (!mapping) continue;
    for (const span of spansByKey.get(key) ?? []) {
      const start = Math.max(sourceOffset, span.start);
      const end = Math.min(sourceOffset + line.length, span.end);
      if (start >= end) continue;
      const style = mapping.style;
      const item = { key, color: style.color ?? mode.accent, opacity: Number(style.opacity ?? 1), fontWeight: style.fontWeight, textDecoration: style.textDecoration, background: rgba(style.backgroundColor) };
      activeSpans.push({ start, end, item });
      for (let offset = start; offset < end; offset++) selected[offset - sourceOffset] = item;
    }
  }

  const backgrounds = activeSpans.filter(({ item }) => item.background).map(({ start, end, item }) => {
    const left = x + (start - sourceOffset) * charWidth;
    const rectWidth = Math.max(charWidth, (end - start) * charWidth);
    return `<rect x="${left.toFixed(2)}" y="${(y - fontSize + 2).toFixed(2)}" width="${rectWidth.toFixed(2)}" height="${(fontSize + 4).toFixed(2)}" rx="2" fill="${item.background.color}" fill-opacity="${item.background.opacity}"/>`;
  }).join('');

  let spans = '';
  for (let index = 0; index < line.length;) {
    const item = selected[index];
    let end = index + 1;
    while (end < line.length && selected[end] === item) end++;
    const text = xml(line.slice(index, end));
    if (!item) spans += `<tspan fill="#c9bfd2" fill-opacity="0.65">${text}</tspan>`;
    else {
      const decoration = item.textDecoration?.includes('underline') ? ' underline' : '';
      spans += `<tspan fill="${xml(item.color)}" fill-opacity="${item.opacity}"${item.fontWeight ? ` font-weight="${xml(item.fontWeight)}"` : ''}${decoration ? ` text-decoration="${decoration.trim()}"` : ''}>${text}</tspan>`;
    }
    index = end;
  }
  const textLength = line.length * fontSize * 0.61;
  const fit = textLength > width ? ` textLength="${width}" lengthAdjust="spacingAndGlyphs"` : '';
  return `${backgrounds}<text x="${x}" y="${y}" font-family="Consolas,monospace" font-size="${fontSize}" xml:space="preserve"${fit}>${spans}</text>`;
}

function artwork(name, source, language, fileName) {
  const analysis = analyzeCode(source, language, true, fileName);
  const schema = UniversalLoader.getSchema(language) ?? UniversalLoader.getSchema(schemaAliases[language] ?? language);
  if (!schema) throw new Error(`No Bloom schema found for ${language}`);
  let reviewCue = '';
  for (const example of schema.mapping.danger?.examples ?? []) {
    const cueAnalysis = analyzeCode(example, schema.id, true, fileName);
    if (categorySpans(cueAnalysis, schema, 'danger').length) {
      reviewCue = example;
      break;
    }
  }
  const cueAnalysis = reviewCue ? analyzeCode(reviewCue, schema.id, true, fileName) : null;

  const rawLines = source.split('\n');
  const spansByKey = new Map();
  for (const mode of views) {
    for (const key of mode.keys) {
      if (!spansByKey.has(key)) spansByKey.set(key, categorySpans(analysis, schema, key));
    }
  }
  const lineHeight = 19;
  const codeTop = 91;
  const gutter = 54;
  const canvasWidth = 1760;
  const margin = 40;
  const gap = 24;
  const cardWidth = (canvasWidth - margin * 2 - gap) / 2;
  const lineWidth = cardWidth - gutter - 24;
  const fontSize = 14;
  const maxChars = Math.floor(lineWidth / (fontSize * 0.61));
  const cueSpace = reviewCue ? 72 : 0;
  const cardHeight = codeTop + rawLines.length * lineHeight + cueSpace + 34;
  const canvasHeight = 120 + cardHeight * 2 + 24;
  const modeMarkup = views.map((mode, index) => {
    const x = margin + (index % 2) * (cardWidth + gap);
    const y = 120 + Math.floor(index / 2) * (cardHeight + 24);
    let offset = 0;
    let code = '';
    rawLines.forEach((rawLine, lineIndex) => {
      const line = rawLine.replace(/\r$/, '');
      const charWidth = Math.min(fontSize * 0.61, lineWidth / Math.max(1, line.length));
      const baseline = y + codeTop + lineIndex * lineHeight;
      code += `<text x="${x + 18}" y="${baseline}" fill="#766b84" font-family="Consolas,monospace" font-size="11" text-anchor="end">${lineIndex + 1}</text>`;
      code += renderCodeLine(line, offset, mode, spansByKey, schema, x + gutter, baseline, lineWidth, charWidth, fontSize);
      offset += rawLine.length + 1;
    });
    if (reviewCue && cueAnalysis) {
      const cueLabelY = y + codeTop + rawLines.length * lineHeight + 22;
      const cueBaseline = cueLabelY + 20;
      const cueSpans = new Map();
      for (const key of mode.keys) cueSpans.set(key, categorySpans(cueAnalysis, schema, key));
      const cueLabel = mode.name === 'Dangerous' ? 'Danger highlight example - review only; never executed' : 'Danger example - shown for review; never executed';
      code += `<rect x="${x + 16}" y="${cueLabelY - 17}" width="${cardWidth - 32}" height="54" rx="8" fill="${mode.name === 'Dangerous' ? '#ff4d4d20' : '#ffffff08'}" stroke="${mode.name === 'Dangerous' ? '#ff4d4d88' : '#ffffff18'}"/>`;
      code += `<text x="${x + 24}" y="${cueLabelY}" fill="${mode.name === 'Dangerous' ? '#ff8a8a' : '#b7a9c3'}" font-family="Arial,sans-serif" font-size="12" font-weight="${mode.name === 'Dangerous' ? '700' : '400'}">${xml(cueLabel)}</text>`;
      const cueCharWidth = Math.min(fontSize * 0.61, lineWidth / Math.max(1, reviewCue.length));
      code += renderCodeLine(reviewCue, 0, mode, cueSpans, schema, x + gutter, cueBaseline, lineWidth, cueCharWidth, fontSize);
    }
    return `<g><rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="18" fill="#3b2055"/><rect x="${x}" y="${y}" width="${cardWidth}" height="82" rx="18" fill="#ffffff04"/><text x="${x + 24}" y="${y + 38}" fill="#fbf8f1" font-family="Arial,sans-serif" font-size="25">${mode.name}</text><text x="${x + 24}" y="${y + 64}" fill="#d7c8e3" font-family="Arial,sans-serif" font-size="15">${mode.subtitle}</text>${code}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" role="img" aria-labelledby="title desc"><title id="title">${xml(name)} complete sample · Bloom highlighting</title><desc id="desc">The same complete ${xml(name)} source is shown in Operational, Interfaces, Structural, and Dangerous views using Bloom's current language and framework rules.</desc><rect width="100%" height="100%" fill="#2e164b"/><text x="${margin}" y="43" fill="#fbf8f1" font-family="Arial,sans-serif" font-size="31">${xml(name)} · Complete code in four Bloom views</text><text x="${margin}" y="73" fill="#d7c8e3" font-family="Arial,sans-serif" font-size="16">Highlights use Bloom's active category rules; unmatched code is dimmed.</text>${modeMarkup}</svg>`;
}

function writeArtwork(folder, slug, name, source, language, fileName) {
  const codeLines = source.split(/\r?\n/).filter(line => line.trim()).length;
  if (codeLines < 30) {
    throw new Error(`${fileName}: expected at least 30 nonblank source lines, got ${codeLines}`);
  }
  const outputBase = path.join(assetsRoot, folder, slug);
  const svg = artwork(name, source, language, fileName);
  fs.writeFileSync(`${outputBase}.svg`, svg, 'utf8');
  fs.writeFileSync(`${outputBase}.png`, new Resvg(svg).render().asPng());
}

for (const [slug, name] of languages) {
  const samplePath = languageSamples[slug];
  if (!samplePath) throw new Error(`No complete source example mapped for ${slug}`);
  const source = fs.readFileSync(path.join(projectRoot, samplePath), 'utf8');
  const language = slug;
  writeArtwork('languages', slug, name, source, language, samplePath);
}

for (const [slug, name, samplePath, language] of frameworks) {
  const source = fs.readFileSync(path.join(projectRoot, samplePath), 'utf8');
  writeArtwork('frameworks', slug, name, source, language, samplePath);
}

const store = path.join(projectRoot, 'media', 'store');
fs.mkdirSync(store, { recursive: true });
fs.copyFileSync(path.join(assetsRoot, 'languages', 'python.png'), path.join(store, 'bloom-language-examples.png'));
fs.copyFileSync(path.join(assetsRoot, 'frameworks', 'react.png'), path.join(store, 'bloom-framework-examples.png'));
console.log(`Generated Bloom-analyzed SVG and PNG previews for ${languages.length} languages and ${frameworks.length} frameworks.`);
