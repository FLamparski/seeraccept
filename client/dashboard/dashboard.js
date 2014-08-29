function portalResponseTimes(){
return Portals.find({}).fetch()
    .filter(function(el){
        return el.history.length > 1;
    })
    .map(function(el){
        var sortedHistory = _.sortBy(el.history, 'timestamp');
        var earliest = moment(_.first(sortedHistory).timestamp);
        var latest = moment(_.last(sortedHistory).timestamp);
        return moment.duration(latest.diff(earliest)).asDays();
    });
}

Template.dashboard.helpers({
    shortestResponse: function(){
        if (Portals.find({}).count() === 0) return 0;
        return Math.round(
            _.min(portalResponseTimes()));
    },
    longestResponse: function(){
        if (Portals.find({}).count() === 0) return 0;
        return Math.round(
            _.max(portalResponseTimes()));
    },
    averageResponse: function(){
        if (Portals.find({}).count() === 0) return 0;
        return Math.round(portalResponseTimes().reduce(function(memo, num) {
          if (memo) return (memo + num) / 2;
          else return num; 
        }, null));
    },
    humanize: function(days) {
      return moment.duration(days, 'days').humanize();
    },
    countPortals: function(what) {
      return countPortalsWhichAre(what, Portals.find().fetch());
    },
    totalPortals: function() {
      return Portals.find().count();
    },
    isNextSeerAvailable: function() {
      return countPortalsWhichAre('live', Portals.find().fetch()) < 5000;
    }
});

function countPortalsWhichAre(what, where){
  return where.filter(function(portal){
    return _.last(_.sortBy(portal.history, 'timestamp')).what === what;
  }).length;
}

var _depreceated = {
  percentSubmittedCss: function(){
    return _percentStatus('submitted').toString() + '%';
  },
  percentRejectedCss: function(){
    return _percentStatus('rejected').toString() + '%';
  },
  percentLiveCss: function(){
    return _percentStatus('live').toString() + '%';
  },
  percentSubmittedView: function(){
    return (Math.round(_percentStatus('submitted') * 10) / 10).toString() + '%';
  },
  percentRejectedView: function(){
    return (Math.round(_percentStatus('rejected') * 10) / 10).toString() + '%';
  },
  percentLiveView: function(){
    return (Math.round(_percentStatus('live') * 10) / 10).toString() + '%';
  },
};

piechart_data = function(portals) {
  return [
    {
      value: countPortalsWhichAre('submitted', portals),
      label: 'Waiting',
      color: '#004d40',
      highlight: '#00796b'
    },
    {
      value: countPortalsWhichAre('live', portals),
      label: 'Live',
      color: '#0d5302',
      highlight: '#0a7e07'
    },
    {
      value: countPortalsWhichAre('rejected', portals),
      label: 'Rejected',
      color: '#b0120a',
      highlight: '#d01716'
    },
    {
      value: countPortalsWhichAre('duplicate', portals),
      label: 'Duplicate',
      color: '#ff6f00',
      highlight: '#ffa000'
    }
  ];
};
redrawChart = function () {
  var chart = Template.portalPieChart._pieChart;
  var data = piechart_data(Portals.find().fetch());
  data.forEach(function(datum, index) {
    chart.segments[index] = _.extend(chart.segments[index], datum);
  });
  chart.update();
};
Template.portalPieChart.rendered = function(){
  var self = this;
  setTimeout(function() {
    Template.portalPieChart._chartContext = self.find('#portalPieChart').getContext('2d');
    Template.portalPieChart._pieChart = new Chart(Template.portalPieChart._chartContext, { animation: false, responsive: true })
      .Pie(piechart_data(Portals.find().fetch()));
    self._portalObserver = Portals.find().observeChanges({
      added: redrawChart,
      changed: redrawChart,
      removed: redrawChart
    });
  }, 1000);
};

Template.portalPieChart.destroyed = function() {
  this._portalObserver.stop();
};

Template.badgeProgress.nextSeerBadge = function() {
  var levels = [
    { name: 'Before', minimum: 0 },
    { name: 'Bronze', minimum: 10 },
    { name: 'Silver', minimum: 50 },
    { name: 'Gold', minimum: 200 },
    { name: 'Platinum', minimum: 500 },
    { name: 'Black', minimum: 5000 }
  ];
  var currentCount = countPortalsWhichAre('live', Portals.find().fetch());
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
};
