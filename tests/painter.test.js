const test = require('node:test');
const assert = require('node:assert/strict');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');
const { installMock } = require('./vscodeMock');
const mock = installMock();
const { BloomPainter, ViewMode } = require('../out/painter/styler');
const { UniversalLoader } = require('../out/core/loader');
const { getDepthAnalysis } = require('../out/core/depthTracker');
const schemas = require('../out/core/definitions.json');

test.beforeEach(() => {
    UniversalLoader.loadStatic(schemas);
    Object.assign(mock.settings, { enabled: true, speed: 0, frameworks: true, dimOpacity: 0.65, maxFileSize: 500000 });
    mock.vscode.window.visibleTextEditors = [];
    mock.messages.length = 0;
});

function painted(editor, color) {
    return [...editor.decorations].filter(([type]) => !color || type.options.color === color)
        .flatMap(([, ranges]) => ranges);
}
function textRanges(editor, color) {
    return painted(editor, color).map(range => editor.document.getText().slice(
        editor.document.offsetAt(range.start), editor.document.offsetAt(range.end)));
}

async function until(condition) {
    const deadline = Date.now() + 5000;
    while (!condition() && Date.now() < deadline) await delay(20);
    assert.ok(condition(), 'Editor update did not complete');
}

test('disabled and unsupported documents receive no highlights', () => {
    const painter = new BloomPainter();
    const editor = mock.editor(mock.document('let n = 1;'));
    painter.update(editor);
    assert.ok(painted(editor).length);
    mock.settings.enabled = false;
    painter.update(editor);
    assert.equal(painted(editor).length, 0);
    mock.settings.enabled = true;
    editor.document.languageId = 'markdown';
    painter.update(editor);
    assert.equal(painted(editor).length, 0);
    painter.dispose();
});

test('changing views refreshes both visible split editors', () => {
    const painter = new BloomPainter();
    const doc = mock.document('export class A\n{\n  method() { return; }\n}');
    const first = mock.editor(doc);
    const second = mock.editor(doc);
    painter.setMode(ViewMode.Operational);
    assert.ok(textRanges(first, '#34d399').includes('return'));
    painter.setMode(ViewMode.Structural);
    assert.deepEqual(textRanges(first, '#f472b6'), textRanges(second, '#f472b6'));
    assert.deepEqual(textRanges(first, '#f472b6'), ['export', 'class']);
    assert.deepEqual(textRanges(first, '#34d399'), []);
    painter.dispose();
});

test('schema reload recreates styles and removes categories without stale decorations', () => {
    const painter = new BloomPainter();
    const editor = mock.editor(mock.document('return;'));
    painter.update(editor);
    assert.deepEqual(textRanges(editor, '#34d399'), ['return']);
    UniversalLoader.loadStatic({ typescript: { logic: { regex: 'return', style: { color: '#123456' } } } });
    painter.update(editor);
    assert.deepEqual(textRanges(editor, '#34d399'), []);
    assert.deepEqual(textRanges(editor, '#123456'), ['return']);
    painter.dispose();
});

test('a zero-length lookahead cannot hang the renderer', () => {
    UniversalLoader.loadStatic({ typescript: { logic: { regex: '(?=x)', style: { color: '#123456' } } } });
    const painter = new BloomPainter();
    const editor = mock.editor(mock.document('xxx'));
    painter.update(editor);
    assert.deepEqual(textRanges(editor, '#123456'), []);
    painter.dispose();
});

test('delayed bloom is cancelled by disable and disposal', async () => {
    mock.settings.speed = 25;
    const painter = new BloomPainter();
    const editor = mock.editor(mock.document('return;'));
    painter.update(editor, true);
    assert.deepEqual(textRanges(editor, '#34d399'), []);
    mock.settings.enabled = false;
    painter.update(editor);
    await delay(45);
    assert.equal(painted(editor).length, 0);
    mock.settings.enabled = true;
    painter.update(editor, true);
    painter.dispose();
    const writes = editor.writes;
    await delay(45);
    assert.equal(editor.writes, writes);
});

