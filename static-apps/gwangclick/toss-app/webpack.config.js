// 광클대전 토스 빌드 — 우리 기존 정적 게임(상위 폴더)을 그대로 dist로 복사 + 작은 부트 번들.
// 게임은 자체 완결형(index.html + *.js + vendor)이라, 별도 리팩터 없이 복사 빌드가 가장 안전.
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const GAME = path.resolve(__dirname, '..'); // static-apps/gwangclick (게임 원본)

module.exports = {
  entry: './src/main.ts',
  output: { path: path.resolve(__dirname, 'dist'), filename: 'bundle.js', clean: true },
  resolve: { extensions: ['.ts', '.js'] },
  module: { rules: [{ test: /\.ts$/, use: 'ts-loader', exclude: /node_modules/ }] },
  plugins: [
    new CopyPlugin({
      patterns: [{
        from: GAME,
        to: path.resolve(__dirname, 'dist'),
        globOptions: { dot: false, ignore: [
          '**/toss-app/**', '**/node_modules/**', '**/tests/**',
          '**/promo/**', '**/*.md', '**/offline.html',
        ] },
      }],
    }),
  ],
  devServer: { port: 8080, hot: true, open: false, static: { directory: path.resolve(__dirname, 'dist') } },
};
