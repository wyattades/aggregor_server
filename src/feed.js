const responses = require('./responses'),
  plugin = require('./plugin');

var pg;

//TODO: replace pgpool connect with promise
/*
e.g.

pool
  .connect()
  .then(client => {
    return client
      .query('SELECT $1::int AS "clientCount"', [client.count])
      .then(res => console.log(res.rows[0].clientCount)) // outputs 0
      .then(() => client)
  })
  .then(client => client.release())

*/

const respond = (response, data) => {
  const responseData = {
    code: 200,
    msg: "OK",
    data: data
  };

  response.writeHead(200);
  response.write(JSON.stringify(responseData));
  response.end();
};

const getFeedId = (client, userId, feedName) => {
  return new Promise((resolve, reject) => {
    client.query('SELECT id FROM feeds WHERE user_id = $1 AND name = $2', [userId, feedName], (err, res) => {
      if (err) {
        reject(responses.internalError("Failed to load feed"));
      } else if (res.rowCount === 0) {
        reject(responses.badRequest("Feed '" + feedName + "' does not exist"));
      } else if (res.rowCount > 1) {
        reject(responses.internalError("Duplicate matching feeds"));
      } else {
        resolve(res.rows[0].id);
      }
    });
  });
};

exports.createFeed = function (userId, data) {
  return new Promise((resolve, reject) => {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return reject(responses.badRequest("Bad request data in creating feed"));
    }

    if (data.name) {
      if (data.name.length > 32) {
        return reject(responses.badRequest('Feed name has max length of 32 characters'));
      }
    } else {
      return reject(responses.badRequest('Must provide name for feed'));
    }

    pg.pool().connect((err, client, done) => {
      if (err) {
        reject(responses.internalError('Failed to connect to DB while creating new feed'));
      } else {
        client.query('INSERT INTO feeds VALUES (DEFAULT, $1, $2) ON CONFLICT (user_id, name) DO NOTHING', [userId, data.name], (err, res) => {
          done();
          if (err) {
            reject(responses.internalError('Failed to create feed'));
          } else if (res.rowCount === 0) {
            reject(responses.badRequest("Feed '" + data.name + "' already exists"));
          } else if (res.rowCount > 1) {
            reject(responses.internalError("Duplicate matching feeds"));
          } else {
            resolve({
              data: {}
            });
          }
        });
      }
    });
  });
};

exports.deleteFeed = function (userId, feedName) {
  return new Promise((resolve, reject) => {
    pg.pool().connect((err, client, done) => {
      if (err) {
        reject(responses.internalError('Failed to connect to database')); //TODO copy this elsewhere
      } else {
        client.query('DELETE FROM feeds WHERE user_id = $1::text AND name = $2::text', [userId, feedName], (err, res) => {
          done();
          if (err) {
            reject(responses.internalError("Failed to delete feed"));
          } else if (res.rowCount === 0) {
            reject(responses.badRequest("No feed named '" + feedName + "'"));
          } else if (res.rowCount > 1) {
            reject(responses.internalError("Duplicate matching feeds"));
          } else {
            resolve({
              data: {}
            });
          }
        });
      }
    });
  });
};

exports.fetchFeeds = function (userId, response) {
  return new Promise((resolve, reject) => {
    pg.pool().connect((err, client, done) => {
      if (err) {
        reject(responses.internalError("Failed to load feed names"));
      } else {
        client.query('SELECT name FROM feeds WHERE user_id = $1', [userId], (err, res) => {
          done();
          if (err) {
            reject(responses.internalError("Failed to load feed names"));
          } else {
            respond(response, { feedNames: res.rows.map((p) => p.name) });
            resolve({
              handled: true
            });
          }
        });
      }
    });
  });
};

exports.fetchPlugins = function (userId, feedName, response) {
  return new Promise((resolve, reject) => {
    pg.pool().connect((err, client, done) => {
      if (err) {
        reject(responses.internalError("Failed to fetch plugins"));
      } else {
        getFeedId(client, userId, feedName).then((feedId) => {
          client.query('SELECT id, type, data FROM plugins WHERE feed_id = $1', [feedId], (err, res) => {
            done();

            if (err) {
              reject(responses.internalError("Failed to load feed"));
            } else {
              respond(response, {
                plugins: res.rows.map((p) => ({
                  id: p.id,
                  type: p.type,
                  data: p.data
                }))
              });
              resolve({
                handled: true
              });
            }
          });
        }, (err) => {
          done();
          reject(err);
        });
      }
    });
  });
};

