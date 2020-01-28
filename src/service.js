const turf = require('@turf/circle');
const fs = require("fs"); 
//const csv = require('csv-parser');
const csv = require("fast-csv");
const request = require('request');
const polygonaggregator = require('./polygonaggregator');
const geocoder = require('./geocoder');

const hubUrl = 'https://xyz.api.here.com/hub';
const hubToken = 'ACzfLRsDTh6pmm3A8-fmOAA';
const polygonSpaceId = 'KmYLgaEP';
let maxCount = 0;
let featureIds;
let centres = {
    'IND':[79.088860, 21.146633],
    'USA':[-89.417931, 36.778259],
    'DEU':[13.404954, 52.520008],
    'JPN':[139.839478, 	35.652832]
}

exports.uploadData = async function(filePath, res, imageOnly, isRaw, mapType) {
    console.log('Uploading data');
    var spaceId;

    if(isRaw == 'false') {

        var data = await convertCsvToJson(filePath);
        let options = {
            title: 'xyz space',
            description: 'xyz space'
        }
        spaceId =  await createSpace(options);
        if(mapType == 'choropleth')  {
            data.features = exports.populateColor(data.features, null);
        } else {
            data.features = exports.populateCircle(data.features, null);
        }

        await putFeatures(spaceId, data);
    } else {
        var data = fs.readFileSync(filePath, 'utf8');
        data = JSON.parse(data);
        let options = {
            title: 'xyz space',
            description: 'xyz space'
        }
        var tempSpaceId =  await createSpace(options);
        await putFeatures(tempSpaceId, data);
        spaceId = await createSpace(options);
        var fIds = await geocoder.findAggregate(tempSpaceId, spaceId, mapType);
        //var fIds = await polygonaggregator.findAggregate(tempSpaceId, spaceId);
        featureIds = '';
        fIds.forEach(id => {
            featureIds += id + ',';
        })
        featureIds = featureIds.substring(0, featureIds.length-1);
    }
    
    var virtualSpaceId  = spaceId;
    if(mapType == 'choropleth') {
        let vsOptions = {
            title: 'xyz virtual space',
            description: 'xyz virtual space',
            storage: {
                "id": "virtualspace",
                "params": {
                    virtualspace: {
                        merge: [
                            polygonSpaceId,
                            spaceId
                        ]
                    }
                }
            }
        }
        virtualSpaceId =  await createSpace(vsOptions);
    }
    
    var url = hubUrl + '/spaces/' +virtualSpaceId+ '/features?id='+featureIds+'&access_token='+hubToken;
    return generateScreenshot(url, res, imageOnly);


}

function createSpace(options) {
    console.log('creating space');

    var space = {};

    return new Promise((resolve, reject) => {
		request.post({
			url: hubUrl +'/spaces',
            auth: { 'bearer': hubToken },
            json: options
		},(error, response, body) => {
			if(!error && response.statusCode == 200) {
                console.log(body);
				//var result = JSON.parse(body);
                console.log('Created space: ', body.id);
                resolve(body.id);
			} else {
                console.log(JSON.stringify(body));
				reject(error);
			}
		});
	});
}

function putFeatures(spaceId, data) {
    console.log('uploading features to space ',spaceId);
    console.log(JSON.stringify(data));
    return new Promise((resolve, reject) => {
		request.put({
			url: hubUrl+ '/spaces/'+ spaceId +'/features',
			headers: {"Content-Type": "application/geo+json"},
			auth: { 'bearer': hubToken },
			json: data
		},(error, response, body) => {
			if(!error && response.statusCode == 200) {
				resolve(body);
				console.log('Data pushed to HUB.');
			} else {
                console.log(body);
				reject(error);
			}
		});
	});
}

