import angular from 'angular';
import '@uirouter/angularjs';
import * as d3 from 'd3';

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

			$scope.usersOverTime = $scope.project.months.map(m => ({ label: m.month, value: m.users.ids + m.users.ips }));
			$scope.newUsersOverTime = $scope.project.months.map(m => ({ label: m.month, value: m.newUsers.ids + m.newUsers.ips }));
			$scope.rowsOverTime = $scope.project.months.map(m => ({ label: m.month, value: m.rows }));
		}
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
		var svg = d3.select($element[0]).append('svg').attr('width', 600).attr('height', 340),
		    margin = {top: 20, right: 20, bottom: 30, left: 40},
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
			      .attr("class", "axis axis--x")
			      .attr("transform", "translate(0," + height + ")")
			      .call(d3.axisBottom(x));

			  g.append("g")
			      .attr("class", "axis axis--y")
			      .call(d3.axisLeft(y))
			    .append("text")
			      .attr("transform", "rotate(-90)")
			      .attr("y", 6)
			      .attr("dy", "0.71em")
			      .attr("text-anchor", "end")
			      .text("Frequency");

			  g.selectAll(".bar")
			    .data(this.left)
			    .enter().append("rect")
			      .attr("class", "bar")
			      .attr("x", function(d) { return x(d.label); })
			      .attr("y", function(d) { return y(d.value); })
			      .attr("width", x.bandwidth())
			      .attr("height", function(d) { return height - y(d.value); });
		};
	}
});
