function portalResponseTimes(){
return Portals.find({}).fetch()
    .filter(function(el){
        return el.history.length > 1;
    })
    .map(function(el){
        return Math.abs(el.history[0].timestamp - el.history[1].timestamp);
    });
}

Template.dashboard.helpers({
    shortestResponse: function(){
        if (Portals.find({}).count() === 0) return 0;
        return Math.round(
            _.min(portalResponseTimes()) / (1000*3600*24));
    },
    longestResponse: function(){
        if (Portals.find({}).count() === 0) return 0;
        return Math.round(
            _.max(portalResponseTimes()) / (1000*3600*24));
    },
    averageResponse: function(){
        if (Portals.find({}).count() === 0) return 0;
        return Math.round(Portals.find({}).fetch()
            .filter(function(el){
                return el.history.length > 1;
            })
            .map(function(el){
                return Math.abs(el.history[0].timestamp - el.history[1].timestamp);
            })
            .reduce(function(prev, curv){
                return (prev+curv) / 2;
            }, []) / (1000*3600*24));
    },
    countPortals: function(what) {
      return countPortalsWhichAre(what, Portals.find().fetch());
    },
    totalPortals: function() {
      return Portals.find().count();
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

Template.portalPieChart.destroyed = function(){
  this._portalObserver.stop();
};
