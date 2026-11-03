const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { installMock } = require('./vscodeMock');
const mock = installMock();
const { UniversalLoader } = require('../out/core/loader');
const schemas = require('../out/core/definitions.json');
const { registerSidebar } = require('../out/sidebar');

function section(id) {
    const provider = mock.providers.get('bloom.tree');
    const root = provider.getChildren();
    const heading = root.find(row => row.id === 'bloom.highlighting');
    assert.ok(heading, 'Section must be inside the existing Code Views panel');
    assert.equal(heading.collapsibleState, mock.vscode.TreeItemCollapsibleState.Expanded);
    return { getChildren: () => provider.getChildren(heading).filter(row => id === 'bloom.colors' ? row.contextValue : id === 'bloom.legend' ? !row.command : true), onDidChangeTreeData: provider.onDidChangeTreeData };
}

test.beforeEach(() => {
    UniversalLoader.loadStatic(schemas);
    Object.assign(mock.settings, { enabled: true, speed: 300, dimOpacity: 0.65, maxFileSize: 500000 });
    mock.vscode.window.visibleTextEditors = [];
    mock.vscode.window.activeTextEditor = undefined;
    mock.vscode.workspace.workspaceFolders = [];
    mock.vscode.window.showQuickPick = async () => undefined;
    Object.keys(mock.overrides).forEach(key => delete mock.overrides[key]);
    mock.settingWrites.length = 0;
});

