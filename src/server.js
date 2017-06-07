const http = require('http'),
      url = require('url');

const config = require('../config'),
      pg = require('./pg'),
      user = require('./user'),
      auth = require('./auth'),
      feed = require('./feed'),
      utils = require('./utils'),
      responses = require('./responses');

const __DEV__ = process.env.NODE_ENV === 'development';

const MACROS = {
  user_name: '([_a-zA-Z0-9]{4,32})',
  feed_name: '([_a-zA-Z0-9]{1,32})',
  plugin_id: '([a-z0-9-]{36})',
  page: '([0-9]+)',
};


const ROUTES = {
  user_new: {
    endpoint: regexRoute('/user'),
    methods: ['POST'],
    content_types: ['application/json'],
    handle: (req) => {
      return new Promise( (resolve, reject) => {
        utils.aggregateStream(req).then( (data) => {
          user.newUser(data.toString()).then(resolve, reject);
        });
      });
    }
  },

  user_delete: {
    endpoint: regexRoute('/user'),
    methods: ['DELETE'],
    content_types: ['application/json'],
    authenticate: true,
    handle: (req, match, authInfo) => {
      return new Promise( (resolve, reject) => {
        utils.aggregateStream(req).then( (data) => {
          user.deleteUser(authInfo, data.toString()).then(resolve, reject);
        });
      });
    }
  },

  user_login: {
    endpoint: regexRoute('/user/login'),
    methods: ['POST'],
    content_types: ['application/json'],
    handle: (req) => {
      return new Promise( (resolve, reject) => {
        utils.aggregateStream(req).then( (data) => {
          user.loginUser(data.toString()).then(resolve, reject);
        });
      });
    }
  },

  user_logout: {
    endpoint: regexRoute('/user/logout'),
    methods: ['DELETE'],
    authenticate: true,
    handle: (req, match, authInfo) => {
      return new Promise( (resolve, reject) => {
        user.logoutUser(authInfo).then(resolve, reject);
      });
    }
  },

  fetch_feeds: {
    endpoint: regexRoute('/user/:user_name/feed'),
    methods: ['GET'],
    authenticate: true,
    handle: (req, match, authInfo, res) => {
      return new Promise( (resolve, reject) => {
        feed.fetchFeeds(authInfo.user.id, res).then(resolve, reject);
      });
    }
  },

  create_feed: {
    endpoint: regexRoute('/user/:user_name/feed'),
    methods: ['POST'],
    content_types: ['application/json'],
    authenticate: true,
    handle: (req, match, authInfo) => {
      return new Promise( (resolve, reject) => {
        utils.aggregateStream(req).then( (data) => {
          feed.createFeed(authInfo.user.id, data.toString()).then(resolve, reject);
        });
      });
    }
  },

  delete_feed: {
    endpoint: regexRoute('/user/:user_name/feed/:feed_name'),
    methods: ['DELETE'],
    authenticate: true,
    handle: (req, match, authInfo) => {
      return new Promise( (resolve, reject) => {
        feed.deleteFeed(authInfo.user.id, match[2]).then(resolve, reject);
      });
    }
  },

  fetch_plugins: {
    endpoint: regexRoute('/user/:user_name/feed/:feed_name'),
    methods: ['GET'],
    authenticate: true,
    handle: (req, match, authInfo, res) => {
      return new Promise( (resolve, reject) => {
        feed.fetchPlugins(authInfo.user.id, match[2], res).then(resolve, reject);
      });
    }
  },

  add_plugin: {
    endpoint: regexRoute('/user/:user_name/feed/:feed_name'),
    methods: ['POST'],
    content_types: ['application/json'],
    authenticate: true,
    handle: (req, match, authInfo, res) => {
      return new Promise( (resolve, reject) => {
        utils.aggregateStream(req).then( (data) => {
          feed.addPlugin(authInfo.user.id, match[2], data.toString(), res).then(resolve, reject);
        });
      });
    }
  },

  fetch_feed: {
    endpoint: regexRoute('/user/:user_name/feed/:feed_name/:page'),
    methods: ['GET'],
    authenticate: true,
    handle: (req, match, authInfo, res) => {
      return new Promise( (resolve, reject) => {
        feed.fetchFeed(authInfo.user.id, match[2], match[3], res).then(resolve, reject);
      });
    }
  },

  update_plugin: {
    endpoint: regexRoute('/user/:user_name/feed/:feed_name/:plugin_id'),
    methods: ['PUT'],
    authenticate: true,
    content_types: ['application/json'],
    handle: (req, match, authInfo, res) => {
      return new Promise( (resolve, reject) => {
        utils.aggregateStream(req).then( (data) => {
          feed.updatePlugin(authInfo.user.id, match[2], match[3], data.toString()).then(resolve, reject);
        });
      });
    }
  },

  remove_plugin: {
    endpoint: regexRoute('/user/:user_name/feed/:feed_name/:plugin_id'),
    methods: ['DELETE'],
    authenticate: true,
    handle: (req, match, authInfo) => {
      return new Promise( (resolve, reject) => {
        feed.removePlugin(authInfo.user.id, match[2], match[3]).then(resolve, reject);
      });
    }
  },
  
  fetch_available_plugins: {
    endpoint: regexRoute('/plugins'),
    methods: ['GET'],
    handle: (req, match, authInfo, res) => {
      return new Promise((resolve, reject) => {
        feed.availablePlugins(res).then(resolve, reject);
       });
     }
   }
};

