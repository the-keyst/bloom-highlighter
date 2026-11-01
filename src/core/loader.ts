import type { DecorationRenderOptions } from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parseMarkdown, categories, OperationalKey, SerializedMapping } from './schemaParser';
import { LanguageSchemaAliases } from './languageIds';

export interface LanguageSchema {
    id: string;
    mapping: Partial<Record<OperationalKey, { regex: RegExp; style: DecorationRenderOptions; examples?: string[] }>>;
}

export class UniversalLoader {
    private static schemas = new Map<string, LanguageSchema>();

    public static loadStatic(schemas: Record<string, SerializedMapping>): void {
        const next = new Map<string, LanguageSchema>();
        for (const [id, mapping] of Object.entries(schemas)) {
            const parsed: LanguageSchema['mapping'] = {};
            for (const key of Object.keys(mapping) as OperationalKey[]) {
                if (!categories.includes(key)) throw new Error(`${id}: unknown category ${key}`);
                const entry = mapping[key]!;
                const regex = new RegExp(entry.regex, 'g');
                if (regex.test('')) throw new Error(`${id}/${key}: regex matches empty input`);
                parsed[key] = { regex, examples: entry.examples, style: { ...entry.style, opacity: String(entry.style.opacity ?? '1') } };
            }
            next.set(id, { id, mapping: parsed });
        }
        // Publish only a complete, valid replacement. Existing painters compare schema identity.
        this.schemas = next;
    }

    public static loadFromDirectory(directory: string): void {
        const schemas: Record<string, SerializedMapping> = {};
        for (const file of fs.readdirSync(directory).filter(f => f.endsWith('.md') && f !== 'FEATURES.md')) {
            const id = path.basename(file, '.md');
            schemas[id] = parseMarkdown(id, fs.readFileSync(path.join(directory, file), 'utf8'));
        }
        this.loadStatic(schemas);
    }

    public static getSchema(languageId: string): LanguageSchema | null {
        return this.schemas.get(languageId) ?? this.schemas.get(LanguageSchemaAliases[languageId]) ?? null;
    }
}
