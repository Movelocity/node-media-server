// @ts-check
//
//  Created for pig-project monitoring system
//  Statistics API endpoints for dashboard
//

const express = require("express");
const logger = require("../core/logger.js");

/**
 * 创建统计API路由
 * @param {import('./statistics_manager.js')} statisticsManager 
 * @returns {express.Router} Express路由器
 */
function createStatisticsAPI(statisticsManager) {
  const router = express.Router();

  // 设置CORS和JSON解析
  router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  /**
   * 获取服务器统计信息
   * GET /api/statistics/server
   */
  router.get('/server', (req, res) => {
    try {
      const serverStats = statisticsManager.getServerStats();
      res.json({
        success: true,
        data: serverStats,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`Statistics API /server error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * 获取所有流的统计信息
   * GET /api/statistics/streams
   */
  router.get('/streams', (req, res) => {
    try {
      const streamStats = statisticsManager.getStreamStats();
      res.json({
        success: true,
        data: streamStats,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`Statistics API /streams error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * 获取指定流的统计信息
   * GET /api/statistics/streams/:streamPath
   */
  router.get('/streams/:streamPath(*)', (req, res) => {
    try {
      const streamPath = '/' + req.params.streamPath;
      const streamStat = statisticsManager.getStreamStatById(streamPath);
      
      if (!streamStat) {
        res.status(404).json({
          success: false,
          error: 'Stream not found',
          message: `Stream ${streamPath} not found`
        });
        return;
      }

      res.json({
        success: true,
        data: streamStat,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`Statistics API /streams/:streamPath error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * 获取完整的监控数据（服务器统计 + 流列表）
   * GET /api/statistics/dashboard
   */
  router.get('/dashboard', (req, res) => {
    try {
      const serverStats = statisticsManager.getServerStats();
      const streamStats = statisticsManager.getStreamStats();
      
      res.json({
        success: true,
        data: {
          server: serverStats,
          streams: streamStats
        },
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`Statistics API /dashboard error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * 重置统计信息（可选的管理功能）
   * POST /api/statistics/reset
   */
  router.post('/reset', (req, res) => {
    try {
      statisticsManager.reset();
      logger.info('Statistics data reset by API request');
      res.json({
        success: true,
        message: 'Statistics reset successfully',
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`Statistics API /reset error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * 健康检查端点
   * GET /api/statistics/health
   */
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Statistics API is running',
      timestamp: Date.now(),
      uptime: process.uptime()
    });
  });

  return router;
}

module.exports = createStatisticsAPI; 