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
tizen?=${HOME}/tizen-studio/tools/ide/bin/tizen
pkgname?=main
pkgid?=ComExample
wgt_file?=${pkgname}.wgt
cert?=tizen
dst=/opt/usr/apps/${pkgid}/res/wgt/index.html

all: ${wgt_file}
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


run: wgt check deploy
	${tizen} run --pkgid ${pkgid}

wgt: ${wgt_file}


${wgt_file}: ${SELF}
	${tizen} build-web # --exclude '.git/*,tmp/*'
	${tizen} package -t wgt -s ${cert}

check: ${wgt_file}
	unzip -t $<
	ls -l ${CURDIR}/${<}
	md5sum ${CURDIR}/${<}

import:
	${tizen} list web-project
	${tizen} create web-project -p mobile-2.4  -t WebSinglePage  -n main

	rm -f ${wgt_file}

rule/tizen/distclean: cleanall
	rm -rf author-signature.xml .buildResult .manifest.tmp signature1.xml tmp


deploy: ${wgt_file}
	lsusb
	sdb devices
	${tizen} install -n $< -- .
	${tizen_sdk_dir}/tools/sdb  shell pkgcmd -l -t wgt

rule/prep: index.html
	sudo mkdir -p ${dst}.tmp
	sudo ln -fs ${CURDIR}/index.html ${dst}

