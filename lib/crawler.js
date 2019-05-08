const Crawler = require('crawler');
const isUrl = require('is-url');

const crawler = new Crawler({
    maxConnections: parseInt(process.env.MAX_CONNECTIONS),
    skipDuplicates: true,
    retries: Infinity,
    debug: false
});

const queue = Crawler.prototype.queue;

// Overskriver queue funktionen for at man ikke behøves at skrive host name
crawler.queue = function (url) {
    if (typeof url !== 'string') {
        // Undgå fejl ved manglende links
        return;
    }

    if (!isUrl(url)) {
        if (!url.startsWith('/')) {
            url = '/' + url;
        }

        url = process.env.WIKI_HOST + url;
    }

    this.options.skipDuplicates = false;
    const seen = crawler.seen.exists({ uri: url });
    if (!seen) {
        queue.call(this, url);
    }
    this.options.skipDuplicates = true;
    return !seen;
};

if (process.env.PROXY_URL) {
    // Tilføj proxy for at kunne sende flere requests uden at blive rate limited
    crawler.on('schedule', function (options) {
        options.proxy = process.env.PROXY_URL;
    });
}

module.exports = crawler;
