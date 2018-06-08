const countrycodes = require('iso-3166-1-alpha-2').getData();

module.exports = {
	id: 'dark-sky-meter',
	name: 'Dark Sky Meter',
	parent: 'my-sky-at-night',
	url: 'http://wordpress.redirectingat.com/?id=725X1342&site=light2015blogdotorg.wordpress.com&xs=1&isjs=1&url=https%3A%2F%2Fitunes.apple.com%2Fapp%2Fdark-sky-meter-lite%2Fid626796278%3Fmt%3D8&xguid=ca62db2bb15b70f2a0bd4eca9745dbea&xuuid=37e63d502c',
	files: ['./data/myskyatnight.csv'],
	filter: row => row.obs_type === 'DSM',
	parseRow: row => {
		let country = (row.country || '').trim();
		country = Object.keys(countrycodes).find(code => country.startsWith(countrycodes[code])); // allows United States - New York to match
		return {
			date: new Date(row.date_utc),
			isContribution: !!(row.sky_comment || row.location_comment),
			user: row.obs_id,
			country
		};
	}
};
