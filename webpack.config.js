const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const autoprefixer = require('autoprefixer');
const Bump = require("bump-webpack-plugin");
const HappyPack = require('happypack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
// const CircularDependencyPlugin = require('circular-dependency-plugin')
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const happyThreadPool = HappyPack.ThreadPool({size: 3});

module.exports = function getWebConfig(opt) {
	opt = Object.assign({}, { release: false, loginOnly: false }, opt);

	const dev = !opt.release;
	// const dev = false;
	const loginOnly = !!opt.loginOnly;

	const buildLoaders = dev
		? [tsLoader]
		: [babelLoader, tsLoader];

	// const buildLoaders = [tsLoader];

	// console.log(`Build = ${dev ? 'DEV' : 'PRODUCTION'}, Target = ${loginOnly ? 'Login Only' : 'Web client'}`);

	const config = {
		mode: dev ? 'development' : 'production',
		// mode: 'production',

		context: path.resolve(__dirname, "src"),

		// target: 'web',

		entry: {
			app: ["babel-polyfill", "./index"],
			// app: ["./index"],
			// app: ['./test/bench1.tsx']
			// 'vendor': ["react", "react-dom"]
		},

		output: {
			path: path.resolve(__dirname, opt.release ? 'release' : 'build', loginOnly ? 'login' : 'web'),
			filename: '[name]_[hash:8].js',
			// filename: '[name]_[hash:8].js',
			chunkFilename: '[name]_[hash:8].js'
		},

		resolve: {
			// REMOVED? root: path.resolve(__dirname),
			extensions: [
				'.web.js', '.js',
				'.web.ts', '.ts',
				'.web.tsx', '.tsx',
				'.web.less', '.less'
			],

			modules: [
				path.resolve(__dirname, 'src'),
				'node_modules'
			],

			alias: Object.assign({
				'core': path.resolve('src/core/'),
				'app': path.resolve('src/app/'),
				'data': path.resolve('src/data/'),
				'meta': path.resolve('src/meta/'),
				'mod': path.resolve('src/mod/'),
				'frag': path.resolve('src/frag/'),
				'ux': path.resolve('src/ux/'),
				'asset': path.resolve('src/asset/'),
				'util': path.resolve('src/util/'),
				'static':  path.resolve('static/'),

				// 'DevExpress': path.resolve('static/dx.dashboard-control.bundle'),
				// 'DevExpressExtra': path.resolve('static/dx.dashboard-control.third-party.min'),
				// 'funnelD3ItemExtension': path.resolve('static/funnel.min'),



				// 'react' : 'react/dist/react.min.js',
				// 'react-dom' : 'react-dom/dist/react-dom.min.js',
			}, dev ? {} : {
				// 'react$' : path.resolve('node_modules/react/dist/react.min.js'),
			})
		},

		// externals: {
		// 	'react': true
		// },

		module: {
			rules: [
				{
					test: /\.ts(x?)$/,
					use: [
						{
							loader: 'happypack/loader?id=ts',
						}
						// { loader: "ts-loader" }
					]
				},
				{
					test: /\.less$/,
					use: [
						!dev ? MiniCssExtractPlugin.loader : 'style-loader',
						{
							loader: 'css-loader',
							options: {
								modules: true,
								camelCase: true,
								minimize: !dev,
								localIdentName: '[name]_[local]_[hash:base64:4]'
							}
						},
						{
							loader: 'postcss-loader',
							options: {
								ident: 'postcss',
								plugins: [
									require('postcss-import')({ addDependencyTo: webpack }),
									require('postcss-url')(),
									require('postcss-preset-env')({
										/* use stage 2 features (defaults) */
										stage: 2,
									}),
									require('postcss-reporter')(),
									require('postcss-browser-reporter')({
										disabled: !dev
									})
								]
							}
						},
						{loader: 'less-loader'}
					]
				},
				{
					test: /\.css$/,
					use: [
						!dev ? MiniCssExtractPlugin.loader : 'style-loader',
						{
							loader: 'css-loader',
							options: {minimize: !dev}
						}
					]
				},
				{
					test: /\.svg$/,
					use: [{loader: 'svg-url-loader', options: {limit: 10000, name: 'res/[name]_[hash:6].[ext]'}},
						/*{	loader: 'image-webpack-loader' } */]
				},
				{
					test: /\.(png|jpg)$/,
					use: {loader: 'url-loader', options: {limit: 10000, name: 'res/[name]_[hash:6].[ext]'}}
				},
				{
					test: /\.font\.js/,
					// loader: "style-loader!css-loader!webfonts-loader"
					use: [
						!dev ? MiniCssExtractPlugin.loader : 'style-loader',
						{loader: 'css-loader'},
						{
							loader: 'webfonts-loader',
							options: {
								embed: true
							}
						},
						// {loader: 'webfonts-loader?embed'}, // FIXME: don't really want to ?embed, but couldn't get it to work with relative public paths. Otherwise we'll have to set the publicPath for each environment and build
					]
				},
				{
					test: /\.(woff|eot|ttf)$/,
					loader: "url-loader"
				},
				// {
				// 	test: /static\/.*\.js/,
				// 	loader: "imports-loader?this=>window"
				// }
			]
		},

		/*
		imageWebpackLoader: { svgo: { plugins: [
			{ removeViewBox: true }
		]}},
		*/

		// optimization: {
		// 	splitChunks: {
		// 		chunks: 'all'
		// 	}
		// },

		optimization: dev ? {
			splitChunks: false
		} : {
			// runtimeChunk: 'single',
			// sideEffects: true,
			// usedExports: true,
			// providedExports: true,
			// namedModules: true,
			// mergeDuplicateChunks: true,
			// removeAvailableModules: true,
			// flagIncludedChunks: true,
			splitChunks: {
				chunks: 'all',
				minSize: 64 * 1024,
				minChunks: 1,
				cacheGroups: {
					// schema: {
					// 	test: /schema/,
					// 	name: 'schema',
					// 	priority: 5,
					// 	// enforce: true,
					// 	chunks: 'all'
					// },
					// ux: {
					// 	test: /ux/,
					// 	name: 'ux',
					// 	priority: 3,
					// 	// enforce: true,
					// 	chunks: 'all'
					// },
					pdfjs: {
						test: /pdfjs/,
						name: 'pdfjs',
						// enforce: true,
						chunks: 'all'
					},
					// data: {
					// 	test: /data/,
					// 	name: 'data',
					// 	// enforce: true,
					// 	chunks: 'all'
					// },
					// util: {
					// 	test: /util/,
					// 	name: 'util',
					// 	// enforce: true,
					// 	chunks: 'all'
					// },
					// vendors: {
					// 	test: /[\\/]node_modules[\\/]/,
					// 	name: 'vendors',
					// 	priority: -10
					// 	// // enforce: true,
					// 	// chunks: 'all'
					// },
					default: false
				}
			}
		},

		plugins: [
			new webpack.DefinePlugin({__DEV__: dev}),
			new webpack.DefinePlugin({__LOGIN_ONLY__: loginOnly}),
			!dev && new webpack.DefinePlugin({
				'process.env': {
					'NODE_ENV': JSON.stringify('production')
				}
			}),

			// new webpack.optimize.CommonsChunkPlugin({
			// 	name: "vendor", filename: "vendor.js", minChunks: function (module, count) {
			// 		const userRequest = module.userRequest;
			// 		if (typeof userRequest !== 'string') return false;
			// 		return userRequest.indexOf('node_modules') >= 0;
			// 	}
			// }),

			new HtmlWebpackPlugin({
				title: "Iplicit",
				template: './index.html',
				chunksSortMode: 'none',
				hash: true
			}),

			// new CircularDependencyPlugin({
			// 	exclude: /node_modules/,
			// 	failOnError: true
			// }),

			// dev && new webpack.HotModuleReplacementPlugin(),

			createHappyPlugin("ts", buildLoaders),
			// createHappyPlugin("less", lessLoaders),


			new ForkTsCheckerWebpackPlugin({
			 	tsconfig: path.resolve(__dirname, "tsconfig.json"),
			 	checkSyntacticErrors: true,
			 	// async: false, // uncomment to have the type errors nicely after the build
			
				// logger: {
			 	// 	info: console.log,
			 	// 	error: console.error,
			 	// 	warn: console.warn
			 	// }
			 }),

			// !dev && new ExtractTextPlugin({ filename: '[name].css', allChunks: true }),
			new MiniCssExtractPlugin({
				// Options similar to the same options in webpackOptions.output
				// both options are optional
				filename: "[name].css",
				chunkFilename: "[id].css"
			}),

			// !dev && new webpack.optimize.UglifyJsPlugin(),

			!dev && new webpack.optimize.ModuleConcatenationPlugin(),

			// !dev && new Bump(["package.json"]),

			new ProgressBarPlugin({
				format: '  build: [:bar] :percent (:elapsed seconds)',
				clear: false
			})
		],

		node: {__dirname: true},

		// profile: true,
		// devtool: dev ? 'cheap-module-source-map' : 'cheap-module',
		devtool: dev ? 'eval-source-map' : 'cheap-module',

		cache: dev
		// profile: true,
	};

	config.plugins = config.plugins.reduce((r, i) => {
		if (i) r.push(i);
		return r;
	}, []);

	// function styleHandling(fallback, use) {
	// 	return [fallback, ...use];
	// 	// if (dev) return [fallback, ...use];
	// 	// return ExtractTextPlugin.extract({ fallback, use });
	// }


	return config;
};


function createHappyPlugin(id, loaders) {
	return new HappyPack({
		id: id,
		loaders: loaders,
		threadPool: happyThreadPool,

		// make happy more verbose with HAPPY_VERBOSE=1
		verbose: process.env.HAPPY_VERBOSE === '1',
	});
}


/*loaders*/


const babelLoader = {
	path: 'babel-loader',
	query: {
		// presets: ['es2015', 'es2016', 'es2017'],
		presets: ['env'],
		cacheDirectory: '.awcache',
		// retainLines: dev,
		// cacheDirectory: true,
		// plugins: dev ? ['react-hot-loader/babel'] : []
		plugins: [
			"syntax-dynamic-import",
// 			"transform-runtime"
			// "@babel/plugin-transform-runtime" // injects helper functions (such as _extend) once, instead per each file.
		]
	}
};
const tsLoader = {
	path: 'ts-loader',
	query: {
		happyPackMode: true,
		transpileOnly: true,
		getCustomTransformers: path.join(__dirname, './webpack.ts-transformers.js')
	}
};


// const lessLoaders = [
// 	{path: 'style-loader'},
// 	{
// 		path: 'css-loader',
// 		query: {
// 			modules: true,
// 			camelCase: true,
// 			localIdentName: '[name]__[local]__[hash:base64:5]'
// 		}
// 	},
// 	{path: 'postcss-loader', query: {plugins: () => [autoprefixer]}},
// 	{path: 'less-loader'}
// ];


/*end loaders*/


