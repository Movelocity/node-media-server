// @ts-check
//
//  Created for pig-project monitoring system
//  Statistics module entry point
//

const StatisticsManager = require('./statistics_manager.js');
const StatisticsServer = require('./statistics_server.js');
const createStatisticsAPI = require('./statistics_api.js');

module.exports = {
  StatisticsManager,
  StatisticsServer,
  createStatisticsAPI
}; 