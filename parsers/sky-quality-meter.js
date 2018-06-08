const countrycodes = require('iso-3166-1-alpha-2').getData();

module.exports = {
	name: 'Sky Quality Meter',
	parent: 'my-sky-at-night',
	url: 'http://www.unihedron.com/projects/sqm-l/',
	files: ['./data/myskyatnight.csv'],
	filter: row => row.obs_type === 'SQM',
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
