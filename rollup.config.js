module.exports = {
  input: 'src/index.js',
  output: {
    file: 'docs/asar.js',
    format: 'umd',
    name: 'asar',
    exports: 'named'
  },
  plugins: [
    require('@rollup/plugin-json')()
  ]
}
