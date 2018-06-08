module.exports = {
	name: 'Night Knights',
	parent: 'cities-at-night',
	url: 'https://www.nightknights.eu',
	note: 'Don\'t have access to the API yet',
	files: [
		'../data/results-nightknights-2016.csv',
		'../data/results-nightknights-2017.csv',
		'../data/results-nightknights-2018.csv'
	],
	parseRow: row => ({
		date: new Date(row.created),
		isContribution: row.hasOwnProperty('info_LONLAT'),
		user: row.user_id
	})
};
