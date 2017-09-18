// TODO:
// https://github.com/reddit/reddit/wiki/OAuth2
// https://github.com/reddit/reddit/wiki/API

const request = require('request-promise-native');

exports.BASE_URL = 'https://www.reddit.com/';

exports.label = 'Reddit';

exports.options = [
  { key: 'subreddit', label: 'Subreddit', prefix: 'r/', regex: /^[_A-Za-z0-9]{1,21}$/, default: '' },
];

exports.icon = 'reddit';
exports.iconFamily = 'FontAwesome';
exports.color = '#149EF0';

exports.request = (data, { id }, amount) => {

  const hasSubreddit = typeof data.subreddit === 'string' && data.subreddit.length > 0,
        subpath = hasSubreddit ? ('r/' + data.subreddit) : '', 
        uri = `${exports.BASE_URL}${subpath}.json?after=${id}&limit=${amount}`;

  return request({ 
    uri, 
    json: true,
    resolveWithFullResponse: true,
  })
  .then(res => {
    if (hasSubreddit && !res.request.uri.pathname.startsWith('/r/')) {
      throw 'Invalid subreddit';
    }
    return res.body;
  });
};

exports.parse = body => Promise.resolve(body.data.children.map(
  ({ data: { id, title, subreddit_name_prefixed, author, url, permalink, num_comments, thumbnail, created_utc } }) => ({
    id,
    title,
    author,
    category: subreddit_name_prefixed,
    categoryURL: subreddit_name_prefixed,
    link: url,
    commentAmount: num_comments,
    commentURL: permalink,
    thumbnailURL: thumbnail,
    date: !isNaN(created_utc) ? created_utc * 1000 : undefined,
    authorURL: `u/${author}`,
  }))
);