// -*- mode: js; js-indent-level:2; -*-
// SPDX-License-Identifier: MPL-2.0
/* Copyright 2018-present Samsung Electronics France
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

function log(arg)
{
  if (arg && arg.name && arg.message) {
    var err = arg;
    log("exception [" + err.name + "] msg[" + err.message + "]");
  }
  var text = "log: " + arg + "\n";
  console.log(text);
  document.form.console.value += text;
  document.form.console.value.scrollTop = document.form.console.value.scrollHeight;
}

function handleDocument(document)
{
  var parser = new DOMParser();
  var xpath = '/html/body/section/div[2]/code/text()';
  var iterator = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null );
  var thisNode = iterator.iterateNext();
  log("token: " + thisNode.textContent); //TODO
  localStorage['token'] = thisNode.textContent;
}

function browse(base_url, callback)
{
  const delay = 50;
  var url = base_url;
  url += '/oauth/authorize' + '?';
  url += '&client_id=' + 'local-token';
  url += '&scope=' + '/things:readwrite';
  url += '&state=asdf';
  url += '&response_type=code';
  log("browse: " + url); //TODO
  window.authCount = 0;
  // TODO: check if host alive using xhr
  window.authWin = window.open(url);
  window.interval = self.setInterval(function () {
    url = (window.authWin && window.authWin.location
           && window.authWin.location.href )
      ? window.authWin.location.href : undefined;
    log("wait: " + url); //TODO
    if (url && (url.indexOf('code=') >=0)) {
      handleDocument(window.authWin.document);
      window.authCount = 99;
    } else {
      window.authCount++;
    }
    if ( !url || (window.authCount > 60)) {
      window.clearInterval(window.interval);
      if (window.authWin) {
        window.authWin.close();
      }
      if (callback) callback();
    }
  }, delay);
}

function get(endpoint, callback)
{
  var request = new XMLHttpRequest();
  var url = window.form.url.value + endpoint;
  var token = localStorage['token'];
  request.addEventListener('load', function() {
    callback = callback || {};
    callback(null, this.responseText);
  });
  log(url); //TODO
  request.open('GET', url);
  request.setRequestHeader('Accept', 'application/json');
  request.setRequestHeader('Authorization', 'Bearer ' + token);
  request.send();
}

function request()
{
  var base_url = window.form.url.value;
  if (! localStorage['token']) {
    return browse(base_url, query);
  }
  query();
}

function query(url)
{
  url = (url) || window.form.url.value + window.form.endpoint.value;
  log("query: " + url);
  get("/things", function(err, data) {
    var items = data && JSON.parse(data) || [];
    for (index=0; index < items.length; index++) {
      var model = items[index];
      log(JSON.stringify(model));
    };
  });
}

function request()
{
  var base_url = window.form.url.value;
  if (! localStorage['token']) {
    return browse(base_url, query);
  }
  query();
}

function main()
{
  if (localStorage['url'] ) window.form.url.value = localStorage['url']
  try {
    request();
    query();
  } catch(err) {
    log(err);
  }
}

window.onload = function() {

  var clearButton = document.getElementById('clear');
  clearButton.addEventListener('click', function() {
    document.form.console.value = '';
  });

  var forgetButton = document.getElementById('forget');
  forgetButton.addEventListener('click', function() {
    document.form.console.value = '';
    localStorage.clear();
    log('token forgotten (need auth again)');
  });

  var urlInput = document.getElementById('url');
  urlInput.addEventListener('change', function() {
    this.value = this.value.replace(/\/$/, "");
  });
  // add eventListener for tizenhwkey
  document.addEventListener('tizenhwkey', function(e) {
    if (e.keyName === "back") {
      try {
        tizen.application.getCurrentApplication().exit();
      } catch (ignore) {}
    }
  });
};
