const Bluebird = require('bluebird');
const csv = require('csv');
const fs = Bluebird.promisifyAll(require('fs'));

let months = {};
let i = 0;

const parse = (path) => {
	return new Bluebird((resolve, reject) => {
		let parser = csv.parse({ columns: true, relax_column_count: true });

		let parseRow = row => {
			let yyyymm = row.tstamp.slice(0, 7), // 2014-07
				month = months[yyyymm];
			if (!month) {
				month = months[yyyymm] = {
					ids: new Set(),
					rowCount: 0
				};
			}
			month.rowCount++;
			month.ids.add(row.name);
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

module.exports = () => {
	return fs.readdirAsync(`${__dirname}/data`)
		.map(f => parse(`${__dirname}/data/${f}`))
		.then(() => {
			let data = {},
				ids = new Set(),
				rowCount = 0;
				
			data.months = Object.keys(months).sort().map(yyyymm => {
				let month = months[yyyymm],
					newIDs = [...month.ids].filter(x => !ids.has(x));
				ids = new Set([...ids, ...newIDs]);
				rowCount += month.rowCount;
				return {
					month: yyyymm,
					users: {
						ids: month.ids.size,
						ips: 0
					},
					newUsers: {
						ids: newIDs.length,
						ips: 0
					},
					rows: month.rowCount
				};
			});

			data.users = {
				ids: ids.size,
				ips: 0
			};

			data.rows = rowCount;

			return data;
		});
};
