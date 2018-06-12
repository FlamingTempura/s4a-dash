const Bluebird = require('bluebird');
const fs = require('fs-extra');
const xlsx = require('xlsx');
const moment = require('moment');

const id = process.argv.pop();

const TWEET_NODE_LIMIT = 100;

const getVal = cell => {
	let v = cell ? cell.v : null;
	if (typeof v === 'string' && v.match(/\d\d\/\d\d\/\d\d\d\d \d\d:\d\d:\d\d/)) {
		v = moment(v, 'DD/MM/YYYY HH:mm:ss').toDate();
	}
	return v;
};

const processTwitter = id => {
	return fs.readFile(`${__dirname}/data/socialmedia/${id}.xlsx`)
		.then(data => {
			let workbook = xlsx.read(data, { cellDates: true }),
				Edges = workbook.Sheets.Edges,
				Vertices = workbook.Sheets.Vertices,
				edges = [],
				vertices = [],
				dateStart,
				dateEnd,
				i = 3,
				possibleOfficialAccounts = {},
				defaultVals = { engagers: 0, posts: 0, replies: 0, mentions: 0, favorites: 0, shares: 0, comments: 0 };

			if (Edges.Q2.v !== 'Tweet') {
				throw new Error(`${id} is not twitter data, skipping...`);
			}
			console.log(`> detected twitter data ${id}`);

			do { // go through each row of the sheet
				let vertex = getVal(Vertices[`A${i}`]),
					followers = getVal(Vertices[`AF${i}`]);
				if (!vertex) { break; } // reached end of sheet
				vertices.push({ vertex, followers });
				i++;
			} while (true);

			i = 3;
			do { // go through each row of the sheet
				let vertex1 = getVal(Edges[`A${i}`]),
					vertex2 = getVal(Edges[`B${i}`]),
					date = getVal(Edges[`P${i}`]),
					hashtags = (getVal(Edges[`T${i}`]) || '').split(' '),
					content = getVal(Edges[`Q${i}`]),
					relationship = getVal(Edges[`O${i}`]),
					favorites = getVal(Edges[`AD${i}`]),
					retweets = getVal(Edges[`AK${i}`]);
				if (!vertex1) { break; } // reached end of sheet
				if (date) {
					if (!dateStart || date < dateStart) { dateStart = date; }
					if (!dateEnd || date > dateEnd) { dateEnd = date; }
				}
				if (relationship === 'Tweet') {
					if (!possibleOfficialAccounts[vertex1]) { possibleOfficialAccounts[vertex1] = 0; }
					possibleOfficialAccounts[vertex1]++;
				}
				edges.push({ vertex1, vertex2, date, relationship, hashtags, favorites, retweets, content });
				i++;
			} while (true);

			if (Object.keys(possibleOfficialAccounts).length === 0) {
				console.error(`> failed to parse ${id}`);
				return;
			}

			let officialAccount = Object.entries(possibleOfficialAccounts)
				.sort((a, b) => a[0] - b[0])
				[0][0];

			let date = moment(dateStart).startOf('month').toDate(),
				months = [];
			while (date <= dateEnd) {
				let month = moment(date).format('YYYY-MM');
				months[month] = Object.assign({ month }, defaultVals);
				date = moment(date).add(1, 'month').toDate();
			}

			let nodes = {},
				links = {},
				totals = Object.assign({}, defaultVals);

			vertices.forEach(({ vertex, followers }) => {
				nodes[vertex] = { id: vertex, group: vertex === officialAccount ? officialAccount : 'user', count: 0 };
				totals.engagers++;
				if (vertex === officialAccount) {
					totals.followers = followers;
				}
			});

			let posts = [],
				hashtagsOut = {},
				hashtagsIn = {};
			edges.forEach(edge => {
				let month = moment(edge.date).format('YYYY-MM');
				if (edge.vertex1 && edge.vertex2) {
					let link = links[`${edge.vertex1}:${edge.vertex2}`];
					if (!link) {
						link = links[`${edge.vertex1}:${edge.vertex2}`] = { source: edge.vertex1, target: edge.vertex2, value: 0 };
					}
					link.value++;
					nodes[edge.vertex1].count++;
					nodes[edge.vertex2].count++;
				}
				if (edge.relationship === 'Tweet' && edge.vertex1 === officialAccount) {
					[months[month], totals].forEach(o => {
						o.posts += 1;
						o.favorites += edge.favorites;
						o.shares += edge.retweets;
					});
					posts.push({ content: edge.content, favorites: edge.favorites, 
						shares: edge.retweets });
				}
				if (edge.relationship === 'Replies to' && edge.vertex1 !== officialAccount) {
					[months[month], totals].forEach(o => o.comments += 1);
				}
				if (edge.relationship === 'Replies to' && edge.vertex1 === officialAccount) {
					[months[month], totals].forEach(o => o.replies += 1);
				}
				if (edge.relationship === 'Mentions') {
					[months[month], totals].forEach(o => o.mentions += 1);
				}
				let hashtags = edge.vertex1 === officialAccount ? hashtagsOut : hashtagsIn;
				edge.hashtags.forEach(tag => {
					if (!tag) { return; }
					if (!hashtags[tag]) { hashtags[tag] = 0; }
					hashtags[tag]++;
				});
			});

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

			let mostFavorited = posts.sort((a, b) => b.favorites - a.favorites).slice(0, 10),
				mostShared = posts.sort((a, b) => b.shares - a.shares).slice(0, 10);

			months = Object.keys(months).sort().map(m => months[m]);
			
			hashtagsIn = Object.entries(hashtagsIn)
				.map(([tag, count]) => ({ tag, count }))
				.sort((a, b) => b.count - a.count)
				.slice(0, 50);

			hashtagsOut = Object.entries(hashtagsOut)
				.map(([tag, count]) => ({ tag, count }))
				.sort((a, b) => b.count - a.count)
				.slice(0, 50);

			let project = { id, type: 'twitter', officialAccount, months, totals,
				hashtagsOut, hashtagsIn, mostFavorited, mostShared, links, nodes };

			let js = `window.socialmedia.push(${JSON.stringify(project, null, '\t')});`;
			//js = js.replace(/\[[^\[\]]*\]/g, match => match.replace(/\s+/g, ' ')); // remove excessive whitespce
			return fs.writeFile(`${__dirname}/build/accounts/${id}.js`, js, 'utf8');
		});
};

