// webpack.main.config.js — Proceso Main de Electron
const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    index: './src/main/index.ts',
    preload: './src/main/preload.ts',
  },
  target: 'electron-main',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@config': path.resolve(__dirname, 'src/config'),
    },
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist/main'),
  },
  externals: {
    // Módulos nativos que no deben ser bundleados
    'node-record-lpcm16': 'commonjs node-record-lpcm16',
    'nspell': 'commonjs nspell',
    'dictionary-es': 'commonjs dictionary-es',
    'dictionary-en': 'commonjs dictionary-en',
    'electron-store': 'commonjs electron-store',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};
