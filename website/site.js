const compare = document.querySelector('.compare');
const caption = document.querySelector('#compare-caption');
const hint = document.querySelector('.compare-hint');
const highlightButtons = [...document.querySelectorAll('.highlight-mode')];
const viewNames = { structural: 'Structural', interface: 'Interfaces', operational: 'Operational', dangerous: 'Dangerous' };

highlightButtons.forEach(button => button.addEventListener('click', () => updateComparisonView(button.dataset.view)));
const compareLanguageSelect = document.querySelector('#compare-language-select');
const compareCode = document.querySelector('#comparison-code');
const compareExamples = {
  python: { language: 'PYTHON', file: 'task_runner.py', source: 'assets/examples/task_runner.py' },
  javascript: { language: 'JAVASCRIPT', file: 'stress_test.js', source: 'assets/examples/stress_test.js' },
  go: { language: 'GO', file: 'task_queue.go', source: 'assets/examples/task_queue.go' },
  rust: { language: 'RUST', file: 'task_queue.rs', source: 'assets/examples/task_queue.rs' },
  lisp: { language: 'LISP', file: 'task_queue.lisp', source: 'assets/examples/task_queue.lisp' },
  solidity: { language: 'SOLIDITY', file: 'TaskQueue.sol', source: 'assets/examples/TaskQueue.sol' }
};

const viewCategories = {
  structural: ['alert', 'structural', 'anchor', 'internal'],
  interface: ['alert', 'interface', 'native', 'prototype', 'functions'],
  operational: ['alert', 'logic', 'guards', 'mutation'],
  dangerous: ['danger']
};

const syntaxLexicons = {
  python: {
    keywords: new Set('and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return self try while with yield False None True'.split(' ')),
    types: new Set('BaseException Exception TypeError ValueError bool bytes dict float int list object set str tuple'.split(' ')), comment: '#'
  },
  javascript: {
    keywords: new Set('async await break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while with yield false null true undefined'.split(' ')),
    types: new Set('Array Boolean Date Error Map Number Object Promise Set String WeakMap'.split(' ')), comment: '//', blockComments: true
  },
  go: {
    keywords: new Set('break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var'.split(' ')),
    types: new Set('any bool byte complex64 complex128 error float32 float64 int int8 int16 int32 int64 rune string uint uint8 uint16 uint32 uint64 uintptr'.split(' ')), comment: '//'
  },
  rust: {
    keywords: new Set('as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while'.split(' ')),
    types: new Set('bool char f32 f64 i8 i16 i32 i64 isize str String u8 u16 u32 u64 usize Vec Option Result'.split(' ')), comment: '//'
  },
  lisp: {
    keywords: new Set('defstruct defun lambda let let* if progn setf nil t when unless dolist loop do cond case and or not'.split(' ')),
    types: new Set('vector list string integer number symbol'.split(' ')), comment: ';'
  },
  solidity: {
    keywords: new Set('abstract break case catch contract continue delete do else emit enum event external false for function if immutable import indexed interface internal is library mapping memory modifier new payable pragma private pure public return returns revert selfdestruct storage this throw try type uint uint256 view virtual while'.split(' ')),
    types: new Set('address bool bytes calldata int mapping memory payable string storage uint uint8 uint16 uint32 uint64 uint128 uint256'.split(' ')), comment: '//', blockComments: true
  }
};

function addSyntaxToken(parent, className, value) {
  if (!value) return;
  if (!className) {
    parent.append(document.createTextNode(value));
    return;
  }
  const token = document.createElement('span');
  token.className = className;
  token.textContent = value;
  parent.append(token);
}

