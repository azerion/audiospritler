[![Build Status](https://secure.travis-ci.org/keesinggames/audiospritler.png)](http://travis-ci.org/keesinggames/audiospritler)

### What?

This is a `ffmpeg` wrapper that will take in **multiple audio files** and combines them **into a single file**. Silent gaps will be put between the parts so that every new part starts from full second and there is at least 1 second pause between every part. The final file will be exported in `mp3`, `ogg`, `ac3`, `m4a` and `caf`(IMA-ADPCM) to support as many devices as possible. This tool will also generate a `JSON` file that is compatible with [Howler.js](https://github.com/goldfire/howler.js).

## Who?

The original of this awesome tool was made by tonistiigi (https://github.com/tonistiigi) this is an adjusted (and updated) version to be used for [Howler.js](https://github.com/goldfire/howler.js)

###Installation

```
npm install -g audiospritler
```

#### Hints for Windows users

- You need to install [Node.js](https://www.nodejs.org/)
- Use [Git Bash](http://git-scm.com/download/win) instead of Command Line or Powershell
- Download [ffmpeg](http://ffmpeg.zeranoe.com/builds/) and include it in your path `export PATH=$PATH:path/to/ffmpeg/bin`
- IMA-ADPCM(the fastest iPhone format) will only be generated if you are using OSX.

###Usage

```
> audiospritler --help
info: Usage: audiospritler [options] file1.mp3 file2.mp3 *.wav
info: Options:
  --output, -o      Name for the output file.                                    [default: "output"]
  --export, -e      Limit exported file types. Comma separated extension list.   [default: ""]
  --log, -l         Log level (debug, info, notice, warning, error).             [default: "info"]
  --autoplay, -a    Autoplay sprite name                                         [default: null]
  --silence, -s     Add special "silence" track with specified duration.         [default: 0]
  --samplerate, -r  Sample rate.                                                 [default: 44100]
  --channels, -c    Number of channels (1=mono, 2=stereo).                       [default: 1]
  --rawparts, -p    Include raw slices(for Web Audio API) in specified formats.  [default: ""]
  --help, -h        Show this help message.


> audiospritler --output mygameaudio bg_loop.wav *.mp3
info: File added OK file=bg_loop.wav
info: 1.25s silence gap added OK
info: File added OK file=click.mp3
info: 1.70s silence gap added OK
info: Exported caf OK file=mygameaudio.caf
info: Exported ac3 OK file=mygameaudio.ac3
info: Exported mp3 OK file=mygameaudio.mp3
info: Exported m4a OK file=mygameaudio.m4a
info: Exported ogg OK file=mygameaudio.ogg
info: Exported json OK file=mygameaudio.json
info: All done


> cat mygameaudio.json
{
  "urls": [
    "mygameaudio.caf",
    "mygameaudio.ac3",
    "mygameaudio.mp3",
    "mygameaudio.m4a",
    "mygameaudio.ogg"
  ],
  "sprite": {
    "bg_loop": [
      0, 3750, true
    ],
    "click": [
      5000, 5300
    ]
  }
}
```

####Custom silent track

On some cases starting and pausing a file has bigger latency than just setting playhead position. You may get better results if your file is always playing. `--silence <duration>` option will generate extra track named *silence* that you can play instead of pausing the file.

####Usage with [Howler.js](https://github.com/goldfire/howler.js) framework.

Generated JSON file can be passed straight into `Howl` constructor. Check out Howler.js documentation/demos for more info.
