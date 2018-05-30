const projects = require('./projects.json');
const Bluebird = require('bluebird');
const fs = Bluebird.promisifyAll(require('fs-extra'));
const { rollup } = require('rollup');
const commonjs = require('rollup-plugin-commonjs');
const resolve = require('rollup-plugin-node-resolve');
const virtual = require('rollup-plugin-virtual');
const jsStringEscape = require('js-string-escape');

const getTemplates = () => {
	return fs.readdirAsync(`${__dirname}/src/templates`)
		.map(file => fs.readFileAsync(`${__dirname}/src/templates/${file}`, 'utf8')
			.then(source => `$templateCache.put('/templates/${file}', '${jsStringEscape(source)}');`))
		.then(sources =>  `angular.module('app').run(['$templateCache', function ($templateCache) {\n${sources.join('\n')}\n}]);`);
};

// bundles all javascript and templates into a single javascript file (bundle.js)
const bundle = () => {
	console.log('Compiling scripts...');
	console.time('Compiled scripts');
	return getTemplates()
		.then(templates => rollup({
			input: `${__dirname}/src/scripts/index.js`,
			plugins: [
				virtual({ templates }),
				resolve({ browser: true, jsnext: true, preferBuiltins: false }),
				commonjs({
					namedExports: { events: [ 'EventEmitter' ] } // needed for pouchdb
				})
			],
			onwarn(warning) {
				if (warning.code === 'CIRCULAR_DEPENDENCY') { return; }
				console.log(warning.message);
			}
		}))
		.then(bundle => bundle.write({
			file: `${__dirname}/build/bundle.js`,
			format: 'iife',
			sourcemap: true
		}))
		.then(() => console.timeEnd('Compiled scripts'));
};

const generateDataFiles = () => {
	return Bluebird.map(projects, project => {
		let js = `window.projects["${project.name}"] = ${JSON.stringify(project, null, '\t')};`;
		return fs.writeFileAsync(`${__dirname}/build/projects/${project.id}.js`, js, 'utf8');
	});
};

const generateHTML = () => {
	return fs.readFileAsync(`${__dirname}/src/index.html`, 'utf8')
		.then(html => {
			let scripts = projects.map(p => `<script src="data/${p.id}.js"></script>`);
			html = html.replace('<!-- @DATA -->', scripts.join('\n'));
			return fs.writeFileAsync(`${__dirname}/build/index.html`, html, 'utf8');
		});
};

projects.forEach(project => {
	project.id = project.name.toLowerCase().replace(/\W/g, '-');
});

fs.removeAsync(`${__dirname}/build/`)
	.then(() => fs.ensureDirAsync(`${__dirname}/build/projects`))
	.then(() => Bluebird.all(generateDataFiles(), bundle(), generateHTML()));
	