const Module = require('node:module');

function installMock() {
    const settings = { enabled: true, speed: 0, frameworks: true, dimOpacity: 0.65, maxFileSize: 500000 };
    const editors = [];
    const types = [];
    const commands = new Map();
    const providers = new Map();
    const overrides = {};
    const settingWrites = [];
    const events = {};
    const messages = [];
    function event(name) {
        const listeners = new Set();
        events[name] = value => [...listeners].forEach(listener => listener(value));
        return listener => { listeners.add(listener); return { dispose: () => listeners.delete(listener) }; };
    }
    class Position {
        constructor(line, character) { this.line = line; this.character = character; }
    }
    class Range {
        constructor(start, end) { this.start = start; this.end = end; }
    }
    const vscode = {
        EventEmitter: class {
            constructor() { this.listeners = new Set(); this.event = listener => { this.listeners.add(listener); return { dispose: () => this.listeners.delete(listener) }; }; }
            fire(value) { this.listeners.forEach(listener => listener(value)); }
            dispose() { this.listeners.clear(); }
        },
        ThemeIcon: class { constructor(id, color) { this.id = id; this.color = color; } },
        ThemeColor: class { constructor(id) { this.id = id; } },
        TreeItem: class { constructor(label, collapsibleState) { this.label = label; this.collapsibleState = collapsibleState; } },
        Position, Range,
        DecorationRangeBehavior: { ClosedClosed: 1 },
        ExtensionMode: { Development: 2, Production: 1 },
        ConfigurationTarget: { Workspace: 2, Global: 1, WorkspaceFolder: 3 },
        StatusBarAlignment: { Right: 2 },
        TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
        commands: {
            registerCommand(name, callback) { commands.set(name, callback); return { dispose: () => commands.delete(name) }; },
            async executeCommand(name, ...args) { return commands.get(name)?.(...args); }
        },
        window: {
            registerTreeDataProvider(id, provider) { providers.set(id, provider); return { dispose() { providers.delete(id); } }; },
            registerWebviewViewProvider(id, provider) { providers.set(id, provider); return { dispose() { providers.delete(id); } }; },
            registerWebviewViewProvider(id, provider) { providers.set(id, provider); return { dispose() { providers.delete(id); } }; },
            visibleTextEditors: [],
            activeTextEditor: undefined,
            createTextEditorDecorationType(options) {
                const type = { options, disposed: false, dispose() {
                    this.disposed = true;
                    editors.forEach(editor => editor.decorations.delete(this));
                } };
                types.push(type);
                return type;
            },
            createStatusBarItem() { return { text: '', show() {}, hide() {}, dispose() {} }; },
            showQuickPick: async () => undefined,
            createOutputChannel() { return { appendLine: message => messages.push(message), dispose() {} }; },
            showErrorMessage: message => messages.push(message),
            onDidChangeActiveTextEditor: event('active'),
            onDidChangeVisibleTextEditors: event('visible'),
            onDidChangeTextEditorVisibleRanges: event('viewport'),
        },
        workspace: {
            workspaceFolders: [],
            getConfiguration: () => ({
                get: (name, fallback) => settings[name] ?? fallback,
                inspect: name => overrides[name] ?? {},
                update: async (name, value, target) => { settingWrites.push({ name, value, target }); settings[name] = value; events.config({ affectsConfiguration: () => true }); }
            }),
            onDidChangeTextDocument: event('change'),
            onDidChangeConfiguration: event('config'),
        }
    };
    const original = Module._load;
    Module._load = function(name, ...args) { return name === 'vscode' ? vscode : original.call(this, name, ...args); };
    function document(text, languageId = 'typescript') {
        let content = text;
        let lines;
        let starts;
        const indexLines = () => {
            lines = content.split('\n');
            let offset = 0;
            starts = lines.map(line => { const start = offset; offset += line.length + 1; return start; });
        };
        indexLines();
        const doc = {
            languageId, version: 1, isClosed: false, fileName: '/sample.' + languageId, uri: { path: '/sample.' + languageId },
            getText: () => content,
            get lineCount() { return lines.length; },
            positionAt(offset) {
                offset = Math.max(0, Math.min(content.length, offset));
                let low = 0;
                let high = starts.length;
                while (low + 1 < high) {
                    const mid = (low + high) >>> 1;
                    if (starts[mid] <= offset) low = mid; else high = mid;
                }
                return new Position(low, offset - starts[low]);
            },
            offsetAt(position) { return starts[position.line] + position.character; },
            lineAt(line) { return { text: lines[line], range: new Range(new Position(line, 0), new Position(line, lines[line].length)) }; },
            edit(value) { content = value; indexLines(); this.version++; }
        };
        return doc;
    }
    function editor(doc) {
        const instance = { document: doc, visibleRanges: [], decorations: new Map(), writes: 0,
            setDecorations(type, ranges) {
                if (type.disposed) throw new Error('Writing a disposed decoration');
                this.writes++;
                this.decorations.set(type, ranges);
            }
        };
        editors.push(instance);
        vscode.window.visibleTextEditors.push(instance);
        vscode.window.activeTextEditor = instance;
        return instance;
    }
    return { vscode, settings, types, commands, providers, overrides, settingWrites, events, messages, document, editor };
}

module.exports = { installMock };
