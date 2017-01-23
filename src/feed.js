const responses = require('./responses'),
      plugin = require('./plugin');

var pg;

exports.createFeed = function(userId, data) {
  return new Promise( (resolve, reject) => {
    try {
      data = JSON.parse(data);
    } catch(e) {
      reject(responses.badRequest("Bad request data in creating feed"));
    }

    if(data.name) {
      if(data.name.length > 32) {
        reject(responses.badRequest('Feed name has max length of 32 characters'));
      }
    } else {
      reject(responses.badRequest('Must provide name for feed'));
      return;
    }

    pg.pool().connect((err, client, done) => {
      if(err) {
        reject(responses.internalError('Failed to connect to DB while creating new feed'));
      } else {
        client.query('INSERT INTO feeds VALUES (DEFAULT, $1, $2) ON CONFLICT (user_id, name) DO NOTHING', [userId, data.name], (err, res) => {
          done();

          if(err) {
            reject(responses.internalError('Failed to create feed'));
          } else {
            if(res.rowCount === 0) {
              reject(responses.badRequest("Feed '" + data.name + "' already exists"));
            } else if(res.rowCount === 1) {
              resolve({ data: {}});
            }
          }
        });
      }
    });
  });
};

exports.deleteFeed = function(userId, feedName) {
  return new Promise( (resolve, reject) => {
    pg.pool().connect((err, client, done) => {
      if(err) {
        reject(responses.internalError('Failed to connect to DB while creating new feed'));
      } else {
        client.query('DELETE FROM feeds WHERE user_id = $1::text AND name = $2::text', [userId, feedName], (err, res) => {
          done();

          if(err) {
            reject(responses.internalError("Failed to delete feed"));
          } else {
            if(res.rowCount === 0) {
              reject(responses.badRequest("No feed named '" + feedName + "'"));
            } else {
              resolve({ data: {}});
            }
          }
        });
      }
    });
  });
};

function compileFeed(plugins, res) {
  let feed = { code: 200, msg: "OK", data: {plugins: []} },
      pending = plugins.length;

  plugins.forEach((p) => {
    const type = p.type,
          data = p.data,
          plg = plugin.installedPlugins[type];

    let strm = plg.request(data).pipe(plg.parse()),
        pluginFeed = [];

    strm.on('data', (chunk) => {
      if(Buffer.isBuffer(chunk)) {
        pluginFeed.push(chunk.toString());
      } else {
        pluginFeed.push(chunk);
      }
    }).on('end', () => {
      feed.data.plugins.push({
        type,
        feed: pluginFeed
      });

      pending--;
      if(pending === 0) {
        complete();
      }
    });
  });

  function complete() {
    res.writeHead(200);
    res.write(JSON.stringify(feed));
    res.end();
  }
}

exports.fetchFeed = function(userId, feedName, response) {
  return new Promise( (resolve, reject) => {
    pg.pool().connect((err, client, done) => {
      if(err) {
        reject(responses.internalError("Failed to load feed"));
      } else {
        client.query('SELECT id FROM feeds WHERE user_id = $1 AND name = $2', [userId, feedName], (err, res) => {
          if(err) {
            done();
            reject(responses.internalError("Failed to load feed"));
          } else {
            if(res.rowCount === 0) {
              done();
              reject(responses.badRequest("Couldn't find feed '" + feedName + "'"));
            } else if(res.rowCount === 1) {
              const feedId = res.rows[0].id;

              client.query('SELECT type, data FROM plugins WHERE feed_id = $1', [feedId], (err1, res1) => {
                done();

                if(err1) {
                  reject(responses.internalError("Failed to load feed"));
                } else {
                  const plugins = res1.rows.map((p) => {
                    return {
                      type: p.type,
                      data: p.data
                    };
                  });

                  compileFeed(plugins, response);
                  resolve({ handled: true });
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

exports.fetchFeeds = function(userId, response) {
  return new Promise( (resolve, reject) => {
    pg.pool().connect((err, client, done) => {
      if(err) {
        reject(responses.internalError("Failed to load feed names"));
      } else {
        client.query('SELECT name FROM feeds WHERE user_id = $1', [userId], (err, res) => {
          if(err) {
            done();
            reject(responses.internalError("Failed to load feed names"));
          } else {
            response.writeHead(200);
            response.write(JSON.stringify(res.rows));
            response.end();
            resolve({ handled: true});
          }
        });
      }
    });

  });
};

//TODO: decide how to handle multiple plugins of the same type
exports.addPlugin = function(userId, feedName, data) {
  return new Promise( (resolve, reject) => {
    try {
      data = JSON.parse(data);
    } catch(e) {
      reject(responses.badRequest("Bad request data in adding plugin"));
    }

    if(!plugin.validPluginType(data.type)) {
      reject(responses.badRequest("Invalid plugin type '" + data.type + "'"));
    }

    pg.pool().connect((err, client, done) => {
      client.query('SELECT id FROM feeds WHERE user_id = $1 AND name = $2', [userId, feedName], (err, res) => {
        if(err) {
          done();
          reject(responses.internalError("Failed to add plugin"));
        } else {
          if(res.rowCount) {
            const feedId = res.rows[0].id,
                  type = data.type,
                  info = data.data;

            client.query('INSERT INTO plugins VALUES (DEFAULT, $1, $2, $3)', [feedId, type, info], (_err) => {
              done();

              if(_err) {
                reject(responses.internalError("Failed to add plugin"));
              } else {
                resolve({ data: {}});
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

exports.removePlugin = function() {

};

exports.init = function(_pg) {
  pg = _pg;

  plugin.init();
};
