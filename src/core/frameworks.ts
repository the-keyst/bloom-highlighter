import { parse as parseSfc } from '@vue/compiler-sfc';
import { parse as parseTemplate, NodeTypes, ElementTypes, TemplateChildNode } from '@vue/compiler-dom';
import { parse as parseSvelte } from 'svelte/compiler';
import { analyzeScript, CodeAnalysis, emptyAnalysis, mergeAnalysis } from './codeAnalysis';
import { addConstruct } from './constructs';

export function analyzeVue(text: string, fileName = ''): CodeAnalysis {
    const result = emptyAnalysis(text);
    result.frameworks = ['vue'];
    const { descriptor, errors } = parseSfc(text, { sourceMap: false, ignoreEmpty: false });
    result.complete = errors.length === 0;
    for (const block of [descriptor.script, descriptor.scriptSetup]) {
        if (!block || block.src || (block.lang && !['js', 'ts', 'jsx', 'tsx'].includes(block.lang))) continue;
        mergeAnalysis(result, analyzeScript(block.content, /[jt]sx/.test(block.lang ?? ''),
            block === descriptor.scriptSetup ? 'vue' : undefined, fileName), block.loc.start.offset);
    }
    const template = descriptor.template;
    if (!template || template.src || (template.lang && template.lang !== 'html')) return result;
    const offset = template.loc.start.offset;
    const ast = parseTemplate(template.content, { onError: () => { result.complete = false; } });
    function visit(node: TemplateChildNode): void {
        if (node.type === NodeTypes.INTERPOLATION) {
            const expression = node.content;
            mergeAnalysis(result, analyzeScript(expression.loc.source), offset + expression.loc.start.offset);
        } else if (node.type === NodeTypes.ELEMENT) {
            const start = offset + node.loc.start.offset;
            const end = offset + node.loc.end.offset;
            if (node.tagType === ElementTypes.COMPONENT) {
                result.tokens.push({ key: 'interface', start: start + 1, end: start + 1 + node.tag.length });
                addConstruct(result, 'component', start + 1, start + 1 + node.tag.length, 'framework', 'vue');
                const close = text.lastIndexOf('</' + node.tag, end);
                if (close > start) {
                    result.tokens.push({ key: 'interface', start: close + 2, end: close + 2 + node.tag.length });
                    addConstruct(result, 'component', close + 2, close + 2 + node.tag.length, 'framework', 'vue');
                }
            }
            for (const prop of node.props) {
                if (prop.type !== NodeTypes.DIRECTIVE) continue;
                const directiveStart = offset + prop.loc.start.offset;
                const length = prop.loc.source.search(/[=\s]/);
                const key = ['if', 'else', 'else-if', 'for', 'show'].includes(prop.name) ? 'guards' :
                    ['on', 'model'].includes(prop.name) ? 'mutation' : 'interface';
                result.tokens.push({ key, start: directiveStart, end: directiveStart + (length < 0 ? prop.loc.source.length : length) });
                const construct = ['if', 'else', 'else-if', 'for', 'show'].includes(prop.name) ?
                    (prop.name === 'for' ? 'loop' : 'branch') : prop.name === 'on' ? 'handler' : 'component';
                addConstruct(result, construct, directiveStart, directiveStart + (length < 0 ? prop.loc.source.length : length), 'framework', 'vue');
                if (prop.exp) mergeAnalysis(result, analyzeScript(prop.exp.loc.source), offset + prop.exp.loc.start.offset);
            }
            // Template scopes are separate from braces inside script expressions.
            if (!node.isSelfClosing) {
                result.scopes.push({ start, headerEnd: start, end });
                addConstruct(result, 'scope', start, end, 'framework', 'vue');
            }
            node.children.forEach(visit);
        }
    }
    ast.children.forEach(visit);
    return result;
}

interface SvelteNode {
    type?: string;
    start?: number;
    end?: number;
    name?: string;
    [key: string]: unknown;
}

export function analyzeSvelte(text: string, fileName = ''): CodeAnalysis {
    const result = emptyAnalysis(text);
    result.frameworks = ['svelte'];
    try {
        const ast = parseSvelte(text, { modern: true, loose: true });
        for (const script of [ast.instance, ast.module]) {
            if (!script) continue;
            const { start, end } = script.content as typeof script.content & { start?: number; end?: number };
            if (typeof start === 'number' && typeof end === 'number') {
                mergeAnalysis(result, analyzeScript(text.slice(start, end), false, 'svelte', fileName), start);
            }
        }
        function visit(value: unknown): void {
            if (!value || typeof value !== 'object') return;
            if (Array.isArray(value)) { value.forEach(visit); return; }
            const node = value as SvelteNode;
            if (node.type === 'Text' || node.type === 'Comment') return;
            const start = node.start;
            const end = node.end;
            if (typeof start === 'number' && typeof end === 'number') {
                if (node.type === 'Component' && node.name) {
                    result.tokens.push({ key: 'interface', start: start + 1, end: start + 1 + node.name.length });
                    addConstruct(result, 'component', start + 1, start + 1 + node.name.length, 'framework', 'svelte');
                    const close = text.lastIndexOf('</' + node.name, end);
                    if (close > start) {
                        result.tokens.push({ key: 'interface', start: close + 2, end: close + 2 + node.name.length });
                        addConstruct(result, 'component', close + 2, close + 2 + node.name.length, 'framework', 'svelte');
                    }
                }
                if (node.type?.endsWith('Block')) {
                    const marker = text.slice(start, end).match(/^\{[#:][a-z]+/);
                    if (marker) {
                        result.tokens.push({ key: 'guards', start, end: start + marker[0].length });
                        addConstruct(result, /for|each/i.test(marker[0]) ? 'loop' : 'branch', start, start + marker[0].length, 'framework', 'svelte');
                    }
                    result.scopes.push({ start, headerEnd: start, end });
                    addConstruct(result, 'scope', start, end, 'framework', 'svelte');
                }
                if (['BindDirective', 'OnDirective'].includes(node.type ?? '') ||
                    (node.type === 'Attribute' && /^on[a-z]/.test(node.name ?? ''))) {
                    const name = text.slice(start, end).match(/^[^=\s]+/)?.[0];
                    if (name) {
                        result.tokens.push({ key: 'mutation', start, end: start + name.length });
                        addConstruct(result, node.type === 'OnDirective' || /^on[a-z]/.test(node.name ?? '') ? 'handler' : 'mutation', start, start + name.length, 'framework', 'svelte');
                    }
                }
            }
            for (const [key, child] of Object.entries(node)) {
                if (['loc', 'name_loc', 'metadata', 'parent'].includes(key)) continue;
                if (['expression', 'test', 'key'].includes(key) && child && typeof child === 'object') {
                    const expression = child as SvelteNode;
                    if (typeof expression.start === 'number' && typeof expression.end === 'number') {
                        mergeAnalysis(result, analyzeScript(text.slice(expression.start, expression.end)), expression.start);
                        continue;
                    }
                }
                visit(child);
            }
        }
        visit(ast.fragment);
    } catch {
        // An incomplete component during typing should retain the editor's normal syntax colors.
        result.complete = false;
    }
    return result;
}
