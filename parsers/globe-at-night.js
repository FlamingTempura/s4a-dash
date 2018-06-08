let parse = require('./my-sky-at-night');

module.exports = {
	name: 'Globe at Night',
	parent: 'my-sky-at-night',
	url: 'http://www.globeatnight.org/',
	parse: () => parse('GAN')
};
