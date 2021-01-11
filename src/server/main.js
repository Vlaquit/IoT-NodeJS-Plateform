const http = require("http");
const jwt = require('jsonwebtoken');
const schemas = require("../schemas");
const authdb = require("../db/authdb");

var amqp = require('amqplib/callback_api');
var validate = require('jsonschema').validate;


var from_backend_channel;

const host = 'localhost'; // Use 0.0.0.0 to be visible from ouside local machine
const port = 8000;
const queue = 'from_server';

const ACCESS_TOKEN_SECRET = "123456789";
const ACCESS_TOKEN_LIFE = 120;

function check_password(login,password) {
    // Check password against authdb
    let fnd = authdb.authdb.find(element => {
        return element.login == login && element.password == password;
    });

    if (fnd) {
        return true;
    } else {
        return false;
    }
}

function login(data,res) {
    console.log("login");
    console.log('Username:',data.username,'Passwd:',data.password);
    // check validation
    let validation = validate(data,schemas.login_schema);
    // Check result is valid
    if (validation.valid) {
        if (check_password(data.username,data.password)) {
            let j = jwt.sign({"username":data.username}, ACCESS_TOKEN_SECRET, {
                algorithm: "HS512",
                expiresIn: ACCESS_TOKEN_LIFE
            });
            // Reply to client as error code 200 (no error in HTTP); Reply data format is json
            res.writeHead(200, {'Content-Type': 'application/json'});
            // Send back reply content
            res.end(JSON.stringify({"error":0,"message":j}));
        } else {
            // Reply to client as error code 200 (no error in HTTP); Reply data format is json
            res.writeHead(401, {'Content-Type': 'application/json'});
            // Send back reply content
            res.end(JSON.stringify({"error":-1,"message":"login error"}));
        }
    } else {
        res.writeHead(401, {'Content-Type': 'application/json'});
        // Send back reply content
        res.end(JSON.stringify({"error":-1,
            "message":"Invalid query: " + validation.errors.map(d => { return d.message + ";";})}));
    }
}

function push_to_queue(data,decoded_jwt) {
    let d = data;
    d.jwt = decoded_jwt;
    from_backend_channel.sendToQueue(queue, Buffer.from(JSON.stringify(d)));
    console.log(" [x] Sent %s", d);
}


function postdata(data,res) {
    let validation = validate(data,schemas.postdata_schema);
    if (validation.valid) {
        // Check JWT validity
        jwt.verify(data.jwt, ACCESS_TOKEN_SECRET, function(err, decoded) {
            if (err) { // There is an error: invalid jwt ...
                res.writeHead(401, {'Content-Type': 'application/json'});
                // Send back reply content
                res.end(JSON.stringify({"error":-1,"message":"JWT error"}));
            } else {
                // Ok no problem: Adding data (currently only display)
                console.log("Data received:",data.data);
                push_to_queue(data,decoded);
                res.writeHead(201, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({"error":0,"message":"data added"}));
            }
        });
    } else {
        console.error("Invalid schema");
        res.writeHead(401, {'Content-Type': 'application/json'});
        // Send back reply content
        res.end(JSON.stringify({"error":-1,
            "message":"Invalid query: " + validation.errors.map(d => { return d.message + ";";})}));
    }
}



function pull(data,res) {
    let validation = validate(data,schemas.pull_schema);
    if (validation.valid) {
        // Check JWT validity
        jwt.verify(data.jwt, ACCESS_TOKEN_SECRET, function(err, decoded) {
            if (err) { // There is an error: invalid jwt ...
                res.writeHead(401, {'Content-Type': 'application/json'});
                // Send back reply content
                res.end(JSON.stringify({"error":-1,"message":"JWT error"}));
            } else {
                res.writeHead(201, {'Content-Type': 'application/json'});
                // Serve back the action array at position action_iter
                res.end(JSON.stringify({"error":0,
                    "message":"Data received"}));
            }
        });
    } else {
        res.writeHead(401, {'Content-Type': 'application/json'});
        // Send back reply content
        res.end(JSON.stringify({"error":-1,
            "message":"Invalid query: " + validation.errors.map(d => { return d.message + ";";})}));
    }
}
/**
 *
 * Occur when an unkown url was called
 *
 */
function f404(data,res) {
    res.writeHead(404, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({"error":-1,"message":"404"}));
}


const requestListener = function (req, res) {
    console.log("HTTP method :",req.method,"; Called URL:",req.url);
    // Manage POST http method
    if (req.method == 'POST') {
        var body = '';
        req.on('data', function(data) {
            body += data;
        });
        req.on('end', function() {
            try {
                // Parse incoming data as JSON
                let jbody =  JSON.parse(body);
                // See https://developer.mozilla.org/docs/Web/JavaScript/Reference/Instructions/switch
                // Writting on console log
                switch (req.url) {
                    case "/login":
                        login(jbody,res);
                        break;
                    case "/postdata":
                        postdata(jbody,res);
                        break;
                    case "/pull":
                        pull(jbody,res);
                        break;
                    default:
                        f404(jbody,res);
                }
            } catch (error) { // Catch any error
                console.error("Incorrect Data:",error);
                // Error code 400: bad request
                res.writeHead(400, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({"error":1,"message":"exception","detail":error}));
            }
        });

    } else {
        res.setHeader("Content-Type", "application/json");
        res.writeHead(200);
        // You can use "`" of JSON.stringify to transform json data to string (res.end need string)
        res.end(`{"error":-1,"message": "Please send data as POST"}`);
    }
};


function run () {
    const IP = process.env.IP || "127.0.0.1";
    const username = process.env.user || 'guest';
    const password = process.env.password || 'guest';
    const opt = { credentials: require('amqplib').credentials.plain(username, password) };

    amqp.connect('amqp://'+IP, opt, function(error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function(error1, channel) {
            if (error1) {
                throw error1;
            }
            channel.assertQueue(queue, {
                durable: true
            });
            from_backend_channel = channel;

            const server = http.createServer(requestListener);
            server.listen(port, host, () => {
                console.log("Server is running at http://"+ host+":"+port);
            });

        });

    });
}


exports.run = run;
