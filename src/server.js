const http = require('http'),
      url = require('url');

const config = require('../config'),
      pg = require('./pg'),
      user = require('./user'),
      auth = require('./auth'),
      feed = require('./feed'),
      utils = require('./utils');

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
  fetch_feed: {
    endpoint: regexRoute('/user/:user_name/feed/:feed_name'),
    methods: ['GET'],
    authenticate: true,
    handle: (req, match, authInfo, res) => {
      return new Promise( (resolve, reject) => {
        feed.fetchFeed(authInfo.user.id, match[2], res).then(resolve, reject);
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
  add_plugin: {
    endpoint: regexRoute('/user/:user_name/feed/:feed_name'),
    methods: ['POST'],
    content_types: ['application/json'],
    authenticate: true,
    handle: (req, match, authInfo) => {
      return new Promise( (resolve, reject) => {
        utils.aggregateStream(req).then( (data) => {
          feed.addPlugin(authInfo.user.id, match[2], data.toString()).then(resolve, reject);
        });
      });
    }
  },
  remove_plugin: {
    endpoint: regexRoute('/user/:user_name/feed/:feed_name'),
    methods: ['DELETE'],
    authenticate: true,
    handle: (req, match, authInfo) => {
      return new Promise( (resolve, reject) => {
        resolve();
      });
    }
  }
};

function regexRoute(rt) {
  const MACROS = {
    //user_id: '([a-z0-9]{8})',
    user_name: '([a-zA-Z0-9]{4,32})',
    feed_name: '([a-zA-Z0-9]{1,32})'
  };

  let re = `^${rt}/?$`
    .replace(/:(\w+)/g, (m, name) => MACROS[name] ? MACROS[name] : m);

  return new RegExp(re);
}

function matchUrl(req) {
  const reqUrl = url.parse(req.url, true),
          path = reqUrl.pathname,
          method = req.method,
          content_type = req.headers['content-type'];

  const route =
    Reflect.ownKeys(ROUTES)
    .map(_ => ROUTES[_])
    .find(r => path.match(r.endpoint)
               && r.methods.includes(method)
               && (!r.content_types || r.content_types.includes(content_type)));

  if(!route)
    return [undefined, undefined];

  return [route, path.match(route.endpoint)];
}

function init() {
  const dbInfo = url.parse(config.DB_URI),
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
      headers['Content-Type'] = 'application/json';
      res.writeHead(code, headers);
      res.end(JSON.stringify({code, msg, data}));
    }

    const [route, match] = matchUrl(req);
    let authInfo = {};

    res.setHeader('Access-Control-Allow-Origin', '*');

    // Handle preflight request
    if(req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Aggregor-Token');
      res.writeHead(200);
      res.end();

      return;
    }

    if(!route) {
      respond(404, 'Not Found', 'No route ' + req.url);
      return;
    }

    if(route.authenticate) {
      const token = req.headers['x-aggregor-token'];
      if(token) {
        auth.validateAuthToken(token).then(
          (userId) => {
            user.getAuthedUser(userId).then(
              (user) => {
                authInfo.user = user;
                authInfo.token = token;
                handle();
              },
              (err) => respond(err.code, err.msg, err.data)
            );
          },
          (err) => respond(err.code, err.msg, err.data)
        );
      } else {
        respond(401, 'Unauthorized', '');
      }
    } else {
      handle();
    }

    function handle() {
      route.handle(req, match, authInfo, res).then(
        (resp) => {
          if(!resp.handled) {
            respond(resp.code || 200, resp.msg || 'OK', resp.data);
          }
        },
        (err) => {
          respond(err.code || 500, err.msg, err.data);
        }
      );
    }
  }).listen(port);
}

init();
run(config.HOST_PORT);
