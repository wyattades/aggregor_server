const exec = require('child_process').exec;

const USER = 'test_username',
      PASS = 'test_pass123',
      FIRST = 'test_first_name',
      LAST = 'test_last_name',
      EMAIL = 'test_email@email.com';

let X_Aggregor_Token;

const command = (args) => {
    return new Promise((resolve, reject) => {
        let commandString = 'scripts/' + args[0] + '.sh';
        for (let i = 1; i < args.length; i++) {
            commandString += ' ' + args[i];
        }

        exec(commandString, (err, stdout, stderr) => {
            if (err) {
                reject("Error while running: " + commandString + ":" + stdout + stderr);
            } else {
                const res = JSON.parse(stdout);
                if (res.code === 200) {
                    resolve(res);
                } else {
                    reject(res);
                }
            }
        });
    });
};

// command(['new_user', USER, PASS, EMAIL, FIRST, LAST]).then();

command(['login_user', USER, PASS])
.then((res) => {
    X_Aggregor_Token = res.data.token;
    return command(['create_feed', X_Aggregor_Token, 'test_feed', USER]);
})
.then((res) => {
    console.log("RES: ", res);
})
.catch((err) => {
    console.log("ERR: ", err);
});