function highlightSourceLine(element, line, language, lexerState) {
  const lexicon = syntaxLexicons[language];
  const masked = line.split('');
  const hideFromBloom = (start, end) => {
    for (let position = start; position < end; position++) if (masked[position] !== '\r' && masked[position] !== '\n') masked[position] = ' ';
  };
  let index = 0;
  let plainStart = 0;
  let declaration = '';
  const flushPlain = end => {
    addSyntaxToken(element, '', line.slice(plainStart, end));
    plainStart = end;
  };
  while (index < line.length) {
    if (lexerState.blockComment) {
      const close = line.indexOf('*/', index);
      const end = close < 0 ? line.length : close + 2;
      flushPlain(index);
      addSyntaxToken(element, 'syntax-comment', line.slice(index, end));
      hideFromBloom(index, end);
      index = end;
      plainStart = index;
      lexerState.blockComment = close < 0;
      continue;
    }
    const startsBlockComment = lexicon.blockComments && line.startsWith('/*', index);
    const startsLineComment = line.startsWith(lexicon.comment, index);
    if (startsLineComment || startsBlockComment) {
      flushPlain(index);
      if (startsBlockComment) {
        const close = line.indexOf('*/', index + 2);
        const end = close < 0 ? line.length : close + 2;
        addSyntaxToken(element, 'syntax-comment', line.slice(index, end));
        hideFromBloom(index, end);
        lexerState.blockComment = close < 0;
        index = end;
      } else {
        addSyntaxToken(element, 'syntax-comment', line.slice(index));
        hideFromBloom(index, line.length);
        index = line.length;
      }
      plainStart = index;
      continue;
    }
    const quote = line[index];
    const isStringQuote = (quote === '"' || quote === '`' || (quote === "'" && language !== 'lisp'));
    if (isStringQuote) {
      flushPlain(index);
      let end = index + 1;
      while (end < line.length) {
        if (line[end] === '\\') { end += 2; continue; }
        if (line[end] === quote) { end++; break; }
        end++;
      }
      addSyntaxToken(element, 'syntax-string', line.slice(index, end));
      hideFromBloom(index, end);
      index = end;
      plainStart = end;
      continue;
    }
    const isPythonDecorator = language === 'python' && quote === '@' && index === line.search(/\S/);
    if (isPythonDecorator) {
      const decorator = line.slice(index).match(/^@[A-Za-z_]\w*/)?.[0];
      if (decorator) {
        flushPlain(index);
        addSyntaxToken(element, 'syntax-decorator', decorator);
        index += decorator.length;
        plainStart = index;
        continue;
      }
    }
    const number = line.slice(index).match(/^(?:0[xX][\da-fA-F]+|\d+(?:\.\d+)?)/)?.[0];
    if (number && /\d/.test(quote)) {
      flushPlain(index);
      addSyntaxToken(element, 'syntax-number', number);
      index += number.length;
      plainStart = index;
      continue;
    }
    const identifierPattern = language === 'lisp' ? /^[A-Za-z_*+!?<>=/-][A-Za-z0-9_*+!?<>=/-]*/ : /^[A-Za-z_$][\w$]*/;
    const identifier = line.slice(index).match(identifierPattern)?.[0];
    if (identifier) {
      flushPlain(index);
      const next = line.slice(index + identifier.length).trimStart()[0];
      let className = '';
      if (lexicon.keywords.has(identifier)) {
        className = 'syntax-keyword';
        if (['def', 'func', 'fn', 'function', 'defun'].includes(identifier)) declaration = 'function';
        else if (['class', 'struct', 'type', 'interface', 'contract', 'enum'].includes(identifier)) declaration = 'type';
      } else if (lexicon.types.has(identifier) || (/^[A-Z]/.test(identifier) && next !== '(' && line.slice(0, index).trimEnd().slice(-1) !== '.')) {
        className = 'syntax-type';
        declaration = '';
      } else if (declaration) {
        className = `syntax-${declaration}`;
        declaration = '';
      } else if (next === '(' || (language === 'lisp' && line.slice(0, index).trimEnd().endsWith('('))) {
        className = 'syntax-function';
      }
      addSyntaxToken(element, className, identifier);
      index += identifier.length;
      plainStart = index;
      continue;
    }
    index++;
  }
  flushPlain(line.length);
  return { lexerState, masked: masked.join('') };
}

function applyBloomStyles(view) {
  const mapping = window.BLOOM_EXAMPLE_SCHEMAS?.[compareLanguageSelect.value] ?? {};
  const selectedCategories = viewCategories[view] ?? [];
  compareCode.querySelectorAll('[data-bloom-categories]').forEach(token => {
    token.style.cssText = '';
    const tokenCategories = token.dataset.bloomCategories.split(' ');
    const active = selectedCategories.filter(category => tokenCategories.includes(category));
    token.classList.toggle('bloom-unmatched', active.length === 0);
    for (const category of active) {
      const style = mapping[category]?.style;
      if (!style) continue;
      for (const property of ['color', 'backgroundColor', 'fontWeight', 'fontStyle', 'textDecoration']) {
        if (style[property] !== undefined) token.style[property] = String(style[property]);
      }
    }
  });
  compareCode.querySelectorAll('.bloom-token:not([data-bloom-categories])').forEach(token => token.classList.add('bloom-unmatched'));
}

