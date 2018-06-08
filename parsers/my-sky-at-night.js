/*obs_type - project
obs_id - should be unique by row
gan_id - globe at night project id
date_utc - when it was taken
sky_comment - percent filled in (completeness of data)
location_comment - completeness of data
country - where measure was taking*/

const Bluebird = require('bluebird');
const csv = require('csv');
const fs = require('fs');
const countrycodes = require('iso-3166-1-alpha-2').getData();

{
	"name": "My Sky at Night",
	"url": "http://www.myskyatnight.com"
}

const parse = project => {
	return new Bluebird((resolve, reject) => {
		let parser = csv.parse({ columns: true, relax_column_count: true }),
			days = {};

		let parseRow = row => {
			if (project && row.obs_type !== project) { return; }
			let yyyymmdd = row.date_utc.slice(0, 10),
				day = days[yyyymmdd];
			if (!day) {
				day = days[yyyymmdd] = {
					countries: {},
					rows: 0,
					contributions: 0
				};
			}
			day.rows++;
			if (row.sky_comment || row.location_comment) {
				day.contributions++;
			}

			let country = (row.country || '').trim();
			country = Object.keys(countrycodes).find(code => {
				return country.startsWith(countrycodes[code]); // allows United States - New York to match
			});

			country = country || '--';

			if (!day.countries[country]) {
				day.countries[country] = 0;
			}
			day.countries[country]++;
		};

		parser.on('readable', () => {
			let row = parser.read();
			while (row) {
				parseRow(row);
				row = parser.read();
			}
		});

		parser.on('error', reject);

		parser.on('finish', () => {
			let data = {},
				rows = 0,
				contributions = 0,
				countries = {};

			data.columns = [
				'date',
				'userCount',
				'registeredUserCount',
				'anonymousUserCount',
				'newUserCount',
				'newRegisteredUserCount',
				'newAnonymousUserCount',
				'rowCount',
				'contributionCount',
				'taskCount'
			];

			data.days = Object.keys(days).sort().map(yyyymmdd => {
				let day = days[yyyymmdd];
				rows += day.rows;
				contributions += day.contributions;
				Object.entries(day.countries).forEach(([country, count]) => {
					if (!countries[country]) {
						countries[country] = 0;
					}
					countries[country] += count;
				});
				//day.countries
				return [
					yyyymmdd,
					null,
					null,
					null,
					null,
					null,
					null,
					day.rows,
					day.contributions,
					null
				];
			});

			data.countries = countries;
			data.rows = rows;
			data.contributions = contributions;

			resolve(data);
		});

		fs.createReadStream(`${__dirname}/data/myskyatnight.csv`).pipe(parser);
	});
};

module.exports = parse;
