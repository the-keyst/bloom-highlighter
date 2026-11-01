import type { OperationalKey } from './schemaParser';

export interface Span { start: number; end: number }

/** Syntax concepts shared by all language and framework adapters. */
export type ConstructKind =
    | 'declaration' | 'function' | 'call' | 'type' | 'module'
    | 'branch' | 'loop' | 'return' | 'async' | 'mutation' | 'error-handling'
    | 'component' | 'route' | 'handler' | 'middleware' | 'authorization'
    | 'validation' | 'data-access' | 'render' | 'server-client-boundary'
    | 'lifecycle' | 'scope';
export type ConstructOrigin = 'language' | 'framework' | 'generic';
export interface CodeConstruct extends Span {
    kind: ConstructKind;
    origin: ConstructOrigin;
    /** Optional framework/language identifier for diagnostics and future filters. */
    adapter?: string;
}

export interface ConstructSink { constructs: CodeConstruct[] }

/** Translate shared constructs into Bloom's existing configurable categories. */
export const constructCategories: Partial<Record<ConstructKind, readonly OperationalKey[]>> = {
    declaration: ['structural'], function: ['functions'], call: ['functions'], type: ['interface'], module: ['structural'],
    branch: ['guards'], loop: ['guards'], return: ['guards'], async: ['guards'], mutation: ['mutation'], 'error-handling': ['alert', 'guards'],
    component: ['interface'], route: ['interface'], handler: ['functions'], middleware: ['interface'], authorization: ['guards'],
    validation: ['interface'], 'data-access': ['functions'], render: ['interface'], 'server-client-boundary': ['structural'],
    lifecycle: ['guards'],
};

export function addConstruct(result: ConstructSink, kind: ConstructKind, start: number, end: number,
    origin: ConstructOrigin = 'language', adapter?: string): void {
    if (end <= start) return;
    result.constructs.push({ kind, start, end, origin, ...(adapter ? { adapter } : {}) });
}

