require('dotenv').config();
require('module-alias/register');

const crawler = require('lib/crawler');

let pages = 0;

require('lib/init')(function (err) {
    if (err) {
        // Der skete en fejl ved initialiseringen af programmet
        throw err;
    }

    // Sæt callback funktion
    crawler.options.callback = pageResult;

    // Start crawl
    crawler.queue('/wiki/Liberalisme');
});

/**
 * Funktion som bliver kaldt når man har fået respons fra en request
 * @param {Error} err Fejlen hvis der er sket nogen
 * @param {Object} res Resultatet fra requesten
 * @param {Function} done Funktion som skal kaldes når man er færdig
 */
function pageResult (err, res, done) {
    if (err) {
        done();
        return;
    }

    pages++;

    const $ = res.$;
    // eslint-disable-next-line no-console
    console.log($('title').text(), pages);

    // Gå igennem alle a elementer i body'en af siden
    $('#bodyContent a').each(function () {
        // Få linket
        const link = $(this).attr('href');
        // Tjek om det er et link vi gider at følge
        if (link && link.startsWith('/wiki/') && link.indexOf('.') === -1 && link.indexOf(':') === -1) {
            // Tilføj wiki side til køen
            crawler.queue(link);
        }
    });

    done();
}
