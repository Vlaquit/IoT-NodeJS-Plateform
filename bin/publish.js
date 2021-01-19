/*
  Ce code est le module principal de notre backend.
*/
require('dotenv').config();

const main = require("../src/pubish/main");

console.log("Starting Processing");

main.run();