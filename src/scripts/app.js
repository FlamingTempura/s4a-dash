import angular from 'angular';
import '@uirouter/angularjs';
import * as d3 from 'd3';
import moment from 'moment';
import alpha2 from 'iso-3166-1-alpha-2';

const countries = alpha2.getData();

const app = angular.module('app', ['ui.router']);

let dateStart, dateEnd;

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

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



app.component('daygraphold', {
	bindings: {
		data: '<'
	},
	controller: function ($element) {
		let svg = d3.select($element[0]).append('svg').attr('width', 510).attr('height', 40),
			margin = {top: 0, right: 0, bottom: 0, left: 0},
			width = +svg.attr("width") - margin.left - margin.right,
			height = +svg.attr("height") - margin.top - margin.bottom;

		let g = svg.append("g")
			.attr("transform", `translate(${margin.left},${margin.top})`);

		let x = d3.scaleLinear()
			.domain([dateStart, dateEnd])
			.rangeRound([0, width]);

		let y = d3.scaleLog()
			.range([height, 0]);



		this.$onInit = () => {

			y.domain([1, d3.max(this.data, d => d.contributions + 1)]);

			console.log(y(1000));

			g.selectAll(".bar")
				.data(this.data)
				.enter().append("rect")
					.attr("class", "bar")
					.attr("x", d => x(d.date))
					.attr('y', d => y(d.contributions + 1))
					.attr("width", width / this.data.length)
					.attr("height", d => height - y(d.contributions + 1));

			/*g.append("g")
				.attr("transform", "translate(0," + height + ")")
				.call(d3.axisBottom(x));

			g.append("g")
				.call(d3.axisLeft(y));*/
		};
	}
});


app.component('daygraph', {
	bindings: {
		data: '<',
		axis: '<'
	},
	controller: function ($element) {
		let svg = d3.select($element[0]).append('svg').attr('width', 610).attr('height', 60),
			margin = {top: 0, right: 0, bottom: 20, left: 0},
			width = +svg.attr("width") - margin.left - margin.right,
			height = +svg.attr("height") - margin.top - margin.bottom;

		let g = svg.append("g")
			.attr("transform", `translate(${margin.left},${margin.top})`);

		let dateStart = new Date(2015, 1, 1)

		let x = d3.scaleTime()
			.domain([dateStart, dateEnd])
			.rangeRound([0, width]);

		let y = d3.scaleLog()
			.range([height, 0]);


var area = d3.area()
    .x(function(d) { return x(d.date); })
    .y1(function(d) { return y(d.contributions + 1); });

		this.$onInit = () => {

			let data = this.data.filter(d => d.date > dateStart && d.date < dateEnd);

			y.domain([1, d3.max(data, d => d.contributions + 1)]);

			console.log(this.axis);

			area.y0(y(1));

			g.append("path")
				.datum(data)
				.attr('class', 'area')
				.attr("fill", "steelblue")
				.attr("d", area);
			
			if (this.axis) {
				g.append("g")
					.attr("transform", "translate(0," + height + ")")
					.call(d3.axisBottom(x));
			}
		};
	}
});



app.component('weekdaygraph', {
	bindings: {
		data: '<',
		axis: '<'
	},
	controller: function ($element) {
		let svg = d3.select($element[0]).append('svg').attr('width', 100).attr('height', 60),
			margin = {top: 0, right: 0, bottom: 20, left: 0 },
			width = +svg.attr("width") - margin.left - margin.right,
			height = +svg.attr("height") - margin.top - margin.bottom;

		let g = svg.append("g")
			.attr("transform", `translate(${margin.left},${margin.top})`);

		let x = d3.scaleBand()
			.domain(WEEKDAYS)
			.range([0, width]);

		let y = d3.scaleLinear()
			.range([height, 0]);

		this.$onInit = () => {
			y.domain([0, d3.max(this.data, d => d.contributions)]);

			g.selectAll(".bar")
				.data(this.data)
				.enter().append("rect")
					.attr("class", "bar")
					.attr("x", d => x(d.weekday))
					.attr('y', d => y(d.contributions))
					.attr("width", width / this.data.length - 1)
					.attr("height", d => height - y(d.contributions));

			if (this.axis) {
				g.append("g")
					.attr("transform", "translate(0," + height + ")")
					.call(d3.axisBottom(x)
						.tickFormat(s => s.charAt(0).toUpperCase()));
			}
		};
	}
});
