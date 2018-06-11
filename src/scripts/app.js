import angular from 'angular';
import '@uirouter/angularjs';
import * as d3 from 'd3';
import moment from 'moment';
import alpha2 from 'iso-3166-1-alpha-2';

const countries = alpha2.getData();

const app = angular.module('app', ['ui.router']);

let dateStart, dateEnd;

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const chartHeight = 130;

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
		project.subprojects = window.projects.filter(p => p.parent && (p.parent.id || p.parent) === project.id);
		project.parent = window.projects.find(p => p.id === project.parent);
		if (project.countries.length === 0) {
			delete project.countries;
		} else {
			project.countries.forEach(d => d.name = countries[d.country]);
		}
	});

});

app.run(($rootScope, $transitions) => {
	$rootScope.yTitles = {
		contributions: 'contributions',
		users: 'contributers',
		starters: 'new contributers'
	};
	$rootScope.y = 'contributions';
	$rootScope.countryContributors = false;
	$transitions.onSuccess({}, function () { 
    document.body.scrollTop = document.documentElement.scrollTop = 0
});
});

app.config($stateProvider => {
	$stateProvider.state('projects', {
		url: '/',
		templateUrl: '/templates/projects.html',
		controller: function ($scope, $rootScope) {
			$scope.projects = window.projects;
			$rootScope.currentState = 'projects';
		}
	});

	$stateProvider.state('project', {
		url: '/project/:id',
		templateUrl: '/templates/project.html',
		controller: function ($state, $scope, $rootScope) {

			$rootScope.currentState = 'projects';
			$scope.project = window.projects.find(p => p.id === $state.params.id);
			$scope.month = $scope.project.months[$scope.project.months.length - 1];
			$scope.prevMonth = $scope.project.months[$scope.project.months.length - 2];
			/*


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

			*/
		}
	});

	$stateProvider.state('socialmedia', {
		url: '/socialmedia',
		templateUrl: '/templates/socialmedia.html',
		controller: function ($scope, $rootScope) {
			$scope.socialmedia = window.socialmedia;
			$rootScope.currentState = 'socialmedia';
			$scope.socialmedia.forEach((s, i) => {
				$scope.$watch(`socialmedia[${i}].selected`, () => {
					refreshChart();
				});
			});
			let refreshChart = () => {
				let months = {},
					allTags = {};
				$scope.socialmedia.forEach(account => {
					if (!account.selected) { return; }
					account.months.forEach(bin => {
						let month = months[bin.month];
						if (!month) {
							month = months[bin.month] = {
								date: moment(bin.month, 'YYYY-MM').toDate(),
								month: bin.month,
								tags: {},
								tweetsIn: 0,
								tweetsOut: 0
							};
						}
						Object.entries(bin.hashtags).forEach(([tag, count]) => {
							if (!month.tags[tag]) { month.tags[tag] = 0; }
							if (!allTags[tag]) { allTags[tag] = 0; }
							month.tags[tag] += count;
							allTags[tag] += count;
						});
						month.tweetsIn += bin.tweetsIn;
						month.tweetsOut += bin.tweetsOut;
					});
				});
				let ks = Object.keys(months).sort();
				months = ks.map(k => months[k]);
				console.log(months);
				$scope.data = months;
			};
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
		y: '<',
		width: '@',
		height: '@'
	},
	controller: function ($element) {
		this.$onChanges = () => {
			let svg = d3.select($element[0]).append('svg')
					.attr('width', this.width || 580)
					.attr('height', this.height || chartHeight),
				margin = {top: 10, right: 10, bottom: 50, left: 50 },
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

			xaxis.append("text")
				.attr('class', 'label')
				.attr("y", 22)
				.attr('x', width)
				.attr("dy", ".71em")
				.style("text-anchor", "end")
				.text("Day");

			yaxis.append("text")
				.attr('class', 'label')
				.attr("transform", "rotate(-90)")
				.attr("y", -margin.left)
				.attr("dy", ".71em")
				.style("text-anchor", "end")
				.text("Number of contributions (log)");

			this.$onChanges = () => {
				let data = this.data.filter(d => d.date > dateStart && d.date < dateEnd);
				console.log(data);

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
			this.$onChanges();
		};
	}
});

app.component('weekdaygraph', {
	bindings: {
		data: '<',
		y: '<',
		width: '@',
		height: '@'
	},
	controller: function ($element) {
		this.$onChanges = () => {
			let svg = d3.select($element[0]).append('svg')
					.attr('width', this.width || 170)
					.attr('height', this.height || chartHeight),
				margin = {top: 10, right: 10, bottom: 50, left: 50 },
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

			xaxis.append("text")
				.attr('class', 'label')
				.attr("y", 22)
				.attr('x', width)
				.attr("dy", ".71em")
				.style("text-anchor", "end")
				.text("Weekday");

			yaxis.append("text")
				.attr('class', 'label')
				.attr("transform", "rotate(-90)")
				.attr("y", -margin.left)
				.attr("dy", ".71em")
				.style("text-anchor", "end")
				.text("Number of contributions");

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
			this.$onChanges();
		};
	}
});

app.component('effortgraph', {
	bindings: {
		data: '<',
		y: '<',
		width: '@',
		height: '@'
	},
	controller: function ($element) {
		this.$onChanges = () => {
			let svg = d3.select($element[0]).append('svg')
					.attr('width', this.width || 190)
					.attr('height', this.height || chartHeight),
				margin = {top: 10, right: 10, bottom: 50, left: 50 },
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

			xaxis.append("text")
				.attr('class', 'label')
				.attr("y", 22)
				.attr('x', width)
				.attr("dy", ".71em")
				.style("text-anchor", "end")
				.text("Number of contributions");

			yaxis.append("text")
				.attr('class', 'label')
				.attr("transform", "rotate(-90)")
				.attr("y", -margin.left)
				.attr("dy", ".71em")
				.style("text-anchor", "end")
				.text("Number of users (log)");

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
			this.$onChanges();
		};
	}
});


app.component('tweetline', {
	bindings: {
		data: '<'
	},
	controller: function ($element) {
		this.$onChanges = () => {
			let svg = d3.select($element[0]).append('svg').attr('width', 530).attr('height', 400),
				margin = {top: 0, right: 0, bottom: 30, left: 20 },
				width = +svg.attr("width") - margin.left - margin.right,
				height = +svg.attr("height") - margin.top - margin.bottom;

			let g = svg.append("g")
				.attr("transform", `translate(${margin.left},${margin.top})`);

			let dateStart = new Date(2015, 1, 1);

			let x = d3.scaleTime()
				.domain([dateStart, dateEnd])
				.rangeRound([0, width]);

			let y = d3.scaleLinear()
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

				y.domain([1, d3.max(data, d => d.tweetsOut + 1)]);

				area.y0(y(1))
					.y1(d => y(d.tweetsOut + 1));

				path.datum(data)
					.transition()
					.duration(500)
					.attr("d", area);

				xaxis.call(d3.axisBottom(x));
				yaxis.call(d3.axisLeft(y));
			};
			this.$onChanges();
		};
	}
});

app.filter('capitalize', () => {
    return input => !!input ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : '';
});