const fs = require('fs');
module.exports = {
	name: 'Night Knights',
	files: [
		'./data/night-knights.csv'
	],
	parseRow: row => ({
		date: new Date(row.timestampUTC),
		isContribution: true,
		user: row.idUser
	}),
	metrics: () => {
		let json = fs.readFileSync('./data/night-knights-eval.json', { headers: true });
		let data = JSON.parse(json);
		console.log(data);
		return data;
	}
};
