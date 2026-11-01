import * as vscode from 'vscode';
import { UniversalLoader, LanguageSchema } from '../core/loader';
import { OperationalKey } from '../core/schemaParser';
import { CodeAnalysis, Span } from '../core/codeAnalysis';
import { analyzeCode } from '../core/languageAnalysis';
import { getDepthAnalysis } from '../core/depthTracker';
import { categorySpans } from '../core/patternAnalysis';
import { preferencesFor, highlightingEnabled, categoryEnabled, categoryColor } from '../preferences';

export enum ViewMode {
    Operational = 'operational',
    Interfaces = 'interfaces',
    Structural = 'structural',
    Dangerous = 'dangerous'
}

interface DecorationSet {
    colors: string;
    schema: LanguageSchema;
    decorations: Map<OperationalKey, vscode.TextEditorDecorationType>;
}
interface CachedAnalysis {
    version: number;
    language: string;
    frameworks: boolean;
    analysis: CodeAnalysis;
}
interface SpanIndex {
    spans: Span[];
    prefixMaxEnd: number[];
}
interface PreparedSpans {
    schema: LanguageSchema;
    categories: Map<OperationalKey, SpanIndex>;
    noise: SpanIndex;
    layers?: SpanIndex[];
}

const lightColors: Record<OperationalKey, string> = {
    alert: '#b42342', logic: '#006875', mutation: '#9b4900', guards: '#126741',
    interface: '#765500', native: '#006891', prototype: '#5541a5', structural: '#a32771',
    anchor: '#333333', internal: '#7535a5', danger: '#b42318', functions: '#765500'
};

export class BloomPainter {
    private languageDecorations = new Map<string, DecorationSet>();
    private blockDecorations: vscode.TextEditorDecorationType[] = [];
    private blockSets = new Map<ViewMode, vscode.TextEditorDecorationType[]>();
    private applied = new WeakMap<vscode.TextEditor, { document: vscode.TextDocument; version: number; ranges: Map<vscode.TextEditorDecorationType, vscode.Range[]> }>();
    private spans = new WeakMap<CodeAnalysis, PreparedSpans>();
    private dimmers = new Map<number, vscode.TextEditorDecorationType>();
    private cache = new WeakMap<vscode.TextDocument, CachedAnalysis>();
    private pending = new Map<vscode.TextEditor, ReturnType<typeof setTimeout>>();
    private allCategoryDecorations = new Set<vscode.TextEditorDecorationType>();
    private disposed = false;
    private currentMode = ViewMode.Operational;

    constructor() { this.updateBlockDecorations(); }

    public get mode(): ViewMode { return this.currentMode; }
    public get categories(): OperationalKey[] { return this.visibleKeys(); }

    private decorationsFor(schema: LanguageSchema, document: vscode.TextDocument): DecorationSet {
        const strong = this.currentMode === ViewMode.Dangerous && preferencesFor(document).dangerousEmphasis === true;
        const colors = JSON.stringify({ colors: preferencesFor(document).colors ?? {}, strong });
        const styleKey = `${document.languageId}:${colors}`;
        const existing = this.languageDecorations.get(styleKey);
        if (existing?.schema === schema && existing.colors === colors) return existing;

        const decorations = new Map<OperationalKey, vscode.TextEditorDecorationType>();
        for (const [category, mapping] of Object.entries(schema.mapping)) {
            const key = category as OperationalKey;
            const color = categoryColor(document, key);
            decorations.set(key, vscode.window.createTextEditorDecorationType({
                ...mapping.style,
                ...(color ? { color } : {}),
                ...(key === 'danger' && strong ? { fontWeight: '900', textDecoration: 'underline' } : {}),
                border: undefined,
                borderRadius: undefined,
                light: { color: color ?? lightColors[key], backgroundColor: 'transparent' },
                rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
            }));
        }
        decorations.forEach(type => this.allCategoryDecorations.add(type));
        const set = { schema, decorations, colors };
        this.languageDecorations.set(styleKey, set);
        return set;
    }

    private updateBlockDecorations(): void {
        const existing = this.blockSets.get(this.currentMode);
        if (existing) { this.blockDecorations = existing; return; }
        const hue = this.currentMode === ViewMode.Operational ? 180 : this.currentMode === ViewMode.Interfaces ? 45 : 320;
        this.blockDecorations = [0, 20, 40, 60].map(shift => vscode.window.createTextEditorDecorationType({
            backgroundColor: `hsla(${(hue + shift) % 360}, 60%, 50%, 0.05)`,
            isWholeLine: false,
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
        }));
        this.blockSets.set(this.currentMode, this.blockDecorations);
    }

