const request = require('request'),
      url = require('url');

// NOTE: in progress

/*
    Checkout Noembed [https://noembed.com/], a free and opensource embeding service.
    Unless we want to write an embeding service ourselves!

    this might be moved to the client
*/

const EMBED_SERVICE = 'http://noembed.com/embed?url='; // NOTE: Use https if our website is also https

module.exports = (url) => {
    return new Promise((resolve) => {

        const options = {
            url: EMBED_SERVICE + encodeURIComponent(url),
            json: true
        };

        request(options, function(error, response, body){
            if (error || response.statusCode !== 200) {
                resolve({
                    url: url
                });
            } else {
                resolve(body);
            }
        });

    });
};

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