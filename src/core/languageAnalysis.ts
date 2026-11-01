import { analyzeScript, CodeAnalysis, emptyAnalysis, Scope } from './codeAnalysis';
import { addConstruct } from './constructs';
import { analyzeVue, analyzeSvelte } from './frameworks';
import { maskConventional } from './languageSupport';
import { maskDart } from './dartLexical';
import { dartPatterns } from './patternAnalysis';
import { ConventionalLanguageIds, LanguageId, ScriptLanguageIds } from './languageIds';

const conventionalKeywordKinds: Record<string, Parameters<typeof addConstruct>[1]> = {
    class: 'declaration', struct: 'declaration', enum: 'declaration', interface: 'declaration', trait: 'declaration',
    impl: 'declaration', module: 'declaration', namespace: 'declaration', def: 'declaration', func: 'declaration',
    function: 'declaration', fn: 'declaration', fun: 'declaration', sub: 'declaration',
    if: 'branch', else: 'branch', elif: 'branch', unless: 'branch', switch: 'branch', case: 'branch', match: 'branch', when: 'branch',
    for: 'loop', foreach: 'loop', while: 'loop', loop: 'loop', until: 'loop',
    return: 'return', throw: 'return', raise: 'return', yield: 'return',
    async: 'async', await: 'async', go: 'async', spawn: 'async',
    try: 'error-handling', catch: 'error-handling', except: 'error-handling', finally: 'error-handling', rescue: 'error-handling',
    import: 'module', export: 'module', include: 'module', require: 'module', use: 'module', package: 'module',
    type: 'type', typedef: 'type', protocol: 'type', record: 'type',
};
const conventionalKeywords = new RegExp(`\\b(${Object.keys(conventionalKeywordKinds).join('|')})\\b`, 'g');
const conventionalAssignments = /(?:\+\+|--|\+=|-=|\*=|\/=|%=|(?<![=!<>])=(?!=|>))/g;
const conventionalCalls = /\b(?!(?:if|for|while|switch|catch|with|assert|return|throw|sizeof|typeof)\b)[A-Za-z_$][\w$]*\s*(?=\()/g;

export function analyzeCode(text: string, language: string, frameworks = true, fileName = ''): CodeAnalysis {
    const result = selectAdapter(language).analyze(text, language, fileName);
    if (!frameworks) {
        result.tokens = [];
        result.frameworks = [];
        result.constructs = result.constructs.filter(construct => construct.origin !== 'framework');
    }
    return result;
}

export interface LanguageAdapter {
    readonly id: string;
    readonly languageIds: readonly string[];
    analyze(text: string, language: string, fileName: string): CodeAnalysis;
}

const adapters: LanguageAdapter[] = [];

/** Register a language adapter. Earlier, explicit adapters take precedence over fallback adapters. */
export function registerLanguageAdapter(adapter: LanguageAdapter): void {
    if (adapters.some(existing => existing.id === adapter.id || existing.languageIds.some(id => adapter.languageIds.includes(id)))) {
        throw new Error(`Language adapter conflicts with an existing adapter: ${adapter.id}`);
    }
    adapters.unshift(adapter);
}

registerLanguageAdapter({
    id: 'javascript-typescript', languageIds: ScriptLanguageIds,
    analyze: (text, language, fileName) => analyzeScript(text, language.endsWith('react') || language === LanguageId.astro,
        /\.svelte\.[jt]s$/.test(fileName) ? 'svelte' : undefined, fileName),
});
registerLanguageAdapter({ id: LanguageId.vue, languageIds: [LanguageId.vue], analyze: (text, _language, fileName) => analyzeVue(text, fileName) });
registerLanguageAdapter({ id: LanguageId.svelte, languageIds: [LanguageId.svelte], analyze: (text, _language, fileName) => analyzeSvelte(text, fileName) });
registerLanguageAdapter({
    id: 'conventional-family',
    languageIds: ConventionalLanguageIds,
    analyze: (text, language, fileName) => analyzeConventional(text, language, fileName),
});
registerLanguageAdapter({ id: LanguageId.generic, languageIds: [LanguageId.plaintext, LanguageId.generic], analyze: text => analyzeConventional(text, LanguageId.generic) });

function selectAdapter(language: string): LanguageAdapter {
    return adapters.find(adapter => adapter.languageIds.includes(language)) ?? adapters.find(adapter => adapter.id === 'generic')!;
}

/** Conservative lexical fallback for languages without a bundled compiler. */
function analyzeConventional(text: string, language: string, fileName = ''): CodeAnalysis {
    const result = emptyAnalysis(text);
    const python = language === LanguageId.python;
    const ruby = language === LanguageId.ruby;
    result.code = language === LanguageId.dart ? maskDart(text) :
        maskConventional(text, language);
    if (language === LanguageId.dart) result.syntax = dartPatterns(result.code);
    const lines = result.code.split('\n');
    let offset = 0;
    if (python) {
        const stack: { indent: number; scope: Scope }[] = [];
        let lastCodeEnd = 0;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
                const indent = (line.match(/^\s*/)?.[0] ?? '').replace(/\t/g, '        ').length;
                while (stack.length && indent <= stack[stack.length - 1].indent) {
                    stack.pop()!.scope.end = lastCodeEnd;
                }
                if (trimmed.endsWith(':') && /^(?:async\s+)?(?:def|class|if|elif|else|for|while|try|except|finally|with|match|case)\b/.test(trimmed)) {
                    const scope = { start: offset + line.indexOf(trimmed), headerEnd: offset + line.length, end: text.length };
                    result.scopes.push(scope);
                    stack.push({ indent, scope });
                }
                lastCodeEnd = offset + line.length;
            }
            offset += line.length + 1;
        }
        stack.forEach(entry => { entry.scope.end = lastCodeEnd; });
    } else if (ruby) {
        const stack: Scope[] = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (/^(?:def|class|module|if|unless|case|begin|while|until|for)\b/.test(trimmed) || /\bdo\s*(?:\|[^|]*\|)?\s*$/.test(trimmed)) {
                const scope = { start: offset + line.indexOf(trimmed), headerEnd: offset + line.length, end: text.length };
                result.scopes.push(scope);
                stack.push(scope);
            }
            if (/^end\b/.test(trimmed)) {
                const scope = stack.pop();
                if (scope) scope.end = offset + line.length;
            }
            offset += line.length + 1;
        }
    } else {
        const stack: Scope[] = [];
        let boundary = 0;
        for (let i = 0; i < result.code.length; i++) {
            if (result.code[i] === '{') {
                const prefix = result.code.slice(boundary, i);
                const header = prefix.match(/\b(?:class|struct|union|namespace|enum|mixin|extension|interface|trait|impl|object)\s+[^;{}]*$/);
                const scope = { start: header ? i - header[0].length : i, headerEnd: i, end: text.length };
                stack.push(scope);
                result.scopes.push(scope);
                boundary = i + 1;
            } else if (result.code[i] === '}') {
                const scope = stack.pop();
                if (scope) scope.end = i + 1;
                boundary = i + 1;
            } else if (result.code[i] === ';') {
                boundary = i + 1;
            }
        }
    }
    addLexicalConstructs(result, language);
    for (const scope of result.scopes) addConstruct(result, 'scope', scope.start, scope.end, 'language', language || 'generic');
    analyzeConventionalFrameworks(text, result, language, fileName);
    return result;
}

