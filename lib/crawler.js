const Crawler = require('crawler');
const isUrl = require('is-url');

const base = 'https://da.wikipedia.org';

const crawler = new Crawler({
    maxConnections: 100,
    skipDuplicates: true,
    debug: false
});

const queue = Crawler.prototype.queue;

// Overskriv queue funktionen for at man ikke behøves at skrive host name
crawler.queue = function (url) {
    if (typeof url !== 'string') {
        // Undgå fejl ved manglende links
        return;
    }

    if (isUrl(url)) {
        return queue.call(this, url);
    }

    if (!url.startsWith('/')) {
        url = '/' + url;
    } else {
        url = base + url;
    }

    return queue.call(this, url);
};

if (process.env.PROXY_URL) {
    // Tilføj proxy for at kunne sende flere requests uden at blive rate limited
    crawler.on('schedule', function (options) {
        options.proxy = process.env.PROXY_URL;
    });
}

module.exports = crawler;
