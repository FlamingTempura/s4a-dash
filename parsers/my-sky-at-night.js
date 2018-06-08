/*obs_type - project
obs_id - should be unique by row
gan_id - globe at night project id
date_utc - when it was taken
sky_comment - percent filled in (completeness of data)
location_comment - completeness of data
country - where measure was taking*/

const countrycodes = require('iso-3166-1-alpha-2').getData();

module.exports = {
	name: 'My Sky at Night',
	url: 'http://www.myskyatnight.com',
	files: ['./data/myskyatnight.csv'],
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
