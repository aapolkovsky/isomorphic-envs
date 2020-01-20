# Isomorphic environment variables plugin for Webpack

## Client-side plugin

```js
const IsomorphicEnvsWebpackPlugin = require('isomorphic-envs/webpack-plugin');
```

### Options

+ `filename` - filename of json config with extracted envs names and name of global variable in which the variables are stored on the client side (default: `isomorphic-envs.json`)
+ `variable` - name of global variable in which the variables are stored on the client side (default: `'__ISOMORPHIC_ENVS__'`)


## Usage

### Client

#### webpack.config.client.js

```js
const IsomorphicEnvsWebpackPlugin = require('isomorphic-envs/webpack-plugin');

module.exports = {
  ...
  plugins: [
    ...
    new IsomorphicEnvsWebpackPlugin({
      filename: 'isomorphic-envs.json',
      variable: '__ISOMORPHIC_ENVS__'
    })
  ]
};
```

#### Isomorphic code

`src/my.js`

```js
import axios from 'axios';

axios
  .get(process.env.OFFERS_API_ENDPOINT, {
    timeout: process.env.REQUEST_TIMEOUT
  })
  .then(r => r.json())
  .then(console.log);
```

#### Output

`dist/isomorphic-envs.json`

```json
{
  "variable": "__ISOMORPHIC_ENVS__",
  "envKeys": [
    "OFFERS_API_ENDPOINT",
    "REQUEST_TIMEOUT"
  ]
}
```

`src/my.js`

```js
import axios from 'axios';

axios
  .get(__ISOMORPHIC_ENVS__.OFFERS_API_ENDPOINT, {
    timeout:__ISOMORPHIC_ENVS__.REQUEST_TIMEOUT
  })
  .then(r => r.json())
  .then(console.log);
```

### Server

#### Default

```js
import { getEnvScriptTag } from 'isomorphic-envs';
import config from '../dist/isomorphic-envs.json';

/*
process.env = {
  ...
  'OFFERS_API_ENDPOINT': 'https://api.example.com/offers',
  'REQUEST_TIMEOUT': '1000'
};
*/

const scriptTag = getEnvScriptTag(process.env, config);

/*
<script>
  window.__ISOMORPHIC_ENVS__ = {
    "OFFERS_API_ENDPOINT": "https://api.example.com/offers",
    "REQUEST_TIMEOUT": '1000'
  };
</script>
*/

function render(request) {
  const [html, head, scripts] = app.render(request); // your isomorphic app renders somehow
  
  return `
    <!doctype html>
    <html>
      <head>
        ${head}
      </head>
      <body>
        ${html}
        ${scriptTag}
        ${scripts}
      </body>
    </html>
  `;
}
```

#### Polymorphic

To use different envs values on client and server side prefix or postfix your client envs (default: `/^CLIENT_/`, e.g. `CLIENT_OFFERS_API_ENDPOINT`)
and use `isomorphic-envs/polymorphic` on server side. It fallbacks to unprefixed value of env if prefixed value is not presented.

```js
import { getEnvScriptTag } from 'isomorphic-envs/polymorphic';
import config from '../dist/isomorphic-envs.json';

/*
process.env = {
  ...
  'C_OFFERS_API_ENDPOINT': 'https://api.example.com/offers',
  'OFFERS_API_ENDPOINT': 'http://somehost.svc/offers',
  'REQUEST_TIMEOUT': '1000'
};
*/

const scriptTag = getEnvScriptTag(process.env, config, /^C_/);

/*
<script>
  window.__ISOMORPHIC_ENVS__ = {
    "OFFERS_API_ENDPOINT": "https://api.example.com/offers",
    "REQUEST_TIMEOUT": '1000'
  };
</script>
*/

function render(request) {
  const [html, head, scripts] = app.render(request); // your isomorphic app renders somehow
  
  return `
    <!doctype html>
    <html>
      <head>
        ${head}
      </head>
      <body>
        ${html}
        ${scriptTag}
        ${scripts}
      </body>
    </html>
  `;
}
```
