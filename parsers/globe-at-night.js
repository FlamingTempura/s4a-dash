const countrycodes = require('iso-3166-1-alpha-2').getData();

module.exports = {
	name: 'Globe at Night',
	parent: 'my-sky-at-night',
	url: 'http://www.globeatnight.org/',
	files: ['./data/myskyatnight.csv'],
	filter: row => row.obs_type === 'GAN',
	parseRow: row => {
		let country = (row.country || '').trim();
		country = Object.keys(countrycodes).find(code => country.startsWith(countrycodes[code])); // allows United States - New York to match
		return {
			date: new Date(row.date_utc),
			isContribution: row.sky_comment || row.location_comment,
			user: row.obs_id,
			country
		};
	}
};
