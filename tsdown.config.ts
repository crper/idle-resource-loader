import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    main: './src/index.ts',
  },
  platform: 'browser',
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  outDir: 'dist',
  target: 'es2020',
  exports: true,
  minify: 'dce-only',
  external: [],
})