function updateComparisonView(view) {
  const selectedCategories = viewCategories[view] ?? [];
  const matchingTokens = [...compareCode.querySelectorAll('[data-bloom-categories]')].filter(token =>
    token.dataset.bloomCategories.split(' ').some(category => selectedCategories.includes(category)));
  const showingHighlights = view !== 'plain' && matchingTokens.length > 0;
  compare.dataset.mode = showingHighlights ? 'bloom' : 'plain';
  compare.dataset.view = view;
  applyBloomStyles(showingHighlights ? view : 'plain');
  highlightButtons.forEach(button => {
    const selected = button.dataset.view === view;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  if (view === 'plain') {
    caption.textContent = 'Without Bloom, your editor’s syntax highlighting stays as usual.';
    hint.textContent = 'All code has equal visual weight';
  } else if (matchingTokens.length === 0) {
    caption.textContent = `This ${compareExamples[compareLanguageSelect.value].language} example has no ${viewNames[view].toLowerCase()} cue to highlight.`;
    hint.textContent = `No ${viewNames[view].toLowerCase()} cues in this example`;
  } else {
    caption.textContent = `${viewNames[view]} view applies Bloom’s language-specific categories to the matching code tokens.`;
    hint.textContent = `${viewNames[view]} highlights`;
  }
}

const compareFile = document.querySelector('#compare-file');
const compareLanguageLabel = document.querySelector('#compare-language');
const compareSource = document.querySelector('#compare-source');
function findBloomRanges(maskedSource, language) {
  const schema = window.BLOOM_EXAMPLE_SCHEMAS?.[language] ?? {};
  const ranges = [];
  for (const [category, mapping] of Object.entries(schema)) {
    const regex = new RegExp(mapping.regex, 'g');
    let match;
    while ((match = regex.exec(maskedSource)) !== null) {
      if (match[0].length) ranges.push({ start: match.index, end: match.index + match[0].length, category });
      else regex.lastIndex++;
    }
  }
  return ranges;
}

function applyBloomRangesToLine(code, line, lineStart, ranges) {
  const relevant = ranges.filter(range => range.end > lineStart && range.start < lineStart + line.length);
  const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  let cursor = 0;
  for (const node of textNodes) {
    const value = node.nodeValue ?? '';
    const nodeStart = cursor;
    const nodeEnd = cursor + value.length;
    cursor = nodeEnd;
    const boundaries = new Set([0, value.length]);
    for (const range of relevant) {
      const start = Math.max(nodeStart, range.start - lineStart) - nodeStart;
      const end = Math.min(nodeEnd, range.end - lineStart) - nodeStart;
      if (start < end) { boundaries.add(start); boundaries.add(end); }
    }
    const positions = [...boundaries].sort((left, right) => left - right);
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < positions.length - 1; index++) {
      const start = positions[index];
      const end = positions[index + 1];
      if (start === end) continue;
      const categories = relevant.filter(range => range.start - lineStart <= nodeStart + start && range.end - lineStart >= nodeStart + end).map(range => range.category);
      const text = value.slice(start, end);
      const token = document.createElement('span');
      token.className = 'bloom-token';
      if (categories.length) token.dataset.bloomCategories = [...new Set(categories)].join(' ');
      token.textContent = text;
      fragment.append(token);
    }
    node.parentNode?.replaceChild(fragment, node);
  }
}

function renderComparisonExample(language) {
  const example = compareExamples[language];
  const sourceText = window.BLOOM_EXAMPLE_SOURCES?.[language];
  if (typeof sourceText !== 'string') {
    console.error(`Bundled comparison source is missing for ${language}`);
    return;
  }
  const sourceLines = sourceText.replace(/\r\n?/g, '\n').split('\n');
  if (sourceLines.at(-1) === '') sourceLines.pop();
  const lexerState = { blockComment: false };
  const maskedLines = [];
  const codeRows = [];
  let lineStart = 0;
  compareCode.replaceChildren();
  sourceLines.forEach((text, index) => {
    const row = document.createElement('div');
    const number = document.createElement('small');
    number.textContent = String(index + 1);
    const code = document.createElement('code');
    const scanned = highlightSourceLine(code, text, language, lexerState);
    maskedLines.push(scanned.masked);
    row.append(number, code);
    compareCode.append(row);
    codeRows.push({ code, text, start: lineStart });
    lineStart += text.length + 1;
  });
  const bloomRanges = findBloomRanges(maskedLines.join('\n'), language);
  codeRows.forEach(({ code, text, start }) => applyBloomRangesToLine(code, text, start, bloomRanges));
  compareFile.textContent = example.file;
  compareLanguageLabel.textContent = `${example.language} · ${sourceLines.length} LINES`;
  compareSource.href = example.source;
  compareSource.textContent = `Explore ${example.language.toLowerCase()} example ↗`;
  compareCode.setAttribute('aria-label', `${example.language} task example with separate structural, interface, operational, and dangerous highlights`);
  updateComparisonView(compare.dataset.view || 'plain');
}
compareLanguageSelect.addEventListener('change', () => renderComparisonExample(compareLanguageSelect.value));
renderComparisonExample(compareLanguageSelect.value);

const slideContent = [
  {
    title: 'Start with the entry point.',
    copy: 'Structural cues show the import and function declaration. Interfaces brings the callable boundary into focus.',
    highlight: 1,
    focus: 'INTERFACES + STRUCTURAL'
  },
  {
    title: 'Trace the decision first.',
    copy: 'Operational view draws your eye to the confirmation guard and early return before execution continues.',
    highlight: 2,
    focus: 'OPERATIONAL'
  },
  {
    title: 'Review the operation.',
    copy: 'Dangerous marks execSync as a cue to inspect the command source and context. It does not determine whether the call is unsafe.',
    highlight: 3,
    focus: 'DANGEROUS · REVIEW CUE'
  }
];

let currentSlide = 0;
const slideButtons = [...document.querySelectorAll('.slide-tab, .slide-dots button')];
function showSlide(index) {
  currentSlide = Math.max(0, Math.min(slideContent.length - 1, index));
  const slide = slideContent[currentSlide];
  document.querySelector('#slide-number').textContent = `STEP 0${currentSlide + 1} · ${slide.focus}`;
  document.querySelector('#slide-title').textContent = slide.title;
  document.querySelector('#slide-copy').textContent = slide.copy;
  document.querySelectorAll('#slide-code > div').forEach((line, lineIndex) => line.classList.toggle('highlight-line', lineIndex === slide.highlight));
  slideButtons.forEach(button => {
    const active = Number(button.dataset.slide) === currentSlide;
    button.classList.toggle('active', active);
    if (button.hasAttribute('aria-selected')) button.setAttribute('aria-selected', String(active));
  });
  document.querySelector('#slide-prev').disabled = currentSlide === 0;
  document.querySelector('#slide-next').disabled = currentSlide === slideContent.length - 1;
}
slideButtons.forEach(button => button.addEventListener('click', () => showSlide(Number(button.dataset.slide))));
document.querySelector('#slide-prev').addEventListener('click', () => showSlide(currentSlide - 1));
document.querySelector('#slide-next').addEventListener('click', () => showSlide(currentSlide + 1));

const exampleSets = {
  frameworks: {
    image: 'assets/frameworks/react.png',
    alt: 'React complete code sample with Bloom category highlights in all four views',
    examples: [
      ['⚛', 'React counter', 'Hooks, JSX composition, and event handlers', '../samples/frameworks/Counter.tsx', 'react'],
      ['◈', 'Vue counter', 'Computed values, directives, and reactive state', '../samples/frameworks/Counter.vue', 'vue'],
      ['✳', 'Svelte counter', 'Runes, markup blocks, and events', '../samples/frameworks/Counter.svelte', 'svelte'],
      ['◉', 'Flutter counter', 'Widget composition, callbacks, and state', '../samples/frameworks/Counter.dart', 'flutter'],
      ['⌁', 'FastAPI tasks', 'Routes, guards, and a state update', '../samples/frameworks/fastapi/tasks.py', 'fastapi'],
      ['Ex', 'Express tasks', 'Route handlers, lookup guards, and writes', '../samples/frameworks/express/tasks.ts', 'express'],
      ['Ne', 'NestJS tasks', 'Controller routes, validation, and mutation', '../samples/frameworks/nest/tasks.controller.ts', 'nest'],
      ['An', 'Angular tasks', 'Component metadata, lifecycle, and state', '../samples/frameworks/angular/tasks.component.ts', 'angular'],
      ['Nx', 'Next.js tasks', 'Server data access and JSX output', '../samples/frameworks/next/app/tasks/page.tsx', 'next'],
      ['Nu', 'Nuxt tasks', 'Fetch actions and loading/error branches', '../samples/frameworks/nuxt/pages/tasks.vue', 'nuxt'],
      ['Sk', 'SvelteKit tasks', 'Server load handler and guarded parsing', '../samples/frameworks/sveltekit/src/routes/tasks/+page.server.ts', 'sveltekit'],
      ['As', 'Astro tasks', 'Frontmatter data and component markup', '../samples/frameworks/astro/src/pages/tasks.astro', 'astro']
    ]
  },
  languages: {
    image: 'assets/languages/python.png',
    alt: 'Python complete code sample with Bloom category highlights in all four views',
    examples: [
      ['Py', 'Python task queue', 'Guards, mutations, loops, and returns', '../samples/languages/task_queue.py'],
      ['Go', 'Go task queue', 'Slice updates, branching, and iteration', '../samples/languages/task_queue.go'],
      ['Rs', 'Rust task queue', 'Results, mutable borrowing, and early return', '../samples/languages/task_queue.rs'],
      ['Jv', 'Java task queue', 'Records, collections, and stream pipelines', '../samples/languages/TaskQueue.java'],
      ['C#', 'C# task queue', 'Records, guards, updates, and LINQ', '../samples/languages/TaskQueue.cs'],
      ['D', 'Dart / Flutter counter', 'Widgets, callbacks, state, and async reset', '../samples/frameworks/Counter.dart']
    ]
  }
};

const exampleImage = document.querySelector('#example-image');
const selectedSource = document.querySelector('#selected-source');
const pictureDialog = document.createElement('dialog');
pictureDialog.className = 'picture-dialog';
pictureDialog.id = 'picture-dialog';
pictureDialog.setAttribute('aria-label', 'Expanded code picture');
pictureDialog.innerHTML = '<div class="picture-dialog-header"><span class="picture-dialog-title"></span><button class="picture-dialog-close" type="button">Close picture</button></div><div class="picture-dialog-stage"><img alt=""></div>';
document.body.append(pictureDialog);
const pictureDialogTitle = pictureDialog.querySelector('.picture-dialog-title');
const pictureDialogImage = pictureDialog.querySelector('img');
function openPicture(image, title) {
  pictureDialogTitle.textContent = title;
  pictureDialogImage.src = image.currentSrc || image.src;
  pictureDialogImage.alt = image.alt;
  pictureDialog.showModal();
}
function addPictureExpandButton(image, title) {
  const toolbar = document.createElement('div');
  toolbar.className = 'example-picture-toolbar';
  const label = document.createElement('span');
  label.className = 'example-picture-title';
  label.textContent = title;
  const button = document.createElement('button');
  button.className = 'expand-picture';
  button.type = 'button';
  button.textContent = 'Expand picture';
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', pictureDialog.id);
  button.addEventListener('click', () => openPicture(image, label.textContent));
  toolbar.append(label, button);
  image.parentElement.insertBefore(toolbar, image);
  return label;
}
const pictureTitle = addPictureExpandButton(exampleImage, 'React complete code sample');
const pictureToolbar = pictureTitle.parentElement;
const examplePreview = document.querySelector('#example-preview');
const previewTitle = document.querySelector('#example-preview-title');
const openFrameworkButton = document.querySelector('#open-framework-example');
const openLanguageButton = document.querySelector('#open-language-example');
exampleImage.hidden = true;
pictureToolbar.hidden = true;
selectedSource.hidden = true;
function hideExamplePicture() {
  examplePreview.hidden = true;
}
function openExample(image, alt, title, source) {
  exampleImage.src = image;
  exampleImage.alt = alt;
  pictureTitle.textContent = `${title} complete code sample`;
  previewTitle.textContent = title;
  selectedSource.href = source;
  selectedSource.textContent = `Open complete ${title} source`;
  examplePreview.hidden = false;
  exampleImage.hidden = false;
  pictureToolbar.hidden = false;
  selectedSource.hidden = false;
  examplePreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
document.querySelectorAll('.views-shot img').forEach(image => {
  addPictureExpandButton(image, image.alt || 'Code picture');
});
pictureDialog.querySelector('.picture-dialog-close').addEventListener('click', () => pictureDialog.close());
pictureDialog.addEventListener('click', event => {
  if (event.target === pictureDialog) pictureDialog.close();
});
const frameworkOptions = document.querySelector('#framework-options');
const languageOptions = document.querySelector('#language-options');
const languageSearch = document.querySelector('#language-search');
let selectedLanguage = null;
let selectedFramework = null;
const languageDefinitions = [
  ['C', 'c'], ['C++', 'cpp'], ['C#', 'csharp'], ['Clojure', 'clojure'], ['CoffeeScript', 'coffeescript'],
  ['CUDA C++', 'cuda-cpp'], ['D', 'd'], ['Dart', 'dart'], ['Elixir', 'elixir'], ['Erlang', 'erlang'],
  ['F#', 'fsharp'], ['GLSL', 'glsl'], ['Go', 'go'], ['Groovy', 'groovy'], ['Haskell', 'haskell'],
  ['HLSL', 'hlsl'], ['Java', 'java'], ['JavaScript', 'javascript'], ['Julia', 'julia'], ['Kotlin', 'kotlin'],
  ['Lisp', 'lisp'], ['Lua', 'lua'], ['MATLAB', 'matlab'], ['Objective-C', 'objective-c'],
  ['Objective-C++', 'objective-cpp'], ['OCaml', 'ocaml'], ['Perl', 'perl'], ['PHP', 'php'],
  ['PowerShell', 'powershell'], ['Python', 'python'], ['R', 'r'], ['Ruby', 'ruby'], ['Rust', 'rust'],
  ['Scala', 'scala'], ['Scheme', 'scheme'], ['Shell Script', 'shellscript'], ['Solidity', 'solidity'],
  ['SQL', 'sql'], ['Swift', 'swift'], ['TypeScript', 'typescript'], ['Zig', 'zig']
];
const languageSamples = {
  cpp: ['C++ feature sample', '../samples/all-features/stress_test.cpp'],
  python: ['Python task queue', '../samples/languages/task_queue.py'],
  go: ['Go task queue', '../samples/languages/task_queue.go'],
  rust: ['Rust task queue', '../samples/languages/task_queue.rs'],
  java: ['Java task queue', '../samples/languages/TaskQueue.java'],
  csharp: ['C# task queue', '../samples/languages/TaskQueue.cs'],
  dart: ['Dart / Flutter counter', '../samples/frameworks/Counter.dart'],
  javascript: ['JavaScript feature sample', '../samples/all-features/stress_test.js'],
  typescript: ['TypeScript feature sample', '../samples/all-features/stress_test.ts'],
  c: ['C task queue', '../samples/languages/task_queue.c'],
  kotlin: ['Kotlin task queue', '../samples/languages/TaskQueue.kt'],
  swift: ['Swift task queue', '../samples/languages/TaskQueue.swift'],
  powershell: ['PowerShell task queue', '../samples/languages/task_queue.ps1'],
  julia: ['Julia task queue', '../samples/languages/task_queue.jl'],
  lua: ['Lua task queue', '../samples/languages/task_queue.lua'],
  sql: ['SQL task queue', '../samples/languages/task_queue.sql'],
  scala: ['Scala task queue', '../samples/languages/TaskQueue.scala'],
  elixir: ['Elixir task queue', '../samples/languages/task_queue.exs'],
  shellscript: ['Shell task queue', '../samples/languages/task_queue.sh'],
  clojure: ['Clojure task queue', '../samples/languages/task_queue.clj'],
  coffeescript: ['CoffeeScript task queue', '../samples/languages/task_queue.coffee'],
  d: ['D task queue', '../samples/languages/task_queue.d'],
  groovy: ['Groovy task queue', '../samples/languages/task_queue.groovy'],
  haskell: ['Haskell task queue', '../samples/languages/task_queue.hs'],
  perl: ['Perl task queue', '../samples/languages/task_queue.pl'],
  r: ['R task queue', '../samples/languages/task_queue.R'],
  php: ['PHP feature sample', '../samples/all-features/stress_test.php'],
  ruby: ['Ruby feature sample', '../samples/all-features/stress_test.rb'],
  'cuda-cpp': ['CUDA vector example', '../samples/languages/vector_add.cu'],
  'objective-c': ['Objective-C task queue', '../samples/languages/TaskQueue.m'],
  'objective-cpp': ['Objective-C++ task queue', '../samples/languages/TaskQueue.mm'],
  glsl: ['GLSL color shader', '../samples/languages/color.frag'],
  hlsl: ['HLSL color shader', '../samples/languages/color.hlsl'],
  zig: ['Zig task queue', '../samples/languages/task_queue.zig'],
  erlang: ['Erlang task queue', '../samples/languages/task_queue.erl'],
  fsharp: ['F# task queue', '../samples/languages/task_queue.fs'],
  lisp: ['Common Lisp task queue', '../samples/languages/task_queue.lisp'],
  scheme: ['Scheme task queue', '../samples/languages/task_queue.scm'],
  ocaml: ['OCaml task queue', '../samples/languages/task_queue.ml'],
  matlab: ['MATLAB task queue', '../samples/languages/task_queue.m'],
  solidity: ['Solidity task queue', '../samples/languages/TaskQueue.sol']
};
function languageArtwork(name, slug) {
  return `assets/languages/${slug}.png`;
}
function frameworkArtwork(name, slug) {
  return `assets/frameworks/${slug}.png`;
}
function selectLanguage(slug) {
  selectedLanguage = slug;
  hideExamplePicture();
  openLanguageButton.hidden = false;
  openLanguageButton.disabled = false;
  languageOptions.querySelectorAll('button').forEach(button => {
    const active = button.dataset.slug === slug;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}
function renderLanguages(filter = '') {
  const matches = languageDefinitions.filter(([name]) => name.toLowerCase().includes(filter.trim().toLowerCase()));
  languageOptions.innerHTML = matches.length
    ? matches.map(([name, slug]) => `<button type="button" role="option" aria-selected="${slug === selectedLanguage}" class="${slug === selectedLanguage ? 'active' : ''}" data-slug="${slug}">${name}</button>`).join('')
    : '<p class="language-empty-state">No languages match that search.</p>';
  languageOptions.querySelectorAll('button').forEach(button => button.addEventListener('click', () => selectLanguage(button.dataset.slug)));
  if (selectedLanguage && !matches.some(([, slug]) => slug === selectedLanguage)) {
    selectedLanguage = null;
    openLanguageButton.hidden = true;
    openLanguageButton.disabled = true;
    hideExamplePicture();
  }
}
function renderFrameworks() {
  const entries = exampleSets.frameworks.examples;
  frameworkOptions.innerHTML = entries.map(([, name, , , slug]) => `<button type="button" role="option" aria-selected="${slug === selectedFramework}" class="${slug === selectedFramework ? 'active' : ''}" data-framework="${slug}">${name.replace(/ (counter|tasks)$/i, '')}</button>`).join('');
  frameworkOptions.querySelectorAll('button').forEach(button => button.addEventListener('click', () => selectFramework(button.dataset.framework)));
}
function selectFramework(slug) {
  selectedFramework = slug;
  hideExamplePicture();
  openFrameworkButton.hidden = false;
  openFrameworkButton.disabled = false;
  frameworkOptions.querySelectorAll('button').forEach(button => {
    const active = button.dataset.framework === slug;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}
function openSelectedFramework() {
  const [, name, , href, slug] = exampleSets.frameworks.examples.find(entry => entry[4] === selectedFramework);
  openExample(frameworkArtwork(name, slug), `${name} complete code sample with syntax coloring and all four Bloom views`, name, href);
}
function openSelectedLanguage() {
  const [name, slug] = languageDefinitions.find(([, value]) => value === selectedLanguage);
  const sample = languageSamples[slug];
  if (!sample) throw new Error(`No complete source example is mapped for ${slug}`);
  openExample(languageArtwork(name, slug), `${name} complete code sample with syntax coloring and all four Bloom views`, name, sample[1]);
}
renderFrameworks();
renderLanguages();
languageSearch.addEventListener('input', () => renderLanguages(languageSearch.value));
openFrameworkButton.addEventListener('click', openSelectedFramework);
openLanguageButton.addEventListener('click', openSelectedLanguage);
