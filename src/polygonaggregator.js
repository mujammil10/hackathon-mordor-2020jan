
const request = require('request');
const service = require('./service');

getToken = () => {
    return "ACzfLRsDTh6pmm3A8-fmOAA";
}

exports.findAggregate = async (sourceSpaceId, aggregateTargetSpaceId) => {
    return await this.findSpatialAggregate(sourceSpaceId, aggregateTargetSpaceId, 'KmYLgaEP')
}

exports.findSpatialAggregate = async (dataSpaceId, aggregateTargetSpaceId, polygonRefSpaceId) => {
    let allCountries = await iteratePolygons(polygonRefSpaceId);
    let valueCountries = [];
    let targetAggregateFC = {type: 'FeatureCollection', features: []};
    let aggFeatures = targetAggregateFC.features;

    let count = 0;
    //console.log(allCountries.length);
    for(const country of allCountries) {
        let url = "https://xyz.api.here.com/hub/spaces/"+dataSpaceId+"/spatial?access_token="+getToken()+"&refSpaceId="+polygonRefSpaceId+"&refFeatureId="+country;
        const responseData = await getData(url);
        //console.log(responseData.features.length);
        if(responseData != null && responseData.features.length>0) {
            aggFeatures.push({type: 'Feature', id: country, properties: {count: responseData.features.length}});
            valueCountries.push(country);
        }
    }
    aggFeatures = service.populateColor(aggFeatures);
    console.log(JSON.stringify(targetAggregateFC));
    let postUrl = "https://xyz.api.here.com/hub/spaces/"+aggregateTargetSpaceId+"/features?access_token="+getToken();
    let response = await postPutData(postUrl, 'POST', targetAggregateFC, 'application/geo+json');
    console.log("Aggregated values stored!");
    return valueCountries;
}

async function iteratePolygons(polygonRefSpaceId) {
    let allCountries = [];
    let token = "ACzfLRsDTh6pmm3A8-fmOAA";
    let url = "";
    let handle = 0;
    while(handle != null) {
        url = "https://xyz.api.here.com/hub/spaces/"+polygonRefSpaceId+"/iterate?access_token="+token+"&handle="+handle;
        const responseData = await getData(url);
        for(const feature of responseData.features) {
            allCountries.push(feature.id);
        }
        handle = responseData.handle;
    }
    return allCountries;
}

exports.postPutData = async (url, postOrPut, data, contentType) => {
    return new Promise((resolve, reject) => {
        if (typeof url !== 'string') {
          reject('Missing valid ds_url parameter');
          return;
        }

        const options = {
          method: postOrPut,
          url: url,
          headers: {
            'User-Agent': 'XYZ-VisualUtil',
            'Accept': 'application/json',
            'content-type': contentType
          },
          body: JSON.stringify(data)
        };
        const req = request(options, (error, response, body) => {
          if (error) {
            req.end();
            reject(error);
            return;
          }
    
          if (response.statusCode != 200) {
            req.end();
            reject('Failed to fetch info: ' + response.statusCode + " " + response.statusMessage + "\n" + body);
            return;
          }
    
          try {
            req.end();
            resolve(JSON.parse(body));
          } catch (e) {
            reject('Failed to parse info: ' + e);
          }
        });
      });
}

exports.getData = async (url) => {
    return new Promise((resolve, reject) => {
        if (typeof url !== 'string') {
          reject('Missing valid ds_url parameter');
          return;
        }
    
        const options = {
          method: 'GET',
          url: url,
          headers: {
            'User-Agent': 'XYZ-VisualUtil',
            'Accept': 'application/json'
          }
        };
        const req = request(options, (error, response, body) => {
          if (error) {
            req.end();
            reject(error);
            return;
          }
    
          if (response.statusCode != 200) {
            req.end();
            reject('Failed to fetch info: ' + response.statusCode + " " + response.statusMessage + "\n" + body);
            return;
          }
    
          try {
            req.end();
            resolve(JSON.parse(body));
          } catch (e) {
            reject('Failed to parse info: ' + e);
          }
        });
      });
}