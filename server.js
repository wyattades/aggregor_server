const http = require('http'),
      url = require('url');

const config = require('./config'),
      pg = require('./pg'),
      user = require('./user');
var pool;

const ROUTES = {
  user_new: {
    endpoint: regexRoute('/user/new'),
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
}

function run(port) {
  console.log("Server running on port: " + port);
  http.createServer( (req, res) => {

    const [route, match] = matchUrl(req);

    if(!route) {
      res.writeHead(404);
      res.end("Couldn't find route " + req.url);
      return;
    }

    route.handle(req, match, res).then(
      (resp) => {
        if(!resp.code)
          resp.code = 200;

        if(!resp.handled) {
          res.writeHead(resp.code, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(resp.data));
        }
      },
      // Handle reject
      (resp) => {
        res.writeHead(resp.code || 500);
        res.end(resp.data || '');
      }
    );
  }).listen(port);
}

init();
run(config.HOST_PORT);
