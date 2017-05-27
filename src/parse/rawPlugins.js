module.exports = {

    "news.ycombinator.com": {

        label: "hackernews",

        votable: "up",

        crawl: ($, body) => {
            return new Promise((resolve, reject) => {
                let entries = $('body').find("tr.athing");
                if (entries.length === 0) {
                    reject("Failed to parse given plugin");
                } else {
                    resolve(entries);
                }
            });
        },

        parseEntry: ($, el) => {
            return new Promise((resolve) => {

                const topline = $(el).children().eq(2).children();
                const bottomline = $(el).next().children("td.subtext").children();
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
                    date: bottomline.eq(2).children("a").text(),
                    rating: parseInt(bottomline.first().text().split(" ")[0])
                };

                resolve(data);
            });
        }
    },

    "www.reddit.com": {

        label: "reddit",

        votable: "both",

        crawl: ($) => {
            return new Promise((resolve, reject) => {
                let entries = $('body').find("#siteTable").children(".thing");
                if (entries.length === 0) {
                    reject("Failed to parse given plugin");
                } else {
                    resolve(entries);
                }
            });
        },

        parseEntry: ($, el) => {
            return new Promise((resolve) => {

                const commentElement = $(el).find(".first").children().first();
                const categoryName = "r/" + $(el).attr("data-subreddit");
                const authorName = $(el).attr("data-author");
                const titleElement = $(el).find("a.title").first();

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
                    thumbnailURL: $(el).find(".thumbnail").children().attr("src"),
                    imageURL: $(el).attr("data-url"),
                    date: parseInt($(el).attr("data-timestamp")),
                    rating: $(el).find(".score").eq(2).text()
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
            });
        }
    }
};