SeerAccept
==========

This is an Enlintel project aimed at helping you track your portal submissions.
Simply log in with your Google account, hit "Refresh mail", and see statistics
about your submissions.

How does it work?
-----------------

SeerAccept will scan your gmail account for the following queries:

* `from:ingress-support@google.com`
    * `"Ingress Portal Submitted"`
    * `"Ingress Portal Live"`
    * `"Ingress Portal Rejected"`

Based on that information, it will construct a dashboard listing your portal
submissions, highlighting which of them have been rejected or accepted.
It will also tell you the minimum, average, and maximum time Niantic has taken
to review a submission.

Roadmap
-------

I want to expand SeerAccept to support the following:

* **Merging portal submissions:** If you've submitted the same portal several times,
  you may want to track it as such.
* **Groups:** Coordinate your submissions with your local group.
* **Seer Badge progress meter:** This one should be easy.

Contributing
------------

Want to contribute? Great! Here is what you'll need:

* Node.js with NPM, and you may need to ensure that `/usr/bin/node` is symlinked
  to `/usr/bin/nodejs`
* [Meteor](http://meteor.com/) should get you most other things you need
* [Meteorite](https://github.com/oortcloud/meteorite/) for managing some dependencies
* Register for the Google Developer Console (free) and create a project to get
  your own localhost tokens. As per Meteor convention, please use the
  following values:
    * *JavaScript origins:* http://localhost:3000/
    * *Callback URL:* http://localhost:3000/_oauth/google?close

Things to note: You might not be able to run SeerAccept on Windows, even with a
Cygnus environment. Use a VM or a Linux or OS X.
