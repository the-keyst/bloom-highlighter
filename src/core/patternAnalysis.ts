import * as ts from 'typescript';
import type { CodeAnalysis, Span, SyntaxAnalysis } from './codeAnalysis';
import type { LanguageSchema } from './loader';
import type { OperationalKey } from './schemaParser';
import { constructCategories } from './constructs';

const nameKeys: OperationalKey[] = ['alert', 'logic', 'mutation', 'guards', 'anchor', 'interface', 'native', 'prototype', 'structural'];
const constructSpanCache = new WeakMap<CodeAnalysis, Map<OperationalKey, Span[]>>();

function constructSpans(analysis: CodeAnalysis): Map<OperationalKey, Span[]> {
    let indexed = constructSpanCache.get(analysis);
    if (indexed) return indexed;
    indexed = new Map();
    for (const construct of analysis.constructs) {
        for (const key of constructCategories[construct.kind] ?? []) {
            const spans = indexed.get(key);
            if (spans) spans.push(construct);
            else indexed.set(key, [construct]);
        }
    }
    constructSpanCache.set(analysis, indexed);
    return indexed;
}

function builder() {
    const syntax: SyntaxAnalysis = { tokens: [], exclusions: {} };
    const exclude = (key: OperationalKey, span: Span) => { (syntax.exclusions[key] ??= []).push(span); };
    const name = (span: Span) => nameKeys.forEach(key => exclude(key, span));
    const add = (key: OperationalKey, span: Span) => { syntax.tokens.push({ ...span, key }); };
    const finish = () => {
        for (const key of Object.keys(syntax.exclusions) as OperationalKey[]) {
            const ranges = syntax.exclusions[key]!.sort((a, b) => a.start - b.start || a.end - b.end);
            const merged: Span[] = [];
            for (const range of ranges) {
                const prior = merged[merged.length - 1];
                if (prior && range.start <= prior.end) prior.end = Math.max(prior.end, range.end);
                else merged.push({ ...range });
            }
            syntax.exclusions[key] = merged;
        }
        return syntax;
    };
    return { syntax, exclude, name, add, finish };
}

/** Reuse the compiler tree; symbol spelling never implies a library or an effect. */
export function scriptPatterns(file: ts.SourceFile, code: string): SyntaxAnalysis {
    const result = builder();
    const allowedLogic = new Set<number>();
    const span = (node: ts.Node): Span => ({ start: node.getStart(file), end: node.end });
    const logic = (node: ts.Node) => allowedLogic.add(node.getStart(file));
    const callable = (node: ts.Node | undefined) => {
        if (node && ts.isIdentifier(node) && code.slice(node.getStart(file), node.end).trim()) result.add('functions', span(node));
    };
    const initializer = (node: ts.VariableDeclaration | ts.ParameterDeclaration | ts.PropertyDeclaration) => {
        if (!node.initializer) return;
        const start = code.lastIndexOf('=', node.initializer.getStart(file) - 1);
        if (start >= node.name.end) result.exclude('mutation', { start, end: start + 1 });
    };
    function visit(node: ts.Node): void {
        if (ts.isBinaryExpression(node) && [ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken,
            ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken,
            ts.SyntaxKind.LessThanToken, ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.LessThanEqualsToken,
            ts.SyntaxKind.GreaterThanEqualsToken, ts.SyntaxKind.AmpersandAmpersandToken,
            ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) logic(node.operatorToken);
        if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) allowedLogic.add(node.getStart(file));
        if (ts.isConditionalExpression(node)) { logic(node.questionToken); logic(node.colonToken); }
        if (ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isPropertyDeclaration(node)) initializer(node);
        if (ts.isVariableDeclarationList(node)) {
            const start = node.getStart(file);
            const word = code.slice(start).match(/^(?:let|var)\b/)?.[0];
            if (word) { result.exclude('mutation', { start, end: start + word.length }); result.add('structural', { start, end: start + word.length }); }
        }
        if (ts.isTypeNode(node)) result.exclude('functions', span(node));
        if (ts.isPropertyAccessExpression(node)) result.name(span(node.name));
        if (ts.isPropertyAssignment(node) || ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node) ||
            ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
            result.name(span(node.name));
        }
        if (ts.isPropertyAssignment(node) && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) callable(node.name);
        if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
            const expression = node.expression;
            callable(ts.isPropertyAccessExpression(expression) ? expression.name : expression);
        }
        if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isMethodDeclaration(node) ||
            ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) callable(node.name);
        if (ts.isArrowFunction(node)) result.add('functions', span(node.equalsGreaterThanToken));
        ts.forEachChild(node, visit);
    }
    visit(file);
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, code);
    while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken) {
        const word = scanner.getTokenText();
        const range = { start: scanner.getTokenPos(), end: scanner.getTextPos() };
        if ((/[<>?:!]/.test(word) || /^(?:={2,3}|&&=?|\|\|=?)$/.test(word)) && !allowedLogic.has(range.start)) result.exclude('logic', range);
    }
    return result.finish();
}

