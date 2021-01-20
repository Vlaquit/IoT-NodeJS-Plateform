require('dotenv').config();
const redis = require("redis");
// For this TP we use express a REST framework...
const express = require('express');
var morgan = require('morgan');

const IP = process.env.REDISIP ;
const password = process.env.REDISpassword ;

// Redis client to get T°C values
const client = redis.createClient({host:IP,password:password});

client.on("error", function(error) {
    console.error("ERROR",error);
});


const app = express();
const port = 3000;

// Using log service available on express
app.use(morgan('combined'));

// Declaration of REST entry point
// Attention les calculs peuvent planter si un erreur est enregistrée dans la value, je nai pas eu le temps de gerer les erreurs ...
app.get('/:location', (req, res) => {
    let location = req.params.location;
    let returnedJson = JSON.parse('{"compteur":0,"moyenne1":0,"moyenne10":0,"nberror":0}');
    client.lrange(location.toUpperCase(), 0, 59, (err, items) => {
        if (items) {
        console.log(items);
        returnedJson.compteur = JSON.parse(items[0]).value;
        let moyenne1sum = 0;
        for (let i = 0; i < 5; i++) {
            moyenne1sum = moyenne1sum + items[i] - items[i+1];
        }
        let moyenne1 = moyenne1sum/6;
        let moyenne10sum = 0;
        for (let i = 0; i < 59; i++) {
            moyenne10sum = moyenne10sum + items[i] - items[i+1];
        }
        let moyenne10 = moyenne10sum/60;
        let nberror =0; // sur les 10 dernières minutes
        for (let i = 0; i < 59; i++) {
            if (items[i] =="error"){
                nberror++;
            }
        }


            console.log("Reply:",location,reply);
            // Ok the location was found.
            res.json(returnedJson);
        } else {
            console.log("Not found:",location);
            // Sending a 404 error in case the location is not in DB
            res.status(404).json({'error':'Unkown location'});
        }
    });
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});