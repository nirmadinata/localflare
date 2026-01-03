import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/worker/index.ts'],
  outDir: 'dist/worker',
  format: ['esm'],
  dts: false,
  clean: true,
  sourcemap: true,
  // Bundle everything for Workers
  noExternal: [/.*/],
  platform: 'browser', // Workers use browser-like APIs
  target: 'es2022',
})
