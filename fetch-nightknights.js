const request = require('request-promise');
const { username, password } = require('./nightknights-auth');
const { stringify } = require('csv');
const fs = require('fs');

const authenticate = () => {
	return request({
		method: 'POST',
		url: 'https://www.nightknights.eu/api/admin.php',
		json: true,
		body: { username, password }
	}).then(data => {
		console.log('authenticated. got token.');
		return data.token;	
	});
};

authenticate()
	.then(token => {
		console.log('getting solved tasks')
		return request({
			method: 'GET',
			url: 'https://www.nightknights.eu/rest/donetasks/?timestamp=',
			json: true,
			headers: {
				'Authorization': `Bearer ${token}`
			}
		}).then(data => {
			console.log('successfully fetched tasks done');
			stringify(data, { header: true }, (err, str) => {
				fs.writeFileSync(`${__dirname}/data/night-knights.csv`, str, 'utf8');
				console.log(`written csv to ${__dirname}/data/nightknights.csv`);
			});
		});
	});