const responses = require('./responses'),
  plugin = require('./plugin');

var pg;

// TODO: create seperate function for getting id from feedName
function getFeedId(client, userId, feedName) {
  return new Promise((resolve, reject) => {
    //client.query(....
  });
}

exports.createFeed = function (userId, data) {
  return new Promise((resolve, reject) => {
    try {
      data = JSON.parse(data);
    } catch (e) {
      reject(responses.badRequest("Bad request data in creating feed"));
    }

    if (data.name) {
      if (data.name.length > 32) {
        reject(responses.badRequest('Feed name has max length of 32 characters'));
      }
    } else {
      reject(responses.badRequest('Must provide name for feed'));
      return;
    }

    pg.pool().connect((err, client, done) => {
      if (err) {
        reject(responses.internalError('Failed to connect to DB while creating new feed'));
      } else {
        client.query('INSERT INTO feeds VALUES (DEFAULT, $1, $2) ON CONFLICT (user_id, name) DO NOTHING', [userId, data.name], (err, res) => {
          done();

          if (err) {
            console.log(err);
            reject(responses.internalError('Failed to create feed'));
          } else {
            if (res.rowCount === 0) {
              reject(responses.badRequest("Feed '" + data.name + "' already exists"));
            } else if (res.rowCount === 1) {
              resolve({
                data: {}
              });
            }
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
        reject(responses.internalError('Failed to connect to DB while creating new feed'));
      } else {
        client.query('DELETE FROM feeds WHERE user_id = $1::text AND name = $2::text', [userId, feedName], (err, res) => {
          done();

          if (err) {
            reject(responses.internalError("Failed to delete feed"));
          } else {
            if (res.rowCount === 0) {
              reject(responses.badRequest("No feed named '" + feedName + "'"));
            } else {
              resolve({
                data: {}
              });
            }
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
          if (err) {
            done();
            reject(responses.internalError("Failed to load feed names"));
          } else {
            const responseData = {
              code: 200,
              msg: "OK",
              data: {
                feedNames: res.rows.map((p) => p.name)
              }
            };

            response.writeHead(200);
            response.write(JSON.stringify(responseData));
            response.end();
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
        reject(responses.internalError("Failed to load feed"));
      } else {
        client.query('SELECT id FROM feeds WHERE user_id = $1 AND name = $2', [userId, feedName], (err, res) => {
          if (err) {
            done();
            reject(responses.internalError("Failed to load feed"));
          } else {
            if (res.rowCount === 0) {
              done();
              reject(responses.badRequest("Couldn't find feed '" + feedName + "'"));
            } else if (res.rowCount === 1) {
              const feedId = res.rows[0].id;

              client.query('SELECT id, type, data FROM plugins WHERE feed_id = $1', [feedId], (err1, res1) => {
                done();

                if (err1) {
                  reject(responses.internalError("Failed to load feed"));
                } else {

                  const responseData = {
                    code: 200,
                    msg: "OK",
                    data: {
                      plugins: res1.rows.map((p) => ({
                        id: p.id,
                        type: p.type,
                        data: p.data
                      }))
                    }
                  };

                  response.writeHead(200);
                  response.write(JSON.stringify(responseData));
                  response.end();
                  resolve({
                    handled: true
                  });
                }
              });
            } else {
              done();
              reject(responses.internalError("Duplicate matching feeds"));
            }
          }
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
      reject(responses.badRequest("Bad request data in adding plugin"));
    }

    if (!plugin.validPluginType(data.type)) {
      reject(responses.badRequest("Invalid plugin type '" + data.type + "'"));
    }

    pg.pool().connect((err, client, done) => {
      client.query('SELECT id FROM feeds WHERE user_id = $1 AND name = $2', [userId, feedName], (err, res) => {
        if (err) {
          done();
          reject(responses.internalError("Failed to add plugin"));
        } else {
          if (res.rowCount == 1) {
            const feedId = res.rows[0].id,
              type = data.type,
              info = data.data;

            client.query('INSERT INTO plugins VALUES (DEFAULT, $1, $2, $3) ON CONFLICT (user_id, name) DO NOTHING', [feedId, type, info], (err1) => {
              done();

              if (err1) {
                reject(responses.internalError("Failed to add plugin"));
              } else {
                resolve({
                  data: {}
                });
              }
            });
          } else {
            reject(responses.internalError("Feed '" + feedName + "' does not exist"));
          }
        }
      });
    });
  });
};

exports.fetchPlugin = function (userId, feedName, pluginId, response) {
  return new Promise((resolve, reject) => {
    pg.pool().connect((err, client, done) => {
      client.query('SELECT id FROM feeds WHERE user_id = $1 AND name = $2', [userId, feedName], (err, res) => {
        if (err) {
          done();
          reject(responses.internalError("Failed to fetch plugin: feed '" + feedName + "' not found"));
        } else {
          if (res.rowCount == 1) {
            const feedId = res.rows[0].id;

            client.query('SELECT type, data FROM plugins WHERE feed_id = $1 AND id = $2', [feedId, pluginId], (err1, res1) => {
              done();

              if (err1) {
                reject(responses.internalError("Failed to fetch plugin"));
              } else {
                if (res1.rowCount === 0) {
                  reject(responses.badRequest("No plugin with id '" + pluginId + "' in feed '" + feedName + "'"));
                } else {

                  const {
                    type,
                    data
                  } = res1[0];

                  doPluginThings(type, data, (entries) => {
                    const responseData = {
                      code: 200,
                      msg: "OK",
                      data: {
                        entries: entries
                      }
                    };

                    response.writeHead(200);
                    response.write(JSON.stringify(responseData));
                    response.end();
                    resolve({
                      handled: true
                    });
                  }, (err2) => {
                    reject(responses.internalError("FAiled to parse selected plugin"));
                  });
                }
              }
            });
          } else {
            reject(responses.badRequest("No feed named '" + feedName + "'"));
          }
        }
      });
    });
  });
};

function doPluginThings() {
  return new Promise((resolve, reject) => {
    reject();
  });
}

exports.updatePlugin = function (userId, feedName, pluginId) {
  return new Promise((resolve, reject) => {
    reject("INCOMPLETE ROUTE");
  });
};

exports.removePlugin = function (userId, feedName, pluginId) {
  return new Promise((resolve, reject) => {
    reject("INCOMPLETE ROUTE");
  });
};

exports.init = function (_pg) {
  pg = _pg;

  plugin.init();
};