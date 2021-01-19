const redis = require("redis");




function run() {

    // getting queue name from routingdb
    let queue_name = "from_processing";

    const REDISIP = process.env.REDISIP || "127.0.0.1";
    const REDISpassword = process.env.REDISpassword || 'guest';

    const client = redis.createClient({host:REDISIP,password:REDISpassword});

    // Pour les besoins du tp ceci initialise la db :

    client.lpush("ESEO",'{"date":0,"value":0,"from":"eseo"}');
    client.lpush("ENSAM",'{"date":0,"value":0,"from":"ensam"}');
    client.lpush("MAIRIE",'{"date":0,"value":0,"from":"mairie"}');

    client.on("error", function(error) {
        console.error("ERROR",error);
    });

    var amqp = require('amqplib/callback_api');

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

            channel.assertQueue(queue_name, {
                durable: true
            });
            console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue_name);
            channel.consume(queue_name, function(msg) {
                console.log(" [x] Received %s", msg.content.toString());
                msg = JSON.parse(msg.content.toString());
                console.log(" [x] Publishing to %s", msg.from.toUpperCase());
                console.log(" [x] Msg is %s", JSON.stringify(msg));

                // Now update Redis DB
                client.lpush(msg.from.toUpperCase(), JSON.stringify(msg));
                client.lrange(msg.from.toUpperCase(), 0, 10, (err, items) => {
                    console.log(items);
                });
            }, { noAck: true });
        });
    });

}

exports.run = run;
