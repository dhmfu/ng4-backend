const path = require('path');
const fs = require('fs');
const ffmetadata = require("ffmetadata");
const _ = require('underscore');
const Watcher = require('file-watcher');
const request = require('request');
const songModel = require('../models/song');

module.exports = (app, originalPath, io) => {
    const filesPath = path.join(originalPath, 'public/mp3');

    // let watcher = new Watcher({
    //     root: filesPath
    // });
    //
    // watcher.watch();
    // watcher.on('create', (event) => {
    //     const filename = event.newPath;
    //     if(filename.indexOf('.metadata') == -1 && filename.indexOf('.mp3') != -1)
    //         io.emit('add song', event.newPath);
    // });
    // watcher.on('delete', (event) => {
    //     const filename = event.oldPath;
    //     if(filename.indexOf('.metadata') == -1 && filename.indexOf('.mp3') != -1)
    //         io.emit('delete song', event.oldPath);
    // });

    const dbAutoFill = () => {
        songModel.find({}, (err, songs) =>{
            if (err) {
                console.log(err);
                return;
            } else {
                const songsFilenames = songs.map(song=>song.filename);
                let index = 0;
                const necessaryKeys = ['album', 'genre', 'title', 'artist',
                'track', 'date'];
                fs.readdir(filesPath, (err, files) => { //get all filenames
                    if (files.length) {
                        files = files.filter(file => !!~file.indexOf('.mp3'));
                        files.forEach(file => {
                            if(!~songsFilenames.indexOf(file)) { //if file isn't in db
                                ffmetadata.read(path.join(filesPath, file), (err, data) => {
                                    if (err) {
                                        ++index;
                                        console.error("Error reading metadata", err);
                                        if(index==files.length) {
                                            return;
                                        }
                                    }
                                    else {
                                        data = _.omit(_.extend(
                                            _.pick(data, necessaryKeys),
                                            {filename: file, year: data.date}), 'date');
                                        getLyrics(data).then(result => {
                                            data = _.extend(data, {lyrics: result});
                                            ++index;
                                            songModel.create(data, (err, song) => {
                                                console.log(err?err:song._id);
                                            });
                                            if(index==files.length) {
                                                return;
                                            }
                                        }).catch(err => {
                                            console.log(err, data.artist, data.title);
                                            ++index;
                                            songModel.create(data, (err, song) => {
                                                console.log(err?err:song._id);
                                            });
                                            if(index==files.length) {
                                                return;
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                    else {
                        console.log('no files');
                        return;
                    }
                });
            }
        });
    };

    let dbAutoFillTimer = setInterval(dbAutoFill, 1000 * 60 * 60);

    app.get('/api/songs', (req, res, next) => {
        const {
            skip: skip = 0,
            limit: limit = 5,
            artist: artist = "",
            title: title = "",
            album: album = "",
            year: year = "",
            genre: genre = "",
            track: track = ""
        } = req.query;
        const callback = (err, songs) => {
            if (err) return res.send(err);
            return res.json(songs);
        };
        songModel.find({
            artist: new RegExp(artist, "i"),
            title: new RegExp(title, "i"),
            album: new RegExp(album, "i"),
            year: new RegExp(year, "i"),
            genre: new RegExp(genre, "i"),
            track: new RegExp(track, "i")
        }).limit(+limit).skip(+skip).sort({artist: 1, year: 1}).exec(callback);
    });

    app.get('/api/songs/count', (req, res, next) => {
        const {
            artist: artist = "",
            title: title = "",
            album: album = "",
            year: year = "",
            genre: genre = "",
            track: track = ""
        } = req.query;
        const callback = (err, songsLength) => {
            if (err) return res.send(err);
            return res.json(songsLength);
        };
        songModel.count({
            artist: new RegExp(artist, "i"),
            title: new RegExp(title, "i"),
            album: new RegExp(album, "i"),
            year: new RegExp(year, "i"),
            genre: new RegExp(genre, "i"),
            track: new RegExp(track, "i")
        }).exec(callback);
    });

    app.get('/api/songs/autocompletes', (req, res, next) => {
        const key = req.query.key, query = new RegExp(req.query.query, "i");
        songModel.find({[key]: query}).distinct(key, (err, keys) => {
            if (err) res.status(500).send(err);
            else res.json(keys.slice(0, 10));
        });
    });

    app.post('/api/songs/synchronize', (req, res, next) => {
        const songs = req.body;
        let index = 0;
        clearInterval(dbAutoFillTimer);
        songs.forEach(songForUpdate => {
            findAndUpdateSong(songForUpdate._id, songForUpdate, filesPath).then(() => {
                ++index;
                if(index==songs.length) {
                    dbAutoFillTimer = setInterval(dbAutoFill, 1000 * 2);
                    return res.end('ok');
                }
            }).catch(err => res.end(err));
        });
    });

    app.post('/api/songs/synchronize/multiple', (req, res, next) => {
        const {properties, songs} = req.body;
        let index = 0;
        clearInterval(dbAutoFillTimer);
        songs.forEach(songId => {
            findAndUpdateSong(songId, properties, filesPath).then(() => {
                ++index;
                if(index==songs.length) {
                    dbAutoFillTimer = setInterval(dbAutoFill, 1000 * 2);
                    return res.end('ok');
                }
            }).catch(err => res.end(err));
        });
    });

};

function composeUrl(song) {
    const letter = song.artist[0].toLowerCase();
    let artist = song.artist.toLowerCase()
        .replace(/&/g,'and').replace(/[()]/g,'').replace(/\W/g,'_');
    artist = artist[artist.length-1] == '_' ? artist.slice(0, -1) : artist;
    let title = song.title.toLowerCase()
        .replace(/&/g,'and').replace(/[()]/g,'').replace(/\W/g,'_');
    title = title[title.length-1] == '_' ? title.slice(0, -1) : title;
    return `https://www.amalgama-lab.com/songs/${letter}/${artist}/${title}.html`;
}

function getLyrics(song) {
    return new Promise((resolve, reject) => {
        if (!(song.artist || song.title))
            reject("Can't get song without full data");
        else {
            request(composeUrl(song), (error, response, body) => {
                if(error) reject(error);
                else {
                    ret = body.match(/<div class="original">(\w|\W)*?<\/div>/ig);
                    if(!ret) reject('No lyrics');
                    else {
                        ret = ret.map(line => line.replace(/(<div class="original">)|(<\/div>)/g, "").trim())
                        .filter(line => line != '<br />').join('\n');
                        resolve(ret);
                    }
                }
            });
        }
    });
}

function updateSong(song, fileProperties, filesPath) {
    const songPath = path.join(filesPath, song.filename);

    return new Promise((resolve, reject) => {
        fileProperties = _.omit(_.extend(fileProperties,
            {date: fileProperties.year}), 'year');
        ffmetadata.write(songPath, fileProperties, (err) => {
            if (err) reject("Error wring metadata", err);
            else {
                if (!song.lyrics) {
                    getLyrics(song).then(lyrics => {
                        song.lyrics = lyrics;
                        song.save((err, updatedSong) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    }).catch(err => {
                        console.log('Still', err, 'for ', song.artist, song.title);
                        song.save((err, updatedSong) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                } else {
                    song.save((err, updatedSong) => {
                        if (err) reject(err);
                        else resolve();
                    });
                }
            }
        });
    });
}

function findAndUpdateSong(songId, newSongProps, filesPath) {
    return new Promise((resolve, reject) => {
        songModel.findById(songId, (err, saveSong) => {
            Object.keys(newSongProps).forEach(key => {
                if(!(key=='_id'||key=='filename')) saveSong[key] = newSongProps[key]
            });
            const fileProperties = _.omit(newSongProps, 'lyrics','_id', 'filename');
            updateSong(saveSong, fileProperties, filesPath).then(() => resolve())
            .catch((err) => reject(err));
        });
    });
}