    public setMode(mode: ViewMode, refresh = true): void {
        if (this.disposed) return;
        this.currentMode = mode;
        this.updateBlockDecorations();
        if (refresh) vscode.window.visibleTextEditors.forEach(editor => this.update(editor, true));
    }

    private visibleKeys(): OperationalKey[] {
        if (this.currentMode === ViewMode.Dangerous) return ['danger'];
        if (this.currentMode === ViewMode.Interfaces) return ['alert', 'interface', 'native', 'prototype', 'functions'];
        if (this.currentMode === ViewMode.Structural) return ['alert', 'structural', 'anchor', 'internal'];
        return ['alert', 'logic', 'guards', 'mutation'];
    }

    public cancel(editor: vscode.TextEditor): void {
        const timer = this.pending.get(editor);
        if (timer !== undefined) clearTimeout(timer);
        this.pending.delete(editor);
    }

    public clear(editor: vscode.TextEditor): void {
        this.cancel(editor);
        if (this.disposed) return;
        this.applied.get(editor)?.ranges.forEach((_, type) => editor.setDecorations(type, []));
        this.applied.delete(editor);
    }

    public status(editor: vscode.TextEditor | undefined): string | undefined {
        if (!editor || !UniversalLoader.getSchema(editor.document.languageId)) return undefined;
        const config = vscode.workspace.getConfiguration('bloom', editor.document.uri);
        if (!highlightingEnabled(editor.document)) return 'Bloom: Off';
        if (editor.document.getText().length > config.get('maxFileSize', 500000)) return 'Bloom: Large file';
        const analysis = this.cache.get(editor.document)?.analysis;
        const mode = this.currentMode.charAt(0).toUpperCase() + this.currentMode.slice(1);
        return `Bloom: ${mode}${analysis?.frameworks.length ? ' ? ' + analysis.frameworks.join(', ') : ''}`;
    }

