const path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/js/app.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      {test: /\.css$/, loader: "style-loader!css-loader"},
      {test: /\.js$/, loader: 'babel-loader', exclude: /node_modules/, query:{presets:['es2015']}}
    ]
  },
  plugins: [
    new CopyWebpackPlugin([{
      from: path.join(__dirname, 'public'),
      to: path.resolve(__dirname, 'dist')
    }]),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'public', 'index.html'),
    }),
    new CleanWebpackPlugin(['dist'])
  ]
}
