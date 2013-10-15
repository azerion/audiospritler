var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    spawn = require('child_process').spawn;

var AUDIOSPRITE_PATH = path.join(__dirname, '../'),
    OUTPUT = 'audiospritler-test-out' + Math.floor(Math.random() * 1e6);

var tmpdir = require('os').tmpDir() || '.';

function cleanTmpDir() {
    "use strict";
    fs.readdirSync(tmpdir).forEach(function (file) {
        if (/^audiospritler/.test(file)) {
            fs.unlinkSync(path.join(tmpdir, file));
        }
    });
}

describe('audiospritler', function () {
    "use strict";
    before(cleanTmpDir);
    after(cleanTmpDir);

    it('generate audiospritler', function (done) {
        this.timeout(10000);

        process.chdir(tmpdir);

        var audiospritler = spawn('node', [
                AUDIOSPRITE_PATH,
                '--rawparts=mp3',
                '-o',
                OUTPUT,
                '-l',
                'debug',
                '--autoplay',
                'boop',
                path.join(__dirname, 'sounds/beep.mp3'),
                path.join(__dirname, 'sounds/boop.wav')
            ]),
            out = '',
            err = '',
            jsonFile,
            json;

        audiospritler.stdout.on('data', function (dt) {
            out += dt.toString('utf8');
        });

        audiospritler.stderr.on('data', function (dt) {
            err += dt.toString('utf8');
        });


        audiospritler.on('exit', function (code, signal) {
            console.log(out);

            var file, stat;

            if (code) {
                assert.fail(code, 0, 'audiospritler returned with error code. debug = ' + err, '==');
            }

            jsonFile = path.join(tmpdir, OUTPUT + '.json');
            assert.ok(fs.existsSync(jsonFile), 'JSON file does not exist');

            assert.doesNotThrow(function () {
                json = JSON.parse(fs.readFileSync(jsonFile));
            }, 'invalid json');

            console.log(json);

            // Test urls array.

            assert.ok(json.urls, 'no urls list');
            assert.ok(json.urls.length >= 4, 'not enought urls');

            json.urls.forEach(function (resource) {
                file = path.join(tmpdir, resource);
                assert.ok(fs.existsSync(file), 'File not found: ' + resource);
                stat = fs.statSync(file);
                assert.ok(stat.size > 9000, 'File too small' + resource);
            });

            // Test sprite.

            assert.ok(json.sprite.beep, 'beep not found in sprite');
            assert.equal(json.sprite.beep[0], 0, 'beep start time not 0');
            assert.ok(Math.abs(1751 - json.sprite.beep[1]) < 40, 'beep end time not 1.77');
            assert.equal(json.sprite.beep[2], undefined, 'beep should not be looping');

            assert.ok(json.sprite.boop, 'boop not found in sprite');
            assert.equal(json.sprite.boop[0], 3000, 'boop start time not 3');
            assert.ok(Math.abs(1270 - json.sprite.boop[1]) < 40, 'boop end time not 4.27');
            assert.equal(json.sprite.boop[2], undefined, 'boop should not be looping');

            assert.equal(json.autoplay, 'boop', 'boop is not set as autoplay');

            // Test rawparts.

            file = path.join(tmpdir, OUTPUT + '_001.mp3');
            assert.ok(fs.existsSync(file), 'no beep raw part file found');
            stat = fs.statSync(file);
            assert.ok(stat.size > 10000, 'beep raw part too small');

            file = path.join(tmpdir, OUTPUT + '_002.mp3');
            assert.ok(fs.existsSync(file), 'no boop raw part file found');
            stat = fs.statSync(file);
            assert.ok(stat.size > 10000, 'boop raw part too small');

            done();
        });

    });
});
