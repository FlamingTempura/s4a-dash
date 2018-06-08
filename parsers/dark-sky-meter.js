let parse = require('./my-sky-at-night');

module.exports = {
	id: 'dark-sky-meter',
	name: 'Dark Sky Meter',
	parent: 'my-sky-at-night',
	url: 'http://wordpress.redirectingat.com/?id=725X1342&site=light2015blogdotorg.wordpress.com&xs=1&isjs=1&url=https%3A%2F%2Fitunes.apple.com%2Fapp%2Fdark-sky-meter-lite%2Fid626796278%3Fmt%3D8&xguid=ca62db2bb15b70f2a0bd4eca9745dbea&xuuid=37e63d502c',
	parse: () => parse('DSM')
};
