// TODO:
// https://github.com/reddit/reddit/wiki/OAuth2
// https://github.com/reddit/reddit/wiki/API

const request = require('request-promise-native'),
      cheerio = require('cheerio');

exports.BASE_URL = 'https://www.reddit.com/';

exports.type = 'reddit';

exports.options = [
  { key: 'subreddit', regex: /^[_A-Za-z0-9]{1,21}$/, default: '' },
];

exports.request = (data, offset, amount) => {

  const subpath = data.subreddit ? 'r/' + data.subreddit : '', 
        uri = `${exports.BASE_URL}${subpath}.json?count=${offset}&limit=${amount}`;

  return request({ 
    uri, 
    json: true,
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
    authorURL: 'u/' + author,
  }))
);