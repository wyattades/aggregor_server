const responses = require('./responses'),
  plugin = require('./plugin');

var pg;

// const respondSuccess = (response, data) => {
//   response.writeHead(200);
//   response.write(JSON.stringify({
//     code: 200,
//     msg: "OK",
//     data: data
//   }));
//   response.end();
// };

// const pgConnect = () => {
//   return new Promise((resolve, reject) => {
//     pg.pool().connect((err, client, done) => {
//       if (err) {
//         reject(responses.internalError("Failed to connect to database"));
//       } else {
//         resolve(client, done);
//       }
//     });
//   });
// };

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

const getEntries = () => {
  return new Promise((resolve, reject) => {
    resolve([{
      title: "example1"
    }, {
      title: "example2"
    }]);
    //reject(responses.internalError("Failed to parse selected plugin"));
  });
};

exports.createFeed = function (userId, data) {
  return new Promise((resolve, reject) => {
    try {
      data = JSON.parse(data);
    } catch (e) {
      reject(responses.badRequest("Bad request data in creating feed"));
      return;
    }

    if (data.name) {
      if (data.name.length > 32) {
        reject(responses.badRequest('Feed name has max length of 32 characters'));
        return;
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
        reject(responses.internalError('Failed to connect to DB while creating new feed')); //TODO copy this elsewhere
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
            // TODO: should feedName contain all that whitespace?

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
        reject(responses.internalError("Failed to fetch plugins"));
      } else {
        getFeedId(client, userId, feedName).then((feedId) => {
          client.query('SELECT id, type, data FROM plugins WHERE feed_id = $1', [feedId], (err, res) => {
            done();

            if (err) {
              reject(responses.internalError("Failed to load feed"));
            } else {

              const responseData = {
                code: 200,
                msg: "OK",
                data: {
                  plugins: res.rows.map((p) => ({
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
      reject(responses.badRequest("Bad request data in adding plugin"));
      return;
    }

    if (!plugin.validPluginType(data.type)) {
      reject(responses.badRequest("Invalid plugin type '" + data.type + "'"));
      return;
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

              getEntries(type, data).then((entries) => {
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
      reject(responses.badRequest("Bad request data in updating plugin"));
    }

    if (!plugin.validPluginType(data.type)) {
      reject(responses.badRequest("Invalid plugin type '" + data.type + "'"));
      return;
    }

    pg.pool().connect((err, client, done) => {
      if (err) {
        reject(responses.internalError("Failed to update plugin"));
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
      getFeedId(client, userId, feedName).then((feedId) => {
        client.query('DELETE FROM plugins WHERE id = $1 AND feed_id = $2', [pluginId, feedId], (err, res) => {
          done();
          if (err) {
            console.log(err);
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
    });
  });
};

exports.availablePlugins = function (response) {
  return new Promise((resolve, reject) => {
    const responseData = {
      code: 200,
      msg: "OK",
      data: {
        plugins: plugin.availablePlugins
      }
    };
    response.writeHead(200);
    response.write(JSON.stringify(responseData));
    response.end();
    resolve({
      handled: true
    });
  });
};

exports.init = function (_pg) {
  pg = _pg;

  plugin.init();
};