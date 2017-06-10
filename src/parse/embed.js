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