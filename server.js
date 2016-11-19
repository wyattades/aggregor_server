const http = require('http'),
      url = require('url');

const config = require('./config'),
      pg = require('./pg'),
      user = require('./user'),
      auth = require('./auth');

var pool;

const ROUTES = {
  user_new: {
    endpoint: regexRoute('/user'),
    methods: ['POST'],
    content_types: ['application/json'],
    handle: (req, match) => {
      return new Promise( (resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk.toString('utf-8') });
        req.on('end', () => {
          user.newUser(data).then( (resp) => resolve(resp), (err) => reject(err));
        });
      });
    }
  },
  user_login: {
    endpoint: regexRoute('/user/login'),
    methods: ['POST'],
    content_types: ['application/json'],
    handle: (req, match) => {
      return new Promise( (resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk.toString('utf-8') });
        req.on('end', () => {
          user.loginUser(data).then( (resp) => resolve(resp), (err) => reject(err));
        });
      });
    }
  },
  user_logout: {
    endpoint: regexRoute('/user/logout'),
    methods: ['POST'],
    content_types: ['application/json'],
    authenticate: true,
    handle: (req, match, authInfo) => {
      return new Promise( (resolve, reject) => {
        user.logoutUser(authInfo).then( (resp) => resolve(resp), (err) => reject(err) );
      });
    }
  }
};

function regexRoute(rt) {
  const MACROS = {
    user_id: '([a-z0-9]{8})'
  };

  re = `^${rt}/?$`
    .replace(/{\w+}/g, (m, name) => MACROS[name] ? MACROS[name] : m);

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
              (err) => {
                respond(err.code, err.msg, err.data);
              }
            );
          },
          (err) => {
            respond(err.code, err.msg, err.data);
          }
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
