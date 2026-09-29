// Bundles the scene registry to plain JS so Node can run it headlessly.
import { build } from 'esbuild'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
await build({
  entryPoints: [resolve(here, 'playtest-entry.ts')],
  outfile: resolve(here, 'playtest-entry.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  logLevel: 'error',
})
