const Bluebird = require('bluebird');
const csv = require('csv');
const fs = require('fs');

const parseTasks = path => {
	return new Bluebird((resolve, reject) => {
		let parser = csv.parse({ columns: true, relax_column_count: true }),
			complete = 0,
			incomplete = 0;

		let parseRow = row => {
			if ((row.state || row.task__state) === 'completed') {
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

		fs.createReadStream(path).pipe(parser);
	});
};

const parseTaskRuns = path => {
	return new Bluebird((resolve, reject) => {
		let parser = csv.parse({ columns: true, relax_column_count: true }),
			months = {};

		let parseRow = row => {
			let yyyymm = (row.created || row.task_run__created).slice(0, 7), // 2014-07
				month = months[yyyymm];
			if (!month) {
				month = months[yyyymm] = {
					ids: new Set(),
					ips: new Set(),
					tasks: new Set(),
					rows: 0,
					contributions: 0
				};
			}
			month.rows++;
			if (row.info_LONLAT || row.task_run__info_LONLAT) {
				month.contributions++;
			}
			month.tasks.add(Number(row.task_id || row.task_run__task_id));
			if (row.user_id || row.task_run__user_id) {
				month.ids.add(Number(row.user_id || row.task_run__user_id));
			} else if (row.user_ip || row.task_run__user_ip) {
				month.ips.add(row.user_ip || row.task_run__user_ip);
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
				rows = 0,
				contributions = 0;
				
			data.months = Object.keys(months).sort().map(yyyymm => {
				let month = months[yyyymm],
					newIDs = [...month.ids].filter(x => !ids.has(x)),
					newIPs = [...month.ips].filter(x => !ips.has(x));
				ids = new Set([...ids, ...newIDs]);
				ips = new Set([...ips, ...newIPs]);
				tasks = new Set([...tasks, month.tasks]);
				rows += month.rows;
				contributions += month.contributions;
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
					rows: month.rows,
					contributions: month.contributions,
					tasks: month.tasks.size
				};
			});

			data.users = {
				ids: ids.size,
				ips: ips.size
			};

			data.rows = rows;
			data.contributions = contributions;
			data.tasks = tasks.size;

			resolve(data);
		});

		fs.createReadStream(path).pipe(parser);
	});
};

let projects = {
	'lost-at-night': () => {
		return Bluebird
			.all([
				parseTasks(`${__dirname}/data/LostAtNight_task.csv`),
				parseTaskRuns(`${__dirname}/data/LostAtNight_task_run.csv`)
			])
			.spread((tasks, data) => {			
				data.tasks = tasks;
				return data;
			});
	},
	'night-cities': () => {
		return Bluebird
			.all([
				parseTasks(`${__dirname}/data/nightcitiesiss_task.csv`), 
				parseTaskRuns(`${__dirname}/data/nightcitiesiss_task_run.csv`)
			])
			.spread((tasks, data) => {			
				data.tasks = tasks;
				return data;
			});
	},
	'dark-skies-iss': () => {
		return Bluebird
			.all([
				parseTasks(`${__dirname}/data/darkskies_task.csv`), 
				parseTaskRuns(`${__dirname}/data/darkskies_task_run.csv`)
			])
			.spread((tasks, data) => {			
				data.tasks = tasks;
				return data;
			});
	},
	/*'night-knights': () => {
		return {
			rows: 0,
			contributions: 0,
			tasks
		};
	} */
};

module.exports = project => {
	if (project) {
		return projects[project]();
	} else {
		return Bluebird
			.map(Object.values(projects), parse => parse())
			.then(results => {
				let combined = {};

				combined.rows = 0;
				combined.contributions = 0;
				combined.tasks = { complete: 0, incomplete: 0 };
				combined.users = { ids: 0, ips: 0 };
				combined.months = [];

				results.forEach(result => {
					combined.rows += result.rows;
					combined.contributions += result.contributions;
					combined.tasks.complete += result.tasks.complete;
					combined.tasks.incomplete += result.tasks.incomplete;
					combined.users.ids += result.users.ids;
					combined.users.ips += result.users.ips;
					result.months.forEach(rmonth => {
						let cmonth = combined.months.find(m => m.month === rmonth.month);
						if (!cmonth) {
							combined.months.push(rmonth);
						} else {
							cmonth.users.ids += rmonth.users.ids;
							cmonth.users.ips += rmonth.users.ips;
							cmonth.newUsers.ids += rmonth.newUsers.ids;
							cmonth.newUsers.ips += rmonth.newUsers.ips;
							cmonth.rows += rmonth.rows;
							cmonth.contributions += rmonth.contributions;
							cmonth.tasks += rmonth.tasks;
						}
					});
				});

				return combined;
			});
	}
};
