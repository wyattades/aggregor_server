// https://github.com/reddit/reddit/wiki/OAuth2
// https://github.com/reddit/reddit/wiki/API

// const https = require('https'),
//       FeedParser = require('feedparser'),
//       stream = require('stream');
const request = require('request-promise-native'),
      cheerio = require('cheerio'),
      parser = require('../parse/rawPlugins')['www.reddit.com']; //TEMP

// TODO: load json instead
exports.BASE_URL = 'https://www.reddit.com/';

exports.type = 'reddit';

exports.options = [
  { key: 'subreddit', regex: /^[_A-Za-z0-9]{1,21}$/, default: '' },
];

exports.request = (data, offset, amount) => {

  const subpath = data.subreddit ? 'r/' + data.subreddit : '', 
        uri = `${exports.BASE_URL}${subpath}?count=${offset}&limit=${amount}`;

  return request({ 
    uri, 
    transform: cheerio.load
  });
};

exports.parse = $ => parser.crawl($)
  .then(entries => {

    // I have to do this because entries.map returns cheerio object
    let promises = [];
    for (let i = 0; i < entries.length; i++) {
      promises.push(parser.parseEntry($(entries[i])));
    }

    return Promise.all(promises);
  });

// exports.request = function(data) {
//   let subreddits = data.subreddits,
//       pt = stream.PassThrough();

//   const uri = ROOT_URI + subreddits.join('+') + '.rss';

//   https.get(uri, (res) => {
//     res.pipe(pt);
//   }).on('error', () => {
//     pt.end();
//   });

//   return pt;
// };

// exports.parse = function() {
//   return new FeedParser();
// };
