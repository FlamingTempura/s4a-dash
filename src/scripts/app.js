import angular from 'angular';
import '@uirouter/angularjs';

const app = angular.module('app', ['ui.router']);

app.config(function ($urlServiceProvider) {
	$urlServiceProvider.rules.otherwise({ state: 'projects' });
});

app.config($stateProvider => {
	$stateProvider.state('projects', {
		url: '/',
		templateUrl: '/templates/projects.html',
		controller: function ($scope) {
			$scope.projects = window.projects.map(p => ({
				id: p.id,
				name: p.name
			}));
		}
	});

	$stateProvider.state('project', {
		url: '/project/:id',
		templateUrl: '/templates/project.html',
		controller: function ($state, $scope) {
			$scope.project = window.projects.find(p => p.id === $state.params.id);
			console.log($scope.project);
		}
	});
});