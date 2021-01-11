const authdb = require("../db/authdb");
var amqp = require('amqplib/callback_api');
const redis = require("redis");
var global_channel;
const from_backend_queue = 'from_server';
const from_processing_queue = 'from_processing';
const REDISIP = process.env.REDISIP || "127.0.0.1";
const REDISpassword = process.env.REDISpassword || 'guest';
const client = redis.createClient({host:REDISIP,password:REDISpassword});

function check_permissions(login) {
    let fnd = authdb.authdb.find(element => {
        return element.login == login;
    });
    if (fnd) {
        return true;
    } else {
        return false;
    }
}

function on_message(msg) {
    // Extract the message
    msg = JSON.parse(msg.content.toString());

        // Check permissions
        if (check_permissions(msg.jwt.username)) {
            client.get(msg.jwt.username, (err,reply) => {
                console.log("Reply:",err,reply);
            });
            console.log("Send Message to queue "+from_processing_queue);
            // If ok: publich message on dedicated queue
            global_channel.sendToQueue(from_processing_queue, Buffer.from(JSON.stringify(msg.data)));
        } else {
            // Drop the message (an let an error message)
            console.error("Illegal submission from username",msg.jwt.username);
        }

}


function run() {


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
            // Create queue "from_backend"
            channel.assertQueue(from_backend_queue, {
                durable: true
            });
            global_channel = channel;
            // Create all output queues
            routingdb.routingdb.forEach(element => {
                channel.assertQueue(element, {
                    durable: true
                });
            });

            // Start consume input queue
            channel.consume(from_backend_queue, on_message, {
                noAck: true });

        });

    });



}

exports.run = run;
