const http = require('http'),
      url = require('url'),
      Joi = require('joi');

const config = require('../config'),
      pg = require('./pg'),
      user = require('./user'),
      auth = require('./auth'),
      feed = require('./feed'),
      utils = require('./utils'),
      responses = require('./responses'),
      regexRoute = utils.regexRoute;

global.__DEV__ = process.env.NODE_ENV === 'development';

const patternSchema = (type) => Joi.string().regex(new RegExp(`^${utils.MACROS[type]}$`));

const ROUTES = {

  login: {
    endpoint: regexRoute('/session'),
    methods: ['POST'],
    content_types: ['application/json'],
    schema: Joi.object({
      username: Joi.string().required(),
      password: Joi.string().required(),
    }),
    handle: (data) => user.loginUser(data)
  },

  logout: {
    endpoint: regexRoute('/session'),
    methods: ['DELETE'],
    authenticate: true,
    handle: (data, match, authInfo) => user.logoutUser(authInfo)
  },
  
  create_user: {
    endpoint: regexRoute('/user'),
    methods: ['POST'],
    content_types: ['application/json'],
    schema: Joi.object({
      username: patternSchema('username').required(),
      password: patternSchema('password').required(),
      email: Joi.string().email().required(),
      first_name: patternSchema('name'),
      last_name: patternSchema('name'),
    }),
    handle: (data) => user.newUser(data)
  },

  delete_user: {
    endpoint: regexRoute('/user/:username'),
    methods: ['DELETE'],
    content_types: ['application/json'],
    authenticate: true,
    schema: Joi.object({
      password: patternSchema('password').required(),
    }),
    handle: (data, match, authInfo) => user.deleteUser(authInfo, data)
  },

  fetch_user: {
    endpoint: regexRoute('/user/:username'),
    methods: ['GET'],
    authenticate: true,
    handle: (data, match, authInfo, res) => user.fetchUser(authInfo.user, res)
  },

  update_user: {
    endpoint: regexRoute('/user/:username'),
    methods: ['PUT'],
    authenticate: true,
    content_types: ['application/json'],
    schema: Joi.object({
      username: patternSchema('username'),
      password: patternSchema('password'),
      email: Joi.string().email().optional()  ,
      first_name: patternSchema('name'),
      last_name: patternSchema('name'),
    }),
    handle: (data, match, authInfo, res) => user.updateUser(authInfo.user, data)
  },

  fetch_feeds: {
    endpoint: regexRoute('/user/:username/feed'),
    methods: ['GET'],
    authenticate: true,
    handle: (data, match, authInfo, res) => feed.fetchFeeds(authInfo.user.id, res)
  },

  create_feed: {
    endpoint: regexRoute('/user/:username/feed'),
    methods: ['POST'],
    content_types: ['application/json'],
    authenticate: true,
    schema: Joi.object({
      name: patternSchema('feed_name').required(),
    }),
    handle: (data, match, authInfo) => feed.createFeed(authInfo.user.id, data)
  },

  delete_feed: {
    endpoint: regexRoute('/user/:username/feed/:feed_name'),
    methods: ['DELETE'],
    authenticate: true,
    handle: (data, match, authInfo) => feed.deleteFeed(authInfo.user.id, match[2])
  },

  update_feed: {
    endpoint: regexRoute('/user/:username/feed/:feed_name'),
    methods: ['PUT'],
    authenticate: true,
    content_types: ['application/json'],
    schema: Joi.object({
      name: patternSchema('feed_name').required(),
    }),
    handle: (data, match, authInfo, res) => feed.updateFeed(authInfo.user.id, match[2], data)
  },

  fetch_plugins: {
    endpoint: regexRoute('/user/:username/feed/:feed_name/plugin'),
    methods: ['GET'],
    authenticate: true,
    handle: (data, match, authInfo, res) => feed.fetchPlugins(authInfo.user.id, match[2], res)
  },

  add_plugin: {
    endpoint: regexRoute('/user/:username/feed/:feed_name/plugin'),
    methods: ['POST'],
    content_types: ['application/json'],
    authenticate: true,
    schema: Joi.object({
      type: patternSchema('type').required(),
      priority: Joi.number().min(0).max(1).required(),
      data: Joi.object().required(),
    }),
    handle: (data, match, authInfo, res) => feed.addPlugin(authInfo.user.id, match[2], data, res)
  },

  fetch_feed: {
    endpoint: regexRoute('/user/:username/feed/:feed_name/:page'),
    methods: ['GET'],
    authenticate: true,
    handle: (data, match, authInfo, res) => feed.fetchFeed(authInfo.user.id, match[2], match[3], res)
  },

  update_plugin: {
    endpoint: regexRoute('/user/:username/feed/:feed_name/plugin/:plugin_id'),
    methods: ['PUT'],
    authenticate: true,
    content_types: ['application/json'],
    schema: Joi.object({
      type: patternSchema('type'),
      priority: Joi.number().min(0).max(1),
      data: Joi.object(),
    }),
    handle: (data, match, authInfo, res) => feed.updatePlugin(authInfo.user.id, match[2], match[3], data)
  },

  remove_plugin: {
    endpoint: regexRoute('/user/:username/feed/:feed_name/plugin/:plugin_id'),
    methods: ['DELETE'],
    authenticate: true,
    handle: (data, match, authInfo) => feed.removePlugin(authInfo.user.id, match[2], match[3])
  },
  
  fetch_available_plugins: {
    endpoint: regexRoute('/plugins'),
    methods: ['GET'],
    handle: (data, match, authInfo, res) => feed.availablePlugins(res)
  }
};

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

  if (!route)
    return [undefined, undefined, responses.notFound('No route: ' + method + ' ' + path)];
  else if (route.content_types && !route.content_types.includes(content_type)) {
    return [undefined, undefined, responses.badRequest('Invalid content type provided')];
  }
  const match = path.match(route.endpoint);
  return [route, match, undefined];
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
        console.log({ code, msg, data });
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
        const err = responses.unauthorized('Route requires an auth token');
        respond(err.code, err.msg, err.data);
      }
    } else {
      handle();
    }

    //TODO: instead of responding in feed.js, why don't we pass our response into resolve(response)?
    function handle() {
      Promise.resolve().then(() => {
        if (route.schema) {
          return utils.aggregateStream(req).then(data => {
            try {
              data = JSON.parse(data);
            } catch(err) {
              throw responses.badRequest('Invalid JSON request data');
            }
            const { error, value } = Joi.validate(data, route.schema);
            if (error) {
              console.log('JOI ERROR:', error);
              throw responses.badRequest(error.details[0].message);
            } else {
              return Promise.resolve(value);
            }
          });
        } else {
          return Promise.resolve();
        }
      })
      .then(data => route.handle(data, match, authInfo, res))
      .then(resp => {
        if(!resp.handled) {
          respond(resp.code || 200, resp.msg || 'OK', resp.data);
        }
      })
      .catch(err => {
        if (err.code === undefined) err = responses.internalError(JSON.stringify(err));
        respond(err.code, err.msg, err.data);
      });
    }
  }).listen(port);
}

init();
run(process.env.PORT || config.HOST_PORT);