function regexRoute(rt) {

  let re = `^${rt}/?$`
    .replace(/:(\w+)/g, (m, name) => MACROS[name] ? MACROS[name] : m);

  return new RegExp(re);
}

function matchUrl(req) {
  const reqUrl = url.parse(req.url, true),
          path = reqUrl.pathname,
          method = req.method;
  let content_type = req.headers['content-type'];
  
  // handle discrepencies in content_type
  if (content_type) {
    const split = content_type.split(";");
    if (split.length > 1) content_type = split[0];
  }

  const route =
    Reflect.ownKeys(ROUTES)
    .map(_ => ROUTES[_])
    .find(r => path.match(r.endpoint)
               && r.methods.includes(method));

  if(!route)
    return [undefined, undefined, responses.notFound('No route: ' + method + ' ' + path)];
  else if (route.content_types && !route.content_types.includes(content_type)) {
    return [undefined, undefined, responses.badRequest('Invalid content type provided')];
  }

  return [route, path.match(route.endpoint), undefined];
}

function init() {
  const dbInfo = url.parse(process.env.DATABASE_URL || config.DB_URI),
        [username, password] = dbInfo.auth.split(':');

  pg.init({
    user: username,
    password: password,
    database: dbInfo.pathname.substring(1),
    host: dbInfo.hostname,
    port: dbInfo.port ? Number(dbInfo.port) : 5432,
    max: config.PG_POOL_SIZE,
    idleTimeoutMillis: config.DB_TIMEOUT
  });

  user.init(pg);
  auth.init(pg);
  feed.init(pg);
}

function run(port) {
  console.log("Server running on port: " + port);
  http.createServer( (req, res) => {

    function respond(code, msg='', data='', headers={}) {

      if (__DEV__) {
        let print_data = data;
        // if (Array.isArray(data)) {
        //   print_data = `[Array:${data.length}]`;
        // }
        console.log({ code, msg, data: print_data });
      }

      headers['Content-Type'] = 'application/json';
      res.writeHead(code, headers);
      res.end(JSON.stringify({code, msg, data}));
    }

    const [route, match, matchError] = matchUrl(req);
    let authInfo = {};

    res.setHeader('Access-Control-Allow-Origin', '*');

    // Handle preflight request
    if(req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Aggregor-Token');
      res.writeHead(200);
      res.end();

      return;
    }

    if(matchError) {
      respond(matchError.code, matchError.msg, matchError.data);
      return;
    }

    if(route.authenticate) {
      const token = req.headers['x-aggregor-token'];
      if (token) {
        user.getAuthedUser(token).then((user) => {
          authInfo.user = user;
          authInfo.token = token;
          handle();
        }, (err) => {
          respond(err.code, err.msg, err.data);
        });
      } else {
        const err = responses.unauthorized('Auth token is not valid');
        respond(err.code, err.msg, err.data);
      }
    } else {
      handle();
    }

    //TODO: instead of responding in feed.js, why don't we pass our response into resolve(response)?
    function handle() {
      route.handle(req, match, authInfo, res).then(
        (resp) => {
          if(!resp.handled) {
            respond(resp.code || 200, resp.msg || 'OK', resp.data);
          }
        },
        (err) => {
          if (!err.code) err = responses.internalError(JSON.stringify(err));
          respond(err.code, err.msg, err.data);
        }
      );
    }
  }).listen(port);
}

init();
run(process.env.PORT || config.HOST_PORT);
