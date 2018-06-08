const parse = require('./cities-at-night');

module.exports = {
	name: 'Night Cities',
	parent: 'cities-at-night',
	url: 'https://crowdcrafting.org/project/nightcitiesiss/',
	note: 'Same as Dark Skies, but all the data is there',
	parse: () => parse('night-cities')
};