    public update(editor: vscode.TextEditor, animate = false, prepared?: CodeAnalysis): void {
        if (this.disposed) return;
        this.cancel(editor);
        const document = editor.document;
        const config = vscode.workspace.getConfiguration('bloom', document.uri);
        const schema = UniversalLoader.getSchema(document.languageId);
        if (!schema || !highlightingEnabled(document)) { this.clear(editor); return; }
        const text = document.getText();
        if (text.length > config.get('maxFileSize', 500000)) { this.clear(editor); return; }
        const frameworks = config.get('frameworks', true);
        let cached = this.cache.get(document);
        if (!cached || cached.version !== document.version || cached.language !== document.languageId || cached.frameworks !== frameworks) {
            cached = { version: document.version, language: document.languageId, frameworks,
                analysis: prepared ?? analyzeCode(text, document.languageId, frameworks, document.fileName) };
            this.cache.set(document, cached);
        }
        const analysis = cached.analysis;
        const set = this.decorationsFor(schema, document);
        const next = new Map<vscode.TextEditorDecorationType, vscode.Range[]>();
        let indexed = this.spans.get(analysis);
        if (!indexed || indexed.schema !== schema) {
            indexed = { schema, categories: new Map(), noise: makeSpanIndex(Array.from(analysis.code.matchAll(/\S+/g),
                match => ({ start: match.index!, end: match.index! + match[0].length }))) };
            this.spans.set(analysis, indexed);
        }
        const viewport: Span[] = editor.visibleRanges.length ? editor.visibleRanges.map(range => ({
            start: document.offsetAt(document.lineAt(Math.max(0, range.start.line - 20)).range.start),
            end: document.offsetAt(document.lineAt(Math.min(document.lineCount - 1, range.end.line + 20)).range.end)
        })) : [{ start: 0, end: text.length }];
        const rangeOf = (span: Span) => new vscode.Range(document.positionAt(span.start), document.positionAt(span.end));
        const clippedRanges = (index: SpanIndex) => {
            const clipped = new Map<string, Span>();
            for (const window of viewport) {
                let low = 0;
                let high = index.prefixMaxEnd.length;
                while (low < high) {
                    const mid = (low + high) >>> 1;
                    if (index.prefixMaxEnd[mid] <= window.start) low = mid + 1;
                    else high = mid;
                }
                for (let i = low; i < index.spans.length && index.spans[i].start < window.end; i++) {
                    const span = index.spans[i];
                    const start = Math.max(span.start, window.start);
                    const end = Math.min(span.end, window.end);
                    if (start < end) clipped.set(`${start}:${end}`, { start, end });
                }
            }
            return [...clipped.values()].map(rangeOf);
        };
        const chosenOpacity = this.currentMode === ViewMode.Dangerous && preferencesFor(document).dangerousEmphasis === true ?
            Math.min(0.4, config.get('dimOpacity', 0.65)) : config.get('dimOpacity', 0.65);
        const opacity = Math.round(Math.min(1, Math.max(0.2, chosenOpacity)) * 100) / 100;
        if (opacity < 1) {
            let dimmer = this.dimmers.get(opacity);
            if (!dimmer) {
                dimmer = vscode.window.createTextEditorDecorationType({ opacity: String(opacity),
                    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed });
                this.dimmers.set(opacity, dimmer);
            }
            next.set(dimmer, clippedRanges(indexed.noise));
        }
        // Structural emphasis belongs to declarations, not a wash over every scope body.
        if (this.currentMode !== ViewMode.Structural && this.currentMode !== ViewMode.Dangerous) {
            indexed.layers ??= getDepthAnalysis(document, analysis).layers.map(ranges => makeSpanIndex(
                ranges.map(range => ({ start: document.offsetAt(range.start), end: document.offsetAt(range.end) }))));
            indexed.layers.forEach((spans, index) => next.set(this.blockDecorations[index], clippedRanges(spans)));
        }
        const paint = () => {
            this.pending.delete(editor);
            if (this.disposed || document.isClosed || editor.document !== document || document.version !== cached!.version) return;
            for (const key of this.visibleKeys()) {
                if (!categoryEnabled(document, key)) continue;
                const type = set.decorations.get(key);
                const mapping = schema.mapping[key];
                if (!type || !mapping) continue;
                let spans = indexed!.categories.get(key);
                if (!spans) {
                    spans = makeSpanIndex(categorySpans(analysis, schema, key));
                    indexed!.categories.set(key, spans);
                }
                next.set(type, clippedRanges(spans));
            }
            const previous = this.applied.get(editor);
            const sameVersion = previous?.document === document && previous.version === document.version;
            // Replace populated layers first; clear only styles absent from the new frame.
            const replacements = [...next].sort((left, right) => Number(!left[1].length) - Number(!right[1].length));
            replacements.forEach(([type, ranges]) => {
                const old = sameVersion ? previous?.ranges.get(type) : undefined;
                if (old && old.length === ranges.length && old.every((range, index) => {
                    const other = ranges[index];
                    return range.start.line === other.start.line && range.start.character === other.start.character &&
                        range.end.line === other.end.line && range.end.character === other.end.character;
                })) return;
                if (ranges.length || previous?.ranges.has(type)) editor.setDecorations(type, ranges);
            });
            previous?.ranges.forEach((_, type) => { if (!next.has(type)) editor.setDecorations(type, []); });
            this.applied.set(editor, { document, version: document.version, ranges: next });
        };
        const speed = Math.min(2000, Math.max(0, config.get('speed', 0)));
        if (animate && speed > 0) this.pending.set(editor, setTimeout(paint, speed));
        else paint();
    }

    public dispose(): void {
        this.pending.forEach(timer => clearTimeout(timer));
        this.pending.clear();
        this.disposed = true;
        this.allCategoryDecorations.forEach(decoration => decoration.dispose());
        this.allCategoryDecorations.clear();
        this.blockSets.forEach(types => types.forEach(decoration => decoration.dispose()));
        this.blockSets.clear();
        this.dimmers.forEach(decoration => decoration.dispose());
        this.languageDecorations.clear();
        this.dimmers.clear();
    }
}

function makeSpanIndex(input: Span[]): SpanIndex {
    const spans = input.slice().sort((left, right) => left.start - right.start || left.end - right.end);
    const prefixMaxEnd = new Array<number>(spans.length);
    let maxEnd = -1;
    for (let i = 0; i < spans.length; i++) {
        maxEnd = Math.max(maxEnd, spans[i].end);
        prefixMaxEnd[i] = maxEnd;
    }
    return { spans, prefixMaxEnd };
}
