import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { BloomPainter, ViewMode } from './painter/styler';
import { UniversalLoader } from './core/loader';
import { AnalysisService } from './core/analysisService';
import { registerSidebar } from './sidebar';
import { categories, OperationalKey } from './core/schemaParser';
import { highlightingEnabled, categoryEnabled, updateLanguagePreferences } from './preferences';

export function activate(context: vscode.ExtensionContext): void {
    const output = vscode.window.createOutputChannel('Bloom');
    const definitions = path.join(context.extensionPath, 'out', 'core', 'definitions.json');
    const sourceDefinitions = path.join(context.extensionPath, 'src', 'core', 'definitions');
    const painter = new BloomPainter();
    // Register the view before loading definitions so the sidebar remains available
    // even if a packaged language rule is malformed or missing.
    const sidebar = registerSidebar(() => ({ mode: painter.mode, categories: painter.categories }));
    try {
        UniversalLoader.loadStatic(JSON.parse(fs.readFileSync(definitions, 'utf8')));
        if (context.extensionMode === vscode.ExtensionMode.Development && fs.existsSync(sourceDefinitions)) {
            UniversalLoader.loadFromDirectory(sourceDefinitions);
        }
    } catch (error) {
        output.appendLine(String(error));
        void vscode.window.showErrorMessage('Bloom could not load its language definitions. See the Bloom output channel.');
    }
    const analyzer = new AnalysisService();
    const generations = new WeakMap<vscode.TextEditor, number>();
    const pending = new Map<vscode.TextEditor, ReturnType<typeof setTimeout>>();
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    status.command = 'bloom.selectView';
    status.tooltip = 'Choose a Bloom view or turn highlighting on/off';
    let disposed = false;
    let sidebarSignature = '';
    let sidebarEditor: vscode.TextEditor | undefined;
    let sidebarSchema: ReturnType<typeof UniversalLoader.getSchema> | undefined;
    const refreshStatus = () => {
        const editor = vscode.window.activeTextEditor;
        const label = painter.status(editor);
        const config = vscode.workspace.getConfiguration('bloom', editor?.document.uri);
        const schema = editor && UniversalLoader.getSchema(editor.document.languageId);
        const signature = JSON.stringify([label, editor?.document.languageId, painter.mode,
            config.get('speed', 0), config.get('dimOpacity', 0.65), config.get('languageSettings', {})]);
        if (signature !== sidebarSignature || editor !== sidebarEditor || schema !== sidebarSchema) {
            sidebarSignature = signature;
            sidebarEditor = editor;
            sidebarSchema = schema;
            sidebar.refresh();
        }
        const enabled = !!editor && !!UniversalLoader.getSchema(editor.document.languageId) &&
            highlightingEnabled(editor.document);
        void vscode.commands.executeCommand('setContext', 'bloom.supported', enabled);
        if (label) { status.text = label; status.show(); }
        else status.hide();
    };
    const update = async (editor: vscode.TextEditor, animate = false) => {
        if (disposed) return;
        const generation = (generations.get(editor) ?? 0) + 1;
        generations.set(editor, generation);
        const document = editor.document;
        const version = document.version;
        const config = vscode.workspace.getConfiguration('bloom', document.uri);
        try {
            if (!UniversalLoader.getSchema(document.languageId) || !highlightingEnabled(document) ||
                document.getText().length > config.get('maxFileSize', 500000)) {
                analyzer.cancel(document);
                painter.update(editor);
            } else {
                const analysis = await analyzer.analyze(document, config.get('frameworks', true));
                if (disposed || generations.get(editor) !== generation || document.version !== version ||
                    document !== editor.document || !vscode.window.visibleTextEditors.includes(editor)) return;
                if (analysis) painter.update(editor, animate, analysis);
                else painter.clear(editor);
            }
        } catch (error) {
            if (!disposed && generations.get(editor) === generation) {
                painter.clear(editor);
                output.appendLine(String(error));
            }
        }
        if (editor === vscode.window.activeTextEditor) refreshStatus();
    };
    const cancel = (editor: vscode.TextEditor) => {
        generations.set(editor, (generations.get(editor) ?? 0) + 1);
        const timer = pending.get(editor);
        if (timer !== undefined) clearTimeout(timer);
        pending.delete(editor);
        painter.cancel(editor);
    };
    const refresh = () => {
        for (const editor of vscode.window.visibleTextEditors) { cancel(editor); update(editor); }
        refreshStatus();
    };
    const setMode = (mode: ViewMode) => {
        for (const editor of vscode.window.visibleTextEditors) cancel(editor);
        painter.setMode(mode, false);
        for (const editor of vscode.window.visibleTextEditors) void update(editor, true);
        void context.workspaceState.update('bloom.view', mode);
        refreshStatus();
    };
    const toggle = async () => {
        const editor = vscode.window.activeTextEditor;
        const config = vscode.workspace.getConfiguration('bloom', editor?.document.uri);
        const target = config.inspect('enabled')?.workspaceFolderValue !== undefined ? vscode.ConfigurationTarget.WorkspaceFolder :
            vscode.workspace.workspaceFolders?.length ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
        await config.update('enabled', !config.get('enabled', true), target);
    };
    const updateSetting = async (name: string, value: number | boolean) => {
        const resource = vscode.window.activeTextEditor?.document.uri;
        const config = vscode.workspace.getConfiguration('bloom', resource);
        const folderOverride = config.inspect(name)?.workspaceFolderValue !== undefined;
        const target = folderOverride ? vscode.ConfigurationTarget.WorkspaceFolder :
            vscode.workspace.workspaceFolders?.length ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
        try {
            await config.update(name, value, target);
        } catch (error) {
            output.appendLine(String(error));
            const choice = await vscode.window.showErrorMessage(
                'Bloom could not save this setting. Reload this window to register the installed Bloom settings, then try again.', 'Reload Window');
            if (choice === 'Reload Window') await vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    };
    context.subscriptions.push(output, status, sidebar,
        vscode.commands.registerCommand('bloom.toggleDangerous', () => setMode(painter.mode === ViewMode.Dangerous ? ViewMode.Operational : ViewMode.Dangerous)),
        vscode.commands.registerCommand('bloom.toggleDangerFocus', async () => {
            const document = vscode.window.activeTextEditor?.document;
            if (!document || !UniversalLoader.getSchema(document.languageId)) return;
            await updateLanguagePreferences(document, current => ({ ...current, dangerousEmphasis: current.dangerousEmphasis !== true }));
        }),
        vscode.commands.registerCommand('bloom.toggleCategory', async (language: string, key: OperationalKey) => {
            const document = vscode.window.activeTextEditor?.document;
            if (!document || document.languageId !== language || !categories.includes(key)) return;
            await updateLanguagePreferences(document, current => ({ ...current,
                categories: { ...current.categories, [key]: !categoryEnabled(document, key) } }));
        }),
        vscode.commands.registerCommand('bloom.toggleLanguage', async () => {
            const document = vscode.window.activeTextEditor?.document;
            if (!document || !UniversalLoader.getSchema(document.languageId)) return;
            await updateLanguagePreferences(document, current => ({ ...current, enabled: current.enabled === false }));
        }),
        vscode.commands.registerCommand('bloom.chooseColor', async (language: string, key: OperationalKey) => {
            const document = vscode.window.activeTextEditor?.document;
            if (!document || document.languageId !== language || !categories.includes(key)) return;
            const picked = await vscode.window.showQuickPick([
                { label: 'Default', value: undefined }, { label: 'Red', value: '#ff0055' },
                { label: 'Cyan', value: '#00f2ff' }, { label: 'Orange', value: '#ff8c00' },
                { label: 'Green', value: '#34d399' }, { label: 'Amber', value: '#fbbf24' },
                { label: 'Blue', value: '#38bdf8' }, { label: 'Purple', value: '#a855f7' },
                { label: 'Custom hex color', value: 'custom' }
            ], { placeHolder: `Color for ${key} in all ${language} files` });
            if (!picked) return;
            let color = picked.value;
            if (color === 'custom') {
                color = await vscode.window.showInputBox({ prompt: 'Hex color (#RGB, #RRGGBB or #RRGGBBAA)',
                    validateInput: value => /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(value) ? undefined : 'Enter a valid hex color.' });
                if (!color) return;
            }
            await updateLanguagePreferences(document, current => {
                const colors = { ...current.colors };
                if (color) colors[key] = color;
                else delete colors[key];
                return { ...current, colors };
            });
        }),
        vscode.commands.registerCommand('bloom.showSidebar', async () => {
            await vscode.commands.executeCommand('workbench.view.extension.bloom');
            await vscode.commands.executeCommand('bloom.controls.focus');
        }),
        vscode.commands.registerCommand('bloom.adjustDimming', async () => {
            const picked = await vscode.window.showQuickPick([
                { label: 'No dimming', description: '100% opacity', value: 1 },
                { label: 'Gentle', description: '80% opacity', value: 0.8 },
                { label: 'Balanced', description: '65% opacity · default', value: 0.65 },
                { label: 'Strong', description: '40% opacity', value: 0.4 }
            ], { placeHolder: 'Readability of code outside active highlights' });
            if (picked) await updateSetting('dimOpacity', picked.value);
        }),
        vscode.commands.registerCommand('bloom.toggleInstant', async () => {
            const speed = vscode.workspace.getConfiguration('bloom', vscode.window.activeTextEditor?.document.uri).get<number>('speed', 0);
            const saved = context.workspaceState.get<number>('bloom.previousSpeed', 300);
            if (speed > 0) await context.workspaceState.update('bloom.previousSpeed', speed);
            await updateSetting('speed', speed === 0 ? saved > 0 ? saved : 300 : 0);
        }),
        vscode.commands.registerCommand('bloom.toggleFrameworks', async () => {
            const enabled = vscode.workspace.getConfiguration('bloom', vscode.window.activeTextEditor?.document.uri).get('frameworks', true);
            await updateSetting('frameworks', !enabled);
        }),
        vscode.commands.registerCommand('bloom.viewOperational', () => setMode(ViewMode.Operational)),
        vscode.commands.registerCommand('bloom.viewInterfaces', () => setMode(ViewMode.Interfaces)),
        vscode.commands.registerCommand('bloom.viewStructural', () => setMode(ViewMode.Structural)),
        vscode.commands.registerCommand('bloom.viewDangerous', () => setMode(ViewMode.Dangerous)),
        vscode.commands.registerCommand('bloom.toggle', toggle),
        vscode.commands.registerCommand('bloom.selectView', async () => {
            const picked = await vscode.window.showQuickPick([
                { label: 'Operational', description: 'Flow, state changes and lifecycle', mode: ViewMode.Operational },
                { label: 'Interfaces', description: 'Contracts, components and framework APIs', mode: ViewMode.Interfaces },
                { label: 'Structural', description: 'Modules, scopes and internal identifiers', mode: ViewMode.Structural },
                { label: 'Dangerous', description: 'Potentially risky operations to review', mode: ViewMode.Dangerous },
                { label: 'Toggle highlighting', description: 'Enable or disable Bloom', mode: undefined }
            ], { placeHolder: 'Bloom view' });
            if (picked?.mode) setMode(picked.mode);
            else if (picked) await toggle();
        }),
        vscode.commands.registerCommand('bloom.reloadDefinitions', () => {
            try {
                if (fs.existsSync(sourceDefinitions)) UniversalLoader.loadFromDirectory(sourceDefinitions);
                else UniversalLoader.loadStatic(JSON.parse(fs.readFileSync(definitions, 'utf8')));
                refresh();
            } catch (error) {
                output.appendLine(String(error));
                void vscode.window.showErrorMessage('Bloom definitions were not reloaded. See the Bloom output channel.');
            }
        }),
        vscode.window.onDidChangeActiveTextEditor(() => refreshStatus()),
        vscode.window.onDidChangeVisibleTextEditors(editors => {
            for (const editor of pending.keys()) if (!editors.includes(editor)) cancel(editor);
            refresh();
        }),
        vscode.window.onDidChangeTextEditorVisibleRanges(event => update(event.textEditor)),
        vscode.workspace.onDidChangeTextDocument(event => {
            for (const editor of vscode.window.visibleTextEditors) {
                if (editor.document !== event.document) continue;
                cancel(editor);
                pending.set(editor, setTimeout(() => { pending.delete(editor); update(editor); }, 50));
            }
        }),
        vscode.workspace.onDidChangeConfiguration(event => { if (event.affectsConfiguration('bloom')) refresh(); }),
        { dispose: () => {
            disposed = true;
            pending.forEach(timer => clearTimeout(timer));
            pending.clear();
            analyzer.dispose();
            painter.dispose();
            void vscode.commands.executeCommand('setContext', 'bloom.supported', false);
        } }
    );
    const saved = context.workspaceState.get<ViewMode>('bloom.view', ViewMode.Operational);
    painter.setMode(Object.values(ViewMode).includes(saved) ? saved : ViewMode.Operational, false);
    for (const editor of vscode.window.visibleTextEditors) void update(editor, true);
    refreshStatus();
}

export function deactivate(): void { /* Context subscriptions own all resources. */ }
