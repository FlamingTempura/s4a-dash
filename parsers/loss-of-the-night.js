let parse = require('./my-sky-at-night');

module.exports = {
	name: 'Loss of the Night',
	parent: 'my-sky-at-night',
	url: 'http://lossofthenight.blogspot.de/2015/01/brief-introduction-to-loss-of-night-app.html',
	parse: () => parse('LON')
};
