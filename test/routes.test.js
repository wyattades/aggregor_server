const exec = require('child_process').exec;

const USER = 'username123',
      PASS = 'password123',
      FIRST = 'firstname',
      LAST = 'lastname',
      EMAIL = 'email@email.com',
      FEED_NAME = 'MyFeed',
      PLUGIN_URL = 'https://news.ycombinator.com/';

let X_Aggregor_Token,
    plugins;

const command = (args) => {
    return new Promise((resolve, reject) => {
        let commandString = 'bash scripts/' + args[0] + '.sh';
        let printString = args[0];
        for (let i = 1; i < args.length; i++) {
            commandString += ' ' + args[i];
            if (/[a-z0-9-]{36}/.test(args[i])) {
                printString += ' [id]';
            } else if (/[a-zA-Z0-9_.]{64}/.test(args[i])) {
                printString += ' [token]';
            } else {
                printString += ' ' + args[i];
            }
        }

        console.log("cmd: " + printString);
        exec(commandString, (err, out, code) => {
            if (err) {
                reject("Error while running: " + commandString + ":" + code);
            } else {
                const res = JSON.parse(out);
                if (res.code === 200) {
                    resolve(res);
                } else {
                    reject(res);
                }
            }
        });
    });
};

const loginUser = () => {
    return command(['login_user', USER, PASS])
    .then((res) => {
        X_Aggregor_Token = res.data.token;
        return Promise.resolve();
    });
};

const deleteExistingUser = () => {
    return loginUser()
    .then((res) => {
        return command(['delete_user', X_Aggregor_Token, USER, PASS]);
    }, (err) => {
        if (err.code === 401) {
            return Promise.resolve();
        } else {
            return Promise.reject();
        }
    });
};

deleteExistingUser()
.then(() => {
    return command(['new_user', USER, PASS, EMAIL, FIRST, LAST])
    .then((res) => {
        X_Aggregor_Token = res.data.token;
        return Promise.resolve();
    });
})
.then(() => {
    return loginUser();  
})
.then(() => {
    return command(['create_feed', X_Aggregor_Token, USER, FEED_NAME]);
})
.then(() => {
    return command(['fetch_feeds', X_Aggregor_Token, USER, FEED_NAME])
    .then((res) => {
        console.log("FEEDS:", res.data.feedNames);
        return Promise.resolve();
    });
})
.then(() => {
    return command(['add_plugin', X_Aggregor_Token, USER, FEED_NAME, PLUGIN_URL])
    .then((res) => {
        console.log('id=' + res.data.id);
        return Promise.resolve();
    });
})
.then(() => {
    return command(['fetch_plugins', X_Aggregor_Token, USER, FEED_NAME])
    .then((res) => {
        plugins = res.data.plugins;
        console.log("plugins=", plugins);
        return Promise.resolve();
    });
})
.then(() => {
    return command(['fetch_plugin', X_Aggregor_Token, USER, FEED_NAME, plugins[0].id])
    .then((res) => {
        console.log("entries=", res.data);
        return Promise.resolve();
    });
})
.then(() => {
    return command(['update_plugin', X_Aggregor_Token, USER, FEED_NAME, plugins[0].id, "https://www.reddit.com"]);
})
.then(() => {
    return command(['delete_plugin', X_Aggregor_Token, USER, FEED_NAME, plugins[0].id]);
})
.then(() => {
    return command(['delete_feed', X_Aggregor_Token, USER, FEED_NAME]);
})
.then(() => {
    return command(['delete_user', X_Aggregor_Token, USER, PASS]);
})
.then(() => {
    console.log("Successfully used all routes");
})
.catch((err) => {
    console.error("\nERROR:", err);
});
