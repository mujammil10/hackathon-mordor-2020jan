const request = require('request');
const polygonAggregator = require('./polygonaggregator');
const service = require('./service');


exports.findAggregate = async (sourceSpaceId, aggregateTargetSpaceId, mapType) => {
  return await this.findSpatialAggregate(sourceSpaceId, aggregateTargetSpaceId, mapType);
}

exports.findSpatialAggregate = async (dataSpaceId, aggregateTargetSpaceId, mapType) => {
  let aggregateData = await iterateandProcessData(dataSpaceId);
  let targetAggregateFC = {type: 'FeatureCollection', features: []};
  let aggFeatures = targetAggregateFC.features;
  let valueCountries = [];

  let count = 0;
  //console.log(aggregateData.length);
  for(const countryCode of Object.keys(aggregateData)) {
      const countryAggregate = aggregateData[countryCode];
      if(countryAggregate != null) {
          aggFeatures.push({type: 'Feature', id: countryCode, properties: {count: countryAggregate}});
      }
      valueCountries.push(countryCode);
  }
  //aggFeatures = service.populateColor(aggFeatures);
  if(mapType == 'choropleth')  {
    aggFeatures = service.populateColor(aggFeatures, null);
  } else {
    aggFeatures = service.populateCircle(aggFeatures, null);
  }
  console.log(JSON.stringify(targetAggregateFC));
  let postUrl = "https://xyz.api.here.com/hub/spaces/"+aggregateTargetSpaceId+"/features?access_token="+getToken();
  let response = await polygonAggregator.postPutData(postUrl, 'POST', targetAggregateFC, 'application/geo+json');
  console.log("Aggregated values stored!");
  return valueCountries;
}

async function iterateandProcessData(dataSpaceId) {
  let aggregateData = {};
  let token = "ACzfLRsDTh6pmm3A8-fmOAA";
  let url = "";
  let handle = 0;
  while(handle != null) {
      url = "https://xyz.api.here.com/hub/spaces/"+dataSpaceId+"/iterate?access_token="+token+"&handle="+handle;
      const responseData = await polygonAggregator.getData(url);
      for(const feature of responseData.features) {
          const lon = feature.geometry.coordinates[0];
          const lat = feature.geometry.coordinates[1];
          const country = await exports.whichCountry(lat, lon);
         // console.log(JSON.stringify(aggregateData));
          if(aggregateData[country]) {
            aggregateData[country] = aggregateData[country] + 1;
          } else {
            aggregateData[country] = 1;
          }
      }
      handle = responseData.handle;
  }
  return aggregateData;
}


exports.reverseGeocodeMe = async (featureCollection) => {
    let response =await this.whichCountry(22.30021443817393,73.19744110107422);
    console.log(response);
}

exports.whichCountry = async (lat, lon) => {
    let  api_url = "https://reverse.geocoder.api.here.com/6.2/reversegeocode.json?mode=retrieveAddresses&maxresults=1&gen=9&app_id=2ddlMUNOyJx27e9QHMRr&app_code=pJl7mN_nr5b0NReRvR0PVg";
    api_url = api_url + "&prox="+ lat + "," + lon;
    
  return new Promise((resolve, reject) => {

    const options = {
      method: 'GET',
      url: api_url,
      headers: {
        'User-Agent': 'XYZ-Visualizer',
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
        reject('Failed to fetch dev info: ' + response.statusCode + " " + response.statusMessage + "\n" + body);
        return;
      }

      try {
        req.end();
        let responseobj = JSON.parse(body);
        
        let view = responseobj.Response.View;
        if(view.length == 0) {
          return null;
        }
        view = view[0];
        let result = view.Result[0];       
        let address = result.Location.Address;
        let country = address.Country;
        resolve(country);
      } catch (e) {
        reject('Failed to parse dev info: ' + e);
      }
    });
  });
}

//this.reverseGeocodeMe();
//this.findAggregate('aQcGMpdm', 'qa7VkEZG');