function convertCsvToJson(filePath) {
    featureIds = '';
    maxCount = 0;
    return new Promise((resolve, reject) => {
        featureColection = {};
        featureColection.type = "FeatureCollection";
        featureColection.features = [];

        let readStream = fs.createReadStream(filePath);
        csv.parseStream(readStream,{headers : true, delimiter: ',', quote: '"'})
        .on('data', async (row) => {
            console.log(row);
            feature = {type: 'Feature', geometry: null, id: row['country'] };
            feature.properties = {};
            feature.properties.count = parseFloat(row.count);
            featureColection.features.push(feature);
            console.log("count " + feature.properties.count + " maxCount " + maxCount);
            if(feature.properties.count > maxCount){
                maxCount = feature.properties.count;
            }
            console.log("maxCount " + maxCount);
            featureIds += feature.id + ',';
        })
        .on('end', () => {
            console.log('CSV file successfully processed');
            featureIds = featureIds.substring(0, featureIds.length-1);
            resolve(featureColection);
        });
    });
}

exports.populateColor = (features, maxColorCodeValue) => {
    
    let maxCount = 0;
    features.forEach(element => {
        if(element.properties.count > maxCount){
            maxCount = element.properties.count;
        }
    });

   console.log("max count - " + maxCount);
    features.forEach(element => {
        element.properties.occupancy = element.properties.count/maxCount;
        element.properties.color = "hsla(" + (200 - Math.round(element.properties.occupancy*100*2))  + ", 100%, 50%,0.51)";
    });

    //upload features to space
    //call screenshot api to take screenshot
    //let options = {file:'/Users/nisar/OneDrive - HERE Global B.V/home/here-cli/Mulund.csv'};
    //here.uploadToXyzSpace(options);
    return features;

}

exports.populateCircle = (features, maxColorCodeValue) => {
    
    let maxCount = 0;
    features.forEach(element => {
        if(element.properties.count > maxCount){
            maxCount = element.properties.count;
        }
    });
    
   let radiusSize = 2000;
   console.log("max country - " + maxCount);
    features.forEach(element => {
        console.log("count for " + element.properties.name + " is " + element.properties.count);
        element.properties.occupancy = element.properties.count/maxCount;
        element.properties.color = "hsla(" + (200 - Math.round(element.properties.occupancy*100*2))  + ", 100%, 50%,0.51)";
        let radius = element.properties.occupancy * radiusSize * ((90 - Math.abs(centres[element.id][1])) * 0.01);
        console.log("radius - " + radius);
        let newCirlce = turf.default(centres[element.id],radius,{units: 'kilometers'});
        element.geometry = newCirlce.geometry;
        //element.properties.color = "hsla(120, 100%, " + (100 - Math.round(element.properties.occupancy*100)*0.75) + "%,0.3)";
    });

    //upload features to space
    //call screenshot api to take screenshot
    //let options = {file:'/Users/nisar/OneDrive - HERE Global B.V/home/here-cli/Mulund.csv'};
    //here.uploadToXyzSpace(options);
    return features;

}

function generateScreenshot(url, res, imageOnly) {

    var geoJsonTools = 'http://geojson.tools/?maponly=true&url=' + url;
    var imageonlyurl = 'http://geojson.tools/?maponly=true&url=' + url;
    //var imageonlyurl = "https://s3.amazonaws.com/geojson.cme.in.here.com/index.html?maponly=true&url=" + url;
    
    if(imageOnly=='false') {
        res.contentType('text/*');
        res.send(geoJsonTools);
        return;
    }
    let ssUrl = 'https://xyz.api.here.com/screenshot-api/screenshots?uploadtos3=false&url=' + encodeURIComponent(imageonlyurl);

    console.log('ssurl : '+ssUrl);
    //eturn new Promise((resolve, reject) => {
		/*request.get({
			url: ssUrl
		},(error, response, body) => {
			if(!error && response.statusCode == 200) {
				resolve(body);
				console.log('Screenshot generated.');
			} else {
                console.log(body);
				reject(error);
			}
        });*/
        //let x = require('stream').Readable();
        res.send(ssUrl);
        //request(ssUrl).pipe(res);
	//});
}