// https://github.com/baileyherbert/svelte-webpack-starter/blob/master/webpack.config.ts
const SveltePreprocess = require('svelte-preprocess');
const Autoprefixer = require('autoprefixer');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path')

const mode = process.env.NODE_ENV || 'development';
const isProduction = mode === 'production';
const isDevelopment = !isProduction;

module.exports = {
  entry: {
    bundle: ['./src/main.js'],
  },
  mode: isProduction ? 'production' : 'development',
  output: {
    path: path.resolve(__dirname, 'public/build'),
    publicPath: '/build/',
    filename: '[name].js',
    chunkFilename: '[name].[id].js'
  },
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.svelte'],
    mainFields: ['svelte', 'browser', 'module', 'main']
  },
  module: {
    rules: [
      // Rule: Svelte
      {
        test: /\.svelte$/,
        use: {
          loader: 'svelte-loader',
          options: {
            compilerOptions: {
              // Dev mode must be enabled for HMR to work!
              dev: isDevelopment
            },
            emitCss: isProduction,
            hotReload: isDevelopment,
            hotOptions: {
              // List of options and defaults: https://www.npmjs.com/package/svelte-loader-hot#usage
              noPreserveState: false,
              optimistic: true,
            },
            preprocess: SveltePreprocess({
              scss: true,
              sass: true,
              postcss: {
                plugins: [
                  Autoprefixer
                ]
              }
            })
          }
        }
      },

      // Rule: SASS
      {
        test: /\.(scss|sass)$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  Autoprefixer
                ]
              }
            }
          },
          'sass-loader'
        ]
      },

      // Rule: CSS
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          'css-loader',
        ]
      },

      // Rule: TypeScript
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  devServer: {
    hot: true,
    stats: 'none',
    contentBase: 'public',
    watchContentBase: true
  },
  target: isDevelopment ? 'web' : 'browserslist',
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css'
    })
  ],
  devtool: isProduction && !sourceMapsInProduction ? false : 'source-map',
  stats: {
    chunks: false,
    chunkModules: false,
    modules: false,
    assets: true,
    entrypoints: false
  }
};