interface Lexeme extends Span { text: string; depth: number }
const identifier = (token: Lexeme | undefined) => !!token && /^[A-Za-z_$][\w$]*$/.test(token.text);

/** Dart's ordinary constructor/call, type, argument and write patterns; no widget names or imports. */
export function dartPatterns(code: string): SyntaxAnalysis {
    const result = builder();
    const tokens: Lexeme[] = [];
    let depth = 0;
    for (const match of code.matchAll(/[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|>>>=|>>=|<<=|~\/=|&&=|\|\|=|\?\?=|\?\?|\?\.\.|\?\.|=>|==|!=|<=|>=|\+\+|--|[+*/%&|^\-]=|\S/g)) {
        const text = match[0];
        if (/^[)\]}]$/.test(text)) depth = Math.max(0, depth - 1);
        tokens.push({ text, start: match.index!, end: match.index! + text.length, depth });
        if (/^[(\[{]$/.test(text)) depth++;
    }
    const pairs = new Map<number, number>();
    const brackets: number[] = [];
    const closing: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
    tokens.forEach((token, index) => {
        if (/^[(\[{]$/.test(token.text)) brackets.push(index);
        else if (closing[token.text]) {
            const open = brackets[brackets.length - 1];
            if (open !== undefined && tokens[open].text === closing[token.text]) { brackets.pop(); pairs.set(open, index); }
        }
    });
    const typeAngles = new Set<number>();
    // Type arguments must have type-shaped contents and a declaration/call/literal continuation.
    for (let index = 0; index < tokens.length; index++) {
        if (tokens[index].text !== '<') continue;
        let nesting = 1;
        let end = index + 1;
        for (; end < tokens.length && nesting; end++) {
            const text = tokens[end].text;
            if (text === '<') nesting++;
            else if (text === '>') nesting--;
            else if (!identifier(tokens[end]) && ![',', '.', '?', '(', ')', '[', ']', '{', '}', ':'].includes(text)) break;
            // Limit lookahead in incomplete/ambiguous code to avoid quadratic scans.
            if (end - index > 120) break;
        }
        if (nesting || tokens[end - 1]?.text !== '>') continue;
        const before = tokens[index - 1];
        const after = tokens[end];
        const continuation = after && (['(', '[', '{', '?', '.', ')', ',', ';', '=', '>'].includes(after.text) || identifier(after));
        const typePrefix = !before || identifier(before) || ['=', ':', ',', '(', '[', 'return', 'const', 'new'].includes(before.text);
        const adjacentName = before && identifier(before) && before.end === tokens[index].start;
        if (!continuation || !typePrefix || (!adjacentName && identifier(before) && !['(', '[', '{'].includes(after.text))) continue;
        for (let part = index; part < end; part++) {
            typeAngles.add(part);
            if (['<', '>', '?', ':'].includes(tokens[part].text)) result.exclude('logic', tokens[part]);
        }
    }
    const nullableQuestions = new Set<number>();
    const questions = new Map<number, Lexeme[]>();
    const declarations = new Map<number, { awaiting: boolean }>();
    const noCalls = new Set(['if', 'for', 'while', 'switch', 'catch', 'assert', 'return', 'throw', 'with', 'Function']);
    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        const previous = tokens[index - 1];
        const next = tokens[index + 1];
        if (['var', 'late'].includes(token.text)) {
            result.exclude('mutation', token);
            result.add('structural', token);
        }
        if (['var', 'final', 'const'].includes(token.text)) declarations.set(token.depth, { awaiting: true });
        if (token.text === ';') { declarations.delete(token.depth); questions.delete(token.depth); }
        if (token.text === ',') {
            const declaration = declarations.get(token.depth);
            if (declaration) declaration.awaiting = true;
            questions.delete(token.depth);
        }
        if (/^[)\]}]$/.test(token.text)) {
            for (const level of declarations.keys()) if (level > token.depth) declarations.delete(level);
            for (const level of questions.keys()) if (level > token.depth) questions.delete(level);
        }
        if (token.text === '=') {
            const declaration = declarations.get(token.depth);
            const beforeName = tokens[index - 2];
            const typedBinding = identifier(previous) && beforeName && beforeName.text !== '.' &&
                ((identifier(beforeName) && !['return', 'throw', 'yield', 'await', 'case', 'in', 'else'].includes(beforeName.text)) || (beforeName.text === '>' && typeAngles.has(index - 2)) || nullableQuestions.has(index - 2));
            if (declaration?.awaiting || typedBinding) {
                result.exclude('mutation', token);
                declarations.set(token.depth, { awaiting: false });
            }
        }
        if (['=>', '?.', '?..', '??=', '>>=', '>>>=', '<<='].includes(token.text)) result.exclude('logic', token);
        if (token.text === '=>') result.add('functions', token);
        if (token.text === '?' && !typeAngles.has(index)) {
            let colonAhead = false;
            for (let look = index + 1; look < Math.min(tokens.length, index + 121); look++) {
                if (tokens[look].depth < token.depth || (tokens[look].depth === token.depth && [',', ';'].includes(tokens[look].text))) break;
                if (tokens[look].depth === token.depth && tokens[look].text === ':') { colonAhead = true; break; }
            }
            const nullable = !colonAhead && (!next || [',', ')', ']', '}', ';', '=', '.', '['].includes(next.text) ||
                (identifier(next) && ['=', ',', ')', ';', '{', '}', '('].includes(tokens[index + 2]?.text))); 
            if (nullable) { result.exclude('logic', token); nullableQuestions.add(index); }
            else { const pending = questions.get(token.depth) ?? []; pending.push(token); questions.set(token.depth, pending); }
        }
        if (token.text === ':' && !typeAngles.has(index)) {
            if (questions.get(token.depth)?.length) questions.get(token.depth)!.pop();
            else {
                result.exclude('logic', token);
                if (identifier(previous)) result.name(previous);
            }
            if (next?.text === '(') {
                const end = pairs.get(index + 1);
                let following = end === undefined ? -1 : end + 1;
                if (tokens[following]?.text === 'async' || tokens[following]?.text === 'sync') following++;
                if (tokens[following]?.text === '*') following++;
                if (following >= 0 && ['=>', '{'].includes(tokens[following]?.text) && previous) result.add('functions', previous);
            }
        }
        if (identifier(token) && previous?.text === '.') result.name(token);
        if (identifier(token) && !noCalls.has(token.text)) {
            let following = index + 1;
            if (tokens[following]?.text === '<' && typeAngles.has(following)) {
                let nesting = 0;
                do {
                    if (tokens[following].text === '<') nesting++;
                    if (tokens[following].text === '>') nesting--;
                    following++;
                } while (following < tokens.length && nesting);
            }
            if (tokens[following]?.text === '(') result.add('functions', token);
        }
    }
    return result.finish();
}

