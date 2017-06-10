const request = require('request'),
  cheerio = require('cheerio'),
  url = require('url');

const absolutePathCheck = new RegExp('^(?:[a-z]+:)?//', 'i');

exports.type = 'raw';

exports.options = [];

// TODO: we should be piping to the response but Idk how to do that yet

exports.request = function (data, offset, amount) {
  return new Promise((resolve, reject) => {
    // let reqUrl = data.url;

    // try {
    //   if (!url.parse(reqUrl).protocol)
    //     reqUrl = 'http://' + reqUrl;
    // } catch (e) {
    //   return reject('Missing or invalid url in data object');
    // }

    // const urlData = url.parse(reqUrl);
    // if (!urlData.hostname) {
    //   return reject('Missing or invalid url in data object');
    // }

    // request(reqUrl, (error, response, body) => {
    //   if (error || response.statusCode !== 200) {
    //     reject(error || 'Unknown plugin request error');
    //   } else {
    //     resolve({
    //       urlData,
    //       body,
    //       plugin: data
    //     });
    //   }
    // });
    reject('plugin type "raw" is currently usupported');

  });
};

exports.parse = (data, pluginId) => new Promise((resolve, reject) => {
  reject('unsupported');
  // const baseUrl = 'http://' + data.urlData.hostname + '/',
  //   path = data.urlData.pathname,
  //   hostname = data.urlData.hostname;

  // if (parsers.hasOwnProperty(hostname)) {

  //   const parser = parsers[hostname];
  //   let $ = cheerio.load(data.body);

  //   let sumRatings = 0;

  //   parser
  //   .crawl($)
  //   .then((entries) => Promise.all(
  //     entries.toArray().map((entry, index) => {
  //       return parser
  //       .parseEntry($, entry)
  //       .then(determineMedia)
  //       .then((entryData) => {

  //         // Assert that data has a valid rating and commentAmount
  //         if (typeof entryData.rating !== "number" || isNaN(entryData.rating)) {
  //           entryData.rating = 0;
  //         }
  //         if (typeof entryData.commentAmount !== "number" || isNaN(entryData.commentAmount)) {
  //           entryData.commentAmount = 0;
  //         }

  //         // Assert that thumbnail is a valid image
  //         if (entryData.thumbnailURL === undefined && entryData.mediaType === "image") {
  //           entryData.thumbnailURL = entryData.imageURL;
  //         } else if (entryData.thumbnailURL !== undefined && 
  //             entryData.thumbnailURL.match(/\.(jpeg|jpg|gif|png)$/) === null) {
  //           entryData.thumbnailURL = undefined;
  //         }

  //         sumRatings += entryData.rating;

  //         // If a link  is a relative path, prefix it with the domain
  //         ['authorURL', 'link', 'commentURL', 'categoryURL'].forEach(function (link) {
  //           if (entryData[link] !== undefined && !absolutePathCheck.test(entryData[link])) {
  //             entryData[link] = url.resolve(baseUrl, entryData[link]);
  //           }
  //         });

  //         entryData.pluginPriority = data.plugin.priority || 0;
  //         entryData.pluginId = pluginId;
  //         entryData.id = index + ':' + pluginId;
  //         entryData.plugin = parser.label + path;
  //         entryData.votable = parser.votable;
  //         return Promise.resolve(entryData);
  //       });
  //     })
  //   ))
  //   .then((entries) => {
  //     const inverseAvg = entries.length / sumRatings;

  //     for (let entryData of entries) {
  //       entryData.priority = entryData.rating * inverseAvg;
  //     }
  //     resolve(entries);
  //   })
  //   .then(resolve, reject);

  // } else {
  //   reject('Given plugin does not have a supported parser');
  // }
});


// TODO: use Noembed (in embed.js (or put in client??))
const determineMedia = (data) => {
  return new Promise((resolve) => {

  if (data.imageURL === undefined) {
    return resolve(data);
  }

  if (data.imageURL.match(/\.(jpeg|jpg|gif|png)$/) !== null) {
    data.mediaType = "image";
    return resolve(data);
  }

  if (data.imageURL.match(/\.gifv$/) !== null) {
    data.mediaType = "gifv";
    data.imageURL = data.imageURL.replace(".gifv", ".mp4");
    return resolve(data);
  }

  const split = data.imageURL.replace(/(https?:\/\/)/, "").split('/');

  if (split[0] === "imgur.com") {
    if (split.length > 2) {

      if (split[1] === "gallery") {
        data.mediaType = "gallery";
        return resolve(data);
      }

      data.imageURL = undefined;
      return resolve(data);

    }

    data.imageURL = "https://i.imgur.com/" + split[1] + ".jpg";
    data.mediaType = "image";
    return resolve(data);
  }

  if (split[0] === "i.reddituploads.com") {
    data.imageURL += ".jpg";
    data.mediaType = "image";
    return resolve(data);
  }

  if (split[0] === "www.youtube.com") {
    data.mediaType = "youtube";
    data.imageURL = "https://www.youtube.com/embed/" + getYoutubeId(data.imageURL);
    return resolve(data);
  }

  data.imageURL = undefined;
  resolve(data);
  });
};

const getYoutubeId = (url) => {
  let ID = '';
  url = url.replace(/(>|<)/gi, '').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);

  if (url[2] !== undefined) {
    ID = url[2].split(/[^0-9a-z_\-]/i);
    ID = ID[0];
  } else {
    ID = url;
  }
  return ID;
};