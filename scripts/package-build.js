const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const manifestPath = path.join(root, 'package.json');
const originalManifest = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(originalManifest);
const args = process.argv.slice(2);
const option = name => {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
};
const buildNumber = option('--build-number') ?? process.env.CI_PIPELINE_IID ?? process.env.GITHUB_RUN_NUMBER ?? process.env.BUILD_NUMBER;
const attempt = option('--build-attempt') ?? process.env.GITHUB_RUN_ATTEMPT ?? '1';

if (!/^\d+$/.test(buildNumber ?? '')) {
    console.error('Provide an incrementing build number with --build-number or CI_PIPELINE_IID, GITHUB_RUN_NUMBER, or BUILD_NUMBER.');
    process.exit(1);
}
if (!/^\d+$/.test(attempt)) {
    console.error('Build attempt must be a positive integer.');
    process.exit(1);
}

const buildVersion = `${manifest.version}+build.${buildNumber}.attempt.${attempt}`;
const versionField = /("version"\s*:\s*")[^"]+("\s*,?)/;
if (!versionField.test(originalManifest)) {
    console.error('Could not locate the package version field.');
    process.exit(1);
}

let exitCode = 1;
try {
    fs.writeFileSync(manifestPath, originalManifest.replace(versionField, `$1${buildVersion}$2`));
    console.log(`Packaging ${manifest.name} ${buildVersion}`);
    const npmCli = process.env.npm_execpath;
    const result = npmCli ?
        spawnSync(process.execPath, [npmCli, 'run', 'package'], { cwd: root, stdio: 'inherit' }) :
        spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'package'], {
            cwd: root, stdio: 'inherit', shell: process.platform === 'win32'
        });
    if (result.error) throw result.error;
    exitCode = result.status ?? 1;
} catch (error) {
    console.error(error);
} finally {
    fs.writeFileSync(manifestPath, originalManifest);
}

process.exitCode = exitCode;
