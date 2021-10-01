const replace = require('@rollup/plugin-replace')
const typescript = require('@rollup/plugin-typescript')
const { terser } = require('rollup-plugin-terser')

module.exports = {
  external: [
    'node:assert',
    'node:fs',
    'node:http',
    'node:path',
    'node:process',
    'node:module',
    'node:util',
  ],

  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'esm',
    generatedCode: 'es2015',
    sourcemap: true,
  },
  plugins: [
    replace({
      delimiters: ['', ''],
      values: {
        '../../package.json': './package',
      },
    }),
    typescript({
      tsconfig: './tsconfig.rollup.json',
    }),
    terser({
      format: {
        comments: false,
      },
    }),
  ],
}
