const fs = require('fs-extra');

const id = process.argv.pop();

const run = id => {
	return fs.exists(`${__dirname}/projects/${id}/parser.js`)
		.then(exists => {
			if (!exists) { 
				console.log('skipping', id);
				return;
			}
			const project = require(`${__dirname}/projects/${id}/project.json`);
			const parse = require(`${__dirname}/projects/${id}/parser.js`);

			console.log(`Parsing ${id}...`);
			console.time(`Successfully parsed ${id}`);
			
			return parse()
				.then(data => {
					console.timeEnd(`Successfully parsed ${id}`);
					Object.assign(project, data, { id });
					let js = `window.projects.push(${JSON.stringify(project, null, '\t')});`;
					js = js.replace(/\[[^\[\]]*\]/g, match => match.replace(/\s+/g, ' ')); // remove excessive whitespce
					return fs.writeFile(`${__dirname}/build/projects/${id}.js`, js, 'utf8');
				});
		});

};

fs.ensureDir(`${__dirname}/build/projects`)
	.then(() => {
		if (id && id.match(/^[A-Za-z0-9-]+$/)) {
			run(id);
		} else {
			fs.readdir(`${__dirname}/projects`)
				.then(projects => Promise.all(projects.map(id => run(id))));
		}
	});
