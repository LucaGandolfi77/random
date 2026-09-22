import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import alias from '@rollup/plugin-alias';
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  input: 'src/main.js',
  output: {
    file: 'dist/bundle.js',
    format: 'iife',
    name: 'Radice',
    sourcemap: true
  },
  plugins: [
    alias({ entries: [] }),
    resolve({ extensions: ['.js', '.mjs', '.json'], browser: true, dedupe: 'auto' }),
    commonjs(),
    visualizer({ open: false, filename: 'dist/stats.html' })
  ],
  onwarn(warning, warn) {
    if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
    warn(warning);
  }
};
