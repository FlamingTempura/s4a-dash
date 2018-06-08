let parse = require('./my-sky-at-night');

module.exports = {
	name: 'Sky Quality Meter',
	parent: 'my-sky-at-night',
	url: 'http://www.unihedron.com/projects/sqm-l/',
	parse: () => parse('SQM')
};
