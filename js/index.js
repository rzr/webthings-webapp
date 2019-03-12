// -*- mode: js; js-indent-level:2; -*-
// SPDX-License-Identifier: MPL-2.0
/* Copyright 2018-present Samsung Electronics France
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

(function() {
  // 'use strict';
app.isLoading = true;
app.datacontent = document.querySelector('.textarea');

app.log = function(arg)
{
  if (arg && arg.name && arg.message) {
    var err = arg;
    this.log("exception [" + err.name + "] msg[" + err.message + "]");
  }
  var text = "log: " + arg + "\n";
  console.log(text);
  if (document.form && document.form.console) {
    document.form.console.value += text;
    document.form.console.value.scrollTop = document.form.console.value.scrollHeight;
  }
};

//TODO enable this if you want to use brower log only for debuging
//app.log = console.log;

app.handleDocument = function(document)
{
  //TODO: https://github.com/mozilla-iot/gateway/pull/1142
  //TODO: document.getElementById('token').textContent;
  var xpath = '/html/body/section/div[2]/code/text()';
  var iterator = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null );
  var thisNode = iterator.iterateNext();
  this.log("token: " + thisNode.textContent); //TODO
  localStorage['token'] = thisNode.textContent;
};

app.browse = function(url, callback)
{
  var self = this;
  if (localStorage['token'])
    return;
  this.log("browse: " + url);
  const delay = 50;
  window.authCount = 0;
  // TODO: https://github.com/mozilla-iot/gateway/pull/1149
  window.addEventListener("message", function(ev) {
    if (ev.data.message && ev.data.message.token) {
      localStorage['token'] = ev.data.message.token;
      window.authCount = 98;
    }
  });
  window.authWin = window.open(url);
  if (!window.authWin) {
    throw "Cant open window: " + url;
  }
  window.interval = setInterval(function () {
    // TODO: check if host alive using xhr
    if (window.authCount > 60) {
      window.clearInterval(window.interval);
      if (window.authWin) {
        window.authWin.close();
      }
      window.form.token.value = localStorage['token'];
      if (callback) callback();
    }
    window.authWin.postMessage({ message: "token" }, "*");
    try {
      url = (window.authWin && window.authWin.location
             && window.authWin.location.href )
        ? window.authWin.location.href : undefined;
      if (url && (url.indexOf('code=') >=0)) {
        self.handleDocument(window.authWin.document);
        window.authCount = 99;
      } else {
        window.authCount++;
        self.log("wait: " + url); //TODO
      }
    } catch(e) {
      self.log(e.message);
    }
  }, delay);
};

app.get = function(url, token, callback)
{
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

app.query = function(url, token)
{
  var self = this;
  console.log('query: ' + url);
  if (!url) {
    url = localStorage['url'] + localStorage['endpoint'];
  }
  if (!token) {
    token = localStorage['token'];
  }
  console.log('query: ' + url);
  this.get(url, token, function(err, data) {
    if (err || !data) throw err;
    var items = data && JSON.parse(data) || [];
    for (var index=0; index < items.length; index++) {
      var model = items[index];
      self.log(JSON.stringify(model));
    }
  });
};

app.request = function(base_url)
{
  var self = this;
  if (!base_url) throw "URL needed";
  this.log("request: " + base_url);
  if (localStorage['token'] && localStorage['token'].length) {
    return self.query(base_url + localStorage['endpoint']);
  }
  var url = base_url;
  url += '/oauth/authorize' + '?';
  url += '&client_id=' + localStorage['client_id'];
  url += '&scope=' + '/things:readwrite';
  url += '&response_type=code';
  if (!window.location.hostname) {
    return this.browse(url, function(){
      self.query();
    });
  } else {
    var wurl = new URL(window.location);
    var searchParams = new URLSearchParams(wurl.search);
    var code = searchParams.get('code');
    let isCallback = (localStorage['state'] === 'callback' );
    console.log("isCallback" + isCallback);
    if (!code && !isCallback) {
      this.log( url );
      url += '&redirect_uri=' + encodeURIComponent(document.location);
      localStorage['state'] = 'callback';
      setTimeout(function(){
        window.location = url;
      }, 500);
    } else if (code && isCallback) {
      localStorage['state'] = 'token';
      var url = base_url + "/oauth/token" ;
      var params = {
        code: code,
        grant_type: 'authorization_code',
        client_id: localStorage['client_id'],
      };
      var request = new XMLHttpRequest();
      request.onreadystatechange = function() {
        if(request.readyState == 4 && request.status == 200) {
          localStorage['token'] = JSON.parse(request.responseText).access_token;
          var pos = window.location.href.indexOf("?");
          if (pos) {
            var loc = window.location.href.substring(0, pos);
            window.history.replaceState({}, document.title, loc);
          }
          self.query();
        }
      }
      request.open('POST', url, true);
      request.setRequestHeader('Content-type', 'application/json');
      request.setRequestHeader('Accept', 'application/json');
      request.setRequestHeader('Authorization', 'Basic '
                               +  window.btoa(localStorage['client_id']
                                              + ":" + localStorage['secret']));
      request.send(JSON.stringify(params));
    } else {
      localStorage['state'] = 'disconnected';
    }
  }
};

app.main = function()
{
  app.log("main: endpoint: " + localStorage['endpoint']);
  app.log("main: " + localStorage['state']);
  app.log("main: " + window.location.hostname);
  // TODO: OAuth update ids here, URLs using file:// will copy from default
  if (!localStorage['client_id'] || !localStorage['secret'] ) {
    if (!window.location.hostname) {
      localStorage['client_id'] = "local-token";
      localStorage['secret'] = "super secret";
    } else {
      //TODO: add GUI to overide default creds:
      localStorage['client_id'] = window.location.hostname;
      localStorage['secret'] = window.location.hostname;
    }
  }
  try {
    if (!localStorage['token']) {
      app.request(localStorage['url']);
    } else {
      app.query(localStorage['url'] + localStorage['endpoint'], localStorage['token']);
    }
  } catch(err) {
    this.log(err);
  }
};

window.htmlOnLoad = function() {

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
    document.form.url.value = '';
    document.form.token.value = '';
    localStorage.clear();
    app.log('token forgotten (need auth again)');
  });

  var aboutButton = document.getElementById('about');
  aboutButton.addEventListener('click', function() {
    window.open('README.md');
  });

  var browseButton = document.getElementById('browse');
  browseButton.addEventListener('click', function() {
    window.location.href = 'aframe.html';
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

  var endpointInput = document.getElementById('endpoint');
  if (localStorage['endpoint']) {
    window.form.endpoint.value = localStorage['endpoint'];
  }
  endpointInput.addEventListener('change', function() {
    console.log(this.value);
    this.value = this.value.replace(/\/$/, "");
    localStorage['endpoint'] = this.value;
  });

  // add eventListener for tizenhwkey
  document.addEventListener('tizenhwkey', function(e) {
    if (e.keyName === "back" && tizen && tizen.application) {
      try {
        tizen.application.getCurrentApplication().exit();
      } catch (ignore) {}
    }
  });

  // PWA
  if ('serviceWorker' in navigator) {
    try {
      navigator.serviceWorker.register('service-worker.js').then(function(registration) {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      }, function(err) {
        console.log('ServiceWorker registration failed: ', err);
      });
    } catch(e) {
      console.log(e.message);
    }
  }

  // Autoconnect
  // TODO add settings page to disable (for debuging)
  app.main();
};

})();

