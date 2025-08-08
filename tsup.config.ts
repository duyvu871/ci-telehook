import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  minify: false,
  bundle: true,
  splitting: false,
  treeshake: true,
  external: [
    // Prisma client should be external
    '@prisma/client'
  ],
  onSuccess: async () => {
    console.log('✅ Build completed successfully!')
  }
})
