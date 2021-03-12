const express = require('express');
const fetch = require('node-fetch');
const redis = require('redis');

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const client = redis.createClient(REDIS_PORT);

const app = express();

function setResponse(username, repos) {
    return `<h2>${username} has ${repos} repos`;
}

async function getRepos(req, res, next) {
    try {
        console.log('Fetching data...');

        const {
            username
        } = req.params;

        const response = await fetch(`https://api.github.com/users/${username}`);

        const data = await response.json();

        const repos = data.public_repos;

        //  Set data to Redis
        client.setex("username", 3600, repos);

        res.send(setResponse(username, repos));
    } catch (error) {
        console.log(error);
        res.send(500);
    }
}

//  Cache middleware
function cache(req, res, next) {
    const {
        username
    } = req.params;
    client.get(username, (err, data) => {
        if (err) throw err;

        if (data !== null) {
            res.send(setResponse(username, data))
        } else {
            next();
        }
    });

}

app.get('/repos/:username', cache, getRepos);

app.listen(PORT, () => {
    console.log(`App is listening on port ${PORT}`);
});