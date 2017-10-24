const path = require('path');
const fs = require('fs');
const ffmetadata = require("ffmetadata");
const _ = require('underscore');
const Watcher = require('file-watcher');
const request = require('request');

module.exports = (app, originalPath, io) => {
    const filesPath = path.join(originalPath, 'public/mp3');

    let watcher = new Watcher({
        root: filesPath
    });

    watcher.watch();
    watcher.on('create', (event) => {
        io.emit('add song', event.newPath);
        console.log(event.newPath);
    });
    watcher.on('delete', (event) => {
        io.emit('delete song', event.oldPath);
        console.log(event.oldPath);
    });

    app.get('/api/songs', (req, res, next) => {
        fs.readdir(filesPath, (err, files) => { //get all filenames
            if (files.length) {
                let songs = [], index = 0;
                const necessaryKeys = ['album', 'genre', 'title', 'artist',
                'track', 'date'];

                files.forEach(file => {
                    ffmetadata.read(path.join(filesPath, file), (err, data) => {
                        if (err) {
                            ++index;
                            console.error("Error reading metadata", err);
                        }
                        else {
                            data = _.omit(_.extend(
                                _.pick(data, necessaryKeys),
                                {filename: file, year: data.date}), 'date');
                            if (data.artist && data.title) {
                                getLyrics(data).then(result => {
                                    data = _.extend(data, {lyrics: result});
                                    ++index;
                                    songs.push(data);
                                    if(index==files.length) {
                                        return res.json(songs);
                                    }
                                }).catch(err => {
                                    ++index;
                                    songs.push(data);
                                    console.log(err);
                                });
                            }
                            else {
                                ++index;
                                songs.push(data);
                                if(index==files.length) {
                                    return res.json(songs);
                                }
                            }
                        }
                    });
                });
            }
            else {
                console.log('no files');
                return res.send('no files');
            }
        });
    });

    app.post('/api/songs', (req, res, next) => {
        res.set('Access-Control-Allow-Origin', '*');
        const filesPath = path.join(originalPath, 'public/mp3');
        const songs = req.body.map(song => {
            return _.omit(song, (value, key)=>value=='unknown');
        });
        let index = 0;
        songs.forEach(song => {
            const songPath = path.join(filesPath, song.filename);
            ffmetadata.write(songPath, _.omit(song, 'filename'), (err) => {
                if (err) console.error("Error wring metadata", err);
                else {
                    ++index;
                    if(index==songs.length) {
                        return res.end('ok');
                    }
                }
            });
        });
    });

};

function composeUrl(song) {
    const letter = song.artist[0].toLowerCase();
    let artist = song.artist.toLowerCase().replace(/\W/g,'_');
    artist = artist[artist.length-1] == '_' ? artist.slice(0, -1) : artist;
    let title = song.title.toLowerCase().replace(/\W/g,'_');
    title = title[title.length-1] == '_' ? title.slice(0, -1) : title;
    return `https://www.amalgama-lab.com/songs/${letter}/${artist}/${title}.html`;
}

function getLyrics(song) {
    return new Promise((resolve, reject) => {
        request(composeUrl(song), (error, response, body) => {
            if(error) reject(error);
            else {
                ret = body.match(/<div class="original">(\w|\W)*?<\/div>/ig);
                ret = ret && ret.map(line => line.replace(/(<div class="original">)|(<\/div>)/g, "").trim())
                .filter(line => line != '<br />').join('\n');
                resolve(ret);
            }
        });
    });
}
