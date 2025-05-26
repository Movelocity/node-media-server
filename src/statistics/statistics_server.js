// @ts-check
//
//  Created for pig-project monitoring system
//  Statistics server that combines manager and API
//

const StatisticsManager = require('./statistics_manager.js');
const createStatisticsAPI = require('./statistics_api.js');
const logger = require('../core/logger.js');

/**
 * 统计服务器类 - 整合统计管理和API服务
 */
class StatisticsServer {
  constructor(config) {
    this.config = config;
    this.statisticsManager = null;
    this.apiRouter = null;
  }

  /**
   * 启动统计服务器
   */
  run() {
    try {
      // 创建统计管理器
      this.statisticsManager = new StatisticsManager();
      
      // 创建API路由
      this.apiRouter = createStatisticsAPI(this.statisticsManager);
      
      logger.info('Statistics server started successfully');
      logger.info('Available endpoints:');
      logger.info('  GET /api/statistics/server - 服务器统计信息');
      logger.info('  GET /api/statistics/streams - 所有流统计信息');
      logger.info('  GET /api/statistics/streams/:streamPath - 指定流统计信息');
      logger.info('  GET /api/statistics/dashboard - 完整监控数据');
      logger.info('  GET /api/statistics/health - 健康检查');
      logger.info('  POST /api/statistics/reset - 重置统计数据');
      
    } catch (error) {
      logger.error(`Failed to start statistics server: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取API路由器（供HTTP服务器使用）
   * @returns Express路由器
   */
  getApiRouter() {
    return this.apiRouter;
  }

  /**
   * 获取统计管理器（供外部直接访问）
   * @returns {StatisticsManager|null} 统计管理器实例
   */
  getStatisticsManager() {
    return this.statisticsManager;
  }

  /**
   * 停止统计服务器
   */
  stop() {
    try {
      if (this.statisticsManager) {
        this.statisticsManager.destroy();
        this.statisticsManager = null;
      }
      
      this.apiRouter = null;
      logger.info('Statistics server stopped');
      
    } catch (error) {
      logger.error(`Error stopping statistics server: ${error.message}`);
    }
  }
}

module.exports = StatisticsServer; 