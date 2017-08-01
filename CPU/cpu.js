var CPUSensors = (function () {
 
  const fs = require('fs');
  const exec = require('child_process').exec;
  const http = require('http');
  var sensorArray =[];

  var parseSensorData = function (input) {
        var data = input.split("\n");
        var JSONObject = '{'

        for (var i = 0; i < data.length; i++) {
            var element = data[i];
            var tempArray =  element.split(":");
            if(tempArray != undefined && tempArray.length>1){
                var sensor = tempArray[0];
                var value =  tempArray[1].trim();

                JSONObject += '\"'+sensor+'\":\"' + value + '\",'; 
            }
        }
        if(JSONObject.length>1){
            JSONObject = JSONObject.substring(0,JSONObject.length-1);

        }
        JSONObject += '}'
        var x = JSON.parse(JSONObject);
        return x
    }

    var getCPUInfo = function () {
        var fileContent = fs.readFileSync("CPUInfo.txt","utf-8");

        var data = fileContent.split("\n");
        var JSONObject = '{'

        for (var i = 0; i < data.length; i++) {
            var element = data[i];
            var tempArray =  element.split(":");
            if(tempArray != undefined && tempArray.length>1){
                var sensor = tempArray[0].trim().replace(/ /g, "_");
                var value =  tempArray[1].trim();

                JSONObject += '\"'+sensor+'\":\"' + value + '\",'; 
            }
        }
        if(JSONObject.length>1){
            JSONObject = JSONObject.substring(0,JSONObject.length-1);

        }
        JSONObject += '}'
        var x = JSON.parse(JSONObject);
        return x
    }

  return {
 
    getCurrentSensorData: function (callback) {
       exec('sensors', (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
            }
            if(sensorArray.length === 10 ){
                sensorArray = [];
            }

            var sensorData = stdout.split("\n\n");
        
            for (var i = 0; i < sensorData.length; i++) {
                var sensor = sensorData[i];
                sensorArray.push(parseSensorData(sensor)) ;
            }
            sensorArray.pop()
            console.log(sensorArray.length);
            if(callback){
                callback(sensorArray);
            }
        });
    },

    getGeneralInfo: function (callback) {
      return  getCPUInfo();
    },

    sendDataToDB: function(data){

        var fileContent = fs.readFileSync("server.cfg","utf-8");
        var cfg = JSON.parse(fileContent);

        var postData = JSON.stringify(data);

        var options = {
            hostname: '192.168.0.101',
            path: '/server/'+ cfg.serverId+'/hardware/cpu/post/temp',
            method: 'POST',
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
    },

    uploadGeneralInfo: function(data){

        var fileContent = fs.readFileSync("server.cfg","utf-8");
        var cfg = JSON.parse(fileContent);
        data.serverId = cfg.serverId;
       
        var postData = JSON.stringify(data);

        var options = {
            hostname: '192.168.0.101',
            port:3000,
            path: '/server/hardware/cpu/post/general',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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

// setInterval(upload,1000)

// function upload(){
//     CPUSensors.getCurrentSensorData(function(data){
//         if(data.length === 10){
//             CPUSensors.sendDataToDB(data);
//         }
//     });
// }

function UploadCPUGeneralInfo(){
   var res = CPUSensors.getGeneralInfo()
  CPUSensors.uploadGeneralInfo(res);
}
UploadCPUGeneralInfo();