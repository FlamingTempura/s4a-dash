const parse = require('./cities-at-night');

module.exports = {
	name: 'Lost at Night',
	parent: 'cities-at-night',
	url: 'https://crowdcrafting.org/project/LostAtNight/tasks/',
	note: 'Same as Dark Skies, but all the data is there',
	parse: () => parse('lost-at-night')
};
