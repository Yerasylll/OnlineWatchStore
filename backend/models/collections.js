const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');

const getCollection = (collectionName) => {
    return getDB().collection(collectionName);
};

const users = () => getCollection('users');
const watches = () => getCollection('watches');
const orders = () => getCollection('orders');
const reviews = () => getCollection('reviews');

const isValidObjectId = (id) => {
    return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
};

const toObjectId = (id) => {
    if (!isValidObjectId(id)) {
        throw new Error('Invalid ObjectId');
    }
    return new ObjectId(id);
};

module.exports = {
    users,
    watches,
    orders,
    reviews,
    ObjectId,
    isValidObjectId,
    toObjectId
};