require('dotenv').config();
require('module-alias/register');

const fs = require('graceful-fs');
const path = require('path');
const replaceall = require('replaceall');

const crawler = require('lib/crawler');

let pagesTotal = 0;
let pagesSinceStart = 0;

const filesDir = path.join(__dirname, './files');
const wikiPath = path.join(filesDir, '/wikidump.txt');
const urlPath = path.join(filesDir, '/urldump.txt');

require('lib/init')(function (err) {
    if (err) {
        // Der skete en fejl ved initialiseringen af programmet
        throw err;
    }

    if (crawler.options.skipDuplicates && fs.existsSync(urlPath)) {
        const urls = fs.readFileSync(urlPath, 'utf8').split('\n');

        // -1 fordi jeg vil ikke have den sidste linje med da den er tom
        for (let i = 0; i < urls.length - 1; i++) {
            const url = urls[i];
            crawler.seen.exists({ uri: url });
        }

        pagesTotal += urls.length - 1;
    }

    // Sæt callback funktion
    crawler.options.callback = pageResult;

    // Start crawl...
    if (process.env.WIKI_PAGE) {
        // ...fra en wiki side
        const added = crawler.queue(process.env.WIKI_PAGE);
        if (added) {
            return;
        }
    }

    // ...fra startsiden
    crawler.queue(process.env.WIKI_HOST);
});

/**
 * Funktion som bliver kaldt når man har fået respons fra en request
 * @param {Error} err Fejlen hvis der er sket nogen
 * @param {Object} res Resultatet fra requesten
 * @param {Function} done Funktion som skal kaldes når man er færdig
 */
function pageResult (err, res, done) {
    // Hvis der er sket en fejl, eller vi har forladt wiki som vi vil crawl, så ignorer resultatet
    if (err || process.env.WIKI_HOST.indexOf(res.request.uri.host) === -1) {
        done();
        return;
    }

    pagesTotal++;
    pagesSinceStart++;

    const $ = res.$;
    // eslint-disable-next-line no-console
    console.log($('title').text(), pagesTotal, pagesSinceStart);

    // Gå igennem alle a elementer på siden
    $('a').each(function () {
        // Få linket
        const link = $(this).attr('href');
        // Tjek om det er et link vi gider at følge
        if (link && link.startsWith('/wiki/') && link.indexOf(':') === -1) {
            // Tilføj wiki side til køen
            crawler.queue(link);
        }
    });

    let wikiText = '';

    // Gå igennem alle p elementer som er en del af wiki teksten
    $('.mw-parser-output').children('p').each(function () {
        // Tjek om elementet indeholder matematik
        if ($(this).children('.mwe-math-element').length !== 0) {
            // Springer matematik elementer over
            return;
        }

        let text = $(this).text().trim();

        // Fjern referencer
        $(this).children('.reference').each(function () {
            text = text.replace($(this).text(), '');
        });

        // Lav alt tekst lowercase
        text = text.toLowerCase();

        // Fjern bindestreger som står for sig selv, erstat bindestreg med understreg
        text = replaceall(' -', ' ', text);
        text = replaceall('- ', ' ', text);
        text = replaceall('-', '_', text);

        // Fjern tegn som ikke indgår i alfabetet og ikke er tal
        text = text.split('').filter(function (value) {
            return 'abcdefghijklmnopqrstuvwxyzæøå0123456789_ '.split('').indexOf(value) !== -1;
        }).join('');

        // Fjern tekst med tal hvor understreger ikke indgår (bevar kun tal fra links)
        text = text.split(' ').filter(function (value) {
            if (!/\d/.test(value)) {
                // Behold strenge som ikke indeholder tal
                return true;
            }

            if (value.indexOf('_') === -1) {
                // Behold ikke strenge som indeholder tal, men ikke indeholder en understreg
                return false;
            }

            const numCount = value.replace(/[^0-9]/g, '').length;
            const underscoreCount = value.replace(/[^_]/g, '').length;

            // Behold ikke tekst hvis det kun er tal og understreger
            return numCount + underscoreCount !== value.length;
        }).join(' ');

        // Fjerner mellemrum hvis der er for mange
        text = text.replace(/\s+/g, ' ').trim();

        // Fikser også et problem med " _ " i teksten som kan ske i nogle tilfælde
        text = replaceall(' _ ', ' ', text);

        // Hvis dette ikke er starten på en tekst, så tilføj et mellemrum
        if (wikiText !== '') {
            text = ' ' + text;
        }

        // Læg teksten fra det enkelte tekst afsnit ind i teksten for hele siden
        wikiText += text;
    });

    done();

    fs.appendFileSync(urlPath, res.request.uri.href + '\n');
    fs.appendFileSync(wikiPath, wikiText);
}
