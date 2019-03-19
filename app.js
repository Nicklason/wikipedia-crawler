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

    // Start crawl...
    if (process.env.WIKI_PAGE) {
        // ...fra en wiki side
        crawler.queue(process.env.WIKI_PAGE);
    } else {
        // ...fra startsiden
        crawler.queue(process.env.WIKI_HOST);
    }
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

    pages++;

    const $ = res.$;
    // eslint-disable-next-line no-console
    console.log($('title').text(), pages);

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

        // Lav teksten fra links til andre wiki sider om til "et ord", hjælper med f.eks. navne
        $(this).children('a').not('.new').each(function () {
            // console.log($(this).attr('href'));
            const wikiTitle = $(this).text();

            // Fjern tekst i parenteser, erstat mellemrum og bindestreg med understreg
            const cleanedTitle = wikiTitle.replace(/ *\([^)]*\) */g, '').replace(/[ -]/g, '_');

            // Erstat alle steder hvor at titlen er set
            text = text.replace(new RegExp(wikiTitle, 'g'), cleanedTitle);
        });

        // Fjern referencer
        $(this).children('.reference').each(function () {
            text = text.replace($(this).text(), '');
        });

        // Lav alt tekst lowercase
        text = text.toLowerCase();

        // Fjern bindestreger som står for sig selv, erstat bindestreg med understreg
        text = text.replace(/ -/g, '').replace(/- /g, '').replace(/-/g, '_');

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
        text = text.replace(/\s+/g, ' ');

        // Hvis dette ikke er starten på en tekst, så tilføj et mellemrum
        if (wikiText.lenght !== 0) {
            text = ' ' + text;
        }

        // Læg teksten fra det enkelte tekst afsnit ind i teksten for hele siden
        wikiText += text;
    });

    done();
}
