# IPSUM ![IPSUM logo](https://ipsum.filipwieland.com/favicon-96x96.png)

[![Open issues](https://img.shields.io/github/issues/FLamparski/seeraccept.svg)](https://github.com/FLamparski/seeraccept/issues) [![Meteor version 1.0.4.1](https://img.shields.io/badge/Meteor-1.0.4.1-brightgreen.svg)](https://meteor.com/) [![Ipsum version 1.0.4.1](https://img.shields.io/badge/Ipsum-0.2.5-green.svg)](https://ipsum.filipwieland.com/)

This is a project aimed at helping you track your portal submissions.
Simply log in with your Google account, hit "Refresh mail", and see statistics
about your submissions.

## Ultra quick-start guide

[Go here](https://ipsum.filipwieland.com/)

## Local quick-start guide

    # You will need node 0.10.36 and Meteor 1.0.42
    git clone https://github.com/FLamparski/seeraccept ipsum && cd ipsum
    meteor run --settings settings.json

# How does it work?

IPSUM will scan your gmail account for the following queries:

* `from:ingress-support@google.com`
    * `"Ingress Portal Submitted"`
    * `"Ingress Portal Live"`
    * `"Ingress Portal Rejected"`
    * `"Ingress Portal Duplicate"`

Based on that information, it will construct a dashboard listing your portal
submissions, highlighting which of them have been rejected or accepted.
It will also tell you the minimum, average, and maximum time Niantic has taken
to review a submission.

### Detailed description

IPSUM will use your G+ profile to automatically determine your account email,
and then use that information, along with your Google OAuth login to initiate an
IMAP connection when you click *Refresh Mail*. In this sense, IPSUM is like
a mail client. The difference is that it will only pull certain types of messages.

It will search for submissions first, then look for go-live notifications or
rejections. Most portal info is scraped from the submission email. Additionally,
IPSUM will try to scrape intel map links if found within the email.
The messages are all treated as 'events' in the portal's history, and statistics are
calculated based on that.

Internally, IPSUM will log into GMail using XOauth2 over IMAP, and execute
raw gmail searches for the submission-related terms. Then, Mail-Parser is used to
generate JS objects for the mail, and all that is divided into categories and
passed to the mail processor.

Roadmap
-------

I want to expand IPSUM to support the following:

* [ ] **Merging portal submissions:** If you've submitted the same portal several times,
  you may want to track it as such.
* [ ] **Groups:** Coordinate your submissions with your local group.
* [x] **Seer Badge progress meter:** This one should be easy.

Contributing
------------

Want to contribute? Great! Here is what you'll need:

* [Meteor](http://meteor.com/) should get you all you need
* Register for the Google Developer Console (free) and create a project to get
  your own localhost tokens. As per Meteor convention, please use the
  following values:
    * *JavaScript origins:* http://localhost:3000/
    * *Callback URL:* http://localhost:3000/_oauth/google?close
