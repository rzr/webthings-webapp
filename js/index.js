// -*- mode: js; js-indent-level:2; -*-
// SPDX-License-Identifier: MPL-2.0
/* Copyright 2018-present Samsung Electronics France
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

(function() {
  app.auto = false;
  app.isLoading = true;
  app.localStorage = localStorage;
  app.devel = !false;
  app.loginUrl = 'login.html';
  app.browseUrl = '00index.html'; // TODO
  app.viewerUrl = 'log.html';

  for (const key in localStorage) {
    if (app[key] !== undefined) {
      app[key] = localStorage[key];
    }
  }
  if (typeof app.devel === 'string') {
    app.devel = JSON.parse(app.devel);
  }
  if (typeof app.auto === 'string') {
    app.auto = JSON.parse(app.auto);
  }

  app.log = function(arg) {
    if (!this.devel) {
      return;
    }
    if (arg && arg.name && arg.message) {
      const err = arg;
      this.log(`exception [${err.name}] msg[${err.message}]`);
    }
    const text = `log: ${arg}\n`;
    console.log(text);
    const el = document.getElementById('console');
    let value;
    if (el) {
      value = el.value || '';
      if (value.length > 1024 * 1024) {
        value = '(...)\n';
      }
      value += text;
      el.value = value;
      el.scrollTop = el.scrollHeight;
    }
  };

  // TODO enable this if you want to use brower log only for debuging
  // app.log = console.log;

  app.redirect = function(location) {
    this.log(`redirect: from ${window.location.href} to ${location}`);

    if (window.location.href === location) {
      return;
    }
    if (localStorage.auto || confirm(`Redirect to: ${location}`)) {
      setTimeout(function() {
        window.location = location;
      }, 1000);
    }
  };

  app.handleDocument = function(document) {
    let token = null;
    this.log(`parse: ${document}`);
    // TODO: https://github.com/mozilla-iot/gateway/pull/1142
    // TODO: document.getElementById('token').textContent;
    try {
      const xpath = '/html/body/section/div[2]/code/text()';
      const iterator = document.evaluate(xpath,
                                         document, null,
                                         XPathResult.ANY_TYPE, null);
      const thisNode = iterator.iterateNext();
      token = thisNode.textContent;
    } catch (err) {
      this.log(`error: ${err}`);
    }
    this.log(`token: ${token}`); // TODO

    return token;
  };

  app.browse = function(endpoint, callback) {
    const self = this;
    if (localStorage.token) {
      return;
    }
    if (!localStorage.url) {
      throw 'Error: ';
    }
    if (!endpoint) {
      endpoint = localStorage.endpoint;
    }
    let url = localStorage.url + endpoint;
    this.log(`browse: ${url}`);
    const delay = 50;
    window.authCount = 0;
    // TODO: https://github.com/mozilla-iot/gateway/pull/1149
    window.addEventListener('message', function(ev) {
      self.log(`message:${ev}`);
      if (ev.data.message && ev.data.message.token) {
        localStorage.token = ev.data.message.token;
        window.authCount = 98;
      }
    });
    if (app.devel && !confirm(`Opening: ${url}`)) {
      return;
    }
    window.authWin = window.open(url);
    if (!window.authWin) {
      throw `Can't open window: ${url}`;
    }
    window.interval = setInterval(function() {
      self.log(`loop: ${window.authCount}`);
      // self.log('TODO: check if host alive using xhr');
      if (window.authCount > 60) {
        window.clearInterval(window.interval);
        if (window.authWin && (window.authCount < 100)) {
          window.authWin.close();
        }
        if (callback) {
          callback(null, localStorage.token);
        }
      }
      try {
        self.log('auth: access authWin may throw exception');
        self.log(`post: win: ${window.authWin}`);
        window.authWin.postMessage({message: 'token'}, '*');
      } catch (err) {
        self.log(`post: err: ${err}`);
      }

      try {
        self.log(`accessing a cross-origin frame: ${window.authWin.location}`);
        url = (window.authWin && window.authWin.location &&
             window.authWin.location.href) ?
          window.authWin.location.href :
          undefined;
        self.log(`auth: url: ${url}`);
        if (url && (url.indexOf('code=') >= 0)) {
          localStorage.token = self.handleDocument(window.authWin.document);
          window.authCount = 99;
        } else {
          window.authCount++;
          self.log(`wait: ${url}`);
        }
      } catch (e) {
        window.authCount = 100;
        if (e.name === 'SecurityError') {
          alert('Token should be copied manually from other frame');
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

  app.get = function(endpoint, callback) {
    const url = localStorage.url + endpoint;
    this.log(`get: url: ${url}`);
    const token = localStorage.token;
    const request = new XMLHttpRequest();
    request.addEventListener('load', function() {
      if (callback) {
        callback(null, this.responseText);
      }
    });
    request.open('GET', url);
    request.setRequestHeader('Accept', 'application/json');
    if (token.length > 8) {
      request.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    request.send();
  };

  app.put = function(endpoint, payload, callback) {
    const url = localStorage.url + endpoint;
    const token = localStorage.token;
    payload = JSON.stringify(payload);
    this.log(`url: ${url}`);
    this.log(`payload: ${payload}`);
    const request = new XMLHttpRequest();
    request.addEventListener('load', function() {
      callback = callback || {};
      callback(null, this.responseText);
    });
    request.open('PUT', url);
    request.setRequestHeader('Content-Type', 'application/json');
    request.setRequestHeader('Accept', 'application/json');
    request.setRequestHeader('Authorization', `Bearer ${token}`);
    request.send(payload);
  };

  app.query = function(endpoint, token) {
    const self = this;
    this.log(`query: ${endpoint}`);

    if (!token) {
      token = localStorage.token;
    }
    if (!endpoint) {
      endpoint = localStorage.endpoint;
    }

    this.get(endpoint, function(err, data) {
      if (err || !data) {
        console.error(err);
        throw err;
      }
      const items = data && JSON.parse(data) || [];
      for (let index = 0; index < items.length; index++) {
        const model = items[index];
        self.log(JSON.stringify(model));
      }
    });
  };

  app.request = function(endpoint) {
    const self = this;
    this.log(`request: ${endpoint} ${localStorage.state}`);
    if (!endpoint) {
      endpoint = localStorage.endpoint;
    }
    if (localStorage.token && localStorage.token.length) {
      return self.query(endpoint);
    }
    const authorize_endpoint = `\
/oauth/authorize\
?\
&client_id=${localStorage.client_id}\
&scope=/things:readwrite\
&response_type=code`;
    if (!window.location.hostname) {
      return this.browse(authorize_endpoint, function(err, data) {
        if (!err) {
          if (data) {
            document.getElementById('token').setAttribute('value', data);
            return self.query(endpoint);
          }
        }
        self.log(`error: browsing: ${err}`);
      });
    }
    const url = new URL(document.location);
    if (!url) {
      return alert('Please set a valid URL (e.g: http://gateway.local)');
    }
    const isCallback = (localStorage.state === 'callback');
    let code = null;
    try {
      code = url.searchParams.get('code');
      this.log(`code: should not be null: ${code}`);
    } catch (err) {
      this.log(`TODO: err: ${err}`);
    }
    this.log(isCallback);

    if (!code && !isCallback) {
      return setTimeout(function() {
        const redirect_uri = encodeURIComponent(window.location.href
          .substring(0, 1 + window.location.href.lastIndexOf('/')));
        const redirectUrl = `\
${localStorage.url}\
${authorize_endpoint}\
&redirect_uri=${redirect_uri}
`;
        localStorage.state = 'callback';
        self.redirect(redirectUrl);
      }, 1000);
    } else if (code) {
      localStorage.state = 'token';
      const request_url = `${localStorage.url}/oauth/token`;
      const params = {
        code: code,
        grant_type: 'authorization_code',
        client_id: localStorage.client_id,
      };
      const request = new XMLHttpRequest();
      request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200) {
          localStorage.token = JSON.parse(request.responseText).access_token;
          document.getElementById('token').setAttribute('value',
                                                        localStorage.token);
          const pos = window.location.href.indexOf('?');
          if (pos) {
            const loc = window.location.href.substring(0, pos);
            window.history.replaceState({}, document.title, loc);
          }
          self.query(endpoint);
        }
      };
      this.log(`grant: ${request_url}`);
      request.open('POST', request_url, true);
      request.setRequestHeader('Content-type', 'application/json');
      request.setRequestHeader('Accept', 'application/json');
      request.setRequestHeader('Authorization', `Basic ${
        window.btoa(`${localStorage.client_id
        }:${localStorage.secret}`)}`);
      request.send(JSON.stringify(params));
    } else {
      localStorage.state = 'disconnected';
    }
  };

  app.main = function() {
    this.log(`main: state: ${localStorage.state}`);
    this.log(`main: hostname: ${window.location.hostname}`);
    // TODO: OAuth update ids here, URLs using file:// will copy from default
    if (!localStorage.client_id || !localStorage.secret) {
      if (!window.location.hostname) {
        localStorage.client_id = 'local-token';
        localStorage.secret = 'super secret';
      } else {
        // TODO: add GUI to overide default creds:
        localStorage.client_id = window.location.hostname;
        localStorage.secret = window.location.hostname; // TODO no html here
      }
    }
    if (!localStorage.url) {
      this.log('main: URL unset');
      if (confirm('Url is unset, set to default ? eg: http://gateway.local:8080')) {
        localStorage.url = 'http://gateway.local:8080';
        const urlInput = document.getElementById('url');
        if (urlInput) {
          urlInput.setAttribute('value', localStorage.url);
        } else {
          return;
        }
      }
    }
    try {
      if (!localStorage.token) {
        app.request(localStorage.endpoint);
      } else {
        app.query(localStorage.endpoint);
      }
    } catch (err) {
      this.log(err);
    }
  };

  app.onload = function() {
    const self = this;

    let searchParams = null;
    if (document.location.search) {
      searchParams = (new URL(document.location)).searchParams;
    }
    console.log(`searchParams=${searchParams}`);

    if (searchParams) {
      for (const entry of searchParams.entries()) {
        localStorage[entry[0]] = entry[1];
      }
    }

    console.log(`log: Devel mode: ${localStorage.devel}`);
    const develCheckbox = document.getElementById('devel');
    if (develCheckbox) {
      develCheckbox.addEventListener('change', function() {
        app.devel = localStorage.devel = Boolean(this.checked);
      });
      if (typeof localStorage.devel !== undefined) {
        develCheckbox.checked = app.devel;
      }
    }

    console.log(`Auto mode: ${localStorage.auto}`);
    const autoCheckbox = document.getElementById('auto');
    if (autoCheckbox) {
      if (localStorage.auto) {
        autoCheckbox.checked = localStorage.auto;
      } else if (autoCheckbox.checked) {
        localStorage.auto = autoCheckbox.checked;
      }
      autoCheckbox.addEventListener('change', function() {
        localStorage.auto = this.checked;
        console.log(localStorage.auto);
      });
    }

    // hack to pass token from CLI
    let hash = window.location.hash;
    if (hash) {
      try {
        hash = hash.substring(1, hash.length);
        const url = `http://0.0.0.0/${hash}`;
        const params = new URL(url).searchParams;
        for (const entry of params.entries()) {
          if (entry[0] && entry[1]) {
            localStorage[entry[0]] = entry[1];
          }
        }
      } catch (e) {
        console.log(e);
      }
      const loc = `${window.location.protocol}\
//\
${window.location.host}\
${window.location.pathname}`;
      if (localStorage.auto || !app.devel || confirm(`Relocate to ${loc}`)) {
        window.history.replaceState({}, document.title, loc);
      }
    }

    const runButton = document.getElementById('run');
    if (runButton) {
      runButton.addEventListener('click', function() {
        app.main();
      });
    }

    const clearButton = document.getElementById('clear');
    if (clearButton) {
      clearButton.addEventListener('click', function() {
        document.getElementById('console').value = '';
      });
    }

    const resetButton = document.getElementById('reset');
    if (resetButton) {
      resetButton.addEventListener('click', function() {
        document.getElementById('console').setAttribute('value', '');
        document.getElementById('url').setAttribute('value', '');
        document.getElementById('token').setAttribute('value', '');
        document.getElementById('endpoint').setAttribute('value', '/things');
        localStorage.clear();
        app.log('token forgotten (need auth again)');
      });
    }

    const aboutButton = document.getElementById('about');
    if (aboutButton) {
      aboutButton.addEventListener('click', function() {
        window.open('README.md');
      });
    }

    const browseButton = document.getElementById('browse');
    if (browseButton) {
      browseButton.addEventListener('click', function() {
        window.location.href = (app.devel) ? app.browseUrl : app.viewerUrl;
      });
    }

    const urlInput = document.getElementById('url');
    if (urlInput) {
      urlInput.addEventListener('change', function() {
        this.value = this.value.replace(/\/$/, '');
        localStorage.url = this.value;
      });
      if (localStorage.url && localStorage.url.length) {
        urlInput.setAttribute('value', localStorage.url);
      } else if (urlInput.value && urlInput.value.length) {
        localStorage.url = urlInput.value;
      }
    }

    const tokenInput = document.getElementById('token');
    if (tokenInput) {
      tokenInput.addEventListener('change', function() {
        this.value = this.value.replace(/\/$/, '');
        localStorage.token = this.value;
      });
      if (localStorage.token && localStorage.token.length) {
        tokenInput.setAttribute('value', localStorage.token);
      } else if (tokenInput && tokenInput.value) {
        localStorage.token = tokenInput.value;
      }
    }

    const endpointInput = document.getElementById('endpoint');
    if (endpointInput) {
      endpointInput.addEventListener('change', function() {
        console.log(this.value);
        this.value = this.value.replace(/\/$/, '');
        localStorage.endpoint = this.value;
      });
      if (localStorage.endpoint) {
        endpoint.setAttribute('value', localStorage.endpoint);
      } else if (endpointInput.getAttribute('value')) {
        localStorage.endpoint = endpointInput.getAttribute('value');
      }
    }
    // add eventListener for tizenhwkey
    document.addEventListener('tizenhwkey', function(e) {
      if (e.keyName === 'back' && tizen && tizen.application) {
        try {
          tizen.application.getCurrentApplication().exit();
        } catch (ignore) {
          self.log(ignore);
        }
      }
    });

    // Autoconnect
    // TODO add settings page to disable (for debuging)
    app.main();
    if (localStorage.token && app.auto) {
      app.redirect(app.viewerUrl);
    }
  };
})();
