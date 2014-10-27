Package.describe({
  name: "xoauth2",
  summary: "node-xoauth2."
});

Npm.depends({
  "xoauth2": "0.1.8"
});

Package.on_use(function(api) {
  api.imply && api.imply('xoauth2', ['server']);
  api.add_files(['xoauth2.js'], 'server');
  api.export(['XOauth2']);
});
