const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');
const { analyzeCode } = require('../out/core/languageAnalysis');
const definitions = require('../out/core/definitions.json');
const directory = path.join(__dirname, '../media/store');
fs.mkdirSync(directory, { recursive: true });
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const write = (name, width, height, content) => fs.writeFileSync(path.join(directory, name),
    new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#2E164B"/>${content}</svg>`).render().asPng());
const text = (x, y, size, value, color = '#FBF8F1') => `<text x="${x}" y="${y}" fill="${color}" font-family="Segoe UI,Arial" font-size="${size}">${escape(value)}</text>`;
const logo = fs.readFileSync(path.join(__dirname, '../media/branding/bloom-neutral-gold-purple.svg'), 'utf8')
    .replace(/<svg[^>]*>|<\/svg>/g, '');
write('bloom-overview.png', 1600, 440,
    `<g transform="translate(72 70) scale(1.15)">${logo}</g>` +
    text(430, 145, 68, 'Bloom Syntax Highlighter') + text(430, 215, 34, 'Make code easier to read.', '#E1D5EF') +
    text(430, 290, 27, 'Flow  •  Functions  •  Structure  •  Risk review', '#E8BC59') +
    text(430, 350, 24, 'Four views. Your colors. Language-wide switches.', '#E1D5EF'));
const code = `Future<void> _reset() async {\n  setState(() => _loading = true);\n  await Future<void>.delayed(_resetDelay);\n  if (!mounted) return;\n  setState(() => _count = 0);\n  if (mounted) setState(() => _loading = false);\n}`;
const masked = analyzeCode(code, 'dart').code;
const views = [
    ['Operational', 'Follow flow and state changes', ['alert', 'logic', 'guards', 'mutation']],
    ['Interfaces', 'Find functions, calls and APIs', ['alert', 'interface', 'native', 'prototype', 'functions']],
    ['Structural', 'Find declarations and stable values', ['alert', 'structural', 'anchor', 'internal']],
    ['Dangerous', 'Review potentially risky operations', ['danger']]
];
let panels = text(55, 65, 36, 'One Dart example. Four ways to read it.') + text(55, 105, 22, 'Illustrated from Bloom’s rules; colors can be customized.', '#E1D5EF');
views.forEach(([title, subtitle, categories], index) => {
    const x = 40 + (index % 2) * 800;
    const y = 135 + Math.floor(index / 2) * 435;
    const colors = Array(code.length).fill('#8796ac');
    for (const category of categories) {
        const rule = definitions.dart[category];
        if (!rule) continue;
        for (const match of masked.matchAll(new RegExp(rule.regex, 'g'))) {
            for (let i = match.index; i < match.index + match[0].length; i++) colors[i] = rule.style.color;
        }
    }
    panels += `<rect x="${x}" y="${y}" width="760" height="410" rx="16" fill="#392057"/>` +
        text(x + 30, y + 48, 30, title) + text(x + 30, y + 83, 21, subtitle, '#E1D5EF');
    let offset = 0;
    code.split('\n').forEach((line, lineIndex) => {
        panels += `<text x="${x + 30}" y="${y + 135 + lineIndex * 30}" xml:space="preserve" font-family="Consolas,monospace" font-size="20">`;
        for (let i = 0; i < line.length; i++) panels += `<tspan fill="${colors[offset + i]}">${escape(line[i])}</tspan>`;
        panels += '</text>';
        offset += line.length + 1;
    });
});
write('bloom-views.png', 1640, 1040, panels);
console.log('Rendered Marketplace PNG illustrations from Bloom’s Dart rules.');
