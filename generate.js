const Bluebird = require('bluebird');
const fs = Bluebird.promisifyAll(require('fs-extra'));
const { rollup } = require('rollup');
const commonjs = require('rollup-plugin-commonjs');
const resolve = require('rollup-plugin-node-resolve');
const virtual = require('rollup-plugin-virtual');
const jsStringEscape = require('js-string-escape');
const less = require('less');

const getTemplates = () => {
	return fs.readdirAsync(`${__dirname}/src/templates`)
		.map(file => fs.readFileAsync(`${__dirname}/src/templates/${file}`, 'utf8')
			.then(source => `$templateCache.put('/templates/${file}', '${jsStringEscape(source)}');`))
		.then(sources =>  `angular.module('app').run(['$templateCache', function ($templateCache) {\n${sources.join('\n')}\n}]);`);
};

// bundles all javascript and templates into a single javascript file (bundle.js)
const generateJS = () => {
	console.log('Compiling scripts...');
	console.time('Compiled scripts');
	return getTemplates()
		.then(templates => rollup({
			input: `${__dirname}/src/scripts/index.js`,
			plugins: [
				virtual({ templates }),
				resolve({ browser: true, jsnext: true, preferBuiltins: false }),
				commonjs({ })
			],
			onwarn(warning) {
				if (warning.code === 'CIRCULAR_DEPENDENCY') { return; }
				console.log(warning.message);
			}
		}))
		.then(bundle => bundle.generate({
			format: 'iife',
			//sourcemap: true
		}))
		.then(output => {
			console.timeEnd('Compiled scripts');
			return output.code;
		});
};

const generateCSS = () => {
	let filename = `${__dirname}/src/style.less`;
	return fs.copy(`${__dirname}/node_modules/flag-icon-css/flags`, `${__dirname}/build/flags`, { overwrite: false })
		.then(() => fs.readFileAsync(filename, 'utf8'))
		.then(style => less.render(style, { filename }))
		.then(output => output.css);
};

const generateHTML = (js, css) => {
	return Bluebird
		.all([
			fs.readFileAsync(`${__dirname}/src/index.html`, 'utf8'),
			fs.readdirAsync(`${__dirname}/projects`)
		])
		.spread((html, projects) => {
			let scripts = projects.map(p => `<script src="projects/${p}.js"></script>`);
			html = html
				.replace('@DATA', scripts.join('\n'))
				.replace('@CSS', css)
				.replace('@JS', `<script src="bundle.js"></script>`);
			return Bluebird.all([
				fs.writeFileAsync(`${__dirname}/build/index.html`, html, 'utf8'),
				fs.writeFileAsync(`${__dirname}/build/bundle.js`, js, 'utf8')
			]);
		});
};

fs.ensureDirAsync(`${__dirname}/build/`)
	.then(() => Bluebird.all([generateJS(), generateCSS()]))
	.spread((js, css) => generateHTML(js, css));
	