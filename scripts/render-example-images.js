const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const output = path.join(root, 'media', 'store');
fs.mkdirSync(output, { recursive: true });

for (const [source, destination] of [
    ['website/assets/languages/python.png', 'bloom-language-examples.png'],
    ['website/assets/frameworks/react.png', 'bloom-framework-examples.png']
]) {
    fs.copyFileSync(path.join(root, source), path.join(output, destination));
}

console.log('Copied complete Bloom-analyzed four-view examples.');
