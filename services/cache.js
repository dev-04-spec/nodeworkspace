const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(redisUrl);
client.get = util.promisify(client.get);
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function () {
    this.useCache = true;
    return this;
}
mongoose.Query.prototype.exec = async function () {

    if (!this.useCache) {
        return exec.apply(this, arguments);
    }
    //  console.log(this.getQuery());
    //  console.log(this.mongooseCollection.name);
    const key = JSON.stringify(Object.assign({}, this.getQuery(), {
        collection: this.mongooseCollection.name
    }));
    //  console.log(key);

    //See if we have a value for 'Key' in redis
    const cacheValue = await client.get(key);
    // If we do , return that       
    if (cacheValue) {

        const doc = JSON.parse(cacheValue);
        return Array.isArray(doc) ? doc.map(d => new this.model(d)) : new this.model(doc)
    }
    // Otherwise, issue the query and store the result in redis

    const result = await exec.apply(this, arguments);
    console.log(result);
    client.set(key, JSON.stringify(result));
    return result;
}