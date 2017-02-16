const request = require('request'),
  cheerio = require('cheerio'),
  url = require('url'),
  parsers = require('../parse/rawPlugins');

const absolutePathCheck = new RegExp('^(?:[a-z]+:)?//', 'i');

exports.type = 'raw';

// TODO: we should be piping to the response but Idk how to do that yet

exports.request = function (data) {
  return new Promise((resolve, reject) => {
    let reqUrl = data.url;

    try {
      if (!url.parse(reqUrl).protocol)
        reqUrl = 'http://' + reqUrl;
    } catch (e) {
      return reject('Missing or invalid url in data object');
    }

    const urlData = url.parse(reqUrl);
    if (!urlData.hostname) {
      return reject('Missing or invalid url in data object');
    }

    request(reqUrl, (error, response, body) => {
      if (error || response.statusCode !== 200) {
        reject(error || 'Unknown plugin request error');
      } else {
        resolve({
          urlData,
          body
        });
      }
    });

  });
};

exports.parse = function (data) {
  return new Promise((resolve, reject) => {
    const baseUrl = 'http://' + data.urlData.hostname + '/',
      path = data.urlData.pathname,
      hostname = data.urlData.hostname;

    if (parsers.hasOwnProperty(hostname)) {

      const parser = parsers[hostname];
      let $ = cheerio.load(data.body);

      parser
      .crawl($)
      .then((entries) => {

        return Promise.all(
          entries.toArray().map((entry, index) => {
            return parser
            .parseEntry($, entry)
            .then(determineMedia)
            .then((entryData) => {

              // If a link  is a relative path, prefix it with the domain
              ['authorURL', 'link', 'commentURL', 'categoryURL'].forEach(function (link) {
                if (entryData[link] !== undefined && !absolutePathCheck.test(entryData[link])) {
                  entryData[link] = url.resolve(baseUrl, entryData[link]);
                }
              });

              entryData.id = index;
              entryData.feed = parser.label + path;
              entryData.feedURL = baseUrl;
              entryData.canDownvote = parser.canDownvote;
              return Promise.resolve(entryData);
            })
            .then(validateData);
          })
        );
      })
      .then(resolve, reject);

    } else {
      reject('Given feed does not have a supported parser');
    }
  });
};

// TODO: Rename this to something that makes sense
const validateData = (data) => {
  return new Promise((resolve) => {
    // Assert that data has a valid rating and commentAmount
    if (typeof data.rating !== "number" || isNaN(data.rating)) {
      data.rating = 0;
    }
    if (typeof data.commentAmount !== "number" || isNaN(data.commentAmount)) {
      data.commentAmount = 0;
    }

    // Assert that thumbnail is a valid image
    if (data.thumbnailURL === undefined && data.mediaType === "image") {
      data.thumbnailURL = data.imageURL;
    } else if (data.thumbnailURL !== undefined && data.thumbnailURL.match(/\.(jpeg|jpg|gif|png)$/) === null) {
      data.thumbnailURL = undefined;
    }

    resolve(data);
  });
};

// TODO: use Noembed (in embed.js)
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