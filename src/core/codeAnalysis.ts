import * as ts from 'typescript';
import type { OperationalKey } from './schemaParser';
import { scriptPatterns } from './patternAnalysis';
import { analyzeScriptFrameworks } from './frameworkAdapters';
import { addConstruct } from './constructs';
import type { CodeConstruct, ConstructKind, Span } from './constructs';

export type { CodeConstruct, ConstructKind, ConstructOrigin, Span } from './constructs';
export interface CognitiveToken extends Span { key: OperationalKey }
export interface SyntaxAnalysis { tokens: CognitiveToken[]; exclusions: Partial<Record<OperationalKey, Span[]>> }
export interface Scope extends Span { headerEnd: number }
export interface CodeAnalysis {
    code: string;
    tokens: CognitiveToken[];
    constructs: CodeConstruct[];
    scopes: Scope[];
    frameworks: string[];
    complete: boolean;
    syntax?: SyntaxAnalysis;
}

export function emptyAnalysis(text: string): CodeAnalysis {
    return { code: text.replace(/[^\r\n]/g, ' '), tokens: [], constructs: [], scopes: [], frameworks: [], complete: true };
}

const apiGroups: Record<string, Partial<Record<OperationalKey, string[]>>> = {
    react: {
        mutation: ['useState', 'useReducer', 'useRef', 'useActionState', 'useOptimistic'],
        logic: ['useMemo', 'useCallback', 'useDeferredValue'],
        guards: ['useEffect', 'useLayoutEffect', 'useInsertionEffect', 'useTransition'],
        interface: ['useContext', 'createContext', 'forwardRef', 'memo', 'useImperativeHandle', 'useSyncExternalStore'],
    },
    vue: {
        mutation: ['ref', 'shallowRef', 'reactive', 'shallowReactive', 'toRef', 'toRefs', 'customRef'],
        logic: ['computed'],
        guards: ['watch', 'watchEffect', 'watchPostEffect', 'onMounted', 'onUnmounted', 'onUpdated', 'nextTick'],
        interface: ['defineComponent', 'provide', 'inject', 'readonly'],
    },
    svelte: {
        guards: ['onMount', 'onDestroy', 'beforeUpdate', 'afterUpdate', 'tick', 'untrack'],
        interface: ['getContext', 'setContext', 'createEventDispatcher'],
    },
    'svelte/store': { mutation: ['writable'], logic: ['derived'], interface: ['readable', 'get'] },
    'svelte/reactivity': { mutation: ['SvelteMap', 'SvelteSet', 'SvelteDate', 'SvelteURL'] },
};

interface FrameworkBinding { module: string; name?: string }

const apiLookup = new Map<string, Map<string, OperationalKey>>();
for (const [module, groups] of Object.entries(apiGroups)) {
    const names = new Map<string, OperationalKey>();
    for (const [key, entries] of Object.entries(groups)) for (const name of entries ?? []) names.set(name, key as OperationalKey);
    apiLookup.set(module, names);
}

function apiKey(module: string, name: string): OperationalKey | undefined { return apiLookup.get(module)?.get(name); }