// TODO: decide how to handle multiple plugins of the same type
exports.addPlugin = function (userId, feedName, data) {
  return new Promise((resolve, reject) => {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return reject(responses.badRequest("Bad request data in adding plugin"));
    }

    if (!plugin.validPluginType(data.type)) {
      return reject(responses.badRequest("Invalid plugin type '" + data.type + "'"));
    }

    pg.pool().connect((err, client, done) => {
      if (err) {
        reject(responses.internalError("Failed to add plugin"));
      } else {
        getFeedId(client, userId, feedName).then((feedId) => {
          const type = data.type,
            info = data.data;

          // NOTE: handling multiple plugins of same type/url/plugin??? 'ON CONFLICT (feed_id, ?url?) DO NOTHING'
          client.query('INSERT INTO plugins VALUES (DEFAULT, $1, $2, $3)', [feedId, type, info], (err) => {
            done();

            if (err) {
              reject(responses.internalError("Failed to add plugin"));
            } else {
              resolve({
                data: {}
              });
            }
          });
        }, (err) => {
          done();
          reject(err);
        });
      }
    });
  });
};

exports.fetchPlugin = function (userId, feedName, pluginId, response) {
  return new Promise((resolve, reject) => {
    pg.pool().connect((err, client, done) => {
      if (err) {
        reject(responses.internalError("Failed to fetch plugin"));
      } else {
        getFeedId(client, userId, feedName).then((feedId) => {
          client.query('SELECT type, data FROM plugins WHERE feed_id = $1 AND id = $2', [feedId, pluginId], (err, res) => {
            done();
            if (err) {
              reject(responses.internalError("Failed to fetch plugin"));
            } else if (res.rowCount === 0) {
              reject(responses.badRequest("No plugin with id '" + pluginId + "' in feed '" + feedName + "'"));
            } else if (res.rowCount > 1) {
              reject(responses.internalError("Multiple plugins with the same id"));
            } else {
              const {
                type,
                data
              } = res.rows[0];

              plugin.getEntries(type, data).then((entries) => {
                respond(response, {
                  entries: entries
                });
                resolve({
                  handled: true
                });
              }, (err) => {
                reject(err);
              });
            }
          });
        }, (err) => {
          done();
          reject(err);
        });
      }
    });
  });
};

exports.updatePlugin = function (userId, feedName, pluginId, data) {
  return new Promise((resolve, reject) => {
    try {
      data = JSON.parse(data);
    } catch(e) {
      return reject(responses.badRequest("Bad request data in updating plugin"));
    }

    if (!plugin.validPluginType(data.type)) {
      return reject(responses.badRequest("Invalid plugin type '" + data.type + "'"));
    }

    pg.pool().connect((err, client, done) => {
      if (err) {
        reject(responses.internalError("Failed to connect to database"));
      } else {
        getFeedId(client, userId, feedName).then((feedId) => {
          const type = data.type,
            info = data.data;

          client.query('UPDATE plugins SET type = $1, data = $2 WHERE id = $3 AND feed_id = $4', [type, info, pluginId, feedId], (err, res) => {
            done();
            if (err) {
              reject(responses.internalError("Failed to update plugin"));
            } else if (res.rowCount === 0) {
              reject(responses.badRequest("No plugin with id '" + pluginId + "' in feed '" + feedName + "'"));
            } else if (res.rowCount > 1) {
              reject(responses.internalError("Multiple plugins with the same id"));
            } else {
              resolve({
                data: {}
              });
            }
          });
        }, (err) => {
          done();
          reject(err);
        });
      }
    });
  });
};

exports.removePlugin = function (userId, feedName, pluginId) {
  return new Promise((resolve, reject) => {
    pg.pool().connect((err, client, done) => {
      if (err) {
        reject(responses.internalError("Failed to connect to database"));
      } else {
        getFeedId(client, userId, feedName).then((feedId) => {
          client.query('DELETE FROM plugins WHERE id = $1 AND feed_id = $2', [pluginId, feedId], (err, res) => {
            done();
            if (err) {
              reject(responses.internalError("Failed to delete plugin"));
            } else if (res.rowCount === 0) {
              reject(responses.badRequest("No plugin with id '" + pluginId + "' in feed '" + feedName + "'"));
            } else if (res.rowCount > 1) {
              reject(responses.internalError("Multiple plugins with the same id"));
            } else {
              resolve({
                data: {}
              });
            }
          });
        }, (err) => {
          done();
          reject(err);
        });
      }
    });
  });
};

exports.availablePlugins = function (response) {
  return new Promise((resolve, reject) => {
    respond(response, {
      plugins: plugin.availablePlugins
    });
    resolve({
      handled: true
    });
  });
};

exports.init = function (_pg) {
  pg = _pg;

  plugin.init();
};