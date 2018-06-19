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

function updateView(model, view)
{
  var self = this;
  if ( model.type == "onOffSwitch" ) {
    log("update: " + view);
    var endpoint = model.properties.on.href;
    get(endpoint, function(err, data) {
      view.local.radio.checked = !!(JSON.parse(data).on);
    });
  } else if (model.type == "multilevelSensor") {
    get(model.properties.level.href, function(err, data) {
      view.local.button.innerText = JSON.parse(data).level;
    });
  }
}

function createViewOnOffSwitch(li, model)
{
  li.setAttribute('class', 'ui-li-static ui-li-1line-btn1');
  var div = document.createElement('div');
  div.setAttribute('class', 'ui-btn.ui-btn-box-s ui-toggle-container');

  var radio = li.local.radio = document.createElement('input');
  radio.setAttribute('type', 'checkbox');
  //TODO: radio.tau = tau.widget.ToggleSwitch(radio);
  radio.setAttribute('class','ui-toggle-switch');
  radio.setAttribute('data-tau-built', "ToggleSwitch");
  radio.setAttribute('data-tau-name', "ToggleSwitch");
  radio.setAttribute('aria-disabled', "false");
  radio.setAttribute('data-tau-bound', "ToggleSwitch");
  var endpoint = model.properties.on.href;
  div.appendChild(radio);
  var handlerdiv = document.createElement('div');
  handlerdiv.setAttribute('class', 'ui-switch-handler');
  div.appendChild(handlerdiv);
  li.appendChild(div);

  return li;
}

function createViewMultilevelSensor(li, model)
{
  var button = li.local.button = document.createElement('button');
  //button.tau = tau.widget.Button(button);
  button.setAttribute('class','ui-btn ui-inline');
  button.setAttribute('data-tau-built', "Button");
  button.setAttribute('data-tau-name', "Button");
  button.setAttribute('aria-disabled', "false");
  button.setAttribute('data-tau-bound', "Button");
  button.innerText = "?";
  button.local = {};
  button.addEventListener('click', function(){
    button.local.interval = setTimeout(function(){
      if (button.disabled) {
        put(model.properties.on.href, { on: true }, function(err, data) {
          data = JSON.parse(data);
          button.disabled = false;
          button.innerText = (data.on) ? "ON" : "OFF";
        });
      }
      button.disabled = false;
    }, 2000);

    button.disabled = true;
    get(model.properties.on.href, function(err, data) {
      data = JSON.parse(data);
      log("~~~ : get: on: ? " + data.on);
      if (!data.on) {
        button.innerText = "OFF";
      } else {
        get(model.properties.level.href, function(err, data) {
          log("~~~ : get: level: " + data);
          data = JSON.parse(data);
          clearInterval(button.local.interval);
          button.disabled = false;
          button.innerText = (data) ? data.level : "?";
        });
      }
    });
  });
  li.setAttribute('class', 'ui-li-static ui-li-1line-btn1');
  li.appendChild(button);
  return li;
}

function createView(model)
{
  var li = document.createElement('li');
  li.tau = tau.widget.Listview(li);
  li.value = model.name;
  li.innerText = model.name;
  li.local = {};
  li.local.model = model;

  model.local = {};
  if (model.type == "onOffSwitch" || model.type == "dimmableColorLight") {
    model.local.view = createViewOnOffSwitch(li, model);
  } else if (model.type == "multilevelSensor") {
    model.local.view = createViewMultilevelSensor(li, model);
  } else {
    li.setAttribute('class', 'ui-li-static');
    log("TODO: implement " + model.type);
  }

  return li;
}

function query(url)
{
  url = (url) || window.form.url.value;
  log("query: " + url);
  get("/things", function(err, data) {
    var list = document.getElementById('items');
    list.innerHTML = "";  // Clean list
    var items = data && JSON.parse(data) || [];
    var index;
    var listWidget;
    for (index=0; index < items.length; index++) {
      var model = items[index];
      var view = createView(model);
      updateView(model, view);
      list.appendChild(view);
      listWidget = tau.widget.Listview(list);
      listWidget.refresh();
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

window.onload = function()
{
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
