// Server/models/index.js
const User = require('./User');
const { locationSchema, getLocationModel } = require('./Location');

module.exports = {
    User,
    locationSchema,
    getLocationModel
};