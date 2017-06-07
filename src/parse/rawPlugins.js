var fs = require('fs'),
timeFormat = require('./timeFormat');

module.exports = {
  
  "news.ycombinator.com": {
    
    label: "hackernews",
    
    // votable: "up",
    
    maxAmount: 30,
    
    crawl: $ => new Promise((resolve, reject) => {
      const home = $('table.itemlist').first();
      let entries = home.find("tr.athing");
      if (entries.length === 0) {
        reject("No entries found on page");
      } else {
        resolve(entries);
      }
    }),
    
    parseEntry: element => new Promise((resolve, reject) => {
      
      const topline = element.children().eq(2).children();
      const bottomline = element.next().children("td.subtext").children();
      const category = topline.eq(1).children("a");
      const titleElement = topline.first();
      const commentElement = bottomline.last();
      const authorElement = bottomline.eq(1);
      
      const data = {
        title: titleElement.text(),
        link: titleElement.attr("href"),
        category: category.children().first().text(),
        categoryURL: category.attr("href"),
        commentAmount: parseInt(commentElement.text().split(" ")[0]),
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
    })
  },
  
  "www.reddit.com": {
    
    label: "reddit",
    
    // votable: "both",
    
    maxAmount: 25,
    
    crawl: $ => new Promise((resolve, reject) => {
      const home = $('#siteTable').first();
      let entries = home.children(".thing");
      if (entries.length === 0) {
        reject("No entries found on page");
      } else {
        resolve(entries);
      }
    }),
    
    parseEntry: element => new Promise((resolve, reject) => {
      
      const commentElement = element.find(".first").children().first();
      const categoryName = "r/" + element.attr("data-subreddit");
      const authorName = element.attr("data-author");
      const titleElement = element.find("a.title").first();
      
      const data = {
        // TODO: title is wrong for certain subreddits (e.g. r/asoiaf)
        title: titleElement.text(),
        link: titleElement.attr("href"),
        author: authorName,
        authorURL: "u/" + authorName,
        category: categoryName,
        categoryURL: categoryName,
        commentURL: commentElement.attr("href"),
        commentAmount: parseInt(commentElement.text().split(" ")[0]),
        thumbnailURL: element.find(".thumbnail").children().attr("src"),
        imageURL: element.attr("data-url"),
        date: parseInt(element.attr("data-timestamp")),
        // rating: element.find(".score").eq(2).text()
      };
      
      const split = data.rating.split('k');
      if (split.length === 1) {
        data.rating = parseInt(split[0], 10);
      } else if (split.length === 2) {
        data.rating = parseInt(split[0], 10) * 1000;
      } else {
        data.rating = NaN;
      }
      
      if (data.thumbnailURL) {
        data.thumbnailURL = data.thumbnailURL.replace(/^(\/\/)/, 'http://');
      }
      
      resolve(data);
    })
  }
};