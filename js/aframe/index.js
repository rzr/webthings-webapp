// -*- mode: js; js-indent-level:2; -*-
// SPDX-License-Identifier: MPL-2.0
/* Copyright 2019-present Samsung Electronics France
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/
 */

var viewer = {};
viewer.count = 0;
viewer.edge = { x: 2,
                y: 1,
                z: 2 };

viewer.position = { x: -viewer.edge.x,
                    y: -viewer.edge.y,
                    z: -2 };


viewer.createPropertyElement = function (model, name)
{
  var self = this;
  let property = model.properties[name];
  let type = property.type;
  let el = null;
  console.log(property);
  let view = document.createElement( "a-entity" );
  view.setAttribute("text", "value", `\n${model.name}/${property.title} (${property.type})`);
  view.setAttribute("text", "color", (property.readOnly) ? "#FFA0A0" : '#A0FFA0');

  var id = `widget-${viewer.count++}`;
  console.log(id);
  if (type === 'boolean') {
    el = document.createElement( "a-entity" );
    el.setAttribute("ui-toggle", "value", 0);
    el.setAttribute("rotation", "90 0 0");
  } else if (type === 'number') {
    el = document.createElement( "a-cylinder" );
    el.setAttribute("color", "#A0A0FF");
    let number = 1; // TODO
    el.setAttribute("height", "0.1" * number);
    el.setAttribute("radius", "0.1");
  } else {
    el = document.createElement( "a-sphere" );
    el.setAttribute("color", "#FF0000");
    el.setAttribute("radius", "0.1");
  }
  el.setAttribute("id", id);
  el.setAttribute("position", "-1 0 0");
  el.addEventListener('change', function(e) {
    console.log('change:  ~~~ ');
    if (e.detail) {
      var payload = { on: e.detail.value !== 0 };
      app.put(property.links[0].href, payload, function(res, data) {
        if (!res) {
          console.log(data);
        } });
    } else {
      self.updateView(model, name, view);
    }
  });
  view.setAttribute("id", `view-${id}`);
  view.appendChild(el);

  return view;
}


viewer.updateView = function(model, name, view)
{
  var property = model.properties[name];
  console.log(property);
  var endpoint = property.links[0].href;
  var url = localStorage['url'] + endpoint;
  console.log(url);
  let type = property.type;
  let el = view.children[0];

  app.get(url, function(err, data) {
    if (!err) {
      let text = view.getAttribute('text', 'value').value;
      text = `\n${text}\n${data})`;
      view.setAttribute("text", "value", text);

      if (type === 'boolean') {
        try {
          let value = JSON.parse(data)[name];
          value = (value) ? 1 : 0;
          el.setAttribute('ui-toggle', "value", value);
          el.emit('change', { value: value });
        } catch (e) {
          console.log('error: ' + e);
        }
      } else if (type === 'string') {
        let t = view.getAttribute('text', 'value').value;
        t = `\n${text}\n${data})`;
        view.setAttribute("text", "value", t);
      }
    }
  });
};


viewer.appendThing = function (model)
{
  var view = null;
  var propertyName = null;
  for (propertyName in model.properties) {
      var el = this.createPropertyElement(model, propertyName);
      try {
        el.emit('change');
      } catch(err) {
        console.log('ignore: ' + err);
      }
      el.setAttribute("position", viewer.position.x + ' ' + viewer.position.y+ ' ' + viewer.position.z );
      viewer.el.appendChild(el);
      viewer.position.y +=0.4;
    }
    if (viewer.position.y > viewer.edge.y){
      viewer.position.x += 2;
      viewer.position.y = -viewer.edge.y;
    }
    if (viewer.position.x > viewer.edge.x){
      viewer.position.x = -viewer.edge.x;
      viewer.position.z -= viewer.edge.z;
      viewer.position.y = -viewer.edge.y;
    }

  
  return view;
}


viewer.thingQuery = function(endpoint)
{
  console.log('log: query: ' + endpoint);
  app.get(endpoint, function(err, data) {
    if (err) throw err;
    let object = data && JSON.parse(data);
    let items = Object.keys(object) || [];
    let index;
    for (index=0; index < items.length; index++) {
      let model = object[items[index]];
      model.local = {};
      console.log(model);
    }
  });
}


viewer.query = function(endpoint)
{
  let self = this;
  console.log('log: query: ' + endpoint);
  app.get(endpoint, function(err, data) {
    if (err) throw err;
    console.log(data);
    let items = data && JSON.parse(data) || [];
    let index;
    for (index=0; index < items.length; index++) {
      let model = items[index];
      model.local = {};
      if (model.type === "thing") {
        console.log(model);
        endpoint = model.href + '/properties';
        //model.local.view = viewer.thingQuery(url, token); //TODO
      } else {
        self.appendThing(model);
      }
    }
  });
}
