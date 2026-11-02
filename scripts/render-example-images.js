const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');
const { analyzeCode } = require('../out/core/languageAnalysis');
const definitions = require('../out/core/definitions.json');

const root = path.join(__dirname, '..');
const output = path.join(root, 'media/store');
const background = '#2E164B';
const card = '#392057';
const baseCode = '#C8C2D5';
const white = '#FBF8F1';
const lavender = '#E1D5EF';
const gold = '#E8BC59';
const schemaLanguage = {
    javascriptreact: 'javascript',
    typescriptreact: 'typescript',
    vue: 'typescript',
    svelte: 'typescript',
    astro: 'typescript'
};

const examples = {
    languages: [
        { title: 'Dart / Flutter', file: 'samples/frameworks/Counter.dart', language: 'dart', start: 14, lines: 6 },
        { title: 'Python', file: 'samples/languages/task_queue.py', language: 'python', start: 3, lines: 6 },
        { title: 'Go', file: 'samples/languages/task_queue.go', language: 'go', start: 9, lines: 6 },
        { title: 'Rust', file: 'samples/languages/task_queue.rs', language: 'rust', start: 4, lines: 6 },
        { title: 'Java', file: 'samples/languages/TaskQueue.java', language: 'java', start: 9, lines: 6 },
        { title: 'C#', file: 'samples/languages/TaskQueue.cs', language: 'csharp', start: 5, lines: 6 }
    ],
    frameworks: [
        { title: 'Flutter · Dart', file: 'samples/frameworks/Counter.dart', language: 'dart', start: 24, lines: 6 },
        { title: 'React · TSX', file: 'samples/frameworks/Counter.tsx', language: 'typescriptreact', start: 0, lines: 7 },
        { title: 'Vue', file: 'samples/frameworks/Counter.vue', language: 'vue', start: 0, lines: 7 },
        { title: 'Svelte', file: 'samples/frameworks/Counter.svelte', language: 'svelte', start: 0, lines: 7 },
        { title: 'FastAPI', file: 'samples/frameworks/fastapi/tasks.py', language: 'python', start: 0, lines: 7 },
        { title: 'Express', file: 'samples/frameworks/express/tasks.ts', language: 'typescript', start: 9, lines: 7 },
        { title: 'NestJS', file: 'samples/frameworks/nest/tasks.controller.ts', language: 'typescript', start: 4, lines: 7 },
        { title: 'Angular', file: 'samples/frameworks/angular/tasks.component.ts', language: 'typescript', start: 5, lines: 7 },
        { title: 'Next.js', file: 'samples/frameworks/next/app/tasks/page.tsx', language: 'typescriptreact', start: 0, lines: 7 },
        { title: 'Nuxt', file: 'samples/frameworks/nuxt/pages/tasks.vue', language: 'vue', start: 0, lines: 7 },
        { title: 'SvelteKit', file: 'samples/frameworks/sveltekit/src/routes/tasks/+page.server.ts', language: 'typescript', start: 0, lines: 7 },
        { title: 'Astro', file: 'samples/frameworks/astro/src/pages/tasks.astro', language: 'astro', start: 0, lines: 7 }
    ]
};

const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const text = (x, y, size, value, color = white) =>
    `<text x="${x}" y="${y}" fill="${color}" font-family="Segoe UI,Arial" font-size="${size}">${escape(value)}</text>`;

function render(filename, width, height, content) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${background}"/>${content}</svg>`;
    fs.writeFileSync(path.join(output, filename), new Resvg(svg).render().asPng());
}

function colorize(line, offset, colors) {
    let result = '';
    for (let index = 0; index < line.length;) {
        const color = colors[offset + index] ?? baseCode;
        let end = index + 1;
        while (end < line.length && (colors[offset + end] ?? baseCode) === color) end++;
        result += `<tspan fill="${color}">${escape(line.slice(index, end))}</tspan>`;
        index = end;
    }
    return result;
}

function renderGrid(filename, heading, subtitle, items, columns, width, height, cardHeight, fontSize, lineCount) {
    const margin = 40;
    const gap = 24;
    const cardWidth = (width - margin * 2 - gap * (columns - 1)) / columns;
    let content = text(margin + 10, 57, 36, heading) + text(margin + 10, 96, 21, subtitle, lavender);

    items.forEach((item, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = margin + column * (cardWidth + gap);
        const y = 125 + row * (cardHeight + 18);
        const clipId = `clip-${filename.replace(/\W/g, '-')}-${index}`;
        const source = fs.readFileSync(path.join(root, item.file), 'utf8');
        const analysis = analyzeCode(source, item.language, true, item.file.replaceAll('/', path.sep));
        const colors = Array(source.length).fill(baseCode);
        const schema = schemaLanguage[item.language] ?? item.language;

        for (const token of analysis.tokens) {
            const tokenColor = definitions[schema]?.[token.key]?.style?.color;
            if (!tokenColor) continue;
            for (let offset = token.start; offset < token.end; offset++) colors[offset] = tokenColor;
        }
        for (const rule of Object.values(definitions[schema] ?? {})) {
            if (!rule?.regex || !rule.style?.color) continue;
            for (const match of analysis.code.matchAll(new RegExp(rule.regex, 'g'))) {
                for (let offset = match.index; offset < match.index + match[0].length; offset++) colors[offset] = rule.style.color;
            }
        }

        const sourceLines = source.split('\n');
        let offset = sourceLines.slice(0, item.start).reduce((sum, line) => sum + line.length + 1, 0);
        const visibleLines = sourceLines.slice(item.start, item.start + (item.lines ?? lineCount));

        content += `<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="14" fill="${card}"/>` +
            text(x + 20, y + 34, 22, item.title, gold) +
            `<clipPath id="${clipId}"><rect x="${x + 20}" y="${y + 48}" width="${cardWidth - 40}" height="${cardHeight - 58}"/></clipPath>` +
            `<g clip-path="url(#${clipId})">`;

        visibleLines.forEach((rawLine, lineIndex) => {
            const line = rawLine.replace(/\r$/, '');
            const maxChars = Math.floor((cardWidth - 40) / (fontSize * 0.62));
            const display = line.length > maxChars ? line.slice(0, maxChars - 1) + '…' : line;
            const baseline = y + 67 + lineIndex * (fontSize + 7);
            content += `<text x="${x + 20}" y="${baseline}" xml:space="preserve" font-family="Consolas,monospace" font-size="${fontSize}">${colorize(display, offset, colors)}</text>`;
            offset += rawLine.length + 1;
        });
        content += '</g>';
    });

    render(filename, width, height, content);
}

renderGrid('bloom-language-examples.png', 'Bloom across languages',
    'The same code-reading views, applied to language-specific examples.', examples.languages, 2, 1640, 1000, 265, 17, 6);
renderGrid('bloom-framework-examples.png', 'Framework examples',
    'Local syntax cues in components, routes and server handlers.', examples.frameworks, 3, 1640, 1300, 260, 14, 7);
console.log('Rendered Bloom language and framework example illustrations.');
