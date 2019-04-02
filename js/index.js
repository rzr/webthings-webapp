// -*- mode: js; js-indent-level:2; -*-
// SPDX-License-Identifier: MPL-2.0
/* Copyright 2018-present Samsung Electronics France
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

var app = {};

app.isLoading = true;
app.datacontent = document.querySelector(".textarea");
app.localStorage = localStorage;
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
  var token = null;
  this.log("parse: " + document);
  //TODO: https://github.com/mozilla-iot/gateway/pull/1142
  //TODO: document.getElementById('token').textContent;
  try {
    var xpath = "/html/body/section/div[2]/code/text()";
    var iterator = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null );
    var thisNode = iterator.iterateNext();
    token= thisNode.textContent;
  } catch(err) {
    this.log("error: " + err);
  }
  this.log("token: " + token); //TODO

  return token;
};

app.browse = function(url, callback)
{
  var self = this;
  if (localStorage["token"])
    return;
  this.log("browse: " + url);
  const delay = 50;
  window.authCount = 0;
  // TODO: https://github.com/mozilla-iot/gateway/pull/1149
  window.addEventListener("message", function(ev) {
    self.log("message:" + ev);
    if (ev.data.message && ev.data.message.token) {
      localStorage["token"] = ev.data.message.token;
      window.authCount = 98;
    }
  });
  this.log("Opening: " + url);
  window.authWin = window.open(url);
  if (!window.authWin) {
    throw "Can't open window: " + url;
  }
  window.interval = setInterval(function () {
    self.log("loop: " + window.authCount);
    //self.log('TODO: check if host alive using xhr');
    if (window.authCount > 60) {
      window.clearInterval(window.interval);
      if (window.authWin && (window.authCount < 100)) {
        window.authWin.close();
      }
      if (callback) {
        callback(null, localStorage["token"]);
      }
    }
    try {
      self.log("auth: access authWin may throw exception");
      self.log("post: win: " + window.authWin);
      window.authWin.postMessage({ "message": "token" }, "*");
    } catch(err) {
      self.log("post: err: " + err);
    }

    try {
      self.log("accessing a cross-origin frame: " + window.authWin.location);
      url = (window.authWin && window.authWin.location
             && window.authWin.location.href )
        ? window.authWin.location.href : undefined;
      self.log("auth: url: " + url);
      if (url && (url.indexOf("code=") >=0)) {
        localStorage["token"] = self.handleDocument(window.authWin.document);
        window.authCount = 99;
      } else {
        window.authCount++;
        self.log("wait: " + url); //TODO
      }
    } catch(e) {
      window.authCount = 100;
      if (e.name === "SecurityError") {
        alert("Token should be copied manually from other frame");
      }
      self.log(e);
      self.log(e.name);
      self.log(e.message);
      if (callback) {
        callback(e, null);
      }
    }
  }, delay);
};

app.get = function(endpoint, callback)
{
  var url = localStorage["url"] + endpoint;
  this.log("url: " + url); //TODO
  var token = localStorage["token"];
  var request = new XMLHttpRequest();
  request.addEventListener("load", function() {
    if (callback) {
      callback(null, this.responseText);
    }
  });
  request.open("GET", url);
  request.setRequestHeader("Accept", "application/json");
  request.setRequestHeader("Authorization", "Bearer " + token);
  request.send();
};

app.put = function(endpoint, payload, callback)
{
  var url = localStorage["url"] + endpoint;
  var token = localStorage["token"];
  payload = JSON.stringify(payload);
  this.log("url: " + url);
  this.log("payload: " + payload);
  var request = new XMLHttpRequest();
  request.addEventListener("load", function() {
    callback = callback || {};
    callback(null, this.responseText);
  });
  request.open("PUT", url);
  request.setRequestHeader("Content-Type", "application/json");
  request.setRequestHeader("Accept", "application/json");
  request.setRequestHeader("Authorization", "Bearer " + token);
  request.send(payload);
}

app.query = function(endpoint, token)
{
  var self = this;
  console.log("query: " + endpoint);

  if (!token) {
    token = localStorage["token"];
  }
  console.log("query: " + url);
  this.get(endpoint, function(err, data) {
    if (err || !data) throw err;
    var items = data && JSON.parse(data) || [];
    for (var index=0; index < items.length; index++) {
      var model = items[index];
      self.log(JSON.stringify(model));
    }
  });
};

app.request = function(endpoint)
{
  var self = this;
  this.log("request: " + endpoint);
  if (!endpoint) {
    endpoint = localStorage["endpoint"];
  }
  if (localStorage["token"] && localStorage["token"].length) {
    return self.query(endpoint);
  }
  var url = localStorage["url"];
  url += "/oauth/authorize" + "?";
  url += "&client_id=" + localStorage["client_id"];
  url += "&scope=" + "/things:readwrite";
  url += "&response_type=code";
  if (!window.location.hostname) {
    return this.browse(url, function(err, data){
      if (!err) {
        if (data) {
          window.form.token.value = data;
          
return self.query(endpoint);
        }
      }
      self.log("error: browsing: " + err);
    });
  }
  let isCallback = (localStorage["state"] === "callback" );
  var code = null;
  var wurl = new URL(document.location);
  this.log("isCallback: " + isCallback);

  if (wurl) { // TODO: refactor
    try {
      this.log("TODO: URL.document.searchParams: " + document.URL.searchParams);
      this.log("TODO: URL.window.searchParams: " + window.URL.searchParams);
      this.log("TODO: location: " + window.location);
      this.log("TODO: check: " + wurl.search);
      wurl.search.replace(/^%3F/, "?");
      this.log("TODO: workaround: " + wurl.search);
      var searchParams = new URLSearchParams(wurl.search);
      this.log("TODO: searchParms: " + searchParams);
      code = searchParams.get("code");
      this.log("TODO: code: " + code);
    } catch(err) {
      this.log("TODO: err: " + err);
      this.log(err);
    }
    if (!code && wurl.search) {
      this.log("TODO: workaround: search: " + wurl.search);
      try {
        code = wurl.search.substring(
          wurl.search.indexOf("code=")+"code=".length,
          wurl.search.indexOf("&")
        );
      } catch(err) {
        code = null;
      }
    }

    if (!code && !isCallback) {
      return setTimeout(function(){
        url += "&redirect_uri=" + encodeURIComponent(document.location);
        localStorage["state"] = "callback";
        window.location = url;
      }, 500);
    } else if (code && isCallback) {
      localStorage["state"] = "token";
      var request_url = localStorage["url"] + "/oauth/token" ;
      var params = {
        "code": code,
        "grant_type": "authorization_code",
        "client_id": localStorage["client_id"],
      };
      var request = new XMLHttpRequest();
      request.onreadystatechange = function() {
        if(request.readyState == 4 && request.status == 200) {
          localStorage["token"] = JSON.parse(request.responseText).access_token;
          window.form.token.value = localStorage["token"]; // TODO
          var pos = window.location.href.indexOf("?");
          if (pos) {
            var loc = window.location.href.substring(0, pos);
            window.history.replaceState({}, document.title, loc);
          }
          self.query(endpoint);
        }
      }
      this.log("grant: " + request_url);
      request.open("POST", request_url, true);
      request.setRequestHeader("Content-type", "application/json");
      request.setRequestHeader("Accept", "application/json");
      request.setRequestHeader("Authorization", "Basic "
                               +  window.btoa(localStorage["client_id"]
                                              + ":" + localStorage["secret"]));
      request.send(JSON.stringify(params));
    } else {
      localStorage["state"] = "disconnected";
    }
  }
};

app.main = function()
{
  this.log(`main: state: ${localStorage["state"]}`);
  this.log(`main: hostname: ${window.location.hostname}`);
  // TODO: OAuth update ids here, URLs using file:// will copy from default
  if (!localStorage["client_id"] || !localStorage["secret"] ) {
    if (!window.location.hostname) {
      localStorage["client_id"] = "local-token";
      localStorage["secret"] = "super secret";
    } else {
      //TODO: add GUI to overide default creds:
      localStorage["client_id"] = window.location.hostname;
      localStorage["secret"] = window.location.hostname;
    }
  }
  if (!localStorage["url"]) {
    this.log("main: URL unset");
    return;
  }

  try {
    if (!localStorage["token"]) {
      app.request(localStorage["url"]);
    } else {
      app.query(localStorage["endpoint"]);
    }
  } catch(err) {
    this.log(err);
  }
};

app.onLoad = function() {

  var runButton = document.getElementById("run");
  runButton.addEventListener("click", function() {
    app.main();
  });

  var clearButton = document.getElementById("clear");
  clearButton.addEventListener("click", function() {
    document.form.console.value = "";
  });

  var resetButton = document.getElementById("reset");
  resetButton.addEventListener("click", function() {
    document.form.console.value = "";
    document.form.url.value = "";
    document.form.token.value = "";
    localStorage.clear();
    app.log("token forgotten (need auth again)");
  });

  var aboutButton = document.getElementById("about");
  aboutButton.addEventListener("click", function() {
    window.open("README.md");
  });

  var browseButton = document.getElementById("browse");
  browseButton.addEventListener("click", function() {
    window.location.href = "00index.html";
  });

  var urlInput = document.getElementById("url");
  if ( localStorage["url"] && localStorage["url"].length ) {
    window.form.url.value = localStorage["url"]
  } else if (urlInput.value && urlInput.value.length) {
    localStorage["url"] = urlInput.value;
  } else {
    window.form.value="http://gateway.local:8080";
  }
  urlInput.addEventListener("change", function() {
    this.value = this.value.replace(/\/$/, "");
    localStorage["url"] = this.value;
  });

  var tokenInput = document.getElementById("token");
  if ( localStorage["token"] && localStorage["token"].length ) {
    window.form.token.value = localStorage["token"]
  }
  tokenInput.addEventListener("change", function() {
    this.value = this.value.replace(/\/$/, "");
    localStorage["token"] = this.value;
  });

  var endpointInput = document.getElementById("endpoint");
  if (localStorage["endpoint"]) {
    window.form.endpoint.value = localStorage["endpoint"];
  } else if (window.form.endpoint.value) {
    localStorage["endpoint"] = window.form.endpoint.value;
  }
  endpointInput.addEventListener("change", function() {
    console.log(this.value);
    this.value = this.value.replace(/\/$/, "");
    localStorage["endpoint"] = this.value;
  });

  // add eventListener for tizenhwkey
  document.addEventListener("tizenhwkey", function(e) {
    if (e.keyName === "back" && tizen && tizen.application) {
      try {
        tizen.application.getCurrentApplication().exit();
      } catch (ignore) {}
    }
  });

  // Autoconnect
  // TODO add settings page to disable (for debuging)
  app.main();
};

window.onload = app.onLoad
