const countrycodes = require('iso-3166-1-alpha-2').getData();

module.exports = {
	name: 'Loss of the Night',
	parent: 'my-sky-at-night',
	url: 'http://lossofthenight.blogspot.de/2015/01/brief-introduction-to-loss-of-night-app.html',
	files: ['./data/myskyatnight.csv'],
	filter: row => row.obs_type === 'LON',
	parseRow: row => {
		let country = (row.country || '').trim();
		country = Object.keys(countrycodes).find(code => country.startsWith(countrycodes[code])); // allows United States - New York to match
		return {
			date: new Date(row.date_utc),
			isContribution: true,
			user: row.obs_id,
			country
		};
	}
};
