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

const parse = project => {
	return new Bluebird((resolve, reject) => {
		let parser = csv.parse({ columns: true, relax_column_count: true }),
			months = {};

		let parseRow = row => {
			if (project && row.obs_type !== project) { return; }
			let yyyymm = row.date_utc.slice(0, 7), // 2014-07
				month = months[yyyymm];
			if (!month) {
				month = months[yyyymm] = {
					countries: {},
					rows: 0,
					comments: 0
				};
			}
			month.rows++;
			if (row.sky_comment || row.location_comment) {
				month.contributions++;
			}

			let country = (row.country || '').trim();
			country = Object.keys(countrycodes).find(code => {
				return country.startsWith(countrycodes[code]); // allows United States - New York to match
			});

			country = country || '--';

			if (!month.countries[country]) {
				month.countries[country] = 0;
			}
			month.countries[country]++;
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
				complete = 0,
				countries = {};
				
			data.months = Object.keys(months).sort().map(yyyymm => {
				let month = months[yyyymm];
				rows += month.rows;
				complete += month.complete;
				Object.entries(month.countries).forEach(([country, count]) => {
					if (!countries[country]) {
						countries[country] = 0;
					}
					countries[country] += count;
				});
				return {
					month: yyyymm,
					rows: month.rows,
					complete: month.complete,
					countries: month.countries
				};
			});

			data.countries = countries;
			data.rows = rows;
			data.contributions = complete;

			resolve(data);
		});

		fs.createReadStream(`${__dirname}/data/myskyatnight.csv`).pipe(parser);
	});
};

module.exports = parse;
