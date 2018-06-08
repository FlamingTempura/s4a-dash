import angular from 'angular';
import '@uirouter/angularjs';
import * as d3 from 'd3';
import moment from 'moment';
import alpha2 from 'iso-3166-1-alpha-2';

const countries = alpha2.getData();

const app = angular.module('app', ['ui.router']);

app.config(function ($urlServiceProvider) {
	$urlServiceProvider.rules.otherwise({ state: 'projects' });
	window.projects.forEach(project => {
		project.months.forEach(m => m.month = moment(m.month, 'YYYY-MM').format('MMM YYYY'));
		project.subprojects = window.projects.filter(p => p.partOf === project.id);
		project.partOf = window.projects.find(p => p.id === project.partOf);
		if (!project.countries || Object.keys(project.countries).length === 0) {
			delete project.countries;
		}
		if (project.countries) {
			project.countries = Object.entries(project.countries)
				.map(([code, count]) => ({ code, name: countries[code], count }))
				.sort((a, b) => b.count - a.count);
			project.months.forEach(m => {
				m.countries = Object.entries(m.countries)
					.map(([code, count]) => ({ code, name: countries[code], count }))
					.sort((a, b) => b.count - a.count);
			});
		}
	});
});

app.config($stateProvider => {
	$stateProvider.state('projects', {
		url: '/',
		templateUrl: '/templates/projects.html',
		controller: function ($scope) {
			$scope.projects = window.projects;
		}
	});

	$stateProvider.state('project', {
		url: '/project/:id',
		templateUrl: '/templates/project.html',
		controller: function ($state, $scope) {
			$scope.project = window.projects.find(p => p.id === $state.params.id);
			console.log($scope.project);

			if ($scope.project.users) {
				$scope.usersOverTime = $scope.project.months.map(m => ({ label: m.month, value: m.users.ids + m.users.ips }));
				$scope.newUsersOverTime = $scope.project.months.map(m => ({ label: m.month, value: m.newUsers.ids + m.newUsers.ips }));
			}
			if ($scope.project.contributions) {
				$scope.contributionsOverTime = $scope.project.months.map(m => ({ label: m.month, value: m.contributions }));
			}
			if ($scope.project.complete) {
				$scope.completeOverTime = $scope.project.months.map(m => ({ label: m.month, value: m.complete }));
			}
			if ($scope.project.tasks) {
				$scope.tasksOverTime = $scope.project.months.map(m => ({ label: m.month, value: m.tasks }));
			}
			$scope.rowsOverTime = $scope.project.months.map(m => ({ label: m.month, value: m.rows }));

			$scope.month = $scope.project.months[$scope.project.months.length - 1];
		}
	});

	$stateProvider.state('about', {
		url: '/about',
		templateUrl: '/templates/about.html'
	});
});

app.component('histogram', {
	bindings: {
		left: '<',
		leftLabel: '=',
		right: '=',
		rightLabel: '='
	},
	controller: function ($element) {
		var svg = d3.select($element[0]).append('svg').attr('width', 900).attr('height', 340),
		    margin = {top: 20, right: 20, bottom: 60, left: 70},
		    width = +svg.attr("width") - margin.left - margin.right,
		    height = +svg.attr("height") - margin.top - margin.bottom;

		var x = d3.scaleBand().rangeRound([0, width]).padding(0.1),
		    y = d3.scaleLinear().rangeRound([height, 0]);

		var g = svg.append("g")
		    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		this.$onInit = () => {
			  x.domain(this.left.map(d => d.label));
			  y.domain([0, d3.max(this.left, d => d.value)]);

			  g.append("g")
			      .attr("class", "axis x")
			      .attr("transform", "translate(0," + height + ")")
			      .call(d3.axisBottom(x));

			  g.append("g")
			      .attr("class", "axis y")
			      .call(d3.axisLeft(y))
			    .append("text")
			      .attr("transform", "rotate(-90)")
			      .attr("y", 6)
			      .attr("dy", "0.71em")
			      .attr("text-anchor", "end")
			      .text(this.leftLabel);

			  g.selectAll(".bar")
			    .data(this.left)
			    .enter().append("rect")
			      .attr("class", "bar")
			      .attr("x", d => x(d.label))
			      .attr("y", d => y(d.value))
			      .attr("width", x.bandwidth())
			      .attr("height", d => height - y(d.value));
		};
	}
});



app.component('histogram', {
	bindings: {
		data: '<'
	},
	controller: function ($element) {
		var svg = d3.select($element[0]).append('svg').attr('width', 900).attr('height', 340),
		    margin = {top: 20, right: 20, bottom: 60, left: 70},
		    width = +svg.attr("width") - margin.left - margin.right,
		    height = +svg.attr("height") - margin.top - margin.bottom;

		var x = d3.scaleBand().rangeRound([0, width]).padding(0.1),
		    y = d3.scaleLinear().rangeRound([height, 0]);

		var g = svg.append("g")
		    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		this.$onInit = () => {
			  x.domain(this.data.map(d => d.label));
			  y.domain([0, d3.max(this.data, d => d.value)]);

			  g.append("g")
			      .attr("class", "axis x")
			      .attr("transform", "translate(0," + height + ")")
			      .call(d3.axisBottom(x));

			  g.append("g")
			      .attr("class", "axis y")
			      .call(d3.axisLeft(y))
			    .append("text")
			      .attr("transform", "rotate(-90)")
			      .attr("y", 6)
			      .attr("dy", "0.71em")
			      .attr("text-anchor", "end")
			      .text(this.leftLabel);

			  g.selectAll(".bar")
			    .data(this.data)
			    .enter().append("rect")
			      .attr("class", "bar")
			      .attr("x", d => x(d.label))
			      .attr("y", d => y(d.value))
			      .attr("width", x.bandwidth())
			      .attr("height", d => height - y(d.value));
		};
	}
});
