const path = require('path');
const {getDefaultConfig} = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Reporting policy is also served directly by the standalone web app.
config.watchFolders = [...new Set([...(config.watchFolders || []), path.resolve(__dirname, '../web')])];
module.exports = config;