test('guide follows language, view, unsupported files, disable, size limits and refresh events', t => {
    let state = { mode: 'structural', categories: ['alert', 'structural', 'anchor', 'internal'] };
    const sidebar = registerSidebar(() => state);
    t.after(() => sidebar.dispose());
    const guide = section('bloom.legend');
    let updates = 0;
    guide.onDidChangeTreeData(() => updates++);
    assert.match(guide.getChildren()[0].label, /Open a code file/);
    const editor = mock.editor(mock.document('class Counter {}', 'dart'));
    let rows = guide.getChildren();
    assert.equal(rows[0].label, 'dart');
    assert.equal(rows.find(row => row.label === 'Active view').description, 'Structural');
    assert.match(rows.find(row => row.label === 'Stable values').tooltip, /final/);
    assert.match(rows.find(row => row.label === 'Declarations and modules').tooltip, /mixin/);
    assert.equal(rows.find(row => row.label === 'Declarations and modules').description.startsWith('Active'), true);
    assert.equal(rows.find(row => row.label === 'Writes and state changes').description.startsWith('On'), true);
    const categories = section('bloom.colors').getChildren();
    assert.equal(categories.find(row => row.contextValue === 'functions').iconPath.id, 'symbol-method');
    assert.ok(categories.every(row => row.iconPath?.id));
    state = { mode: 'interfaces', categories: ['alert', 'interface', 'native', 'prototype'] };
    editor.document.languageId = 'python';
    sidebar.refresh();
    rows = guide.getChildren();
    assert.equal(updates, 1);
    assert.match(rows.find(row => row.label === 'Contracts and functions').tooltip, /def/);
    assert.match(rows.find(row => row.label === 'Built-in types and APIs').tooltip, /list/);
    editor.document.languageId = 'rust';
    assert.equal(guide.getChildren()[0].description, 'Dedicated patterns');
    mock.settings.enabled = false;
    assert.equal(guide.getChildren().find(row => row.label === 'Highlighting').description, 'Off');
    mock.settings.enabled = true;
    mock.settings.maxFileSize = 1;
    assert.equal(guide.getChildren().find(row => row.label === 'Highlighting').description, 'Paused for large file');
    editor.document.languageId = 'markdown';
    assert.equal(guide.getChildren()[0].description, 'No Bloom highlighting');
    editor.document.languageId = 'python';
    UniversalLoader.loadStatic({ python: { interface: { regex: 'def', style: { color: '#123456' } } } });
    rows = guide.getChildren();
    const custom = rows.find(row => row.label === 'Contracts and functions');
    assert.equal(custom.iconPath.id, 'symbol-interface');
    assert.match(custom.tooltip, /#123456/);
    assert.equal(rows.some(row => row.label === 'Built-in types and APIs'), false);
    sidebar.dispose();
    assert.equal(mock.providers.has('bloom.controls'), false);
});

test('adjustments change real settings, restore delay, respect folder scope and handle cancellation', async t => {
    const { activate } = require('../out/extension');
    const state = new Map();
    const context = { extensionPath: path.resolve(__dirname, '..'), extensionMode: 1, subscriptions: [],
        workspaceState: { get: (name, fallback) => state.get(name) ?? fallback, update: async (name, value) => state.set(name, value) } };
    mock.editor(mock.document('class Counter {}', 'dart'));
    activate(context);
    t.after(() => context.subscriptions.forEach(item => item.dispose()));
    const adjustments = section('bloom.adjustments');
    assert.equal(adjustments.getChildren().find(row => row.label === 'Dimming').description, '65% opacity');
    mock.vscode.window.showQuickPick = async items => items.find(item => item.value === 0.8);
    mock.vscode.workspace.workspaceFolders = [{}];
    mock.overrides.dimOpacity = { workspaceFolderValue: 0.65 };
    await mock.commands.get('bloom.adjustDimming')();
    assert.equal(mock.settings.dimOpacity, 0.8);
    assert.equal(adjustments.getChildren().find(row => row.label === 'Dimming').description, '80% opacity');
    assert.equal(mock.settingWrites.at(-1).target, mock.vscode.ConfigurationTarget.WorkspaceFolder);
    mock.vscode.window.showQuickPick = async () => undefined;
    const writes = mock.settingWrites.length;
    await mock.commands.get('bloom.adjustDimming')();
    assert.equal(mock.settingWrites.length, writes);
    mock.settings.speed = 450;
    await mock.commands.get('bloom.toggleInstant')();
    assert.equal(mock.settings.speed, 0);
    assert.equal(adjustments.getChildren().find(row => row.label === 'Instant switching').description, 'On');
    await mock.commands.get('bloom.toggleInstant')();
    assert.equal(mock.settings.speed, 450);
    assert.match(adjustments.getChildren().find(row => row.label === 'Instant switching').description, /^Off .*450 ms$/);
    assert.equal(mock.settingWrites.at(-1).target, mock.vscode.ConfigurationTarget.Workspace);
    mock.vscode.workspace.workspaceFolders = [];
    await mock.commands.get('bloom.toggleInstant')();
    assert.equal(mock.settingWrites.at(-1).target, mock.vscode.ConfigurationTarget.Global);
    await mock.commands.get('bloom.viewOperational')();
    assert.equal(section('bloom.legend').getChildren().find(row => row.label === 'Active view').description, 'Operational');
    assert.deepEqual(require('../package.json').contributes.views.bloom.map(view => view.id), ['bloom.controls', 'bloom.tree']);
    assert.ok(mock.commands.has('bloom.showSidebar'));
});


test('all highlighting controls share one expanded section with category actions', t => {
    mock.editor(mock.document('return;', 'dart'));
    const sidebar = registerSidebar(() => ({ mode: 'operational', categories: ['alert', 'logic', 'guards', 'mutation'] }));
    t.after(() => sidebar.dispose());
    const provider = mock.providers.get('bloom.tree');
    const root = provider.getChildren();
    assert.deepEqual(root.map(row => row.label), ['Code Highlighting']);
    const rows = provider.getChildren(root[0]);
    for (const label of ['Operational', 'Interfaces', 'Structural', 'Dangerous', 'Toggle highlighting',
        'This language', 'Dimming', 'Instant switching', 'Strong danger focus', 'Active view']) {
        assert.ok(rows.some(row => row.label === label), label);
    }
    const category = rows.find(row => row.contextValue === 'guards');
    assert.deepEqual(provider.getChildren(category).filter(row => row.command).map(row => row.command.command),
        ['bloom.toggleCategory', 'bloom.chooseColor']);
});

test('main highlighting toggle updates the effective folder override', async t => {
    const { activate } = require('../out/extension');
    const context = { extensionPath: path.resolve(__dirname, '..'), extensionMode: 1, subscriptions: [],
        workspaceState: { get: (_name, fallback) => fallback, update: async () => {} } };
    mock.editor(mock.document('return;', 'dart'));
    mock.vscode.workspace.workspaceFolders = [{}];
    mock.overrides.enabled = { workspaceFolderValue: true };
    activate(context);
    t.after(() => context.subscriptions.forEach(item => item.dispose()));
    await mock.commands.get('bloom.toggle')();
    assert.equal(mock.settingWrites.at(-1).target, mock.vscode.ConfigurationTarget.WorkspaceFolder);
    assert.equal(mock.settingWrites.at(-1).value, false);
    delete mock.overrides.enabled;
    await mock.commands.get('bloom.toggle')();
    assert.equal(mock.settingWrites.at(-1).target, mock.vscode.ConfigurationTarget.Workspace);
    mock.vscode.workspace.workspaceFolders = [];
    await mock.commands.get('bloom.toggle')();
    assert.equal(mock.settingWrites.at(-1).target, mock.vscode.ConfigurationTarget.Global);
});
