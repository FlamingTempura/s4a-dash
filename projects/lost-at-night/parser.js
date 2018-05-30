const Bluebird = require('bluebird');
const csv = require('csv');
const fs = require('fs');

const parseTasks = () => {
	return new Bluebird((resolve, reject) => {
		let parser = csv.parse({ columns: true }),
			complete = 0,
			incomplete = 0;

		let parseRow = row => {
			if (row.state === 'completed') {
				complete++;
			} else {
				incomplete++;
			}
		};

		parser.on('readable', () => {
			let row = parser.read();
			while (row) {
				parseRow(row);
				row = parser.read();
			}
		});

		parser.on('error', reject);

		parser.on('finish', () => resolve({ complete, incomplete }));

		fs.createReadStream(`${__dirname}/data/LostAtNight_task.csv`).pipe(parser);
	});
};

const parseTaskRuns = () => {
	return new Bluebird((resolve, reject) => {
		let parser = csv.parse({ columns: true }),
			months = {};

		let parseRow = row => {
			let yyyymm = row.created.slice(0, 7), // 2014-07
				month = months[yyyymm];
			if (!month) {
				month = months[yyyymm] = {
					ids: new Set(),
					ips: new Set(),
					locations: {},
					tasks: new Set(),
					rowCount: 0
				};
			}
			month.rowCount++;
			month.tasks.add(Number(row.task_id));
			if (row.user_id) {
				month.ids.add(Number(row.user_id));
			} else if (row.user_ip) {
				month.ips.add(row.user_ip);
			}
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
				ids = new Set(),
				ips = new Set(),
				tasks = new Set(),
				rowCount = 0;
				
			data.months = Object.keys(months).sort().map(yyyymm => {
				let month = months[yyyymm],
					newIDs = [...month.ids].filter(x => !ids.has(x)),
					newIPs = [...month.ips].filter(x => !ips.has(x));
				ids = new Set([...ids, ...newIDs]);
				ips = new Set([...ips, ...newIPs]);
				tasks = new Set([...tasks, month.tasks]);
				rowCount += month.rowCount;
				return {
					month: yyyymm,
					users: {
						ids: month.ids.size,
						ips: month.ips.size
					},
					newUsers: {
						ids: newIDs.length,
						ips: newIPs.length
					},
					rows: month.rowCount,
					tasks: month.tasks.size
				};
			});

			data.users = {
				ids: ids.size,
				ips: ips.size
			};

			data.rows = rowCount;
			data.tasks = tasks.size;


			resolve(data);
		});

		fs.createReadStream(`${__dirname}/data/LostAtNight_task_run.csv`).pipe(parser);
	});
};

module.exports = () => {
	return Bluebird.all([parseTasks(), parseTaskRuns()])
		.spread((tasks, data) => {			
			data.tasks = tasks;
			return data;
		});
};
