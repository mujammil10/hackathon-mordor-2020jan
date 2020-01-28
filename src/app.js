const express = require('express');
const app = express();
//const router = express.Router();
const util = require("util");
const fs = require("fs"); 
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })
const csv = require('csv-parser');
const service = require('./service');
 
app.get('/', function (req, res) {
    res.sendFile('index.html', {root: __dirname })
})

app.post('/upload', upload.single('file'), async function(req, res) {
    console.log('Uploading file...');
    if(req.file) {
        var imageOnly = req.query.imageOnly;
        var isRaw = req.query.isRaw;
        var mapType = req.query.mapType;
        console.log("imageOnly: ", imageOnly, " isRaw: ", isRaw, " mapType: ",mapType);
        console.log("file ",util.inspect(req.file));
        //res.contentType('image/*');
        await service.uploadData(req.file.path, res, imageOnly, isRaw, mapType);
        //res.attachment('screenshot.jpeg');
        //res.send(screenshot);
        //res.sendFile(screenshot);
    }
})

console.log('App running of port 3000');
app.listen(3000)