module.exports = {
	name: 'Photometer network',
	url: 'http://ckan.stars4all.eu/',
	note: 'Available (as monthly CSVs) through this link',
	files: [
		'./data/tess-april-2017.csv',
		'./data/tess-april-2018.csv',
		'./data/tess-dec-2017.csv',
		'./data/tess-december-2016.csv',
		'./data/tess-february-2017.csv',
		'./data/tess-february-2018.csv',
		'./data/tess-january-2017.csv',
		'./data/tess-january-2018.csv',
		'./data/tess-july-2017.csv',
		'./data/tess-june-2017.csv',
		'./data/tess-march-2017.csv',
		'./data/tess-march-2018.csv',
		'./data/tess-may-2017.csv',
		'./data/tess-nov-2017.csv',
		'./data/tess-november-2016.csv',
		'./data/tess-oct-2017.csv',
		'./data/tess-october-2016.csv'
	],
	parseRow: row => ({
		date: new Date(row.tstamp),
		isContribution: true,
		user: row.name
	})
};
