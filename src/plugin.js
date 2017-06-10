const fs = require('fs'),
      responses = require('./responses'),
      url = require('url');

function Plugin(proto) {
  this.request = proto.request;
  this.parse = proto.parse;
  this.options = proto.options;
  this.BASE_URL = proto.BASE_URL;
}
exports.Plugin = Plugin;

var PLUGINS = {};
exports.installedPlugins = PLUGINS;

var pg;

exports.init = function(_pg) {
  pg = _pg;

  fs.readdir('./plugins/', (err, files) => {
    files.forEach((p) => {
      const filename = p,
            proto = require('./plugins/' + filename),
            type = proto.type.trim();

      PLUGINS[type] = new Plugin(proto);
    });
  });
};

const absolutePathCheck = new RegExp('^(?:[a-z]+:)?//', 'i');

exports.validPluginType = type => PLUGINS.hasOwnProperty(type);

exports.validPlugin = plugin => new Promise((resolve, reject) => {

  if (typeof plugin !== 'object') {
    reject('request data must be an object');
  } else if (typeof plugin.data !== 'object') {
    reject('request must contain an object: "data"');

  } else if (typeof plugin.priority !== 'number' || isNaN(plugin.priority) || plugin.priority < 0 || plugin.priority > 1) {
    reject('request must contain number "priority" in range [0,1]');
  } else if (typeof plugin.type !== 'string' || !PLUGINS.hasOwnProperty(plugin.type)) {
    reject('request must contain a valid plugin "type"');
  } else {

    const plg = PLUGINS[plugin.type],
        options = plg.options;

    for (let i = 0; i < options.length; i++) {
      const option = options[i];

      if (plugin.data.hasOwnProperty(option.key)) {
        if (!plugin.data[option.key].match(option.regex)) {
          return reject('request data value "' + option.key + '" is invalid');
        }
      } else if (option.default !== undefined) {
        plugin.data[option.key] = option.default;
      } else {
        return reject('request is missing "' + option.key + '" in "data"');
      }
    }

    resolve();
  }
});

exports.fetchPlugin = _plugin => new Promise((resolve, reject) => {
  const { type, data, offset, amount, id } = _plugin;

  const plg = PLUGINS[type];
  if (!plg) {
    return reject('Invalid plugin type: ' + type);
  }

  plg.request(data, offset, amount)
  .catch(err => {
    console.log(err);
    throw 'Failed to fetch plugin source';
  })
  .then(plg.parse)
  .catch(err => {
    console.log(err);
    throw 'Failed to parse plugin';
  })
  .then(_entries => processEntries(_plugin, plg, _entries))
  .then(entries => resolve(entries))
  .catch(err => {
    if (typeof err !== 'string') {
      console.log(err);
      err = 'Uncaught error';
    }
    err = { err };
    err.id = id;
    resolve(err);
  });
});

const processEntries = ({ type, id, normalPriority, offset }, plg, entries) => Promise.resolve(entries.map((entryData, index) => {
  const realIndex = offset + index;

  entryData.pluginId = id;
  entryData.plugin = type;
  entryData.pluginURL = plg.BASE_URL;
  entryData.id = `${realIndex}:${entryData.id}:${id}`;
  entryData.priority = realIndex * normalPriority;

  // Assert that data has a valid rating and commentAmount
  if (isNaN(entryData.rating)) {
    entryData.rating = 0;
  }
  if (isNaN(entryData.commentAmount)) {
    entryData.commentAmount = 0;
  }
  if (isNaN(entryData.date)) {
    entryData.date = undefined;
  }

  // Assert that thumbnail is a valid image
  if (entryData.thumbnailURL === undefined && entryData.mediaType === "image") {
    entryData.thumbnailURL = entryData.imageURL;
  } else if (entryData.thumbnailURL !== undefined && 
      entryData.thumbnailURL.match(/\.(jpeg|jpg|gif|png)$/) === null) {
    entryData.thumbnailURL = undefined;
  }

  // If a link is a relative path, prefix it with the domain
  ['authorURL', 'link', 'commentURL', 'categoryURL'].forEach(link => {
    if (entryData[link] !== undefined && !absolutePathCheck.test(entryData[link])) {
      entryData[link] = url.resolve(plg.BASE_URL, entryData[link]);
    }
  });

  return entryData;
}));