test('speed controls view bloom and edited versions cannot receive stale ranges', async () => {
    mock.settings.speed = 20;
    const painter = new BloomPainter();
    const editor = mock.editor(mock.document('return;'));
    painter.update(editor, true);
    await delay(35);
    assert.deepEqual(textRanges(editor, '#34d399'), ['return']);
    painter.update(editor, true);
    const writes = editor.writes;
    editor.document.edit('const a = 1;');
    await delay(35);
    assert.equal(editor.writes, writes, 'An obsolete delayed frame must never write after an edit');
    painter.update(editor);
    assert.deepEqual(textRanges(editor, '#34d399'), []);
    painter.dispose();
});

test('large files skip rendering and normal files can recover', () => {
    const painter = new BloomPainter();
    const editor = mock.editor(mock.document('let a = 1;'.repeat(100)));
    mock.settings.maxFileSize = 100;
    painter.update(editor);
    assert.equal(painted(editor).length, 0);
    assert.equal(painter.status(editor), 'Bloom: Large file');
    editor.document.edit('let a = 1;');
    painter.update(editor);
    assert.ok(painted(editor).length);
    painter.dispose();
});

test('component decoration ranges do not reach same-line CSS or template prose', () => {
    for (const language of ['vue', 'svelte']) {
        const text = '<script>let n = 1;</script><style>.if { color: red }</style><p>throw</p>';
        const painter = new BloomPainter();
        const editor = mock.editor(mock.document(text, language));
        painter.update(editor);
        for (const range of painted(editor)) {
            const source = text.slice(editor.document.offsetAt(range.start), editor.document.offsetAt(range.end));
            assert.equal(source.includes('color'), false);
            assert.equal(source.includes('throw'), false);
        }
        painter.dispose();
    }
});

test('Structural does not highlight a class body when its declaration is outside the viewport', () => {
    const text = 'class A {\n' + '    field = 1;\n'.repeat(200) + '}';
    const painter = new BloomPainter();
    const editor = mock.editor(mock.document(text));
    editor.visibleRanges = [new mock.vscode.Range(new mock.vscode.Position(80, 0), new mock.vscode.Position(90, 0))];
    painter.setMode(ViewMode.Structural);
    const ranges = painted(editor, '#f472b6');
    assert.deepEqual(ranges, []);
    const dimmed = [...editor.decorations].filter(([type]) => type.options.opacity === '0.65').flatMap(([, spans]) => spans);
    assert.ok(dimmed.length);
    assert.ok(dimmed.every(range => range.start.line >= 60 && range.end.line <= 110));
    painter.dispose();
});

test('Structural and Interfaces highlight tokens without expanding into Dart, Python or TS bodies', () => {
    for (const [language, text, structural, interfaces] of [
        ['dart', 'class Counter {\n  final int value = 1;\n  void run() { return; }\n}', ['class'], ['run']],
        ['python', 'class Counter:\n    def run(self):\n        return 1', ['class'], ['def', 'run']],
        ['typescript', 'class Counter {\n  run() { return; }\n}\ninterface Contract {\n  value: number;\n}', ['class'], ['interface', 'run']]
    ]) {
        const painter = new BloomPainter();
        const editor = mock.editor(mock.document(text, language));
        painter.setMode(ViewMode.Structural);
        assert.deepEqual(textRanges(editor, '#f472b6'), structural, language);
        const washes = [...editor.decorations].filter(([type]) => type.options.backgroundColor?.startsWith('hsla('));
        assert.ok(washes.every(([, ranges]) => ranges.length === 0), language);
        painter.setMode(ViewMode.Interfaces);
        assert.deepEqual(textRanges(editor, '#fbbf24'), interfaces, language);
        painter.dispose();
    }
});

test('scope layers recognize Python nesting and ignore literal/comment braces', () => {
    const python = mock.document('def f():\n    if True:\n        return 1\nother = 2', 'python');
    const layers = getDepthAnalysis(python).layers;
    assert.ok(layers[2].some(range => range.start.line === 2));
    assert.ok(layers[0].some(range => range.start.line === 3));
    const js = mock.document('const s = "{";\n// }\nlet n = 1;');
    assert.equal(getDepthAnalysis(js).layers[1].length, 0);
});

