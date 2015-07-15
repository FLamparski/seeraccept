/* global Meteor, HTTP, Portals, check, _ */

var url = Meteor.npmRequire('url');
var qs = Meteor.npmRequire('querystring');

// TODO: make this SSL
var CACHE_LIST = 'http://ingress.dj-djl.com/iic-/rest.aspx/PortalCache/List';

Meteor.methods({
  '/levels/get': function(id) {
    if (!this.userId) {
      throw new Meteor.Error(403, 'You need to be logged in to do that');
    }
    check(id, String);
    console.log(new Date().toISOString(), 'method:/levels/get', id);

    var portal = Portals.findOne(id);
    if (!portal) {
      throw new Meteor.Error(404, 'Not Found');
    }
    if (!portal.intel) {
      throw new Meteor.Error(400, 'Portal missing intel URL');
    }

    var portalLL = qs.parse(url.parse(portal.intel).query).ll;
    var parts = portalLL.split(',');
    var latitude = parts[0];
    var longitude = parts[1];
    var latE6 = latitude * 1e6;
    var lonE6 = longitude * 1e6;

    var params = {
      Teams: 3, // 3 = enl and res
      Levels: 255, // 255 = all portal levels because Lee likes bitmasks
      MinX: lonE6,
      MaxX: lonE6,
      MinY: latE6,
      MaxY: latE6
    };
    console.log(new Date().toISOString(), 'method:/levels/get', id, CACHE_LIST + '?' + qs.encode(params));
    var response = HTTP.get(CACHE_LIST, {
      params: params,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ipsum-portal-info/0.1'
      }
    });

    if (response.status > 399) {
      throw new Meteor.Error(response.status, 'An upstream error has occurred. Please see the attached URL for details.', CACHE_LIST + '?' + qs.encode(params));
    }

    var data = response.data || JSON.parse(response.content);
    return _.find(data, function(cached) {
      return cached.N === portal.name;
    });
  }
});
