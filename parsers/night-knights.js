module.exports = {
	name: 'Night Knights',
	files: [
		'./data/night-knights.csv'
	],
	parseRow: row => ({
		date: new Date(row.timestampUTC),
		isContribution: true,
		user: row.idUser
	})
};
