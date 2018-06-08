module.exports = {
	name: 'Cities at Night',
	files: [
		'./data/LostAtNight_task_run.csv',
		'./data/nightcitiesiss_task_run.csv',
		'./data/darkskies_task_run.csv'
	],
	parseRow: row => ({
		date: new Date(row.task_run__created || row.created),
		isContribution: row.hasOwnProperty('info_LONLAT') || row.hasOwnProperty('task_run__info_LONLAT'),
		user: row.user_id || row.task_run__user_id || row.user_ip || row.task_run__user_ip
	})
};
