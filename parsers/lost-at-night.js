module.exports = {
	name: 'Lost at Night',
	parent: 'cities-at-night',
	url: 'https://crowdcrafting.org/project/LostAtNight/tasks/',
	note: 'Same as Dark Skies, but all the data is there',
	files: [`./data/LostAtNight_task_run.csv`],
	parseRow: row => ({
		date: new Date(row.created),
		isContribution: !!row.info_LONLAT,
		user: row.user_id || row.user_ip
	})
};