/** Conservative common constructs for languages without a dedicated syntax tree adapter. */
function addLexicalConstructs(result: CodeAnalysis, language: string): void {
    const code = result.code;
    conventionalKeywords.lastIndex = 0;
    let keyword: RegExpExecArray | null;
    while ((keyword = conventionalKeywords.exec(code)) !== null) {
        addConstruct(result, conventionalKeywordKinds[keyword[1]], keyword.index, keyword.index + keyword[0].length, 'language', language);
    }
    conventionalAssignments.lastIndex = 0;
    let assignment: RegExpExecArray | null;
    while ((assignment = conventionalAssignments.exec(code)) !== null) addConstruct(result, 'mutation', assignment.index, assignment.index + assignment[0].length, 'generic', language || 'generic');
    conventionalCalls.lastIndex = 0;
    let call: RegExpExecArray | null;
    while ((call = conventionalCalls.exec(code)) !== null) {
        const end = call.index + call[0].trimEnd().length;
        addConstruct(result, 'call', call.index, end, 'generic', language || 'generic');
    }
}

/** Local convention adapters for common Python, .NET, JVM, PHP and Rails full-stack patterns. */
function analyzeConventionalFrameworks(text: string, result: CodeAnalysis, language: string, fileName: string): void {
    const code = result.code;
    const addMatch = (kind: Parameters<typeof addConstruct>[1], match: RegExpExecArray, adapter: string, group = 0) => {
        const groupOffset = match[0].indexOf(match[group]);
        const start = match.index + Math.max(0, groupOffset);
        addConstruct(result, kind, start, start + match[group].length, 'framework', adapter);
    };
    const has = (pattern: RegExp) => pattern.test(code);
    const addFramework = (name: string) => { if (!result.frameworks.includes(name)) result.frameworks.push(name); };

    if (language === LanguageId.python) {
        const fastApi = has(/\bfrom\s+fastapi\s+import\b|\bimport\s+fastapi\b/);
        const flask = has(/\bfrom\s+flask\s+import\b|\bimport\s+flask\b/);
        const django = has(/\bfrom\s+django\.urls\s+import\b/);
        if (fastApi || flask) {
            const adapter = fastApi ? 'fastapi' : 'flask';
            addFramework(adapter);
            const decorator = /@(?:\w+\.)?(get|post|put|patch|delete|api_route|route)\s*\(/gi;
            let match: RegExpExecArray | null;
            while ((match = decorator.exec(text)) !== null) {
                if (!code.slice(match.index, match.index + match[0].indexOf('(')).trim()) continue;
                addMatch('route', match, adapter, 1);
                const definition = /\b(?:async\s+)?def\s+[A-Za-z_]\w*/g;
                definition.lastIndex = decorator.lastIndex;
                const handler = definition.exec(code);
                if (handler) addConstruct(result, 'handler', handler.index + handler[0].lastIndexOf(' ') + 1,
                    handler.index + handler[0].length, 'framework', adapter);
            }
        }
        if (django) {
            addFramework('django');
            const route = /\b(?:path|re_path)\s*\(/g;
            let match: RegExpExecArray | null;
            while ((match = route.exec(code)) !== null) addMatch('route', match, 'django');
        }
    }
    if (language === LanguageId.csharp && has(/\busing\s+Microsoft\.AspNetCore\b/)) {
        addFramework('aspnet-core');
        for (const match of text.matchAll(/\[(Http(?:Get|Post|Put|Patch|Delete)|Route|Authorize|AllowAnonymous)\b[^\]]*\]/g)) {
            const kind = match[1] === 'Authorize' ? 'authorization' : match[1] === 'AllowAnonymous' ? 'authorization' : 'route';
            const start = match.index! + match[0].indexOf(match[1]);
            if (!code.slice(start, start + match[1].length).trim()) continue;
            addConstruct(result, kind, start, start + match[1].length, 'framework', 'aspnet-core');
        }
        for (const match of code.matchAll(/\bclass\s+\w+\s*:\s*Controller(?:Base)?\b/g)) addMatch('handler', match as RegExpExecArray, 'aspnet-core');
    }
    if (language === LanguageId.razor || language === LanguageId.csharp && has(/\busing\s+Microsoft\.AspNetCore\.Components\b/)) {
        addFramework('blazor');
        for (const match of text.matchAll(/@(page|code|functions|inject|bind(?::\w+)?|on\w+)\b/g)) {
            const kind = match[1] === 'page' ? 'route' : match[1] === 'code' || match[1] === 'functions' ? 'handler' :
                match[1] === 'inject' ? 'data-access' : match[1].startsWith('on') ? 'handler' : 'mutation';
            const start = match.index!;
            if (code.slice(start, start + match[0].length).trim()) addConstruct(result, kind, start, start + match[0].length, 'framework', 'blazor');
        }
    }
    if (language === LanguageId.java && has(/\bimport\s+org\.springframework\./)) {
        addFramework('spring-boot');
        for (const match of code.matchAll(/@(Get|Post|Put|Patch|Delete|Request)Mapping\b/g)) addMatch('route', match as RegExpExecArray, 'spring-boot');
        for (const match of code.matchAll(/@(RestController|Controller)\b/g)) addMatch('handler', match as RegExpExecArray, 'spring-boot');
        for (const match of code.matchAll(/@(Validated|Valid)\b/g)) addMatch('validation', match as RegExpExecArray, 'spring-boot');
    }
    if (language === LanguageId.php && has(/\buse\s+Illuminate\\Support\\Facades\\Route\s*;/i)) {
        addFramework('laravel');
        for (const match of text.matchAll(/\bRoute\s*::\s*(get|post|put|patch|delete|any|match)\s*\(/gi)) {
            const start = match.index! + match[0].indexOf(match[1]);
            if (!code.slice(match.index!, start).trim()) continue;
            addConstruct(result, 'route', start, start + match[1].length, 'framework', 'laravel');
        }
    }
    if (language === LanguageId.php && has(/\buse\s+Symfony\\Component\\Routing\\Attribute\\Route\b|\buse\s+Symfony\\Component\\Routing\\Annotation\\Route\b/i)) {
        addFramework('symfony');
        for (const match of text.matchAll(/(?:#\[|@)(Route)\b/g)) {
            const start = match.index! + match[0].indexOf(match[1]);
            if (code.slice(match.index!, start).trim()) addConstruct(result, 'route', start, start + match[1].length, 'framework', 'symfony');
        }
        for (const match of code.matchAll(/#\[(IsGranted|MapRequestPayload|MapQueryParameter)\b/g)) {
            const kind = match[1] === 'IsGranted' ? 'authorization' : 'validation';
            addMatch(kind, match as RegExpExecArray, 'symfony', 1);
        }
    }
    if (language === LanguageId.ruby && /(?:^|[\\/])routes\.rb$/i.test(fileName)) {
        addFramework('rails');
        for (const match of text.matchAll(/^\s*(get|post|put|patch|delete|resources|resource)\s+(?=["'])/gm)) {
            const start = match.index! + match[0].indexOf(match[1]);
            if (code.slice(start, start + match[1].length).trim()) addConstruct(result, 'route', start, start + match[1].length, 'framework', 'rails');
        }
    }
}