const processFacebook = id => {
	return fs.readFile(`${__dirname}/data/socialmedia/${id}.xlsx`)
		.then(data => {
			let workbook = xlsx.read(data, { cellDates: true }),
				Edges = workbook.Sheets.Edges,
				Vertices = workbook.Sheets.Vertices;

			if (Vertices.AD2.v !== 'Custom Menu Item Text') {
				throw new Error(`${id} is not facebook data, skipping...`);
			}
			console.log(`> detected facebook data ${id}`);
			
			let vertices = [],
				edges = [],
				i = 3,
				officialAccount,
				dateStart,
				dateEnd,
				possibleOfficialAccounts = {},
				defaultVals = { engagers: 0, posts: 0, replies: 0, mentions: 0, favorites: 0, shares: 0, comments: 0 },
				totals = Object.assign({}, defaultVals),
				months = {};

			do { // go through each row of the sheet
				let vertex = getVal(Vertices[`A${i}`]),
					type = getVal(Vertices[`AS${i}`]),
					author = getVal(Vertices[`BB${i}`]),
					date = getVal(Vertices[`BC${i}`]) || getVal(Vertices[`BN${i}`]),
					likes = getVal(Vertices[`BF${i}`]),
					shares = getVal(Vertices[`BH${i}`]) || 0,
					comments = getVal(Vertices[`BG${i}`]),
					content = getVal(Vertices[`AZ${i}`]);
				if (!vertex) { break; } // reached end of sheet
				if (author) {
					if (!possibleOfficialAccounts[author]) { possibleOfficialAccounts[author] = 0; }
					possibleOfficialAccounts[author]++;
				}
				if (date) {
					if (!dateStart || date < dateStart) { dateStart = date; }
					if (!dateEnd || date > dateEnd) { dateEnd = date; }
				}
				vertices.push({ vertex, type, date, author, likes, shares, comments, content });
				i++;
			} while (true);
			i = 3;
			do { // go through each row of the sheet
				let vertex1 = getVal(Edges[`A${i}`]),
					vertex2 = getVal(Edges[`B${i}`]),
					date = getVal(Edges[`U${i}`]);
				if (!vertex1) { break; } // reached end of sheet
				edges.push({ vertex1, vertex2, date });
				i++;
			} while (true);

			officialAccount = Object.entries(possibleOfficialAccounts)
				.sort((a, b) => a[0] - b[0])
				[0][0];

			let date = moment(dateStart).startOf('month').toDate();
			date = moment(dateStart).startOf('month').toDate();
			while (date <= dateEnd) {
				let month = moment(date).format('YYYY-MM');
				months[month] = Object.assign({ month }, defaultVals);
				date = moment(date).add(1, 'month').toDate();
			}
			let posts = [];
			vertices.forEach(vertex => {
				let month = moment(vertex.date).format('YYYY-MM');
				if (vertex.type === 'Post' && vertex.author === officialAccount) {
					[months[month], totals].forEach(o => {
						o.posts += 1;
						o.favorites += vertex.likes;
						o.shares += vertex.shares;
					});
					posts.push({ content: vertex.content, favorites: vertex.likes, 
						shares: vertex.shares, comments: vertex.comments });
				}
				if (vertex.type === 'User') {
					if (vertex.vertex !== officialAccount) {
						totals.engagers += 1;
					}
				}
				if (vertex.type === 'Comment' && vertex.author === officialAccount) {
					[months[month], totals].forEach(o => o.replies += 1);
				}
				if (['Comment', 'Post'].includes(vertex.type) && vertex.author !== officialAccount) {
					[months[month], totals].forEach(o => o.comments += 1);
				}
			});
			edges.forEach(edge => {
				if (edge.vertex2 === officialAccount) {
					let month = moment(edge.date).format('YYYY-MM');
					[months[month], totals].forEach(o => o.mentions += 1);
				}
			});

			let mostFavorited = posts.sort((a, b) => b.favorites - a.favorites).slice(0, 10),
				mostDiscussed = posts.sort((a, b) => b.comments - a.comments).slice(0, 10),
				mostShared = posts.sort((a, b) => b.shares - a.shares).slice(0, 10);

			months = Object.keys(months).sort().map(m => months[m]);

			let project = { id, type: 'facebook', officialAccount, months, totals,
				mostFavorited, mostDiscussed, mostShared };

			let js = `window.socialmedia.push(${JSON.stringify(project, null, '\t')});`;
			//js = js.replace(/\[[^\[\]]*\]/g, match => match.replace(/\s+/g, ' ')); // remove excessive whitespce
			return fs.writeFile(`${__dirname}/build/accounts/${id}.js`, js, 'utf8');
		});
};


