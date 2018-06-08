const Bluebird = require('bluebird');
const csv = require('csv');
const fs = Bluebird.promisifyAll(require('fs'));

let days = {};
let i = 0;

const parseFile = (path) => {
	return new Bluebird((resolve, reject) => {
		let parser = csv.parse({ columns: true, relax_column_count: true });

		let parseRow = row => {
			let yyyymmdd = row.tstamp.slice(0, 10),
				day = days[yyyymmdd];
			if (!day) {
				day = days[yyyymmdd] = {
					ids: new Set(),
					rowCount: 0
				};
			}
			day.rowCount++;
			day.ids.add(row.name);
			i++;
			if (i % 100000 === 0) { console.log(`Parsed ${i} rows`); }
		};

		parser.on('readable', () => {
			let row = parser.read();
			while (row) {
				parseRow(row);
				row = parser.read();
			}
		});

		parser.on('error', reject);

		parser.on('finish', () => resolve());

		fs.createReadStream(path).pipe(parser);
	});
};

const parse = () => {
	return fs.readdirAsync(`${__dirname}/data`)
		.map(f => parseFile(`${__dirname}/data/${f}`))
		.then(() => {
			let data = {},
				ids = new Set(),
				rowCount = 0;
				
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
				let day = days[yyyymmdd],
					newIDs = [...day.ids].filter(x => !ids.has(x));
				ids = new Set([...ids, ...newIDs]);
				rowCount += day.rowCount;
				return [
					yyyymmdd,
					day.ids.size,
					day.ids.size,
					0,
					newIDs.length,
					newIDs.length,
					0,
					day.rowCount,
					null,
					null
				];
			});

			data.users = {
				ids: ids.size,
				ips: 0
			};

			data.rows = rowCount;

			return data;
		});
};


module.exports = {
	name: 'Photometer network',
	url: 'http://ckan.stars4all.eu/',
	note: 'Available (as monthly CSVs) through this link',
	parse
};
