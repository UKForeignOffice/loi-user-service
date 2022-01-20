const path = require('path');

class TestDownload {
    static init(req, res) {
        try {
            console.log('🤞 Downloading file...');
            console.log(req.headers, 'request headers');

            const EITGHT_SECONS = 8000;
            // const filepath = path.join((__dirname + "/opengraph-image.png"));
            res.contentType('image/png');

            setTimeout((() => {
                res.send({msg: 'tested okay'});
                console.log('🎇 Downloaded file');
            }), EITGHT_SECONS);

        } catch (err) {
            console.error(`⛔️ TestDownload Error: ${err}`);
        }
    }
}

module.exports = TestDownload;