function overlaps(ranges: Span[], span: Span): boolean {
    let low = 0;
    let high = ranges.length;
    while (low < high) {
        const mid = (low + high) >>> 1;
        if (ranges[mid].end <= span.start) low = mid + 1;
        else high = mid;
    }
    return low < ranges.length && ranges[low].start < span.end;
}

/** Schema rules remain customizable; syntax exclusions prevent misleading context matches. */
export function categorySpans(analysis: CodeAnalysis, schema: LanguageSchema, key: OperationalKey): Span[] {
    const mapping = schema.mapping[key];
    if (!mapping) return [];
    const exclusions = analysis.syntax?.exclusions[key] ?? [];
    const unique = new Map<string, Span>();
    const add = (token: Span) => unique.set(`${token.start}:${token.end}`, { start: token.start, end: token.end });
    const regex = new RegExp(mapping.regex.source, mapping.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(analysis.code)) !== null) {
        if (!match[0].length) { regex.lastIndex++; continue; }
        const token = { start: match.index, end: match.index + match[0].length };
        if (!overlaps(exclusions, token)) add(token);
    }
    for (const token of analysis.syntax?.tokens ?? []) if (token.key === key) add(token);
    for (const token of analysis.tokens) if (token.key === key) add(token);
    for (const construct of constructSpans(analysis).get(key) ?? []) add(construct);
    return [...unique.values()];
}
