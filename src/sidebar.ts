import * as vscode from 'vscode';
import { UniversalLoader } from './core/loader';
import type { OperationalKey } from './core/schemaParser';
import { highlightingEnabled, preferencesFor, categoryEnabled, categoryColor } from './preferences';

interface SidebarState { mode: string; categories: OperationalKey[] }
interface SidebarCategory {
    key: OperationalKey;
    label: string;
    examples: string;
    enabled: boolean;
    active: boolean;
    color: string;
}
interface SidebarViewState {
    mode: string;
    language: string;
    languageDescription: string;
    supported: boolean;
    enabled: boolean;
    languageEnabled: boolean;
    paused: boolean;
    dimOpacity: number;
    speed: number;
    dangerousEmphasis: boolean;
    frameworks: boolean;
    categories: SidebarCategory[];
}

const meanings: Record<OperationalKey, string> = {
    alert: 'Errors and warnings', logic: 'Conditions and derived values', mutation: 'Writes and state changes',
    guards: 'Flow and lifecycle', interface: 'Contracts and functions', native: 'Built-in types and APIs',
    prototype: 'Inheritance and special methods', structural: 'Declarations and modules',
    anchor: 'Stable values', internal: 'Private identifiers', danger: 'Potentially risky operations', functions: 'Functions and calls'
};

const viewButtons = [
    { id: 'operational', label: 'Operational', command: 'bloom.viewOperational', description: 'Decisions, flow and writes' },
    { id: 'interfaces', label: 'Interfaces', command: 'bloom.viewInterfaces', description: 'Calls and composition' },
    { id: 'structural', label: 'Structural', command: 'bloom.viewStructural', description: 'Declarations and scopes' },
    { id: 'dangerous', label: 'Dangerous', command: 'bloom.viewDangerous', description: 'Potentially risky operations' }
];

const sidebarCommands = new Set([
    'bloom.reloadDefinitions', 'bloom.toggle', 'bloom.toggleLanguage', 'bloom.adjustDimming',
    'bloom.toggleInstant', 'bloom.toggleDangerFocus', 'bloom.toggleFrameworks', ...viewButtons.map(button => button.command)
]);

