import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'node:os';
import packageJson from '../package.json';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Bun embeds compiled code in a virtual filesystem: /$bunfs/ (Linux/macOS) or /~BUN/ (Windows) */
const bunMain = globalThis.Bun?.main ?? '';
const isCompiled = bunMain.includes('$bunfs') || bunMain.includes('/~BUN/');

export function projectPath(): string {
    return resolve(__dirname, '..');
}

export function runtimePath(): string {
    if (!isCompiled) {
        return projectPath();
    }

    const happyHomeDir = process.env.HAPI_HOME
        ? process.env.HAPI_HOME.replace(/^~/, homedir())
        : join(homedir(), '.hapi');

    return join(happyHomeDir, 'runtime', packageJson.version);
}

export function isBunCompiled(): boolean {
    return isCompiled;
}
