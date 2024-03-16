const path = require('node:path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src/sb3fix.js',
  output: {
    filename: 'sb3fix.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'sb3fix'
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/index.html',
          to: 'index.html'
        }
      ]
    })
  ]
};
