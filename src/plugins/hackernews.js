// TODO
// https://github.com/HackerNews/API I think best api version is v2???

const request = require('request-promise-native'),
      cheerio = require('cheerio'),
      timeFormat = require('../parse/timeFormat');

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

const parse = $ => crawl($)
  .then(entries => {

    // I have to do this because entries.map returns cheerio object
    let promises = [];
    for (let i = 0; i < entries.length; i++) {
      promises.push(parseEntry($(entries[i])));
    }

    return Promise.all(promises);
  });

const requestPage = (page) => {
  const uri = `${exports.BASE_URL}?p=${page}`;

  return request({ 
    uri,
    transform: cheerio.load,
  });
};

const crawl = $ => new Promise((resolve, reject) => {
  const home = $('table.itemlist').first();
  let entries = home.find("tr.athing");
  if (entries.length === 0) {
    reject("No entries found on page");
  } else {
    resolve(entries);
  }
});
    
const parseEntry = element => new Promise((resolve, reject) => {
  
  const topline = element.children().eq(2).children();
  const bottomline = element.next().children("td.subtext").children();
  const category = topline.eq(1).children("a");
  const titleElement = topline.first();
  const commentElement = bottomline.last();
  const commentText = commentElement.text();
  const authorElement = bottomline.eq(1);

  const data = {
    id: element.attr('id'),
    title: titleElement.text(),
    link: titleElement.attr("href"),
    category: category.children().first().text(),
    categoryURL: category.attr("href"),
    commentAmount: commentText ? parseInt(commentText.split(" ")[0]) : 0,
    commentURL: commentElement.attr("href"),
    author: authorElement.text(),
    authorURL: authorElement.attr("href"),
    date: bottomline.eq(2).children("a").first().text(),
    // rating: parseInt(bottomline.first().text().split(" ")[0])
  };
  
  timeFormat(data.date).then(time => {
    data.date = time;
    resolve(data);
  }, () => {
    data.date = undefined;
    resolve(data);
  });
});