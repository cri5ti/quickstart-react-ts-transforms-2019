const path = require('path');
const express = require('express');
const webpack = require('webpack');
const webpackDevMiddleware = require("webpack-dev-middleware");
// const webpackHotMiddleware = require('webpack-hot-middleware');
// const statsViewer = require('webpack-dev-stats-viewer-middleware');
const request = require('request');
const colors = require('colors');


const PORT = process.argv[2] || 3003;
const HOST = '0.0.0.0';
const HOST_URI = `http://${HOST}:${PORT}`;
const DOMAIN_SERVICE = "https://downloads.iplicit.com/domains/";

const server = express();

server.use(express.static(path.resolve(__dirname, 'static')));

server.use('/services/local/dashboard', createProxy('http://localhost:51850/'));

server.use("/services/domains", createProxy(DOMAIN_SERVICE, 'domains'));
server.use("/services/local", createProxy("http://localhost:55555", 'localhost'));
server.use("/services/localhost", createProxy("http://localhost:55555", 'localhost'));

const proxy = {};
server.use("/services/:domain", (req, res, next) => {
	const domain = req.params.domain;
	if (proxy[domain])
		return proxy[domain](req, res);
	request(DOMAIN_SERVICE + '?domain=' + domain, (err, reqRes, body) => {
		const url = JSON.parse(body);
		if (!url) {
			console.error(` * ${domain} => ???`);
			res.status(404).send("Unknown domain");
			return;
		}
		console.log(` * ${domain} => ${url}`);
		proxy[domain] = createProxy(url, domain);
		return proxy[domain](req, res);
	});
});

// multi tenant service proxies
server.use("/ys/reporting", createProxy("http://downloads.iplicit.com/ys/reporting"));

server.use("/mt/dashboard/dashboardControl", createProxy("http://downloads.iplicit.com/mt/dashboard/dashboardControl"));

server.use("/dev.iplicit.com/reporting/dash", createProxy("http://localhost:65404/index.html"));

server.use('/dashboard', createProxy('http://localhost:51850'));
server.use('/report', createProxy('https://downloads.iplicit.com/mt/report/reportControl')); // not tested

server.use('/static', express.static('./static'));

const config = require('./webpack.config')({ release: false, loginOnly: false });
// config.entry.app.unshift("react-hot-loader/patch");
// config.entry.app.unshift("webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000");
// config.entry.app.unshift("webpack/hot/only-dev-server");


try {
	const compiler = webpack(config);

	server.use(webpackDevMiddleware(compiler, {
		// publicPath: '/',
		serverSideRender: true,
		// stats: 'normal'
		// stats: 'verbose'
		// stats: {
		// 	colors: true
		// },
	} ));

	// server.use(webpackHotMiddleware(compiler, {
	// 	log: console.log,
	// 	path: '/__webpack_hmr',
	// 	heartbeat: 10 * 1000,
	// }));

	server.use('/stats', (req, res) => {
		// console.log('req: ', req.locals);
		// console.log('res: ', res.locals);
		res.send(res.locals.webpackStats.toJson({
			timings: true,
			source: false,
			exclude: [/node_modules/],
			optimizationBailout: true
		}));
		// const assetsByChunkName = res.locals.webpackStats.toJson().assetsByChunkName;
		// console.log(assetsByChunkName);
	});

	server.use('/analyse', express.static(path.resolve('./tools/analyse')));

	// statsViewer(server, '/dev-server/stats');

	console.log(`Development server listening at ${HOST_URI}`);
	server.listen(PORT, HOST, function (err) {
		if (err) throw err;
	});

} catch(err) {
	console.error(err.message, '\n\n', err.stack);
}



function createProxy(remote, domain) {
	return (req, res) => {
		const rel_url = req.url;
		const url = remote + '/' + req.url;

		const p_req = request(url);

		p_req.on('error', (err) => {
			res.status(500).send({ proxyError: err.toString() });
			// res.send(500, { proxyError: err.toString() });
			console.error("Proxy error: ", err.toString() );
		});

		const time_start = Date.now();
		let buff_len = 0;

		const s = req.pipe(p_req);
		const s2 = s.pipe(res);

		s.on('data', (chunk) => {
			buff_len += chunk.length;
		});

		const dateStr = '[' + (new Date(time_start)).toLocaleTimeString('en-GB', {hour12: false }) + ']';
		s2.on('finish', () => {
			console.log(domain, dateStr, ' ⚡', rpad(req.method, 7), ' - ', time(Date.now() - time_start), ' - ', size(buff_len), '   -   ', rel_url );
		});
	};
}

function rpad(s, len) {
	return (' '.repeat(Math.max(len - s.toString().length, 0))) + s;
}

function time(ms) {
	if (ms < 100) return time2(ms);
	if (ms < 500) return colors.yellow(time2(ms));
	return colors.red(time2(ms));
}

function time2(ms) {
	return rpad(ms, 6) + ' ms';
}




function size(s) {
	if (s < 20 * 1024) return size2(s);
	if (s < 512 * 1024) return colors.yellow(size2(s));
	return colors.red(size2(s));
}

function size2(s) {
	if (s < 1024) return rpad(s, 6) + ' B ';
	s /= 1024;
	if (s < 1024) return rpad(s.toFixed(2), 6) + ' KB';
	s /= 1024;
	return rpad(s.toFixed(2), 6) + ' MB';
}


