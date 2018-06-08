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
			days = {},
			i = 0;

		let parseRow = row => {
			if (++i % 10000 === 0) { console.log('parsed', i, 'rows...'); }
			let yyyymmdd = (row.created || row.task_run__created).slice(0, 10), // 2015-07-04
				day = days[yyyymmdd];
			if (!day) {
				day = days[yyyymmdd] = {
					ids: new Set(),
					ips: new Set(),
					tasks: new Set(),
					rows: 0,
					contributions: 0
				};
			}
			day.rows++;
			if (row.info_LONLAT || row.task_run__info_LONLAT) {
				day.contributions++;
			}
			day.tasks.add(Number(row.task_id || row.task_run__task_id));
			if (row.user_id || row.task_run__user_id) {
				day.ids.add(Number(row.user_id || row.task_run__user_id));
			} else if (row.user_ip || row.task_run__user_ip) {
				day.ips.add(row.user_ip || row.task_run__user_ip);
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
					newIDs = [...day.ids].filter(x => !ids.has(x)),
					newIPs = [...day.ips].filter(x => !ips.has(x));
				ids = new Set([...ids, ...newIDs]);
				ips = new Set([...ips, ...newIPs]);
				tasks = new Set([...tasks, day.tasks]);
				rows += day.rows;
				contributions += day.contributions;
				return [
					yyyymmdd,
					day.ids.size + day.ips.size,
					day.ids.size,
					day.ips.size,
					newIDs.length + newIPs.length,
					newIDs.length,
					newIPs.length,
					day.rows,
					day.contributions,
					day.tasks.size
				];
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

{
	"name": "Cities at Night"
}

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
				combined.days = [];

				results.forEach(result => {
					combined.rows += result.rows;
					combined.contributions += result.contributions;
					combined.tasks.complete += result.tasks.complete;
					combined.tasks.incomplete += result.tasks.incomplete;
					combined.users.ids += result.users.ids;
					combined.users.ips += result.users.ips;
					result.days.forEach(rday => {
						let cday = combined.days.find(d => d[0] === rday[0]);
						if (!cday) {
							combined.days.push(rday);
						} else {
							rday.slice(1).forEach((v, i) => cday[i + 1] += v);
						}
					});
				});
				combined.days = combined.days.sort(d => d[0]);

				return combined;
			});
	}
};
