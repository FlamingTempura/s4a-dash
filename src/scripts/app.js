import angular from 'angular';
import '@uirouter/angularjs';
import * as d3 from 'd3';
import moment from 'moment';
import alpha2 from 'iso-3166-1-alpha-2';

const countries = alpha2.getData();

const app = angular.module('app', ['ui.router']);

let dateStart, dateEnd;

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const chartHeight = 90;

app.config(function ($urlServiceProvider) {
	$urlServiceProvider.rules.otherwise({ state: 'projects' });

	window.projects.forEach(project => {
		project.days.forEach((d, i) => {
			let m = moment(d.day, 'YYYY-MM-DD');
			d.date = m.toDate();
			//d.day = m.format('DD MMM YYYY');
			if (i === 0 && d.date < dateStart || !dateStart) { dateStart = d.date; }
			if (i === project.days.length - 1 && d.date > dateEnd || !dateEnd) { dateEnd = d.date; }
		});
		project.months.forEach(d => {
			let m = moment(d.month, 'YYYY-MM');
			d.date = m.toDate();
			//d.month = m.format('MMM YYYY');
		});
		project.subprojects = window.projects.filter(p => p.parent === project.id);
		project.parent = window.projects.find(p => p.id === project.parent);
		if (project.countries.length === 0) {
			delete project.countries;
		} else {
			project.countries.forEach(d => d.name = countries[d.country]);
		}
	});
});

app.config($stateProvider => {
	$stateProvider.state('projects', {
		url: '/',
		templateUrl: '/templates/projects.html',
		controller: function ($scope) {
			$scope.projects = window.projects;
			$scope.y = 'contributions';
		}
	});

	$stateProvider.state('project', {
		url: '/project/:id',
		templateUrl: '/templates/project.html',
		controller: function ($state, $scope) {
			$scope.project = window.projects.find(p => p.id === $state.params.id);
			console.log($scope.project);/*

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

			$scope.month = $scope.project.months[$scope.project.months.length - 1];*/
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

app.component('daygraph', {
	bindings: {
		data: '<',
		y: '<'
	},
	controller: function ($element) {
		let svg = d3.select($element[0]).append('svg').attr('width', 530).attr('height', chartHeight),
			margin = {top: 0, right: 0, bottom: 30, left: 20 },
			width = +svg.attr("width") - margin.left - margin.right,
			height = +svg.attr("height") - margin.top - margin.bottom;

		let g = svg.append("g")
			.attr("transform", `translate(${margin.left},${margin.top})`);

		let dateStart = new Date(2015, 1, 1);

		let x = d3.scaleTime()
			.domain([dateStart, dateEnd])
			.rangeRound([0, width]);

		let y = d3.scaleLog()
			.range([height, 0]);

		let path = g.append("path")
			.attr('class', 'area');

		let area = d3.area()
			.x(d => x(d.date));

		let xaxis = g.append("g")
			.attr('class', 'x axis')
			.attr("transform", `translate(0,${height})`);

		let yaxis = g.append("g")
			.attr('class', 'y axis');
		
		this.$onChanges = () => {
			let data = this.data.filter(d => d.date > dateStart && d.date < dateEnd);

			y.domain([1, d3.max(data, d => d[this.y] + 1)]);

			area.y0(y(1))
				.y1(d => y(d[this.y] + 1));

			path.datum(data)
				.transition()
				.duration(500)
				.attr("d", area);

			xaxis.call(d3.axisBottom(x));
			yaxis.call(d3.axisLeft(y));
		};
	}
});



app.component('weekdaygraph', {
	bindings: {
		data: '<',
		y: '<'
	},
	controller: function ($element) {
		let svg = d3.select($element[0]).append('svg').attr('width', 120).attr('height', chartHeight),
			margin = {top: 0, right: 0, bottom: 30, left: 20 },
			width = +svg.attr("width") - margin.left - margin.right,
			height = +svg.attr("height") - margin.top - margin.bottom;

		let g = svg.append("g")
			.attr("transform", `translate(${margin.left},${margin.top})`);

		let x = d3.scaleBand()
			.domain(WEEKDAYS)
			.range([0, width]);

		let y = d3.scaleLinear()
			.range([height, 0]);

		let xaxis = g.append("g")
			.attr('class', 'x axis')
			.attr("transform", `translate(0,${height})`);

		let yaxis = g.append("g")
			.attr('class', 'y axis');

		this.$onChanges = () => {
			y.domain([0, d3.max(this.data, d => d[this.y])]);

			let bar = g.selectAll(".bar")
				.data(this.data);

			bar.exit().remove();

			bar.enter().append("rect")
				.attr("class", "bar")
				.attr("x", d => x(d.weekday))
				.attr("width", width / this.data.length - 1)
				.attr('y', d => y(d[this.y]))
				.attr("height", d => height - y(d[this.y]));

			bar.transition()
				.duration(500)
				.attr('y', d => y(d[this.y]))
				.attr("height", d => height - y(d[this.y]));

			xaxis.call(d3.axisBottom(x)
				.tickFormat(s => s.charAt(0).toUpperCase()));

			yaxis.call(d3.axisLeft(y));
		};
	}
});


app.component('effortgraph', {
	bindings: {
		data: '<',
		y: '<'
	},
	controller: function ($element) {
		let svg = d3.select($element[0]).append('svg').attr('width', 150).attr('height', chartHeight),
			margin = {top: 0, right: 5, bottom: 30, left: 20 },
			width = +svg.attr("width") - margin.left - margin.right,
			height = +svg.attr("height") - margin.top - margin.bottom;

		let g = svg.append("g")
			.attr("transform", `translate(${margin.left},${margin.top})`);

		let x = d3.scaleLinear()
			.rangeRound([0, width]);

		let y = d3.scaleLog()
			.range([height, 0]);

		let path = g.append("path")
			.attr('class', 'area');

		let area = d3.area()
			.x(d => x(d.index))
			.y1(d => y(d.users));

		let xaxis = g.append("g")
			.attr('class', 'x axis rotate')
			.attr("transform", `translate(0,${height})`);

		let yaxis = g.append("g")
			.attr('class', 'y axis');

		this.$onChanges = () => {

			let binSize = 10,
				bins = (new Array(100)).fill(0);

			this.data.forEach(user => {
				let index = Math.floor(user.contributions / binSize);
				if (index < bins.length) {
					bins[index]++;
				}
			});

			let data = bins.map((users, index) => ({ index, users: users + 1 }));

			x.domain([0, bins.length]);
			y.domain([1, d3.max(bins)]);

			area.y0(y(1));

			path.datum(data)
				.transition()
				.duration(500)
				.attr("d", area);

			xaxis.call(d3.axisBottom(x)
				.tickFormat(s => Math.floor(s * 100)));

			yaxis.call(d3.axisLeft(y));
		};
	}
});
