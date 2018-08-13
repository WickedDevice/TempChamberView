const express = require('express');
const router = express.Router();
const path = require('path');
const DB = require('../src/db');
const redacted = require('../redacted.js');
const request = require('request');
const moment = require('moment');
const instructionMan = require('../src/instruction-manager');
const sqlstring = require('sqlstring');
var db = new DB();

var manager = new instructionMan.Manager();


const EGG_SERIAL = 'egg00802fbeaf1b0130';

//Get recent instructions
router.post('/instructions/recent', (req, res, next) => {
    validateHeader(req.headers, DB.PERMISSIONS.READ_INSTRUCTION).then((validated) => {
        res.send(JSON.stringify(manager.getInstructionStack()));
    }).catch((reason) => {
        console.error(reason);
        res.statusCode = 401;
        res.send('401 Unauthorized: ' + reason);
    });
});

//Push an instruction onto the stack
router.post('/instructions/push', (req, res, next) => {
    if(req.session.auth) {
        console.log(JSON.stringify(req.body));
        let body = Object.assign({}, req.body);
        let operation = body.operation;

        delete body.operation;      //after deleting we are left with just the args

        manager.pushInstruction(new instructionMan.Instruction(operation, body));
        
        res.redirect('/');
    } else {
        res.statusCode = 401;
        res.send('You must be signed in to push instructions.');
    }
});

//Get running instruction
router.post('/instructions/running', (req, res, next) => {
    validateHeader(req.headers, DB.PERMISSIONS.READ_INSTRUCTION).then((validated) => {
        res.send(JSON.stringify(manager.getRunningInstruction()));
    }).catch((reason) => {
        console.error(reason);
        res.statusCode = 401;
        res.send('401 Unauthorized: ' + reason);
    });
});

//Run the most recent instruction. DEBUG ONLY
router.post('/instructions/run', (req, res, next) => {
    validateHeader(req.headers, DB.PERMISSIONS.RUN_INSTRUCTION).then((validated) => {
        manager.runInstruction();
        res.send('Ran most recent instruction');
    }).catch((reason) => {
        console.error(reason);
        res.statusCode = 500;
        res.send('401 Unauthorized: ' + reason);
    });
});



//sensor data api routes

router.get('/sensors', (req, res, next) => {
    res.send('Use POST to get sensor data');
});

router.post('/sensors', (req, res, next) => {
    validateHeader(req.headers, DB.PERMISSIONS.READ_SENSOR).then((validated) => {

        if(redacted.AQE_API_KEY === undefined) {
            console.error('WARN: Undefined api key.  This is most likely unintentional');
        }

        console.log(EGG_SERIAL);

        let options = {
            method: 'GET',
            uri: `https://airqualityegg.wickeddevice.com/api/v1/most-recent/messages/device/${EGG_SERIAL}`,
            headers: {
                'User-Agent': 'request',
                'Authorization': `Bearer ${redacted.AQE_API_KEY}`,
            }
        };

        request(options, (err, resp, body) => {
            if(err || resp.statusCode != 200) {
                let sendObj = {data: [], time: moment().format(), error: resp.statusMessage};
                res.send(sendObj);
            } else {
                let parsedBody = JSON.parse(body);  

                let sendObj = {data: [], 
                    time: moment().format(),
                    serialNum: parsedBody.serial_num,
                };

                if(parsedBody.error) {      //Check if error encountered in getting data
                    console.error('Error encountered: ' + parsedBody.error);
                    sendObj.error = 'Error encountered: ' + parsedBody.error;
                    res.statusCode = 400;
                } else {
                    ['temperature', 'humidity', 'co', 'no2'].forEach((sensor) => {
                        if(parsedBody[sensor]) {
                            let sensorData = parsedBody[sensor];
                            sendObj.data.push({name: sensor, lastReport: sensorData.date, value: sensorData['converted-value'], units: sensorData['converted-units']});
                        } else {
                            console.error(`Failed to find sensor ${sensor}. Not including`);
                        }
                    });
                }

                

                res.send(sendObj);
            }
        });
    }).catch((reason) => {
        console.error('Sensors: ' + reason);
        res.statusCode = 401;
        res.send('401 Unauthorized: ' + reason);
    });
});

//Documentation page
router.get('/', (req, res, next) => {
    //Ensure they are logged in, TODO check if they are admin
  if(req.session.auth) {
    res.render('api', {session: req.session});
  } else {
    res.header.continue = '/api';
    res.redirect('/login');
  }
});     

/**
 * Validate that a http header has correct authorization.  Returns a promise that rejects if not validated,
 * and resolves if correctly authenticated
 * @param {any} headers the http header object provided 
 * @param {number} permission the permission to check if the header has.  Should be one of db.PERMISSIONS
 */
function validateHeader(headers, permission) {
    return new Promise((resolve, reject) => {
        if(!headers.authorization) {
            reject('missing authorization header');
        } else {
            return db.validateKey(headers.authorization, permission).then((isValidated) => {
                if(isValidated) {
                    resolve('authenticated');
                } else {
                    reject('invalid api key');
                }
            });
        }
    });
}

module.exports = router;
