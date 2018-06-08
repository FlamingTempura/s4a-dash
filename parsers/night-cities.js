module.exports = {
	name: 'Night Cities',
	parent: 'cities-at-night',
	url: 'https://crowdcrafting.org/project/nightcitiesiss/',
	note: 'Same as Dark Skies, but all the data is there',
	files: [`./data/nightcitiesiss_task_run.csv`],
	parseRow: row => ({
		date: new Date(row.created),
		isContribution: true,
		user: row.user_id || row.user_ip
	})
};
