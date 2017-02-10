const exec = require('child_process').exec;

const setup = process.argv[2] === 'setup'; 

const USER = 'username123',
      PASS = 'password123',
      FIRST = 'firstname',
      LAST = 'lastname',
      EMAIL = 'email@email.com',
      FEED_NAME = 'MyFeed',
      PLUGIN_URL = 'https://www.reddit.com/r/all';

let X_Aggregor_Token,
    plugins;

const command = (args) => {
    return new Promise((resolve, reject) => {
        let commandString = 'bash scripts/' + args[0] + '.sh';
        let printString = args[0];
        for (let i = 1; i < args.length; i++) {
            commandString += ' ' + args[i];
            if (args[i].length > 45) {
                printString += ' [token]';
            } else if (args[i].length > 30) {
                printString += ' [id]';
            } else {
                printString += ' ' + args[i];
            }
        }

        console.log("cmd: " + printString);
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

const setupUserAccount = () => {
    return command(['new_user', USER, PASS, EMAIL, FIRST, LAST])
    .then((res) => {
        X_Aggregor_Token = res.data.token;
        console.log(X_Aggregor_Token);
        return command(['create_feed', X_Aggregor_Token, USER, FEED_NAME]);
    });
};

const loginUser = () => {
    return command(['login_user', USER, PASS])
    .then((res) => {
        X_Aggregor_Token = res.data.token;
        console.log(X_Aggregor_Token);
        return Promise.resolve();
    });
};


(setup ? setupUserAccount() : loginUser())
.then((res) => {
    return command(['fetch_feeds', X_Aggregor_Token, USER, FEED_NAME]);
})
.then((res) => {
    console.log("FEEDS:", res.data.feedNames);
    return command(['add_plugin', X_Aggregor_Token, USER, FEED_NAME, PLUGIN_URL]);
})
.then((res) => {
    return command(['fetch_plugins', X_Aggregor_Token, USER, FEED_NAME]);
})
.then((res) => {
    plugins = res.data.plugins;
    console.log("plugins=", plugins);
    return command(['fetch_plugin', X_Aggregor_Token, USER, FEED_NAME, plugins[0].id]);
})
.then((res) => {
    return command(['update_plugin', X_Aggregor_Token, USER, FEED_NAME, plugins[0].id, { url: PLUGIN_URL, newData: true}]);
})
.then((res) => {
    return command(['delete_plugin', X_Aggregor_Token, USER, FEED_NAME, plugins[0].id]);
})
.then((res) => {
    console.log("entries=", res.data);
    return command(['delete_feed', X_Aggregor_Token, USER, FEED_NAME]);
})
.then((res) => {
    return command(['logout_user', X_Aggregor_Token]);
})
.then((res) => {
    return command(['delete_user', USER, PASS]);
})
.then((res) => {
    console.log("Successfully used all routes");
})
.catch((err) => {
    console.error("\nERROR:", err);
});