/** Parse JS/TS with the compiler so regex literals, JSX text and strings stay out of code matching. */
export function analyzeScript(text: string, jsx = false, macros?: 'vue' | 'svelte', fileName = ''): CodeAnalysis {
    const result = emptyAnalysis(text);
    const chars = text.split(''); // UTF-16 offsets, matching VS Code and compiler offsets.
    const file = ts.createSourceFile(jsx ? 'bloom.tsx' : 'bloom.ts', text, ts.ScriptTarget.Latest, true,
        jsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const reveal = (start: number, end: number) => {
        for (let i = start; i < end; i++) chars[i] = text[i];
    };
    const mask = (start: number, end: number) => {
        for (let i = start; i < end; i++) if (text[i] !== '\r' && text[i] !== '\n') chars[i] = ' ';
    };
    const addToken = (node: ts.Node, key: OperationalKey) => {
        result.tokens.push({ start: node.getStart(file), end: node.end, key });
    };
    const addNodeConstruct = (node: ts.Node, kind: ConstructKind, focus: ts.Node = node) =>
        addConstruct(result, kind, focus.getStart(file), focus.end, 'language', 'javascript-typescript');
    const addKeywordConstruct = (node: ts.Node, kind: ConstructKind, word: string) => {
        const start = node.getStart(file);
        if (text.startsWith(word, start)) addConstruct(result, kind, start, start + word.length, 'language', 'javascript-typescript');
    };
    const imports = new Map<string, FrameworkBinding>();
    for (const statement of file.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
        const module = statement.moduleSpecifier.text;
        if (!apiGroups[module]) continue;
        const family = module.split('/')[0];
        if (!result.frameworks.includes(family)) result.frameworks.push(family);
        const clause = statement.importClause;
        if (clause?.isTypeOnly) continue;
        if (clause?.name) imports.set(clause.name.text, { module });
        if (clause?.namedBindings) {
            if (ts.isNamespaceImport(clause.namedBindings)) {
                imports.set(clause.namedBindings.name.text, { module });
            }
            else for (const specifier of clause.namedBindings.elements) {
                if (!specifier.isTypeOnly) imports.set(specifier.name.text, { module, name: (specifier.propertyName ?? specifier.name).text });
            }
        }
    }
    const scopeBindings = new WeakMap<ts.Node, Set<string>>();
    function collectBinding(name: ts.BindingName, into: Set<string>): void {
        if (ts.isIdentifier(name)) into.add(name.text);
        else for (const element of name.elements) if (ts.isBindingElement(element)) collectBinding(element.name, into);
    }
    function getScopeBindings(scope: ts.Node): Set<string> {
        const cached = scopeBindings.get(scope);
        if (cached) return cached;
        const names = new Set<string>();
        const statements = ts.isSourceFile(scope) || ts.isBlock(scope) || ts.isModuleBlock(scope) ? scope.statements : [];
        for (const statement of statements) {
            if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) collectBinding(declaration.name, names);
            else if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) ||
                ts.isTypeAliasDeclaration(statement) || ts.isEnumDeclaration(statement) || ts.isModuleDeclaration(statement)) && statement.name) {
                if (ts.isIdentifier(statement.name)) names.add(statement.name.text);
            }
        }
        if (ts.isFunctionLike(scope)) {
            for (const parameter of scope.parameters) collectBinding(parameter.name, names);
        }
        if (ts.isFunctionExpression(scope) && scope.name) names.add(scope.name.text);
        if (ts.isClassExpression(scope) && scope.name) names.add(scope.name.text);
        if (ts.isCatchClause(scope) && scope.variableDeclaration) collectBinding(scope.variableDeclaration.name, names);
        scopeBindings.set(scope, names);
        return names;
    }
    function isShadowed(node: ts.Node, name: string): boolean {
        for (let scope: ts.Node | undefined = node.parent; scope; scope = scope.parent) {
            if ((ts.isSourceFile(scope) || ts.isBlock(scope) || ts.isModuleBlock(scope) || ts.isFunctionLike(scope) || ts.isCatchClause(scope)) &&
                getScopeBindings(scope).has(name)) return true;
        }
        return false;
    }
    function frameworkCall(node: ts.CallExpression | ts.NewExpression) {
        if (!imports.size && !macros) return;
        const expression = node.expression;
        const identifier = ts.isIdentifier(expression) ? expression :
            ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression) ? expression.expression : undefined;
        if (!identifier) return;
        const binding = imports.get(identifier.text);
        const macroCandidate = macros === 'svelte' && identifier.text.startsWith('$') ||
            macros === 'vue' && /^(define|withDefaults)/.test(identifier.text);
        if (!binding && !macroCandidate || isShadowed(node, identifier.text)) return;
        if (binding) {
            const name = binding.name ?? (ts.isPropertyAccessExpression(expression) ? expression.name.text : '');
            const key = apiKey(binding.module, name);
            if (key) addToken(expression, key);
        } else if (macros && macroCandidate) {
            const name = expression.getText(file);
            if (macros === 'vue' && ['defineProps', 'defineEmits', 'defineExpose', 'defineSlots', 'defineOptions', 'withDefaults'].includes(name)) {
                addToken(expression, 'interface');
            } else if (macros === 'vue' && name === 'defineModel') {
                addToken(expression, 'mutation');
            } else if (macros === 'svelte') {
                if (/^\$state(?:\.(?:raw|snapshot))?$/.test(name)) addToken(expression, 'mutation');
                if (/^\$(?:derived(?:\.by)?|effect(?:\.(?:pre|tracking|root))?)$/.test(name)) addToken(expression, name.startsWith('$derived') ? 'logic' : 'guards');
                if (['$props', '$bindable', '$host'].includes(name)) addToken(expression, 'interface');
            }
        }
    }
    function visit(node: ts.Node): void {
        if (ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) ||
            ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) {
            if (node.name && ts.isIdentifier(node.name)) addNodeConstruct(node, 'declaration', node.name);
        }
        if (ts.isFunctionLike(node)) {
            const declaration = node as ts.NamedDeclaration;
            const named = declaration.name && ts.isIdentifier(declaration.name) ? declaration.name : undefined;
            if (named) addNodeConstruct(node, 'function', named);
            else if (ts.isArrowFunction(node)) addNodeConstruct(node, 'function', node.equalsGreaterThanToken);
            else addKeywordConstruct(node, 'function', 'function');
        }
        if (ts.isCallExpression(node) || ts.isNewExpression(node)) addNodeConstruct(node, 'call', node.expression);
        if (ts.isIfStatement(node) || ts.isSwitchStatement(node)) addKeywordConstruct(node, 'branch', ts.isIfStatement(node) ? 'if' : 'switch');
        if (ts.isConditionalExpression(node)) addNodeConstruct(node, 'branch', node.questionToken);
        if (ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node)) {
            const keyword = text.slice(node.getStart(file)).match(/^(?:for|while|do)\b/)?.[0];
            if (keyword) addKeywordConstruct(node, 'loop', keyword);
        }
        if (ts.isReturnStatement(node)) addKeywordConstruct(node, 'return', 'return');
        if (ts.isThrowStatement(node)) addKeywordConstruct(node, 'return', 'throw');
        if (ts.isAwaitExpression(node)) addKeywordConstruct(node, 'async', 'await');
        if (ts.isYieldExpression(node)) addKeywordConstruct(node, 'async', 'yield');
        if (ts.isTryStatement(node)) addKeywordConstruct(node, 'error-handling', 'try');
        if (ts.isCatchClause(node)) addKeywordConstruct(node, 'error-handling', 'catch');
        if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) addNodeConstruct(node, 'mutation', node.operatorToken);
        if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
            if ([ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)) {
                const length = 2;
                const start = ts.isPrefixUnaryExpression(node) ? node.getStart(file) : node.end - length;
                addConstruct(result, 'mutation', start, start + length, 'language', 'javascript-typescript');
            }
        }
        if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) addNodeConstruct(node, 'type', node.name);
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
            const keyword = text.slice(node.getStart(file)).match(/^(?:import|export)\b/)?.[0];
            if (keyword) addKeywordConstruct(node, 'module', keyword);
        }
        if (ts.isStringLiteral(node) || ts.isRegularExpressionLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
            || ts.isJsxText(node) || node.kind === ts.SyntaxKind.JSDocComment || ts.isJsxOpeningFragment(node) || ts.isJsxClosingFragment(node) ||
            node.kind === ts.SyntaxKind.TemplateHead || node.kind === ts.SyntaxKind.TemplateMiddle || node.kind === ts.SyntaxKind.TemplateTail) {
            mask(node.getStart(file), node.end);
            return;
        }
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxClosingElement(node)) {
            mask(node.getStart(file), node.end);
            if (/^[A-Z]/.test(node.tagName.getText(file))) {
                addToken(node.tagName, 'interface');
                addNodeConstruct(node.tagName, 'component');
            }
            if (!ts.isJsxClosingElement(node)) {
                for (const attribute of node.attributes.properties) {
                    if (ts.isJsxAttribute(attribute)) {
                        if (/^on[A-Z]/.test(attribute.name.getText(file))) addToken(attribute.name, 'mutation');
                        if (attribute.initializer && ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression) {
                            const expression = attribute.initializer.expression;
                            reveal(expression.getStart(file), expression.end);
                            visit(expression);
                        }
                    } else if (ts.isJsxSpreadAttribute(attribute)) {
                        reveal(attribute.expression.getStart(file), attribute.expression.end);
                        visit(attribute.expression);
                    }
                }
            }
            return;
        }
        if (ts.isCallExpression(node) || ts.isNewExpression(node)) frameworkCall(node);
        if (ts.isBlock(node) || ts.isModuleBlock(node) || ts.isClassDeclaration(node) || ts.isClassExpression(node)
            || ts.isInterfaceDeclaration(node) || ts.isObjectLiteralExpression(node) || ts.isTypeLiteralNode(node)) {
            let start = node.getStart(file);
            let headerEnd = start;
            if (ts.isClassDeclaration(node) || ts.isClassExpression(node) || ts.isInterfaceDeclaration(node)) {
                headerEnd = node.getChildren(file).find(child => child.kind === ts.SyntaxKind.OpenBraceToken)?.getStart(file) ?? start;
            } else if (ts.isBlock(node) && (ts.isFunctionLike(node.parent) || ts.isModuleDeclaration(node.parent))) {
                start = node.parent.getStart(file);
            }
            result.scopes.push({ start, headerEnd, end: node.end });
            addConstruct(result, 'scope', start, node.end, 'language', 'javascript-typescript');
        }
        ts.forEachChild(node, visit);
    }
    visit(file);
    analyzeScriptFrameworks(file, text, fileName, result);
    // Scan only after literals/JSX have been masked, so comment-like text inside them cannot hide real code.
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, chars.join(''));
    let kind: ts.SyntaxKind;
    while ((kind = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
        if (kind === ts.SyntaxKind.SingleLineCommentTrivia || kind === ts.SyntaxKind.MultiLineCommentTrivia || kind === ts.SyntaxKind.ShebangTrivia) {
            mask(scanner.getTokenPos(), scanner.getTextPos());
        }
    }
    result.code = chars.join('');
    result.syntax = scriptPatterns(file, result.code);
    return result;
}

