const Bluebird = require('bluebird');
const csv = require('csv');
const fs = require('fs');

const parse = () => {
	return new Bluebird((resolve, reject) => {
		let parser = csv.parse({ columns: true }),
			ids = new Set(),
			ips = new Set(),
			months = {};

		let parseRow = row => {
			let yyyymm = row.created.slice(0, 7), // 2014-07
				month = months[yyyymm];
			if (!month) {
				month = months[yyyymm] = {
					ids: new Set(),
					ips: new Set()
				};
			}
			if (row.user_id) {
				let id = Number(row.user_id);
				ids.add(id);
				month.ids.add(id);
			} else if (row.user_ip) {
				ips.add(row.user_ip);
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
			let data = {
				users: {
					registered: ids.size,
					anonymous: ips.size,
					total: ids.size + ips.size
				},
				months: Object.keys(months).sort().map(yyyymm => {
					let month = months[yyyymm];
					return {
						users: {
							registered: month.ids.size,
							anonymous: month.ips.size,
							total: month.ids.size + month.ips.size
						}
					};
				})
			};
			resolve(data);
		});

		fs.createReadStream('data/LostAtNight_task_run.csv').pipe(parser);
	});
};


console.time('Parse');
parse().then(data => {
	console.timeEnd('Parse');
	fs.writeFileSync('data.json', JSON.stringify(data, null, '\t'));
});

//module.exports = parse;



/*months = [],*/
		
		/*newUserCountByMonth = [],
		activeUserCountByMonth = [],
		classificationCount = 0*/;