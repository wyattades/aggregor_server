const responses = require('./responses'),
  plugin = require('./plugin');

var pg;

const AMOUNT_PER_PAGE = 20;

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
    pg.pool().connect((err, client, done) => {
      if (err) {
        reject(responses.internalError('Failed to connect to DB while creating new feed'));
      } else {
        client.query('INSERT INTO feeds VALUES (DEFAULT, $1, $2) ON CONFLICT (user_id, name) DO NOTHING', [userId, data.name], (err, res) => {
          done();
          if (err) {
            reject(responses.internalError('Failed to create feed'));
          } else if (res.rowCount === 0) {
            reject(responses.conflict('This feed name is already being used'));
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

exports.updateFeed = function (userId, feedName, data) {
  return new Promise((resolve, reject) => {
    pg.pool().connect((err, client, done) => {
      if (err) {
        reject(responses.internalError('Failed to connect to DB while updating feed'));
      } else {
        client.query('UPDATE feeds SET name = $1 WHERE user_id = $2 AND name = $3', [data.name, userId, feedName], (err, res) => {
          done();
          if (err) {
            reject(responses.internalError('Failed to create feed'));
          } else if (res.rowCount === 0) {
            reject(responses.conflict('This feed name is already being used'));
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
            respond(response, { feedNames: res.rows.map((p) => p.name.trim()) });
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
        getFeedId(client, userId, feedName).then(feedId => {
          client.query('SELECT id, type, data, priority FROM plugins WHERE feed_id = $1', [feedId], (err, res) => {
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
      }, err => reject(responses.badRequest('No feed found with name: ' + feedName)));
      }
    });
  });
};

exports.fetchFeed = (userId, feedName, page, response) => new Promise((resolve, reject) => { 
  if (typeof page === 'string') {
    page = parseInt(page);
  }
  if (page < 1) {
    return reject(responses.badRequest('Feed page must be a positive, nonzero integer'));
  }
  
  pg.pool().connect((err, client, done) => {
    if (err) {
      reject(responses.internalError("Failed to connect to DB"));
    } else {
      getFeedId(client, userId, feedName).then(feedId => {
        client.query(`SELECT * FROM plugins WHERE feed_id = $1`, [feedId], (err, res) => {
          done();
          if (err) {
            reject(responses.internalError("Failed to fetch feed"));
          } else {

            const plugins = res.rows;

            // TODO: fix duplicate entries being returned

            // TODO move this to the database when we add or update plugin
            let totalPriority = 0;
            for (let i = 0; i < plugins.length; i++) {
              totalPriority += plugins[i].priority;
            }
            for (let i = 0; i < plugins.length; i++) {
              const normalPriority = plugins[i].priority / totalPriority;
              plugins[i].normalPriority = normalPriority;
              plugins[i].offset = Math.round((page-1)*normalPriority*AMOUNT_PER_PAGE);
              plugins[i].amount = Math.round(normalPriority*AMOUNT_PER_PAGE);
            }

            Promise.all(plugins.map(_plugin => 
              plugin.fetchPlugin(_plugin)
            ))
            .then(results => {
              done();

              let entries = [], 
                  errors = {};
              for (let i = 0; i < results.length; i++) {
                const result = results[i];
                if (Array.isArray(result)) {
                  entries = entries.concat(result);
                } else {
                  errors[result.id] = result.err;
                }
              }

              entries.sort((a, b) => a.priority - b.priority);

              respond(response, { entries, errors });
              resolve({ handled: true });
            })
            .catch(err => reject(responses.internalError(err)));
          }
        });
      }, err => reject(responses.badRequest('No feed found with name: ' + feedName)));
    }
  });
});

exports.addPlugin = function (userId, feedName, data, response) {
  return new Promise((resolve, reject) => {
    plugin.validPlugin(data).then(() => {
      pg.pool().connect((err, client, done) => {
        if (err) {
          reject(responses.internalError("Failed to add plugin"));
        } else {
          getFeedId(client, userId, feedName).then((feedId) => {
            const { type, priority } = data,
              info = data.data;

            client.query('INSERT INTO plugins VALUES (DEFAULT, $1, $2, $3::real, $4) RETURNING id', [feedId, type, priority, info], (err, res) => {
              done();

              if (err) {
                reject(responses.internalError("Failed to add plugin: " + err));
              } else if (res.rows.length !== 1) {
                reject(responses.internalError('Failed to add plugin: duplicate or null plugin'));
              } else {
                respond(response, { id: res.rows[0].id });
                resolve({
                  handled: true
                });
              }
            });
          }, err => reject(responses.badRequest('No feed found with name: ' + feedName)));
        }
      });
    }, err => reject(responses.badRequest("Invalid plugin request: " + err)));
  });
};

exports.updatePlugin = function (userId, feedName, pluginId, data) {
  return new Promise((resolve, reject) => {
    plugin.validPlugin(data).then(() => {
      pg.pool().connect((err, client, done) => {
        if (err) {
          reject(responses.internalError("Failed to connect to database"));
        } else {
          getFeedId(client, userId, feedName).then((feedId) => {
            const { type, priority } = data,
              info = data.data;

            client.query('UPDATE plugins SET type = $1, data = $2, priority = $3::real WHERE id = $4 AND feed_id = $5', [type, info, priority, pluginId, feedId], (err, res) => {
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
    }, () => reject(responses.badRequest("Invalid plugin request")));
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

  plugin.init(_pg);
};