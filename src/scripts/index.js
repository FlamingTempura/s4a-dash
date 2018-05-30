import angular from 'angular';

import '@uirouter/angularjs';

window.projects = []; // set up global array for project data

const app = angular.module('app', ['ui.router']);

app.config($stateProvider => {
	$stateProvider.state('projects', {
		url: '/',
		templateUrl: '/templates/projects.html',
		controller() {
		}
	});
});

app.config($stateProvider => {
	$stateProvider.state('project', {
		url: '/',
		templateUrl: '/templates/project.html',
		controller() {
		}
	});
});