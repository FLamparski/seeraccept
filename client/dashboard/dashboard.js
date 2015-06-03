/* eslint-env browser */
/* global portalLib, Meteor, Template, Portals, moment, _, Chart, Session */

Template.dashboard.helpers({
  shortestResponse: function() {
    if (this.portals.length === 0) {
      return 0;
    }
    return Math.round(
      _.min(portalLib.portalResponseTimes(this.portals)));
  },
  longestResponse: function() {
    if (this.portals.length === 0) {
      return 0;
    }
    return Math.round(
      _.max(portalLib.portalResponseTimes(this.portals)));
  },
  averageResponse: function() {
    if (this.portals.length === 0) {
      return 0;
    }
    return Math.round(portalLib.portalResponseTimes(this.portals).reduce(function(memo, num) {
      if (memo) {
        return (memo + num) / 2;
      } else {
        return num;
      }
    }, 0));
  },
  humanize: function(days) {
    return moment.duration(days, 'days').humanize();
  },
  countPortals: function(what) {
    return portalLib.countPortalsWhichAre(what, this.portals);
  },
  percentagePortals: function(what) {
    var count = portalLib.countPortalsWhichAre(what, this.portals);
    var total = this.portals.length;
    return Math.round(count / total * 1000) / 10;
  },
  totalPortals: function() {
    return this.portals.length;
  },
  isNextSeerAvailable: function() {
    return portalLib.countPortalsWhichAre('live', this.portals) < 5000;
  }
});

Template.dashboard.onRendered(function() {
  Session.set('page.title', 'Dashboard');
});

function piechartData(portals) {
  return [
    {
      value: portalLib.countPortalsWhichAre('submitted', portals),
      label: 'Waiting',
      color: '#004d40',
      highlight: '#00796b'
    },
    {
      value: portalLib.countPortalsWhichAre('live', portals),
      label: 'Live',
      color: '#0d5302',
      highlight: '#0a7e07'
    },
    {
      value: portalLib.countPortalsWhichAre('rejected', portals),
      label: 'Rejected',
      color: '#b0120a',
      highlight: '#d01716'
    },
    {
      value: portalLib.countPortalsWhichAre('duplicate', portals),
      label: 'Duplicate',
      color: '#ff6f00',
      highlight: '#ffa000'
    }
  ];
}

var redrawChart = _.debounce(function () {
  var chart = Template.portalPieChart._pieChart;
  var data = piechartData(Portals.find({submitter: Meteor.userId()}).fetch());
  data.forEach(function(datum, index) {
    chart.segments[index] = _.extend(chart.segments[index], datum);
  });
  chart.update();
}, 200);

Template.portalPieChart.onRendered(function() {
  console.log('portalPieChart rendered');
  setTimeout(function() {
    var cursor = Portals.find({submitter: Meteor.userId()});
    Template.portalPieChart._chartContext = this.find('#portalPieChart').getContext('2d');
    Template.portalPieChart._pieChart = new Chart(Template.portalPieChart._chartContext, { animation: false, responsive: true })
      .Pie(piechartData(cursor.fetch())); // eslint-disable-line new-cap
    this._portalObserver = cursor.observeChanges({
      added: redrawChart,
      changed: redrawChart,
      removed: redrawChart
    });
  }.bind(this), 0);
});

Template.portalPieChart.onDestroyed(function() {
  this._portalObserver.stop();
});

function scatterData(portals) {
  return [{
    label: 'Portals',
    data: _.chain(portals)
      .map(portalLib.getWaitTime)
      .filter(function(waitTime) {
        return waitTime.conclusive;
      }).map(function(waitTime, i) {
        return {x: _.findWhere(portals[i].history, {what: 'submitted'}).timestamp, y: waitTime.days};
      }).value()
  }];
}

Template.ttrScatterPlot.onRendered(function() {
  console.log('ttrScatterPlot rendered');
  setTimeout(function() {
    var cursor = Portals.find({submitter: Meteor.userId(), 'history.what': 'submitted'});
    this._chartContext = this.find('#ttrScatterPlot').getContext('2d');
    this._scatterPlot = new Chart(this._chartContext, { animation: true, responsive: true, maintainAspectRatio: true })
      .Scatter(scatterData(_.sortBy(cursor.fetch(), function(portal) { return _.findWhere(portal.history, {what: 'submitted'}).timestamp; })), { // eslint-disable-line new-cap
        scaleType: 'date',
        useUtc: true,
        scaleDateFormat: 'yyyy-mm-dd',
        scaleTimeFormat: 'HH:MM',
        scaleDateTimeFormat: 'yyyy-mm-dd HH:MM',
        bezierCurve: false
      });
  }.bind(this), 0);
});

function histogramData(portals) {
  var data = _.chain(portals)
    .map(portalLib.getWaitTime)
    .filter(function(waitTime) {
      return waitTime.conclusive;
    })
    .pluck('days')
    .sortBy()
    .reduce(function(hist, n) {
      if (!hist[n]) {
        hist[n] = 1;
      } else {
        hist[n] += 1;
      }
      return hist;
    }, {})
    .value();
  return {
    labels: _.keys(data),
    datasets: [{
      label: 'Number of days until review',
      data: _.values(data)
    }]
  };
}

Template.ttrHistogram.onRendered(function() {
  console.log('ttrHistogram rendered');
  setTimeout(function() {
    var cursor = Portals.find({submitter: Meteor.userId(), 'history.what': 'submitted'});
    this._chartContext = this.find('#ttrHistogram').getContext('2d');
    this._histogram = new Chart(this._chartContext, { animation: true, responsive: true, maintainAspectRatio: true })
      .Bar(histogramData(cursor.fetch()), {  // eslint-disable-line new-cap
        barValueSpacing: 1,
        scaleShowVerticalLines: false
      });
  }.bind(this), 0);
});

Template.badgeProgress.helpers({
  nextSeerBadge: function() {
    var levels = [
      { name: 'Before', minimum: 0 },
      { name: 'Bronze', minimum: 10 },
      { name: 'Silver', minimum: 50 },
      { name: 'Gold', minimum: 200 },
      { name: 'Platinum', minimum: 500 },
      { name: 'Black', minimum: 5000 }
    ];
    var currentCount = portalLib.countPortalsWhichAre('live', Portals.find().fetch());
    var currentLevel = _.last(_.filter(levels, function (level) {
      return level.minimum <= currentCount;
    }));
    var nextLevel = levels[levels.indexOf(currentLevel) + 1];
    return {
      currentLevel: currentLevel.name,
      toNextLevel: nextLevel.minimum - currentCount,
      nextLevel: nextLevel.name,
      percent: currentCount / nextLevel.minimum * 100
    };
  }
});
