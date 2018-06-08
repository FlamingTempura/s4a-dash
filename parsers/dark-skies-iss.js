const parse = require('./cities-at-night');

module.exports = {
	name: 'Dark Skies ISS',
	parent: 'cities-at-night',
	url: 'https://crowdcrafting.org/project/darkskies/tasks/',
	note: 'Data available from "Export Task Runs" link. Data is incomplete - Only represents 2/3rds of the total number of tasks - all of these are available through "export tasks", but user data is only available through task runs.',
	parse: () => parse('dark-skies-iss')
};