export function mergeAnalysis(target: CodeAnalysis, source: CodeAnalysis, offset: number): void {
    target.code = target.code.slice(0, offset) + source.code + target.code.slice(offset + source.code.length);
    target.tokens.push(...source.tokens.map(t => ({ ...t, start: t.start + offset, end: t.end + offset })));
    target.constructs.push(...source.constructs.map(c => ({ ...c, start: c.start + offset, end: c.end + offset })));
    if (source.syntax) {
        target.syntax ??= { tokens: [], exclusions: {} };
        target.syntax.tokens.push(...source.syntax.tokens.map(token => ({ ...token, start: token.start + offset, end: token.end + offset })));
        for (const key of Object.keys(source.syntax.exclusions) as OperationalKey[]) {
            (target.syntax.exclusions[key] ??= []).push(...source.syntax.exclusions[key]!.map(span => ({ start: span.start + offset, end: span.end + offset })));
            const merged: Span[] = [];
            for (const range of target.syntax.exclusions[key]!.sort((left, right) => left.start - right.start)) {
                const prior = merged[merged.length - 1];
                if (prior && range.start <= prior.end) prior.end = Math.max(prior.end, range.end);
                else merged.push({ ...range });
            }
            target.syntax.exclusions[key] = merged;
        }
    }
    target.scopes.push(...source.scopes.map(s => ({ start: s.start + offset, headerEnd: s.headerEnd + offset, end: s.end + offset })));
    target.frameworks = [...new Set([...target.frameworks, ...source.frameworks])];
}
