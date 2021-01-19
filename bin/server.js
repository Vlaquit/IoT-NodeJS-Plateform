/*
  Ce code est le module principal de notre backend.
*/
require('dotenv').config();

const main = require("../src/server/main");

console.log("Starting Server");

main.run();