const fs = require('fs'),
      responses = require('./responses');

function Plugin(r, p) {
  this.request = r;
  this.parse = p;
}
exports.Plugin = Plugin;

var plugins = {};
exports.installedPlugins = plugins;

exports.init = function() {
  fs.readdir('./plugins/', (err, files) => {
    files.forEach((p) => {
      const filename = p,
            proto = require('./plugins/' + filename);

      plugins[proto.type.trim()] = new Plugin(proto.request, proto.parse);
    });
  });
};

exports.validPluginType = function(type) {
  return plugins.hasOwnProperty(type);
};

//TEMP: 
exports.getEntries = (type, data) => {
  return new Promise((resolve, reject) => {
    if (plugins.hasOwnProperty(type)) {
      const plg = plugins[type];

      plg.request(data).then((response) => {
        plg.parse(response).then((entries) => {
          resolve(entries);
        }, (err) => {
          reject(responses.conflict("Failed to parse plugin: " + (data.url || type) + ", error: " + err));
        });
      }, (err) => {
        reject(responses.notFound("Failed to connect to plugin: " + (data.url || type)));
      });

    } else {
      reject(responses.conflict('Given plugin type is not supported'));
    }
  });
};
