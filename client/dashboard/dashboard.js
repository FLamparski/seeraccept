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

piechart_data = function(portals) {
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
};
redrawChart = _.debounce(function () {
  var chart = Template.portalPieChart._pieChart;
  var data = piechart_data(Portals.find().fetch());
  data.forEach(function(datum, index) {
    chart.segments[index] = _.extend(chart.segments[index], datum);
  });
  chart.update();
}, 200);
Template.portalPieChart.rendered = function(){
  console.log('portalPieChart rendered');
  var self = this;
  Template.portalPieChart._chartContext = self.find('#portalPieChart').getContext('2d');
  Template.portalPieChart._pieChart = new Chart(Template.portalPieChart._chartContext, { animation: false, responsive: true })
    .Pie(piechart_data(Portals.find().fetch()));
  self._portalObserver = Portals.find().observeChanges({
    added: redrawChart,
    changed: redrawChart,
    removed: redrawChart
  });
};

Template.portalPieChart.destroyed = function() {
  this._portalObserver.stop();
};

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
