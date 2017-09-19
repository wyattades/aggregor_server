const fs = require('fs'),
      responses = require('./responses'),
      url = require('url');

function Plugin(proto) {
  this.type = proto.type;
  this.label = proto.label;
  this.request = proto.request;
  this.parse = proto.parse;
  this.options = proto.options;
  this.BASE_URL = proto.BASE_URL;
}
exports.Plugin = Plugin;

var PLUGINS = {};
var RETURN_PLUGINS = {};
exports.installedPlugins = PLUGINS;
exports.availablePlugins = RETURN_PLUGINS;

var pg;

exports.init = function(_pg) {
  pg = _pg;

  fs.readdir('./plugins/', (err, files) => {
    files.forEach(filename => {
      const proto = require('./plugins/' + filename),
            type = filename.replace('.js', '');

      proto.type = type;

      PLUGINS[type] = new Plugin(proto);
      RETURN_PLUGINS[type] = {
        type: proto.type,
        label: proto.label,
        options: proto.options.map(option => { // convert RegExp values to strings
          return Object.assign({}, option, {
            regex: option.regex.source,
          });
        }),
        icon: proto.icon,
        iconFamily: proto.iconFamily,
        color: proto.color,
      };
    });
  });
};

const absolutePathCheck = new RegExp('^(?:[a-z]+:)?//', 'i');

exports.validPluginType = type => PLUGINS.hasOwnProperty(type);

exports.validPlugin = _plugin => new Promise((resolve, reject) => {

  const plg = PLUGINS[_plugin.type],
      options = plg.options;

  for (let i = 0; i < options.length; i++) {
    const option = options[i];

    const prop = _plugin.data[option.key];
    if (typeof prop === 'string' && prop.length > 0) {
      if (!_plugin.data[option.key].match(option.regex)) {
        return reject('Invalid value: ' + option.key);
      }
    } else if (option.default !== undefined) {
      _plugin.data[option.key] = option.default;
    } else {
      return reject('Required value: ' + option.key);
    }
  }

  resolve();

});

exports.fetchPlugin = _plugin => new Promise((resolve, reject) => {
  const { type, data, last_entry, amount, id } = _plugin;

  const plg = PLUGINS[type];
  if (!plg) {
    return reject('Invalid plugin type: ' + type);
  }

  plg.request(_plugin, amount).catch(err => {
    throw new Error('Request Failed: ' + (typeof err === 'string' ? err : 'Unknown error'));
  })
  .then(res => plg.parse(res).catch(err => {
    throw new Error('Parse Failed: ' + (typeof err === 'string' ? err : 'Unknown error'));
  }))
  .then(_entries => processEntries(_plugin, plg, _entries))
  .then(entries => {

    if (entries.length === 0) {
      throw new Error('Parse Failed: Found no entries on this page');
    }

    resolve(entries);
  })
  .catch(err => resolve({ err: err.message, id }));
});

const processEntries = ({ type, id, normalPriority, last_entry: { offset } }, plg, entries) => Promise.resolve(entries.map((entryData, index) => {
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