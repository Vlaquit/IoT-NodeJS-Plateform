const post = require("../src/post");

let login = "eseo";
let password = "pass1";


/**
 Apply command received by pull
 */
function apply_command(cmd) {
    if (cmd.error == 0) {
        switch (cmd.message.type) {
            case "print":
                console.log(cmd.message.data);
                break;
            case "end":
                process.exit(0);
                break;
            default:
                console.error("Invalid command:",cmd.message.type);
        }
    } else {
        console.error("Command error",cmd);
    }
}


var iter_data = 0;

/*
  action performed each 30 seconds
 */
function action(jwt, date, value) {
    iter_data++;
    post.POST({jwt:jwt,data:{date:date,value:value}},"/postdata",d => {
        post.POST({jwt:jwt},"/pull", d => {
            apply_command(d);
        });
    });

}

/* Doing POST ... Imbricate them*/
post.POST({username: login,password: password},"/login",d => {
    var jwt = d.message;
    var value = 0;

    setInterval(() => {
            let date = new Date();
            let randomError = Math.floor(Math.random() * Math.floor(10));
            if (randomError==10){
                let erronedValue = value-Math.floor(Math.random() * Math.floor(10));
                action(jwt, date.getDate(), erronedValue);
            } else {
                value = value + Math.floor(Math.random() * Math.floor(10));
                action(jwt, date.getDate(), value);
            }
        },
        10000);
});
