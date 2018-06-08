const Bluebird = require('bluebird');
const csv = require('csv');
const fs = require('fs-extra');

const id = process.argv.pop();

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const generate = id => {
	id = id.replace(/.js$/, ''); // string extension
	const project = require(`${__dirname}/parsers/${id}`);

	console.log(`Parsing ${id}...`);
	console.time(`Successfully parsed ${id}`);
	
	let rows = [];

	return Bluebird
		.map(project.files, file => {
			return new Bluebird((resolve, reject) => {
				let parser = csv.parse({ columns: true, relax_column_count: true });
				let read = () => {
					let row = parser.read();
					while (row) {
						if (!project.filter || project.filter(row)) {
							rows.push(project.parseRow(row));
							if (rows.length % 10000 === 0) {
								console.log(` ${id}: ${rows.length} rows`);
							}
						}
						row = parser.read();
					}
				};

				parser.on('readable', read);
				parser.on('error', reject);
				parser.on('finish', resolve);

				fs.createReadStream(file).pipe(parser);
			});
		}, { concurrency: 4 })
		.then(() => {
			console.log(rows[0]);
			console.log('Structuring data...');
			let days = {},
				months = {},
				weekdays = {},
				countries = {},
				users = {};

			rows
				.sort((a, b) => a.valueOf() - b.valueOf())
				.forEach(row => {
					let day = row.date.toISOString().slice(0, 10), // 2016-04-09
						month = day.slice(0, 7), // 2016-04,
						weekday = WEEKDAYS[row.date.getDay()], // sun/mon/tue...
						country = row.country,
						user = row.user;

					if (!days[day]) {
						days[day] = { rows: 0, contributions: 0, users: new Set(), starters: new Set() };
					}
					if (!months[month]) {
						months[month] = { rows: 0, contributions: 0, users: new Set(), starters: new Set() };
					}
					if (!weekdays[weekday]) {
						weekdays[weekday] = { rows: 0, contributions: 0, users: new Set(), starters: new Set() };
					}
					if (user && !users[user]) {
						users[user] = { rows: 0, contributions: 0 };
					}
					if (country && !countries[country]) {
						countries[country] = { rows: 0, contributions: 0, users: new Set() };
					}

					[days[day], months[month], weekdays[weekday], countries[country], users[user]].forEach(o => {
						if (!o) { return; }
						if (o.users) {
							o.users.add(user);
						}
						if (o.starters && users[user] && users[user].contributions === 0) {
							o.starters.add(user);
						}
						o.contributions += row.isContribution ? 1 : 0;
						o.rows++;
					});

				});

			project.contributions = rows.filter(d => d.isContribution).length;

			project.days = Object.keys(days)
				.sort()
				.map(day => ({ day, rows: days[day].rows, contributions: days[day].contributions, users: days[day].users.size, starters: days[day].starters.size }));

			project.months = Object.keys(months)
				.sort()
				.map(month => ({ month, rows: months[month].rows, contributions: months[month].contributions, users: months[month].users.size, starters: months[month].starters.size }));

			project.weekdays = Object.keys(weekdays)
				.sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b))
				.map(weekday => ({ weekday, rows: weekdays[weekday].rows, contributions: weekdays[weekday].contributions, users: weekdays[weekday].users.size, starters: weekdays[weekday].starters.size }));

			project.countries = Object.keys(countries)
				.map(country => ({ country, rows: countries[country].rows, contributions: countries[country].contributions, users: countries[country].users.size }));

			project.users = Object.keys(users)
				.map((user, i) => ({ id: i, contributions: users[user].contributions, rows: users[user].rows })); // discard user id

			let js = `window.projects.push(${JSON.stringify(project, null, '\t')});`;
			//js = js.replace(/\[[^\[\]]*\]/g, match => match.replace(/\s+/g, ' ')); // remove excessive whitespce
			return fs.writeFile(`${__dirname}/build/projects/${id}.js`, js, 'utf8');
		})
		.then(() => console.timeEnd(`Successfully parsed ${id}`));
};

fs.ensureDir(`${__dirname}/build/parsers`)
	.then(() => {
		if (id && id.match(/^[A-Za-z0-9-]+$/)) {
			generate(id);
		} else {
			fs.readdir(`${__dirname}/parsers`)
				.then(projects => Bluebird.map(projects, id => generate(id), { concurrency: 4 }));
		}
	});
