#!/usr/bin/make -f
# SPDX-License-Identifier: MPL-2.0
#{
# Copyright 2018-present Samsung Electronics France SAS, and other contributors
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.*
#}

default: all
	pwd


index?=index.html
tmpdir?=${CURDIR}/tmp

all: ${index}
	pwd

clean:
	rm -f *~ *.tmp

cleanall: clean
	rm -f *.wgt *.zip

distclean: cleanall
	rm -rf tmp

rule/firefox: ${index}
	firefox $<

rule/chromium: ${index}
	@mkdir -p "${tmpdir}/$@"
	HOME="${tmpdir}/$@"\
 chromium-browser --disable-web-security \
--user-data-dir="${tmpdir}/$@" \
$<

lint: index.html
	webtidy --version || echo  apt-get install libhtml-tidy-perl
	webtidy index.html > index.html.tmp
	mv index.html.tmp index.html
