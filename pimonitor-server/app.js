var express = require('express');
var mongoDBFramework = require('mongodb');
var bodyParser = require('body-parser')
var LocalStorage = require('node-localstorage').LocalStorage;

var app = express();
var MongoClient = mongoDBFramework.MongoClient
var id = 0;
app.get('/', function (req, res) {
    res.send('pimonitor-server');
});

if (typeof localStorage === "undefined" || localStorage === null) {
    localStorage = new LocalStorage('./scratch');
}

var allowCrossDomain = function (req, res, next) {

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
        res.send(200);
    }
    else {
        next();
    }
};
// for local debug
process.env.PORT = 3000;
process.env.MONGODB_URI = "mongodb://heroku_tshmg3hb:u95l8nf9agmfesv8dchj9h709p@ds119548.mlab.com:19548/heroku_tshmg3hb";


app.use(allowCrossDomain);
// parse application/json  
var jsonParser = bodyParser.json();



// ************************* USER SECTION************************
app.get("/user/exists", function (req, res) {
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.query.username;
            var users = db.collection("users");
            // find if username exists in DB
            users.find({ "username": json }).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    res.status(200);
                    res.send({ "userExists": true });
                }
                else {
                    res.status(200)
                    res.send({ "userExists": false });
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.get('/user/login', function (req, res) {
    // Use connect method to connect to the app 
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            console.log("Connected correctly to mongodb instance");
            var json = req.query.username;
            var users = db.collection("users");
            // find if username exists in DB, if it exists perform password check
            // else return error
            var result = users.find({ "username": json }).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    res.status(200);
                    // TO DO -> move code for password check to heroku server side app
                    res.send(data[0]);
                }
                else {
                    res.status(500)
                    res.send({ "success": false, "errMessage": "The user doesn't exist!" });
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.get('/user/:username/servers/count', function (req, res) {
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.params.username;
            var servers = db.collection("servers");
            // find if username exists in DB
            servers.find({ "username": json }).toArray(function (err, data) {
                console.log(data)
                res.status(200);
                res.send({ "success": true, "count": data.length });
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.get('/user/:username/servers/getAll', function (req, res) {
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.params.username;
            var servers = db.collection("servers");
            // find if username exists in DB
            servers.find({ "username": json }).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    res.status(200);
                    res.send(data);
                }
                else {
                    res.status(200)
                    res.send([]);
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.post('/user/register', jsonParser, function (req, res) {

    // Use connect method to connect to the app 
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            console.log("Connected correctly to mongodb instance");
            var userToFind = req.body.username;
            var users = db.collection("users");
            // find if username exists in DB, if it exists return it for password check
            // else return error
            users.find({ "username": userToFind }).toArray(function (err, data) {
                console.log(data)
                if (data.length == 0) {
                    var json = req.body;
                    users.insertOne(json);
                    res.status(200);
                    res.send({ "success": true, "message": "User registered successfully!" });
                }
                else {
                    res.status(200)
                    res.send({ "success": false, "message": "User is already registered!" });
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

// ************************* SERVER SECTION************************

app.post('/servers/register', jsonParser, function (req, res) {

    // check for existing server
    // if false -> create server -> get serverID and userID -> write to localstorage
    // else get return error
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {

            var json = req.body;
            var userToFind = json.username;
            var serverToFind = json.server;

            var servers = db.collection("servers");
            servers.find({ "username": userToFind, "server": serverToFind }).toArray(function (err, data) {
                console.log(data)
                if (data.length == 0) {
                    //var json = req.body;
                    var jsonObject = {
                        server: serverToFind,
                        username: userToFind,
                        data: [
                            {
                                category: "CPU",
                                parameters: [
                                    { name: "General Information" },
                                    { name: "Temperature" },
                                    { name: "Fan Speed" },
                                    { name: "Voltage" }
                                ]
                            }, {
                                category: "HDD",
                                parameters: [
                                    { name: "General Information" },
                                    { "name": "S.M.A.R.T" }
                                ]
                            }
                        ]
                    };
                    servers.insertOne(jsonObject, function (err, result) {
                        id++;
                        var serverId = result.insertedId.toString();
                        var data = '{"serverID":"' + serverId + '","createdByUser":"' + userToFind + '"}';
                        localStorage.setItem(id, data);
                        res.status(200);
                        res.send({ "success": true, "message": "Server registered successfully!", "requestId": id });
                    });
                }
                else {
                    res.status(200)
                    res.send({ "success": false, "message": "Server is already registered!" });
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.post('/servers/:id/config', jsonParser, function (req, res) {
    var serverId = localStorage.getItem(req.params.id);
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.params.username;
            var servers = db.collection("servers");
            // find if username exists in DB
            servers.find({ "_id": serverId }).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    servers.updateOne()
                }
                else {
                    res.status(200)
                    res.send([]);
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.get('/servers/:id/download', function (req, res) {
    var fileContent = localStorage.getItem(req.params.id);
    res.set("Content-Disposition", "attachment; filename=serverCfg.json");
    res.set("Content-Type", "application/octet-stream");
    res.end(fileContent);
});

app.get('/servers/:id/json', function (req, res) {
    var fileContent = localStorage.getItem(req.params.id);
    var jsonContent = JSON.parse(fileContent);
    res.set("Content-Type", "application/json");
    res.status(200).send(json);
});

app.post('/server/hardware/post/general', jsonParser, function (req, res) {
    var x = req.body;
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.body;
            var hardwareInfo = db.collection("hardwareInfo ");
            // find if username exists in DB
            hardwareInfo.updateOne({ "serverId": "111" }, { $set: { "CPU": json.CPU, "HDD": json.HDD } }, { upsert: true }, function (success) {
                res.status(200).send({ "success": true });
            })
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

// ************************* SERVER CPU SECTION************************
app.post('/server/hardware/cpu/post/temperature', jsonParser, function (req, res) {
    var x = req.body;
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            json.dateCreatedDetailed = temperatureData.dateCreatedDetailed;
            json.dateCreatedShort = temperatureData.dateCreatedShort
            json.sensorData = temperatureData.CPU;
            json.serverId = req.body.serverId;
            hardwareInfo.insertOne(json, function (success) {
                res.status(200).send({ "success": true });
            })
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.get('/server/:id/hardware/cpu/get/general', function (req, res) {
    var serverId = req.params.id;
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.params.username;
            var servers = db.collection("hardwareInfo");
            // find if username exists in DB
            servers.find({ "serverId": serverId }).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    res.status(200);
                    res.send(data[0].CPU);
                }
                else {
                    res.status(200)
                    res.send({});
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.get('/server/:id/hardware/cpu/get/temperature/all', function (req, res) {
    var serverId = req.params.id;
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.params.username;
            var servers = db.collection("CPUData");
            // find if username exists in DB
            servers.find({ "serverId": serverId }).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    res.status(200);
                    res.send(data);
                }
                else {
                    res.status(200)
                    res.send([]);
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.get('/server/:id/hardware/cpu/get/temperature/last/:numberOfRecords', function (req, res) {
    var serverId = req.params.id;
    var numberOfRecords = parseInt(req.params.numberOfRecords);
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.params.username;
            var servers = db.collection("CPUData");
            // find if username exists in DB
            servers.find({ "serverId": serverId }).sort({ "dateCreatedDetailed": -1 }).limit(numberOfRecords).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    res.status(200);
                    res.send(data);
                }
                else {
                    res.status(200)
                    res.send([]);
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.get('/server/:id/hardware/cpu/get/temperature/range/from/:from/to/:to', function (req, res) {
    var serverId = req.params.id;
    var fromTime = parseInt(req.params.from);
    var toTime = parseInt(req.params.to);
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.params.username;
            var servers = db.collection("CPUData");
            // find if username exists in DB
            servers.find({ "serverId": serverId, "dateCreatedDetailed": { $lte: toTime, $gte: fromTime } }).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    res.status(200);
                    res.send(data);
                }
                else {
                    res.status(200)
                    res.send([]);
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

// ************************* SERVER HDD SECTION************************

app.post('/server/hardware/hdd/post/general', jsonParser, function (req, res) {
    var x = req.body;
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.body;
            var hardwareInfo = db.collection("hardwareInfo ");
            // find if username exists in DB
            hardwareInfo.updateOne({ "serverId": json.serverId }, { $set: { "HDD": json.HDD } }, { upsert: true }, function (success) {
                res.status(200).send({ "success": true });
            })
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.post('/server/hardware/hdd/post/smart', jsonParser, function (req, res) {
    var x = req.body;
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.body;

            var hardwareInfo = db.collection("SMARTData ");
            // find if username exists in DB
            hardwareInfo.insertOne({ "serverId": "111" }, json, function (success) {
                res.status(200).send({ "success": true });
            })
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.get('/server/:id/hardware/hdd/get/general', function (req, res) {
    var serverId = req.params.id;
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.params.username;
            var servers = db.collection("hardwareInfo");
            // find if server exists in DB
            servers.find({ "serverId": serverId }).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    res.status(200);
                    if (!data[0].HDD) {
                        res.send(undefined);
                    } else {
                        res.send(data[0].HDD);
                    }
                }
                else {
                    res.status(200)
                    res.send({});
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.get('/server/:id/hardware/hdd/get/smart', function (req, res) {
    var serverId = req.params.id;
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.params.username;
            var servers = db.collection("HDDData");
            // find if username exists in DB
            servers.find({ "serverId": serverId }).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    res.status(200);
                    res.send(data);
                }
                else {
                    res.status(200)
                    res.send([]);
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.get('/server/:id/hardware/hdd/get/smart/attribute/:attrId/last/:count', function (req, res) {
    var serverId = req.params.id;
    var attrId = req.params.attrId;
    var count = parseInt(req.params.count)
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.params.username;
            var servers = db.collection("HDDData");
            // find if username exists in DB
            servers.find({ "serverId": serverId, "HDD.ID": attrId }).sort({ "dateCreated": -1 }).limit(count).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    var dataToSend = [];
                    for (var i = 0; i < data.length; i++) {
                        var element = data[i];
                        for (var j = 0; j < element.HDD.length; j++) {
                            var param = element.HDD[j];
                            if (param.ID == attrId) {
                                dataToSend.push(param);
                            }
                        }
                    }
                    res.status(200);
                    res.send(dataToSend);
                }
                else {
                    res.status(200)
                    res.send([]);
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});


// ************************* SERVER ENVIROMENT SECTION************************

app.post('/enviroment/ambient/post/', jsonParser, function (req, res) {
    var serverId = req.params.id;
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.body;

            var enviroment = db.collection("EnviromentData");
            enviroment.insertOne(json, function (success) {
                res.status(200).send({ "success": true });
            })
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.get('/enviroment/:roomId/ambient/get/all', function (req, res) {
    var roomId = req.params.roomId;
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var servers = db.collection("EnviromentData");
            servers.find({ "roomId": roomId }).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    res.status(200);
                    res.send(data);
                }
                else {
                    res.status(200)
                    res.send([]);
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.get('/enviroment/:roomId/ambient/get/last/:count', function (req, res) {
    var roomId = req.params.roomId;
    var count = parseInt(req.params.count);
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var servers = db.collection("EnviromentData");
            servers.find({ "roomId": roomId }).limit(count).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    res.status(200);
                    res.send(data);
                }
                else {
                    res.status(200)
                    res.send([]);
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.get('/enviroment/:roomId/ambient/get/range/start/:startDate/end/:endDate', function (req, res) {
    var roomId = req.params.roomId;
    var startDate = parseInt(req.params.startDate);
    var endDate = parseInt(req.params.endDate);
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.params.username;
            var enviroment = db.collection("EnviromentData");
            enviroment.find({ "roomId": roomId, "dateCreatedDetailed": { $lte: endDate, $gte: startDate } }).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    res.status(200);
                    res.send(data);
                }
                else {
                    res.status(200)
                    res.send([]);
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.get('/enviroment/user/:id/access/get', function (req, res) {
    var serverId = req.params.id;
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.params.username;
            var servers = db.collection("AccessData");
            // find if username exists in DB
            servers.find({ "roomId": serverId }).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    res.status(200);
                    res.send(data);
                }
                else {
                    res.status(200)
                    res.send([]);
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.post('/enviroment/user/:id/access/post/', jsonParser, function (req, res) {
    var serverId = req.params.id;
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.params.username;
            var servers = db.collection("AccessData");
            // find if username exists in DB
            servers.find({ "roomId": serverId }).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    res.status(200);
                    res.send(data);
                }
                else {
                    res.status(200)
                    res.send([]);
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});



app.get('/enviroment/user/:id/hardware/cpu/get/temperature/all', function (req, res) {
    var serverId = req.params.id;
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.params.username;
            var servers = db.collection("CPUData");
            // find if username exists in DB
            servers.find({ "serverId": serverId }).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    res.status(200);
                    res.send(data);
                }
                else {
                    res.status(200)
                    res.send([]);
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.get('/server/:id/hardware/cpu/get/temperature/last/:numberOfRecords', function (req, res) {
    var serverId = req.params.id;
    var numberOfRecords = parseInt(req.params.numberOfRecords);
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.params.username;
            var servers = db.collection("EnviromentData");
            // find if username exists in DB
            servers.find({ "roomId": serverId }).sort({ "dateCreatedDetailed": -1 }).limit(numberOfRecords).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    res.status(200);
                    res.send(data);
                }
                else {
                    res.status(200)
                    res.send([]);
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});

app.get('/server/:id/hardware/cpu/get/temperature/range/from/:from/to/:to', function (req, res) {
    var serverId = req.params.id;
    var fromTime = parseInt(req.params.from);
    var toTime = parseInt(req.params.to);
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
        if (!err) {
            var json = req.params.username;
            var servers = db.collection("EnviromentData");
            // find if username exists in DB
            servers.find({ "roomId": serverId, "dateCreatedDetailed": { $lte: toTime, $gte: fromTime } }).toArray(function (err, data) {
                console.log(data)
                if (data.length != 0) {
                    res.status(200);
                    res.send(data);
                }
                else {
                    res.status(200)
                    res.send([]);
                }
            });
        } else {
            res.status(500).send({ "error": 'DB Problem!' });
            res.send();
        }
    });
});


app.listen(3000)