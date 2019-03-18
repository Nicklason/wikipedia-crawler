const fs = require('graceful-fs');
const path = require('path');

const filesDir = path.join(__dirname, '../files');

module.exports = function (callback) {
    // Tjek om mappen eksisterer
    if (fs.existsSync(filesDir)) {
        return callback(null);
    }

    // Mappen eksisterer ikke, lav den
    fs.mkdir(filesDir, callback);
};