/** A compact webview panel with primary view buttons and grouped manual controls. */
export function registerSidebar(getState: () => SidebarState): vscode.Disposable & { refresh(): void } {
    let currentView: vscode.WebviewView | undefined;
    const disposables: vscode.Disposable[] = [];

    const configuration = () => vscode.workspace.getConfiguration('bloom', vscode.window.activeTextEditor?.document.uri);
    const readState = (): SidebarViewState => {
        const editor = vscode.window.activeTextEditor;
        const document = editor?.document;
        const schema = document && UniversalLoader.getSchema(document.languageId);
        const preferences = document ? preferencesFor(document) : undefined;
        const config = configuration();
        const supported = !!schema && !!document;
        const categories = supported && schema && document ? Object.entries(schema.mapping).map(([key, entry]) => ({
            key: key as OperationalKey,
            label: meanings[key as OperationalKey],
            examples: entry?.examples?.slice(0, 3).join(', ') ?? 'Custom pattern',
            enabled: categoryEnabled(document, key as OperationalKey),
            active: categoryEnabled(document, key as OperationalKey) && getState().categories.includes(key as OperationalKey),
            color: String(categoryColor(document, key as OperationalKey) ?? entry?.style.color ?? '')
        })) : [];

        return {
            mode: getState().mode,
            language: document?.languageId ?? '',
            languageDescription: !document ? 'Open a code file to begin' : !schema ? 'No Bloom patterns for this language' :
                schema.id === 'generic' ? 'Baseline patterns' : 'Dedicated patterns',
            supported,
            enabled: !!document && highlightingEnabled(document),
            languageEnabled: !!document && preferences?.enabled !== false,
            paused: !!document && document.getText().length > config.get('maxFileSize', 500000),
            dimOpacity: config.get('dimOpacity', 0.65),
            speed: config.get<number>('speed', 0),
            dangerousEmphasis: preferences?.dangerousEmphasis === true,
            frameworks: config.get('frameworks', true),
            categories
        };
    };

    const refresh = () => {
        if (currentView) void currentView.webview.postMessage({ type: 'state', state: readState() });
    };

    const html = (webview: vscode.Webview): string => {
        const nonce = [...Array(32)].map(() => Math.random().toString(36).slice(2)).join('').slice(0, 32);
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
    :root { color-scheme: light dark; }
    body { padding: 12px; color: var(--vscode-foreground); font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
    h2 { margin: 0 0 10px; font-size: 1.05em; font-weight: 600; }
    p { margin: 0; }
    .description { color: var(--vscode-descriptionForeground); font-size: 0.92em; line-height: 1.4; }
    .view-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    button { color: var(--vscode-button-foreground); background: var(--vscode-button-secondaryBackground); border: 1px solid var(--vscode-panel-border, transparent); border-radius: 4px; font: inherit; cursor: pointer; }
    button:hover { background: var(--vscode-button-secondaryHoverBackground); }
    button:focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: 1px; }
    button:disabled { opacity: 0.55; cursor: default; }
    .view-button { min-height: 56px; padding: 8px 10px; text-align: left; }
    .view-button[aria-pressed="true"] { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border-color: var(--vscode-focusBorder); }
    .view-name { display: block; font-weight: 600; }
    .view-description { display: block; margin-top: 3px; color: var(--vscode-descriptionForeground); font-size: 0.84em; line-height: 1.25; }
    .view-button[aria-pressed="true"] .view-description { color: var(--vscode-button-foreground); opacity: 0.85; }
    hr { height: 1px; margin: 16px 0; border: 0; background: var(--vscode-panel-border, var(--vscode-widget-border)); }
    .status { margin-top: 12px; padding: 8px 10px; border-radius: 4px; background: var(--vscode-textBlockQuote-background); }
    .status strong { display: block; margin-bottom: 2px; font-size: 0.95em; }
    .status .paused { color: var(--vscode-editorWarning-foreground); }
    .setting-list { display: grid; gap: 7px; }
    .setting { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 9px; text-align: left; width: 100%; }
    .setting-copy { min-width: 0; }
    .setting-title { display: block; font-weight: 500; }
    .setting-description { display: block; margin-top: 2px; color: var(--vscode-descriptionForeground); font-size: 0.86em; overflow-wrap: anywhere; }
    .setting-state { flex: 0 0 auto; color: var(--vscode-descriptionForeground); font-size: 0.88em; }
    details { margin-top: 13px; }
    summary { cursor: pointer; user-select: none; font-weight: 600; }
    .category-list { display: grid; gap: 5px; margin-top: 9px; }
    .category { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 6px; }
    .category-toggle, .color-button { min-height: 30px; padding: 4px 7px; }
    .category-toggle { width: 100%; display: flex; justify-content: space-between; gap: 8px; text-align: left; }
    .category-name { overflow-wrap: anywhere; }
    .category-state { color: var(--vscode-descriptionForeground); }
    .category-active .category-name { color: var(--vscode-foreground); }
    .swatch { display: inline-block; width: 10px; height: 10px; margin-right: 5px; border: 1px solid var(--vscode-panel-border); border-radius: 50%; vertical-align: -1px; }
    .empty { margin-top: 8px; color: var(--vscode-descriptionForeground); }
</style>
</head>
<body>
    <section aria-labelledby="views-heading">
        <h2 id="views-heading">Highlight view</h2>
        <div class="view-grid">
            ${viewButtons.map(button => `<button class="view-button" type="button" data-view="${button.id}" data-command="${button.command}" aria-pressed="false"><span class="view-name">${button.label}</span><span class="view-description">${button.description}</span></button>`).join('')}
        </div>
        <div class="status" role="status" aria-live="polite"><strong id="language"></strong><span id="language-description" class="description"></span><p id="highlight-status" class="description"></p></div>
    </section>
    <hr>
    <section aria-labelledby="adjustments-heading">
        <h2 id="adjustments-heading">Adjustments</h2>
        <div class="setting-list">
            <button class="setting" type="button" data-command="bloom.reloadDefinitions"><span class="setting-copy"><span class="setting-title">Reload definitions</span><span class="setting-description">Apply updated language rules</span></span><span class="setting-state">Reload</span></button>
            <button id="language-toggle" class="setting" type="button" data-command="bloom.toggleLanguage"><span class="setting-copy"><span class="setting-title">This language</span><span id="language-toggle-description" class="setting-description"></span></span><span id="language-toggle-state" class="setting-state"></span></button>
            <button id="highlight-toggle" class="setting" type="button" data-command="bloom.toggle"><span class="setting-copy"><span class="setting-title">Highlighting</span><span class="setting-description">Turn Bloom on or off</span></span><span id="highlight-toggle-state" class="setting-state"></span></button>
            <button id="dimming-setting" class="setting" type="button" data-command="bloom.adjustDimming"><span class="setting-copy"><span class="setting-title">Dimming</span><span class="setting-description">Readability outside active highlights</span></span><span id="dimming-state" class="setting-state"></span></button>
            <button id="timing-setting" class="setting" type="button" data-command="bloom.toggleInstant"><span class="setting-copy"><span class="setting-title">Timing</span><span class="setting-description">Delay when switching views</span></span><span id="timing-state" class="setting-state"></span></button>
            <button id="framework-setting" class="setting" type="button" data-command="bloom.toggleFrameworks"><span class="setting-copy"><span class="setting-title">Framework cues</span><span class="setting-description">Recognize supported framework syntax</span></span><span id="framework-state" class="setting-state"></span></button>
            <button id="danger-setting" class="setting" type="button" data-command="bloom.toggleDangerFocus"><span class="setting-copy"><span class="setting-title">Strong danger focus</span><span class="setting-description">Emphasize risky-operation cues</span></span><span id="danger-state" class="setting-state"></span></button>
        </div>
    </section>
    <hr>
    <section aria-labelledby="categories-heading">
        <h2 id="categories-heading">Manual categories</h2>
        <p class="description">Change category switches and colors for this language.</p>
        <details id="category-details">
            <summary id="category-summary">Categories</summary>
            <div id="category-list" class="category-list"></div>
        </details>
    </section>
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const byId = id => document.getElementById(id);
        const sendCommand = command => vscode.postMessage({ type: 'command', command });
        document.addEventListener('click', event => {
            const button = event.target.closest('button');
            if (!button || button.disabled) return;
            if (button.dataset.category && button.dataset.language) {
                vscode.postMessage({ type: 'toggleCategory', language: button.dataset.language, key: button.dataset.category });
            } else if (button.dataset.color && button.dataset.language) {
                vscode.postMessage({ type: 'chooseColor', language: button.dataset.language, key: button.dataset.color });
            } else if (button.dataset.command) {
                sendCommand(button.dataset.command);
            }
        });
        function render(state) {
            document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === state.mode)));
            byId('language').textContent = state.language || 'Bloom';
            byId('language-description').textContent = state.languageDescription;
            const status = byId('highlight-status');
            status.textContent = !state.supported ? '' : state.paused ? 'Paused for large file' : state.enabled ? 'Highlighting on' : 'Highlighting off';
            status.className = state.paused ? 'description paused' : 'description';

            byId('language-toggle-description').textContent = state.supported ? 'Enable or disable Bloom for this language' : 'Open a supported code file';
            byId('language-toggle-state').textContent = state.supported ? (state.languageEnabled ? 'On' : 'Off') : '';
            byId('highlight-toggle-state').textContent = state.supported ? (state.enabled ? 'On' : 'Off') : '';
            byId('dimming-state').textContent = Math.round(state.dimOpacity * 100) + '%';
            byId('timing-state').textContent = state.speed === 0 ? 'Instant' : state.speed + ' ms';
            byId('framework-state').textContent = state.frameworks ? 'On' : 'Off';
            byId('danger-state').textContent = state.dangerousEmphasis ? 'On' : 'Off';
            ['language-toggle', 'highlight-toggle', 'danger-setting'].forEach(id => { byId(id).disabled = !state.supported; });

            const summary = byId('category-summary');
            summary.textContent = state.supported ? 'Categories and colors' : 'Categories unavailable';
            const list = byId('category-list');
            list.replaceChildren();
            if (!state.supported || !state.categories.length) {
                const empty = document.createElement('p');
                empty.className = 'empty';
                empty.textContent = 'Open a supported code file to adjust categories.';
                list.append(empty);
                return;
            }
            for (const category of state.categories) {
                const row = document.createElement('div');
                row.className = 'category' + (category.active ? ' category-active' : '');
                const toggle = document.createElement('button');
                toggle.className = 'category-toggle';
                toggle.type = 'button';
                toggle.dataset.category = category.key;
                toggle.dataset.language = state.language;
                toggle.title = category.examples;
                toggle.setAttribute('aria-pressed', String(category.enabled));
                const label = document.createElement('span');
                label.className = 'category-name';
                label.textContent = category.label;
                const value = document.createElement('span');
                value.className = 'category-state';
                value.textContent = category.enabled ? (category.active ? 'Active' : 'On') : 'Off';
                toggle.append(label, value);
                const color = document.createElement('button');
                color.className = 'color-button';
                color.type = 'button';
                color.dataset.color = category.key;
                color.dataset.language = state.language;
                color.title = 'Choose color for ' + category.label;
                const swatch = document.createElement('span');
                swatch.className = 'swatch';
                if (/^#[0-9a-f]{3,8}$/i.test(category.color)) swatch.style.backgroundColor = category.color;
                color.append(swatch, document.createTextNode('Color'));
                row.append(toggle, color);
                list.append(row);
            }
        }
        window.addEventListener('message', event => {
            if (event.data?.type === 'state') render(event.data.state);
        });
        vscode.postMessage({ type: 'ready' });
    </script>
