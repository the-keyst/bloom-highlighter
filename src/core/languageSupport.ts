import {
    AdditionalLanguageIds, CFamilyLanguageIds, HashCommentLanguageIds, LanguageId, NestedCommentLanguageIds,
    PercentCommentLanguageIds, SemicolonCommentLanguageIds, StarCommentLanguageIds,
} from './languageIds';

/** Languages with individual vocabularies and family lexical adapters. */
export const additionalLanguages = new Set<string>(AdditionalLanguageIds);

const isOneOf = (values: readonly string[], language: string) => values.includes(language);

export function conventionalPattern(language: string): RegExp {
    let strings = /'''[\s\S]*?(?:'''|$)|"""[\s\S]*?(?:"""|$)|`(?:\\[\s\S]|[^`\\])*(?:`|$)|'(?:\\[\s\S]|[^'\\])*(?:'|$)|"(?:\\[\s\S]|[^"\\])*(?:"|$)/.source;
    if (language === LanguageId.rust) strings = /b?r(#{0,})"[\s\S]*?(?:"\1|$)|b?'(?:\\(?:u\{[\da-fA-F]+\}|x[\da-fA-F]{2}|.)|[^'\\\r\n])'|"(?:\\[\s\S]|[^"\\])*(?:"|$)/.source;
    if (language === LanguageId.csharp) strings = /\$?@"(?:""|[^"])*(?:"|$)|"""[\s\S]*?(?:"""|$)|'(?:\\.|[^'\\])'|"(?:\\[\s\S]|[^"\\])*(?:"|$)/.source;
    let comments = /\/\/[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$)/.source;
    if (isOneOf(HashCommentLanguageIds, language)) comments = /#[^\r\n]*/.source;
    if (language === LanguageId.php) comments += '|#[^\\r\\n]*';
    if (language === LanguageId.powershell) comments = /<#[\s\S]*?(?:#>|$)|#[^\r\n]*/.source;
    if (language === LanguageId.lua) comments = /--\[(=*)\[[\s\S]*?(?:\]\1\]|$)|--[^\r\n]*|\[(=*)\[[\s\S]*?(?:\]\2\]|$)/.source;
    if (language === LanguageId.sql) comments = /--[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$)/.source;
    if (language === LanguageId.haskell) comments = /--[^\r\n]*|\{-[\s\S]*?(?:-\}|$)/.source;
    if (isOneOf(SemicolonCommentLanguageIds, language)) comments = /;[^\r\n]*/.source;
    if (isOneOf(PercentCommentLanguageIds, language)) comments = /%[^\r\n]*/.source;
    if (isOneOf(StarCommentLanguageIds, language)) comments += '|\\(\\*[\\s\\S]*?(?:\\*\\)|$)';
    // C++ raw literals must be recognized before their quote is consumed.
    const raw = isOneOf(CFamilyLanguageIds, language) ?
        '|R"([^ ()\\\\\\r\\n]{0,16})\\([\\s\\S]*?\\)\\1"' : '';
    return new RegExp(comments + raw + '|' + strings, 'g');
}

export function maskConventional(text: string, language: string): string {
    const pattern = conventionalPattern(language);
    const nested = isOneOf(NestedCommentLanguageIds, language);
    const chars = text.split('');
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
        let end = match.index + match[0].length;
        if (nested) {
            const delimiters = language === LanguageId.haskell ? ['{-', '-}'] :
                isOneOf(StarCommentLanguageIds, language) ? ['(*', '*)'] : ['/*', '*/'];
            if (text.startsWith(delimiters[0], match.index)) {
                let depth = 1;
                end = match.index + 2;
                while (end < text.length && depth > 0) {
                    if (text.startsWith(delimiters[0], end)) { depth++; end += 2; }
                    else if (text.startsWith(delimiters[1], end)) { depth--; end += 2; }
                    else end++;
                }
                pattern.lastIndex = end;
            }
        }
        for (let index = match.index; index < end; index++) if (!/[\r\n]/.test(text[index])) chars[index] = ' ';
    }
    return chars.join('');
}
