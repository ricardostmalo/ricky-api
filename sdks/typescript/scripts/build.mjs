// Builds dist/esm (ES modules) and dist/cjs (CommonJS), each with declarations.
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';

rmSync('dist', { force: true, recursive: true });
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.esm.json'], {
  stdio: 'inherit',
});
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.cjs.json'], {
  stdio: 'inherit',
});
writeFileSync('dist/cjs/package.json', `${JSON.stringify({ type: 'commonjs' })}\n`);
