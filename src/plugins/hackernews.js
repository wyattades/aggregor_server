// https://github.com/HackerNews/API

const request = require('request-promise-native'),
      cheerio = require('cheerio'),
      parser = require('../parse/rawPlugins')['news.ycombinator.com']; //TEMP

exports.BASE_URL = 'https://news.ycombinator.com/';

const AMOUNT_PER_PAGE = 30;

exports.type = 'hackernews';

exports.options = [];

exports.request = (data, offset, amount) => {

  const sliceBegin = offset % AMOUNT_PER_PAGE,
        sliceEnd = sliceBegin + amount;

  const page = Math.floor(offset / AMOUNT_PER_PAGE),
        page2 = Math.floor((offset + amount) / AMOUNT_PER_PAGE);

  if (page === page2) {
    return requestPage(page)
    .then(parse)
    .then(entries => 
    Promise.resolve(entries.slice(sliceBegin, sliceEnd)));
  } else {
    return requestPage(page)
    .then(parse)
    .then(entries => requestPage(page)
      .then(parse)
      .then(entries2 => 
      Promise.resolve(entries.concat(entries2).slice(sliceBegin, sliceEnd)))
    );
  }
};

exports.parse = x => x;

const parse = $ => parser.crawl($)
  .then(entries => {

    // I have to do this because entries.map returns cheerio object
    let promises = [];
    for (let i = 0; i < entries.length; i++) {
      promises.push(parser.parseEntry($(entries[i])));
    }

    return Promise.all(promises);
  });

// TEMP???
const requestPage = (page) => {
  const uri = `${exports.BASE_URL}?p=${page}`;

  return request({ 
    uri,
    transform: cheerio.load,
  });
};