const https = require('https'),
      FeedParser = require('feedparser'),
      stream = require('stream');

const ROOT_URI = 'https://www.reddit.com/r/';

exports.type = 'reddit';

exports.request = function(data) {
  let subreddits = data.subreddits,
      pt = stream.PassThrough();

  const uri = ROOT_URI + subreddits.join('+') + '.rss';

  https.get(uri, (res) => {
    res.pipe(pt);
  }).on('error', () => {
    pt.end();
  });

  return pt;
};

exports.parse = function() {
  return new FeedParser();
};
