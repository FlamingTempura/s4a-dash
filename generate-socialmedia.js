const Bluebird = require('bluebird');
const fs = require('fs-extra');
const xlsx = require('xlsx');
const moment = require('moment');

const id = process.argv.pop();

const generate = id => {
	id = id.replace(/.xlsx$/, ''); // string extension
	console.log(`Parsing ${id}...`);
	console.time(`Successfully parsed ${id}`);
	return fs.readFile(`${__dirname}/data/socialmedia/${id}.xlsx`)
		.then(data => {
			let workbook = xlsx.read(data, { cellDates: true }),
				sheet = workbook.Sheets.Edges,
				rows = [],
				i = 3,
				follows = 0,
				handle;
			do {
				let from = sheet[`A${i}`],
					to = sheet[`B${i}`],
					date = sheet[`P${i}`],
					hashtags = sheet[`T${i}`],
					type = sheet[`O${i}`];
				if (!from) { break; }
				from = from && from.v;
				to = to && to.v;
				date = date.v;
				hashtags = hashtags && hashtags.v.split(' ');
				type = type.v === 'Follows' ? 'follow' : 'tweet';
				let day = moment(date).startOf('day').format('YYYY-MM-DD'),
					month = day.slice(0, 7);
				
				if (from === to) {
					to = null;
					handle = handle || from;
				}
				if (type === 'follow') {
					follows++;
				} else {
					rows.push({ type, date, day, month, from, to, hashtags });
				}
				i++;
			} while (true);

			rows = rows.sort((a, b) => a.date - b.date);

			let dateStart = rows[0].date,
				dateEnd = rows[rows.length - 1].date,
				date = moment(dateStart).startOf('day').toDate(),
				days = [],
				months = [];
			while (date <= dateEnd) {
				let day = moment(date).format('YYYY-MM-DD');
				days.push({ day, tweets: rows.filter(r => r.day === day).length });
				date = moment(date).add(1, 'day');
			}
			date = moment(dateStart).startOf('month').toDate();
			while (date <= dateEnd) {
				let month = moment(date).format('YYYY-MM'),
					tweets = rows.filter(r => r.type === 'tweet' && r.month === month),
					tweetsOut = tweets.filter(d => d.from === handle),
					tweetsIn = tweets.filter(d => d.to === handle),
					hashtags = {};
				tweets.forEach(t => {
					(t.hashtags||[]).forEach(h => {
						if (!hashtags[h]) { hashtags[h] = 0; }
						hashtags[h]++;
					});
				});
				months.push({ month, tweets: tweets.length,
					tweetsOut: tweetsOut.length, tweetsIn: tweetsIn.length,
					hashtags });
				date = moment(date).add(1, 'month');
			}

			let project = { id, months, days, handle, follows };

			let js = `window.socialmedia.push(${JSON.stringify(project, null, '\t')});`;
			//js = js.replace(/\[[^\[\]]*\]/g, match => match.replace(/\s+/g, ' ')); // remove excessive whitespce
			return fs.writeFile(`${__dirname}/build/socialmedia/${id}.js`, js, 'utf8');
		})
		.then(() => console.timeEnd(`Successfully parsed ${id}`));
};

fs.ensureDir(`${__dirname}/build/socialmedia`)
	.then(() => {
		if (id && id.match(/^[A-Za-z0-9-]+$/)) {
			generate(id);
		} else {
			fs.readdir(`${__dirname}/data/socialmedia`)
				.then(projects => Bluebird.map(projects, id => generate(id), { concurrency: 4 }));
		}
	});
