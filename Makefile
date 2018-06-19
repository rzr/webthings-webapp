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
SELF?=${CURDIR}/Makefile
version?=$(shell date)
tizen_dir?=${HOME}/tizen-studio
tizen?=${tizen_dir}/tools/ide/bin/tizen
pkgid?=ComExample
pkgname?=Example
wgt_file?=${pkgname}.wgt
cert?=tizen
dst=/opt/usr/apps/${pkgid}/res/wgt/index.html
tizen_profile?=mobile-2.4
tizen_template?=WebBasicApplication

all: ${wgt_file}
	pwd

clean:
	rm -f *~ *.tmp

cleanall: clean
	rm -f ${wgt_file}
	rm -f *.wgt *.zip

distclean: cleanall
	rm -rf tmp
	rm -rf author-signature.xml .buildResult .manifest.tmp signature1.xml tmp

rule/firefox: ${index}
	firefox $<

rule/chromium: ${index}
	chromium-browser --disable-web-security $<

rule/chromium/clean: ${index}
	@mkdir -p "${tmpdir}/$@"
	HOME="${tmpdir}/$@"\
 chromium-browser --disable-web-security \
--user-data-dir="${tmpdir}/$@" \
"$<"

import:
	${tizen} list web-project
	${tizen} create web-project -p ${tizen_profile} -t ${tizen_template}  -n ${package_name}

lib/tau: ${tizen_dir}/platforms/tizen-2.4/mobile/samples/Template/Web/tau-single-page/project/lib/tau
	@mkdir -p ${@D}
	cp -rfa $< $@
