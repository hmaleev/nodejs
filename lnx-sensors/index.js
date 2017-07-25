var Sensors = (function(){

  const fs = require('fs');
  const exec = require('child_process').exec;
  const http = require('http');
  const sudo = require('sudo-prompt');
  
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

    var getCPUInfo = function (callback) {
        exec('lscpu', (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
            }
            var data = stdout.split("\n");
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
            var json = JSON.parse(JSONObject);
            if(callback){
                callback(json);
            }
        });
    }

    var getCPUSensorData = function(callback){
        exec('sensors', (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
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
    }

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
       return smartData;
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
        CPU:{
            Hardware:{
                get: function(callback){
                     getCPUInfo(callback);
                },
            },
            Sensors:{
                getAll:function(callback){
                    getCPUSensorData(callback);
                }
            }
        },
        HDD: {
            Hardware:{
                get:function(device, callback){
                    sudo.exec('smartctl -i '+device, (error, stdout, stderr) => { 
                        var sensorData = stdout.split(" ===");
                        var hddInfo  = undefined;
                        if(sensorData.length>1){
                            hddInfo = getHDDInformation(sensorData[1]);
                        }
                        if(callback){
                           callback(hddInfo);
                        }
                    });
                }
            },
            SMART:{
                read:function(device, callback){
                   sudo.exec('smartctl -c '+device, (error, stdout, stderr) => { 
                        var sensorData = stdout.split(" ===");
                        var hddInfo  = undefined;
                        if(sensorData.length>1){
                            res = getSMARTData(sensorData[1]);
                        }
                        if(callback){
                           callback(res);
                        }
                    });
                }
            }
        }
    }

})();

module.exports = exports = Sensors;