</body>
</html>`;
    };

    const registration = vscode.window.registerWebviewViewProvider('bloom.controls', {
        resolveWebviewView(view) {
            currentView = view;
            view.webview.options = { enableScripts: true };
            view.webview.html = html(view.webview);
            const listener = view.webview.onDidReceiveMessage(async (message: { type?: string; command?: string; language?: string; key?: OperationalKey }) => {
                if (message.type === 'ready') { refresh(); return; }
                if (message.type === 'command' && message.command && sidebarCommands.has(message.command)) {
                    await vscode.commands.executeCommand(message.command);
                } else if ((message.type === 'toggleCategory' || message.type === 'chooseColor') &&
                    message.language === vscode.window.activeTextEditor?.document.languageId && message.key) {
                    const command = message.type === 'toggleCategory' ? 'bloom.toggleCategory' : 'bloom.chooseColor';
                    await vscode.commands.executeCommand(command, message.language, message.key);
                }
            });
            const disposeListener = view.onDidDispose(() => {
                listener.dispose();
                disposeListener.dispose();
                if (currentView === view) currentView = undefined;
            });
            disposables.push(listener, disposeListener);
            refresh();
        }
    }, { webviewOptions: { retainContextWhenHidden: true } });

    return {
        refresh,
        dispose: () => {
            currentView = undefined;
            registration.dispose();
            for (const disposable of disposables.splice(0)) disposable.dispose();
        }
    };
}
