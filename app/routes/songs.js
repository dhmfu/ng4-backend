const path = require('path');
const fs = require('fs');
const ffmetadata = require("ffmetadata");
const _ = require('underscore');
const request = require('request');

module.exports = (app, originalPath) => {

    app.get('/api/songs', (req, res, next) => {
        const filesPath = path.join(originalPath, 'public/mp3');
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
                            const letter = data.artist[0].toLowerCase();
                            let artist = data.artist.toLowerCase().replace(/\W/g,'_');
                            artist = artist[artist.length-1] == '_' ? artist.slice(0, -1) : artist;
                            let title = data.title.toLowerCase().replace(/\W/g,'_');
                            title = title[title.length-1] == '_' ? title.slice(0, -1) : title;
                            const url = `https://www.amalgama-lab.com/songs/${letter}/${artist}/${title}.html`;
                            new Promise(function(resolve, reject) {
                                request(url, function (error, response, body) {
                                    if(error) reject(error);
                                    ret = body.match(/<div class="original">(\w|\W)*?<\/div>/ig);
                                    ret = ret && ret.map(line => line.replace(/(<div class="original">)|(<\/div>)/g, "").trim())
                                    .filter(line => line != '<br />').join('\n');
                                    resolve(ret);
                                });
                            }).then(result => {
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