test('extension activates Dart, repaints both editors, reacts to settings and disposes pending updates', async t => {
    const { activate } = require('../out/extension');
    const doc = mock.document('return;', 'dart');
    const first = mock.editor(doc);
    const second = mock.editor(doc);
    const context = { extensionPath: path.resolve(__dirname, '..'), extensionMode: 1, subscriptions: [],
        workspaceState: { get: (name, fallback) => fallback, update: async () => {} } };
    t.after(() => context.subscriptions.forEach(subscription => subscription.dispose()));
    activate(context);
    const provider = mock.providers.get('bloom.tree');
    const controls = provider.getChildren(provider.getChildren()[0]);
    assert.deepEqual(controls.slice(0, 3).map(item => item.command.command),
        ['bloom.viewOperational', 'bloom.viewInterfaces', 'bloom.viewStructural']);
    assert.ok(controls.filter(item => item.command).every(item => mock.commands.has(item.command.command)));
    await until(() => textRanges(first, '#34d399').includes('return'));
    assert.deepEqual(textRanges(first, '#34d399'), ['return']);
    doc.edit('throw new Error();');
    mock.events.change({ document: doc });
    await until(() => textRanges(first, '#ff0055').includes('throw') && textRanges(second, '#ff0055').includes('throw'));
    assert.deepEqual(textRanges(first, '#ff0055'), ['throw', 'Error']);
    assert.deepEqual(textRanges(second, '#ff0055'), ['throw', 'Error']);
    mock.settings.enabled = false;
    mock.events.config({ affectsConfiguration: () => true });
    assert.equal(painted(first).length, 0);
    assert.equal(painted(second).length, 0);
    mock.settings.enabled = true;
    mock.events.change({ document: doc });
    context.subscriptions.forEach(subscription => subscription.dispose());
    assert.equal(mock.providers.has('bloom.controls'), false);
    const writes = first.writes + second.writes;
    await delay(75);
    assert.equal(first.writes + second.writes, writes);
    assert.deepEqual(mock.messages, []);
});


test('unchanged viewport repaints do not clear highlights or write duplicate decorations', () => {
    const painter = new BloomPainter();
    const editor = mock.editor(mock.document('if (ready) { return; }'));
    painter.update(editor);
    const writes = editor.writes;
    const types = mock.types.length;
    painter.update(editor);
    assert.equal(editor.writes, writes);
    assert.equal(mock.types.length, types);
    assert.ok(textRanges(editor, '#34d399').includes('return'));
    painter.dispose();
});

test('delayed view replacement retains the previous frame and clears obsolete categories only at commit', async () => {
    mock.settings.speed = 25;
    const painter = new BloomPainter();
    const editor = mock.editor(mock.document('class A { run() { return; } }'));
    painter.update(editor);
    painter.setMode(ViewMode.Structural, false);
    const retained = textRanges(editor, '#34d399');
    painter.update(editor, true);
    assert.deepEqual(textRanges(editor, '#34d399'), retained);
    assert.ok(retained.includes('return'));
    await delay(45);
    assert.deepEqual(textRanges(editor, '#34d399'), []);
    assert.deepEqual(textRanges(editor, '#f472b6'), ['class']);
    painter.dispose();
});

test('scope styles are reused on repeated view switches', () => {
    const painter = new BloomPainter();
    mock.editor(mock.document('class A { run() { return; } }'));
    painter.setMode(ViewMode.Structural);
    painter.setMode(ViewMode.Operational);
    const count = mock.types.length;
    painter.setMode(ViewMode.Structural);
    painter.setMode(ViewMode.Operational);
    assert.equal(mock.types.length, count);
    painter.dispose();
});


test('changing dimming replaces the old layer and disabling a category removes its highlights', () => {
    const painter = new BloomPainter();
    const editor = mock.editor(mock.document('return;'));
    painter.update(editor);
    mock.settings.dimOpacity = 0.8;
    mock.settings.languageSettings = { typescript: { categories: { guards: false } } };
    painter.update(editor);
    assert.deepEqual(textRanges(editor, '#34d399'), []);
    const opacityRanges = opacity => [...editor.decorations].filter(([type]) => type.options.opacity === opacity)
        .flatMap(([, ranges]) => ranges);
    assert.deepEqual(opacityRanges('0.65'), []);
    assert.ok(opacityRanges('0.8').length);
    delete mock.settings.languageSettings;
    painter.dispose();
});
