#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    _ = require('underscore')._,
    winston = require('winston');

var optimist = require('optimist')
    .options('output', {
        alias: 'o', 'default': 'output', describe: 'Name for the output file.'
    })
    .options('export', {
        alias: 'e', 'default': '', describe: 'Limit exported file types. Comma separated extension list.'
    })
    .options('log', {
        alias: 'l', 'default': 'info', describe: 'Log level (debug, info, notice, warning, error).'
    })
    .options('autoplay', {
        alias: 'a', 'default': null, describe: 'Autoplay sprite name'
    })
    .options('silence', {
        alias: 's', 'default': 0, describe: 'Add special "silence" track with specified duration.'
    })
    .options('samplerate', {
        alias: 'r', 'default': 44100, describe: 'Sample rate.'
    })
    .options('channels', {
        alias: 'c', 'default': 1, describe: 'Number of channels (1=mono, 2=stereo).'
    })
    .options('rawparts', {
        alias: 'p', 'default': '', describe: 'Include raw slices(for Web Audio API) in specified formats.'
    })
    .options('help', {
        alias: 'h', describe: 'Show this help message.'
    });

var argv = optimist.argv;

winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
    colorize: true, level: argv.log, handleExceptions: false
});
winston.debug('Parsed arguments', argv);


var SAMPLE_RATE = parseInt(argv.samplerate, 10),
    NUM_CHANNELS = parseInt(argv.channels, 10),
    files = _.uniq(argv._);

if (argv.help || !files.length) {
    if (!argv.help) {
        winston.error('No input files specified.');
    }
    winston.info('Usage: audiospritler [options] file1.mp3 file2.mp3 *.wav');
    winston.info(optimist.help());
    process.exit(1);
}

var offsetCursor = 0,
    wavArgs = ['-ar', SAMPLE_RATE, '-ac', NUM_CHANNELS, '-f', 's16le'],
    tempFile = mktemp('audiospritler'),
    json = { urls: [], sprite: {} };

winston.debug('Created temporary file', { file: tempFile });

spawn('ffmpeg', ['-version'])
    .on('error', function() {
        "use strict";
        winston.error('ffmpeg was not found on your path');
        process.exit(1);
    })
    .on('exit', function () {
        "use strict";
        if (argv.silence) {
            json.sprite.silence = [0, argv.silence * 1000, true];
            if (!argv.autoplay) {
                json.autoplay = true;
            }
            appendSilence(argv.silence + 1, tempFile, processFiles);
        } else {
            processFiles();
        }
    });


function mktemp(prefix) {
    "use strict";
    var tmpdir = require('os').tmpDir() || '.';
    return path.join(tmpdir, prefix + '.' + Math.random().toString().substr(2));
}

function spawn(name, opt) {
    "use strict";
    winston.debug('Spawn', { cmd: [name].concat(opt).join(' ') });
    return require('child_process').spawn(name, opt);
}

function pad(num, size) {
    "use strict";
    var str = num.toString();
    while (str.length < size) {
        str = '0' + str;
    }
    return str;
}

function makeRawAudioFile(src, cb) {
    "use strict";
    var dest = mktemp('audiospritler');

    winston.debug('Start processing', { file: src});

    fs.exists(src, function (exists) {
        if (exists) {
            var ffmpeg = spawn('ffmpeg', ['-i', path.resolve(src)]
                .concat(wavArgs).concat('pipe:'));
            ffmpeg.stdout.pipe(fs.createWriteStream(dest, {flags: 'w'}));
            ffmpeg.on('exit', function (code, signal) {
                if (code) {
                    return cb({
                        msg: 'File could not be added',
                        file: src,
                        retcode: code,
                        signal: signal
                    });
                }
                cb(null, dest);
            });
        }
        else {
            cb({ msg: 'File does not exist', file: src });
        }
    });
}

function appendFile(name, src, dest, cb) {
    "use strict";
    var size = 0,
        reader = fs.createReadStream(src),
        writer = fs.createWriteStream(dest, {
            flags: 'a'
        });

    reader.on('data', function (data) {
        size += data.length;
    });

    reader.on('end', function () {
        var duration = size / SAMPLE_RATE / NUM_CHANNELS / 2;
        winston.info('File added OK', { file: src, duration: duration });
        json.sprite[name] = [offsetCursor * 1000, Math.round((duration) * 1000)];
        offsetCursor += duration;
        appendSilence(Math.ceil(duration) - duration + 1, dest, cb);
    });
    reader.pipe(writer);
}

