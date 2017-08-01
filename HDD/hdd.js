var HDDSensors = (function () {
 
    const fs = require('fs');
    const exec = require('child_process').exec;
    const http = require('http');
    var sensorArray =[];

    var getSMARTData = function (input) {
            var data = input.split("\n");
            var smartData = [];
            for (var i = 4; i < data.length; i++) {
                var element = data[i];
                // if no attributes remain exit the cycle
                if(element.length<=1){
                    break;
                }
                var tempArray =  element.split(" ").filter(function(n){
                    // returns only non-empty elements
                        return n != "" 
                });
                var JSONObject = {
                    ID:tempArray[0],
                    ATTRIBUTE_NAME:tempArray[1],
                    VALUE:tempArray[3],
                    WORST:tempArray[4],
                    THRESH:tempArray[5],
                    TYPE:tempArray[6],
                    RAW_VALUE:tempArray[9]
                };
                smartData.push(JSONObject)
            }
            var stringifiedData = JSON.stringify(smartData);
            return stringifiedData;
    }

    var getHDDInformation = function (input) {
        
            var data = input.split("\n").filter(function(n){
            // returns only non-empty elements
                return n != "" 
        });
        var smartData = [];
        var jsonObjectString = "{"
            for (var i = 0; i < data.length; i++) {
                var element = data[i];
                // if no attributes remain exit the cycle
                if(element.length<=1){
                    break;
                }
                var tempArray =  element.split(":").filter(function(n){
                    // returns only non-empty elements
                    return n != "" 
                });
                jsonObjectString += '"'+tempArray[0].trim().replace(/ /g, "_")+'":"' +tempArray[1].trim()+'",' 
            }
            jsonObjectString = jsonObjectString.slice(0,jsonObjectString.length-1)+"}";
            var json = JSON.parse(jsonObjectString);
            return json;
    }

    return {

    getCurrentSensorData: function (callback) {
        getSMARTData();
    },
    getHDDInfo: function (callback) {
        var fileData = fs.readFileSync("HDD2.txt","utf-8");
        var sensorData = fileData.split(" ===");
        var hddInfo  =undefined;
        if(sensorData.length>1){
            hddInfo = getHDDInformation(sensorData[1]);
        }
        return hddInfo;
    },

    sendDataToDB: function(data){
        var postData = JSON.stringify(data);

        var options = {
                hostname: 'httpbin.org',
                path: '/put',
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            var req = http.request(options, (res) => {
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    console.log(chunk);
                });
                res.on('end', () => {
                    console.log('No more data in response.');
                });
            });

            req.on('error', (e) => {
                console.log(`problem with request: ${e.message}`);
            });

            // write data to request body and send request
            req.write(postData);
            req.end();
        }
    };
 
})();

setInterval(upload,3000)

function upload(){
   var data = HDDSensors.getHDDInfo();
   HDDSensors.sendDataToDB(data);
}


// const fs = require('fs');

// var fileData = fs.readFileSync("HDD2.txt","utf-8");
// var sensorData = fileData.split(" ===");
// var sensorArray =[];
// if(sensorData.length>1){
//     for (var i = 1; i < sensorData.length; i++) {
//         var element = sensorData[i];
//         parseSMARTData(element);
//     }
// }
// console.log(sensorArray);

// function parseSMARTData(input) {
//    var data = input.split("\n").filter(function(n){
//             // returns only non-empty elements
//              return n != "" 
//         });
//    var smartData = [];
//    var jsonObjectString = "{"
//     for (var i = 0; i < data.length; i++) {
//         var element = data[i];
//         // if no attributes remain exit the cycle
//        if(element.length<=1){
//            break;
//        }
//         var tempArray =  element.split(":").filter(function(n){
//             // returns only non-empty elements
//              return n != "" 
//         });
//        jsonObjectString += '"'+tempArray[0].trim().replace(/ /g, "_")+'":"' +tempArray[1].trim()+'",' 
//     }
//     jsonObjectString = jsonObjectString.slice(0,jsonObjectString.length-1)+"}";
//     var json = JSON.parse(jsonObjectString);
 
//     return json;
// }