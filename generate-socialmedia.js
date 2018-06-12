const Bluebird = require('bluebird');
const fs = require('fs-extra');
const xlsx = require('xlsx');
const moment = require('moment');

const id = process.argv.pop();

const TWEET_NODE_LIMIT = 100;
const now = new Date();

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
				handle,
				nodes = {},
				links = {};

			do {
				let from = sheet[`A${i}`],
					to = sheet[`B${i}`],
					date = sheet[`P${i}`],
					hashtags = sheet[`T${i}`],
					type = sheet[`O${i}`];
				if (!from) { break; }
				from = from.v;
				to = to.v;
				if (!date || !(date.v instanceof Date)) { date = sheet[`BC${i}`]; }
				if (!date || !(date.v instanceof Date)) { date = sheet[`BN${i}`]; }
				if (!date || !(date.v instanceof Date)) {
					console.log('date not found', id);
					date = { v: now };
				}
				date = date ? date.v : now;
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
					if (from && to) {
						if (!nodes[from]) { nodes[from] = { id: from, group: 'user', count: 0 }; }
						if (!nodes[to]) { nodes[to] = { id: to, group: 'user', count: 0 }; }
						let link = links[`${from}:${to}`];
						if (!link) {
							link = links[`${from}:${to}`] = { source: from, target: to, value: 0 };
						}
						link.value++;
						nodes[from].count++;
						nodes[to].count++;
					}
				}
				i++;
			} while (true);

			rows = rows.sort((a, b) => a.date - b.date);
			if (rows.length === 0) { return; }

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

			if (handle) {
				nodes[handle].group = handle;
			}
			
			let linkKeys = Object.keys(links);

			nodes = Object.values(nodes)
				.sort((a, b) => b.count - a.count);

			nodes.slice(TWEET_NODE_LIMIT).forEach(node => {
				let s1 = `${node.id}:`,
					s2 = `:${node.id}`;
				linkKeys.filter(k => k.startsWith(s1) || k.endsWith(s2))
					.forEach(k => delete links[k]);
			});
			nodes = nodes.slice(0, TWEET_NODE_LIMIT);
			links = Object.values(links);

			let project = { id, handle, months, days, follows, links, nodes };

			let js = `window.socialmedia.push(${JSON.stringify(project, null, '\t')});`;
			//js = js.replace(/\[[^\[\]]*\]/g, match => match.replace(/\s+/g, ' ')); // remove excessive whitespce
			return fs.writeFile(`${__dirname}/build/accounts/${id}.js`, js, 'utf8');
		})
		.then(() => console.timeEnd(`Successfully parsed ${id}`))
		.catch(err => console.error(`[${id}] ERROR:`, err));
};

fs.ensureDir(`${__dirname}/build/accounts`)
	.then(() => {
		if (id && id.match(/^[A-Za-z0-9-]+$/)) {
			generate(id);
		} else {
			fs.readdir(`${__dirname}/data/socialmedia`)
				.then(projects => {
					return Bluebird.map(projects.filter(p => p.endsWith('.xlsx')), id => generate(id), { concurrency: 4 });
				});
		}
	});
