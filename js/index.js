// -*- mode: js; js-indent-level:2; -*-
// SPDX-License-Identifier: MPL-2.0
/* Copyright 2018-present Samsung Electronics France
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

var app = {};


//TODO enable this if you want to use brower log only for debuging
//app.log = console.log;

app.log = function(arg)
{
  if (arg && arg.name && arg.message) {
    var err = arg;
    this.log("exception [" + err.name + "] msg[" + err.message + "]");
  }
  var text = "log: " + arg + "\n";
  console.log(text);
  document.form.console.value += text;
  document.form.console.value.scrollTop = document.form.console.value.scrollHeight;
};

app.handleDocument = function(document)
{
  var parser = new DOMParser();
  //TODO: https://github.com/mozilla-iot/gateway/pull/1142
  //TODO: document.getElementById('token').textContent;
  var xpath = '/html/body/section/div[2]/code/text()';
  var iterator = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null );
  var thisNode = iterator.iterateNext();
  this.log("token: " + thisNode.textContent); //TODO
  localStorage['token'] = thisNode.textContent;
};

app.browse = function(base_url, callback)
{
  var self = this;
  const delay = 50;
  var url = base_url;
  url += '/oauth/authorize' + '?';
  url += '&client_id=' + 'local-token';
  url += '&scope=' + '/things:readwrite';
  url += '&response_type=code';
  this.log("browse: " + url); //TODO
  window.authCount = 0;
  window.addEventListener("message", function(ev) {
    if (ev.data.message && ev.data.message.token) {
      localStorage['token'] = ev.data.message.token;
      window.authCount = 98;
    }
  });
  window.authWin = window.open(url);
  window.interval = setInterval(function () {
    // TODO: check if host alive using xhr
    if (!url || (window.authCount > 60)) {
      window.clearInterval(window.interval);
      if (window.authWin) {
        window.authWin.close();
      }
      if (callback) callback();
    }
    window.authWin.postMessage({ message: "token" }, "*");
    url = (window.authWin && window.authWin.location
           && window.authWin.location.href )
      ? window.authWin.location.href : undefined;
    self.log("wait: " + url); //TODO
    if (url && (url.indexOf('code=') >=0)) {
      self.handleDocument(window.authWin.document);
      window.authCount = 99;
    } else {
      window.authCount++;
    }
  }, delay);
};

app.get = function(endpoint, callback)
{
  var url = window.form.url.value + endpoint;
  var token = localStorage['token'];
  var request = new XMLHttpRequest();
  request.addEventListener('load', function() {
    callback = callback || {};
    callback(null, this.responseText);
  });
  this.log(url); //TODO
  request.open('GET', url);
  request.setRequestHeader('Accept', 'application/json');
  request.setRequestHeader('Authorization', 'Bearer ' + token);
  request.send();
};

app.put = function(endpoint, payload, callback)
{
  var url = window.form.url.value + endpoint;
  var token = localStorage['token'];
  payload = JSON.stringify(payload);
  this.log(url);
  this.log(payload);
  var request = new XMLHttpRequest();
  request.addEventListener('load', function() {
    callback = callback || {};
    callback(null, this.responseText);
  });
    request.open('PUT', url);
  request.setRequestHeader('Content-Type', 'application/json');
  request.setRequestHeader('Accept', 'application/json');
  request.setRequestHeader('Authorization', 'Bearer ' + token);
  request.send(payload);
}

app.query = function(url)
{
  var self = this;
  url = (url) || window.form.url.value + window.form.endpoint.value;
  this.log("query: " + url);
  this.get("/things", function(err, data) {
    var items = data && JSON.parse(data) || [];
    for (var index=0; index < items.length; index++) {
      var model = items[index];
      self.log(JSON.stringify(model));
    };
  });
};

app.request = function()
{
  var self = this;
  var base_url = window.form.url.value;
  if (! localStorage['token'] || ! localStorage['token'].length) {
    return this.browse(base_url, function(){
      self.query();
    });
  }
  this.query();
};

app.main = function()
{
  try {
    this.request();
    this.query();
  } catch(err) {
    this.log(err);
  }
};

window.onload = function() {

  var runButton = document.getElementById('run');
  runButton.addEventListener('click', function() {
    app.main();
  });

  var clearButton = document.getElementById('clear');
  clearButton.addEventListener('click', function() {
    document.form.console.value = '';
  });

  var resetButton = document.getElementById('reset');
  resetButton.addEventListener('click', function() {
    document.form.console.value = '';
    localStorage.clear();
    app.log('token forgotten (need auth again)');
  });

  var aboutButton = document.getElementById('about');
  aboutButton.addEventListener('click', function() {
    window.open('README.md');
  });

  var urlInput = document.getElementById('url');
  if ( localStorage['url'] && localStorage['url'].length ) {
    window.form.url.value = localStorage['url']
  } else {
    window.form.value="http://gateway.local:8080";
  }
  urlInput.addEventListener('change', function() {
    this.value = this.value.replace(/\/$/, "");
    localStorage['url'] = this.value;
  });

  var tokenInput = document.getElementById('token');
  if ( localStorage['token'] && localStorage['token'].length ) {
    window.form.token.value = localStorage['token']
  }
  tokenInput.addEventListener('change', function() {
    this.value = this.value.replace(/\/$/, "");
    localStorage['token'] = this.value;
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