function appendSilence(duration, dest, cb) {
    "use strict";
    var buffer = new Buffer(Math.round(SAMPLE_RATE * 2 * NUM_CHANNELS * duration)),
        writeStream = fs.createWriteStream(dest, { flags: 'a' });

    buffer.fill(null);
    writeStream.on('close', function () {
        winston.info('Silence gap added', { duration: duration });
        offsetCursor += duration;
        cb();
    });
    writeStream.end(buffer);
}

function exportFile(src, dest, ext, opt, store, cb) {
    "use strict";
    var outfile = dest + '.' + ext;
    spawn('ffmpeg', ['-y', '-ac', NUM_CHANNELS, '-f', 's16le', '-i', src]
        .concat(opt).concat(outfile))
        .on('exit', function (code, signal) {
            if (code) {
                return cb({
                    msg: 'Error exporting file',
                    format: ext,
                    retcode: code,
                    signal: signal
                });
            }
            if (ext === 'aiff') {
                exportFileCaf(outfile, dest + '.caf', function (err) {
                    if (!err && store) {
                        json.urls.push(dest + '.caf');
                    }
                    fs.unlinkSync(outfile);
                    cb();
                });
            } else {
                winston.info("Exported " + ext + " OK", { file: outfile })
                if (store) {
                    json.urls.push(outfile);
                }
                cb();
            }
        });
}

function exportFileCaf(src, dest, cb) {
    "use strict";
    if (process.platform !== 'darwin') {
        return cb(true);
    }
    spawn('afconvert', ['-f', 'caff', '-d', 'ima4', src, dest])
        .on('exit', function (code, signal) {
            if (code) {
                return cb({
                    msg: 'Error exporting file',
                    format: 'caf',
                    retcode: code,
                    signal: signal
                });
            }
            winston.info('Exported caf OK', { file: dest });
            return cb();
        });
}

function processFiles() {
    "use strict";
    var formats = {
        aiff: [], ac3: '-acodec ac3'.split(' '), mp3: ['-ar', SAMPLE_RATE, '-ab', '128k', '-f', 'mp3'], m4a: [], ogg: '-acodec libvorbis -f ogg'.split(' ')
    };

    if (argv.export.length) {
        formats = argv.export.split(',').reduce(function (memo, val) {
            if (formats[val]) {
                memo[val] = formats[val];
            }
            return memo;
        }, {});
    }

    var rawparts = argv.rawparts.length ? argv.rawparts.split(',') : null;
    var i = 0;
    async.forEachSeries(files, function (file, cb) {
        i++;
        makeRawAudioFile(file, function (err, tmp) {
            if (err) {
                return cb(err);
            }

            function tempProcessed() {
                fs.unlinkSync(tmp);
                cb();
            }

            var name = path.basename(file).replace(/\.[a-zA-Z0-9]+$/, '');
            appendFile(name, tmp, tempFile, function (err) {
                if (rawparts !== null ? rawparts.length : void 0) {
                    async.forEachSeries(rawparts, function (ext, cb) {
                        winston.debug('Start export slice', { name: name, format: ext, i: i });
                        exportFile(tmp, argv.output + '_' + pad(i, 3), ext, formats[ext], false, cb);
                    }, tempProcessed);
                } else {
                    tempProcessed();
                }
            });
        });
    }, function (err) {
        if (err) {
            winston.error('Error adding file', err);
            process.exit(1);
        }
        async.forEachSeries(Object.keys(formats), function (ext, cb) {
            winston.debug('Start export', { format: ext });
            exportFile(tempFile, argv.output, ext, formats[ext], true, cb);
        }, function (err) {
            if (err) {
                winston.error('Error exporting file', err);
                process.exit(1);
            }
            if (argv.autoplay) {
                json.autoplay = argv.autoplay;
            }
            var jsonfile = argv.output + '.json';
            fs.writeFileSync(jsonfile, JSON.stringify(json, null, 2));
            winston.info('Exported json OK', { file: jsonfile });
            fs.unlinkSync(tempFile);
            winston.info('All done');
        });
    });
}
