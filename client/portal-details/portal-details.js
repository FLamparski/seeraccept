/* global Portals, Blaze, Template, moment, $, _ */
/* global PortalDetails:true */
PortalDetails = function(id, row) {
  var detailsHTML = Blaze.toHTMLWithData(Template.portalDetails, Portals.findOne(id));
  $('.provisional-body', row).remove();
  $('.portal-details', row).append($(detailsHTML));
};

Template.portalDetails.helpers({
    selected_portal: function(){
        return this;
    },
    events: function(){
        var p = this;
        return p ? _.sortBy(p.history, 'timestamp') : null;
    },
    relativeDate: function(timestamp){
        return moment(timestamp).fromNow();
    },
    intel: function(){
        var p = this;
        return p ? p.intel : null;
    },
    name: function(){
        var p = this;
        return p ? p.name : null;
    },
    image: function(){
        var p = this;
        return p ? p.image : null;
    },
    stats: function(){
        var p = this;
        if(!p) return "please wait";
        var text = "This portal ",
            hist = _.sortBy(p.history, 'timestamp');
        if(p.history.length > 1) {
            text += "took "
               + moment.duration(hist[0].timestamp - hist[hist.length - 1].timestamp).asDays()
               + " days to "
               + (hist[0].what === 'live' ? 'go live' : 'be rejected') + ".";
        } else {
            text += "is still waiting for decision.";
        }
        return text;
    }
});
