Package.describe({
  name: "imap",
  summary: "node-imap."
});

Npm.depends({
  imap: '0.8.10'
});

Package.on_use(function(api) {
  api.imply && api.imply('imap', ['server']);
  api.add_files(['imap.js'], 'server');
  api.export(['Imap']);
});
