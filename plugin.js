const fs = require('fs');

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
  return !!plugins[type];
};
