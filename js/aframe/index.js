// -*- mode: js; js-indent-level:2; -*-
// SPDX-License-Identifier: MPL-2.0
/* Copyright 2019-present Samsung Electronics France
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/
 */

const viewer = {};
viewer.count = 0;
viewer.edge = {x: 2,
               y: 1,
               z: 2};

viewer.position = {x: -viewer.edge.x,
                   y: -viewer.edge.y,
                   z: -2};


viewer.verbose = console.log;

viewer.createPropertyElement = function(model, name) {
  const self = this;
  const property = model.properties[name];
  const type = property.type;
  let el = null;
  const endpoint = `${model.links[0].href}/${name}`;

  const view = document.createElement('a-entity');
  view.setAttribute('text', 'value',
                    `\n${model.name}/${property.title} (${property.type})`);
  view.setAttribute('text', 'color',
                    (property.readOnly) ? '#FFA0A0' : '#A0FFA0');

  const id = `${viewer.count++}`;
  if (type === 'boolean') {
    el = document.createElement('a-entity');
    el.setAttribute('ui-toggle', 'value', 0);
    el.setAttribute('rotation', '90 0 0');
  } else if ((type === 'number') || (type === 'integer')) {
    el = document.createElement('a-cylinder');
    el.setAttribute('color', '#A0A0FF');
    const number = 1; // TODO
    el.setAttribute('height', '0.1' * number);
    el.setAttribute('radius', '0.1');
  } else {
    el = document.createElement('a-sphere');
    el.setAttribute('color', '#FF0000');
    el.setAttribute('radius', '0.1');
  }
  el.setAttribute('id', `widget-${id}`);
  el.setAttribute('position', '-1 0 0');
  el.addEventListener('change', function(e) {
    if (e.detail) {
      const payload = {};
      payload[name] = !!(e.detail.value !== 0);
      app.put(endpoint, payload, function(res, data) {
        if (!res) {
          console.error(data);
        }
      });
    } else {
      self.updateView(model, name, view);
    }
  });
  view.setAttribute('id', `view-${id}`);
  view.appendChild(el);

  return view;
};


viewer.updateView = function(model, name, view) {
  const property = model.properties[name];
  const endpoint = property.links[0].href;
  const type = property.type;
  const el = view.children[0];

  app.get(endpoint, function(err, data) {
    if (!err) {
      let text = view.getAttribute('text', 'value').value;
      text = `\n${text}\n${data})`;
      view.setAttribute('text', 'value', text);

      if (type === 'boolean') {
        try {
          let value = JSON.parse(data)[name];
          value = (value) ? 1 : 0;
          el.setAttribute('ui-toggle', 'value', value);
          el.emit('change', {value: value});
        } catch (e) {
          console.error(`error: ${e}`);
        }
      } else if (type === 'string') {
        let t = view.getAttribute('text', 'value').value;
        t = `\n${t}\n${data})`;
        view.setAttribute('text', 'value', t);
      }
    }
  });
};


viewer.appendProperties = function(model) {
  const view = null;
  let propertyName = null;
  for (propertyName in model.properties) {
    const el = this.createPropertyElement(model, propertyName);
    try {
      el.emit('change');
    } catch (err) {
      console.error(`ignore: ${err}`);
    }
    el.setAttribute('position', `${viewer.position.x} ${viewer.position.y} ${viewer.position.z}`);
    viewer.el.appendChild(el);
    viewer.position.y += 0.4;
  }
  if (viewer.position.y > viewer.edge.y) {
    viewer.position.x += 2;
    viewer.position.y = -viewer.edge.y;
  }
  if (viewer.position.x > viewer.edge.x) {
    viewer.position.x = -viewer.edge.x;
    viewer.position.z -= viewer.edge.z;
    viewer.position.y = -viewer.edge.y;
  }

  return view;
};


viewer.handleResponse = function(err, data) {
  const self = viewer;
  self.verbose(`handleResponse: ${typeof data}`);
  if (err || !data) {
    console.error(err);
    throw err;
  }
  let model = data;

  if (typeof data === 'string' && data) {
    model = data && JSON.parse(data);
  }

  if (Array.isArray(model)) {
    let index;
    for (index = 0; index < model.length; index++) {
      viewer.handleResponse(err, model[index]);
    }
  } else {
    self.appendProperties(model);
  }
};


viewer.query = function(endpoint) {
  this.verbose(`log: query: ${endpoint}`);
  app.get(endpoint, viewer.handleResponse);
};
