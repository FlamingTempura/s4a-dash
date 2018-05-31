const fs = require('fs-extra');

const id = 'european-photometer-network';

const project = require(`${__dirname}/projects/${id}/project.json`);
const parse = require(`${__dirname}/projects/${id}/parser.js`);

console.time('Parse');
fs.ensureDir(`${__dirname}/build/projects`)
	.then(() => parse())
	.then(data => {
		console.timeEnd('Parse');
		Object.assign(project, data, { id });
		let js = `window.projects.push(${JSON.stringify(project, null, '\t')});`;
		return fs.writeFile(`${__dirname}/build/projects/${id}.js`, js, 'utf8');
	});