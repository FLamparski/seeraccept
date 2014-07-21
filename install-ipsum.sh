#!/bin/sh

meteor bundle ipsum.tar.gz
scp ipsum.tar.gz ovz1.filipwieland.com:/opt/
ssh ovz1.filipwieland.com << HERE
cd /opt
./install-ipsum.sh
HERE