const processWeirdFile = id => { // for stars4all Facebook.xlsx
	return fs.readFile(`${__dirname}/data/socialmedia/${id}.xlsx`)
		.then(data => {
			let workbook = xlsx.read(data, { cellDates: true }),
				Edges = workbook.Sheets.Edges,
				Vertices = workbook.Sheets.Vertices;

			if (Vertices.AP2.v !== 'Custom Menu Item Text') {
				throw new Error(`${id} is not facebook data, skipping...`);
			}
			console.log(`> detected weird facebook data ${id}`);
			
			let vertices = [],
				edges = [],
				i = 3,
				officialAccount,
				dateStart,
				dateEnd,
				possibleOfficialAccounts = {},
				defaultVals = { engagers: 0, posts: 0, replies: 0, mentions: 0, favorites: 0, shares: 0, comments: 0 },
				totals = Object.assign({}, defaultVals),
				months = {};

			do { // go through each row of the sheet
				let vertex = getVal(Vertices[`A${i}`]),
					type = getVal(Vertices[`BL${i}`]),
					author = getVal(Vertices[`BU${i}`]),
					date = getVal(Vertices[`BV${i}`]) || getVal(Vertices[`CG${i}`]),
					likes = getVal(Vertices[`BY${i}`]),
					shares = getVal(Vertices[`CA${i}`]) || 0,
					comments = getVal(Vertices[`BZ${i}`]),
					content = getVal(Vertices[`BS${i}`]);
				if (!vertex) { break; } // reached end of sheet
				if (author) {
					if (!possibleOfficialAccounts[author]) { possibleOfficialAccounts[author] = 0; }
					possibleOfficialAccounts[author]++;
				}
				if (date) {
					if (!dateStart || date < dateStart) { dateStart = date; }
					if (!dateEnd || date > dateEnd) { dateEnd = date; }
				}
				vertices.push({ vertex, type, date, author, likes, shares, comments, content });
				i++;
			} while (true);
			i = 3;
			do { // go through each row of the sheet
				let vertex1 = getVal(Edges[`A${i}`]),
					vertex2 = getVal(Edges[`B${i}`]),
					date = getVal(Edges[`U${i}`]);
				if (!vertex1) { break; } // reached end of sheet
				edges.push({ vertex1, vertex2, date });
				i++;
			} while (true);

			officialAccount = Object.entries(possibleOfficialAccounts)
				.sort((a, b) => a[0] - b[0])
				[0][0];

			let date = moment(dateStart).startOf('month').toDate();
			date = moment(dateStart).startOf('month').toDate();
			while (date <= dateEnd) {
				let month = moment(date).format('YYYY-MM');
				months[month] = Object.assign({ month }, defaultVals);
				date = moment(date).add(1, 'month').toDate();
			}
			let posts = [];
			vertices.forEach(vertex => {
				let month = moment(vertex.date).format('YYYY-MM');
				if (vertex.type === 'Post' && vertex.author === officialAccount) {
					[months[month], totals].forEach(o => {
						o.posts += 1;
						o.favorites += vertex.likes;
						o.shares += vertex.shares;
					});
					posts.push({ content: vertex.content, favorites: vertex.likes, 
						shares: vertex.shares, comments: vertex.comments });
				}
				if (vertex.type === 'User') {
					if (vertex.vertex !== officialAccount) {
						totals.engagers += 1;
					}
				}
				if (vertex.type === 'Comment' && vertex.author === officialAccount) {
					[months[month], totals].forEach(o => o.replies += 1);
				}
				if (['Comment', 'Post'].includes(vertex.type) && vertex.author !== officialAccount) {
					[months[month], totals].forEach(o => o.comments += 1);
				}
			});
			edges.forEach(edge => {
				if (edge.vertex2 === officialAccount) {
					let month = moment(edge.date).format('YYYY-MM');
					[months[month], totals].forEach(o => o.mentions += 1);
				}
			});

			let mostFavorited = posts.sort((a, b) => b.favorites - a.favorites).slice(0, 10),
				mostDiscussed = posts.sort((a, b) => b.comments - a.comments).slice(0, 10),
				mostShared = posts.sort((a, b) => b.shares - a.shares).slice(0, 10);

			months = Object.keys(months).sort().map(m => months[m]);

			let project = { id, type: 'facebook', officialAccount, months, totals,
				mostFavorited, mostDiscussed, mostShared };

			let js = `window.socialmedia.push(${JSON.stringify(project, null, '\t')});`;
			//js = js.replace(/\[[^\[\]]*\]/g, match => match.replace(/\s+/g, ' ')); // remove excessive whitespce
			return fs.writeFile(`${__dirname}/build/accounts/${id}.js`, js, 'utf8');
		});
};

const run = (id) => {
	id = id.replace(/.xlsx$/, ''); // string extension
	console.log(`Parsing ${id}...`);
	console.time(`> successfully parsed ${id}`);
	return processWeirdFile(id)
		.catch(() => processFacebook(id))
		.catch(() => processTwitter(id))
		.then(() => console.timeEnd(`> successfully parsed ${id}`))
		.catch(err => console.error(`[${id}] ERROR:`, err));
}

fs.ensureDir(`${__dirname}/build/accounts`)
	.then(() => {
		if (id && id.match(/^[A-Za-z0-9-]+$/)) {
			run(id);
		} else {
			fs.readdir(`${__dirname}/data/socialmedia`)
				.then(projects => {
					return Bluebird.map(projects.filter(p => p.endsWith('.xlsx')), id => run(id), { concurrency: 4 });
				});
		}
	});
