console.log("Entering schemas.js");

Schemas = {};
Schemas.PortalEvent = new SimpleSchema({
    timestamp: {type: Date, label: "Date of event"},
    what: {
        type: String,
        custom: function(){
            return (this.value === 'submitted' || this.value === 'rejected' || this.value === 'live') ? true : "notAllowed";
        }
    }
});
Schemas.Portal = new SimpleSchema({
    submitter: { type: String, label: "Submitter ID" },
    name: { type: String, label: "Portal Title" },
    image: { type: String, label: "Portal Photo" },
    intel: { type: String, optional: true },
    history: { type: [Schemas.PortalEvent], minCount: 1 }
});


