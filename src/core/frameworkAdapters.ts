import * as ts from 'typescript';
import type { CodeAnalysis } from './codeAnalysis';
import { addConstruct } from './constructs';
import type { ConstructKind } from './constructs';

const routeVerbs = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'all']);

export interface ScriptFrameworkContext {
    file: ts.SourceFile;
    text: string;
    fileName: string;
    result: CodeAnalysis;
}

export interface FrameworkAdapter {
    readonly id: string;
    analyze(context: ScriptFrameworkContext): void;
}

const adapters: FrameworkAdapter[] = [];

/** Register a syntax-local framework adapter used by the JavaScript/TypeScript language adapter. */
export function registerFrameworkAdapter(adapter: FrameworkAdapter): void {
    if (adapters.some(existing => existing.id === adapter.id)) throw new Error(`Framework adapter already registered: ${adapter.id}`);
    adapters.push(adapter);
}

export function analyzeScriptFrameworks(file: ts.SourceFile, text: string, fileName: string, result: CodeAnalysis): void {
    const context = { file, text, fileName, result };
    for (const adapter of adapters) adapter.analyze(context);
}

/** Framework enrichment for JavaScript/TypeScript syntax trees. Recognition is file-local. */
function analyzeBuiltInFrameworks({ file, text, fileName, result }: ScriptFrameworkContext): void {
    const imports = new Set<string>();
    for (const statement of file.statements) {
        if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) imports.add(statement.moduleSpecifier.text);
    }
    const hasImport = (test: (name: string) => boolean) => [...imports].some(test);
    const express = hasImport(name => ['express', 'fastify', 'koa', 'hono', 'h3'].includes(name));
    const nest = hasImport(name => name === '@nestjs/common');
    const angular = hasImport(name => name === '@angular/core');
    const next = hasImport(name => name.startsWith('next/')) || /(?:^|[\\/])(?:app|pages)[\\/].*(?:page|layout|route)\.[jt]sx?$/.test(fileName);
    const nuxt = hasImport(name => name === '#imports' || name.startsWith('nuxt/')) ||
        /(?:^|[\\/])(?:pages|server|middleware)(?:[\\/]|$)/.test(fileName) && /\b(?:useFetch|useAsyncData|defineEventHandler)\s*\(/.test(text);
    const svelteKit = hasImport(name => name.startsWith('$app/') || name === '@sveltejs/kit');
    const astro = hasImport(name => name === 'astro' || name.startsWith('astro/')) || /\.astro$/i.test(fileName);
    if (!(express || nest || angular || next || nuxt || svelteKit || astro)) return;
    const add = (kind: ConstructKind, node: ts.Node, adapter: string) =>
        addConstruct(result, kind, node.getStart(file), node.end, 'framework', adapter);
    const addHandler = (node: ts.Node, adapter: string) => {
        if (ts.isArrowFunction(node)) add('handler', node.equalsGreaterThanToken, adapter);
        else if (ts.isFunctionExpression(node)) {
            const start = node.getStart(file);
            if (text.startsWith('function', start)) addConstruct(result, 'handler', start, start + 8, 'framework', adapter);
        } else if (ts.isIdentifier(node)) add('handler', node, adapter);
    };

    for (const [active, id] of [[express, 'express-family'], [nest, 'nestjs'], [angular, 'angular'],
        [next, 'nextjs'], [nuxt, 'nuxt'], [svelteKit, 'sveltekit'], [astro, 'astro']] as const) {
        if (active && !result.frameworks.includes(id)) result.frameworks.push(id);
    }

    const directive = file.statements.find(statement => ts.isExpressionStatement(statement) &&
        ts.isStringLiteral(statement.expression) && ['use client', 'use server'].includes(statement.expression.text));
    if (next && directive && ts.isExpressionStatement(directive)) add('server-client-boundary', directive.expression, 'nextjs');
    if (next && /(?:^|[\\/])route\.[jt]sx?$/.test(fileName)) {
        for (const statement of file.statements) {
            if (ts.isFunctionDeclaration(statement) && statement.name && /^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/.test(statement.name.text)) add('handler', statement.name, 'nextjs');
            if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name) && /^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/.test(declaration.name.text)) add('handler', declaration.name, 'nextjs');
            }
        }
    }
    if (next && /(?:^|[\\/])(?:page|layout)\.[jt]sx?$/.test(fileName)) {
        for (const statement of file.statements) if (ts.isFunctionDeclaration(statement) && statement.name) add('render', statement.name, 'nextjs');
    }

    function decoratorName(decorator: ts.Decorator): string {
        const expression = decorator.expression;
        return ts.isCallExpression(expression) ? expression.expression.getText(file) : expression.getText(file);
    }

    function visit(node: ts.Node): void {
        if (express && (ts.isCallExpression(node) || ts.isNewExpression(node)) && ts.isPropertyAccessExpression(node.expression)) {
            const method = node.expression.name.text.toLowerCase();
            if (routeVerbs.has(method)) {
                add('route', node.expression.name, 'express-family');
                const argumentsList = ts.isCallExpression(node) ? node.arguments : node.arguments ?? [];
                const callback = argumentsList[argumentsList.length - 1];
                if (callback) addHandler(callback, 'express-family');
            }
            if (['use', 'addhook', 'register'].includes(method)) add('middleware', node.expression.name, 'express-family');
        }
        if (nest) {
            const decorators = ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : [];
            const namedDecorators = decorators.map(decorator => ({ decorator, name: decoratorName(decorator) }));
            if (namedDecorators.some(item => item.name === 'Controller')) {
                const cls = node as ts.ClassDeclaration;
                if (cls.name) add('handler', cls.name, 'nestjs');
            }
            for (const item of namedDecorators) {
                if (/^(Get|Post|Put|Patch|Delete|All|Options|Head)$/.test(item.name ?? '')) {
                    add('route', item.decorator.expression, 'nestjs');
                    const method = node as ts.MethodDeclaration;
                    if (method.name) add('handler', method.name, 'nestjs');
                }
                if (item.name === 'UseGuards') add('authorization', item.decorator.expression, 'nestjs');
                if (['Body', 'Param', 'Query', 'ParseIntPipe', 'ValidationPipe'].includes(item.name ?? '')) add('validation', item.decorator.expression, 'nestjs');
                if (['UseInterceptors', 'UsePipes'].includes(item.name ?? '')) add('middleware', item.decorator.expression, 'nestjs');
            }
        }
        if (angular) {
            const decorators = ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : [];
            const names = decorators.map(decorator => ({ decorator, name: decoratorName(decorator) }));
            const className = ts.isClassDeclaration(node) ? node.name : undefined;
            if (names.some(item => item.name === 'Component') && className) add('component', className, 'angular');
            if (names.some(item => ['Injectable', 'NgModule', 'Directive', 'Pipe'].includes(item.name ?? '')) && className) add('declaration', className, 'angular');
            if (ts.isMethodDeclaration(node) && node.name && /^(?:ngOnInit|ngOnDestroy|ngOnChanges|ngAfterViewInit|ngAfterContentInit)$/.test(node.name.getText(file))) {
                add('lifecycle', node.name, 'angular');
            }
        }
        if (nuxt && ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
            ['useFetch', 'useAsyncData', 'useLazyFetch', 'useLazyAsyncData', 'defineEventHandler'].includes(node.expression.text)) {
            add(node.expression.text === 'defineEventHandler' ? 'handler' : 'data-access', node.expression, 'nuxt');
        }
        if (svelteKit && ts.isFunctionDeclaration(node) && node.name && ['load', 'actions'].includes(node.name.text)) add('handler', node.name, 'sveltekit');
        if (svelteKit && ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'actions') add('handler', node.name, 'sveltekit');
        if (astro && ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'getStaticPaths') add('route', node.expression, 'astro');
        ts.forEachChild(node, visit);
    }
    visit(file);
}

registerFrameworkAdapter({ id: 'javascript-typescript-fullstack', analyze: analyzeBuiltInFrameworks });
