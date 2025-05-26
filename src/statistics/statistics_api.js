// @ts-check
//
//  Created for pig-project monitoring system
//  Statistics API endpoints for dashboard
//

const express = require("express");
const logger = require("../core/logger.js");
const fs = require("node:fs");
const path = require("node:path");

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

  /**
   * 获取所有流的历史记录文件列表
   * GET /api/statistics/records
   */
  router.get('/records', (req, res) => {
    try {
      const recordsPath = './records';
      
      if (!fs.existsSync(recordsPath)) {
        res.json({
          success: true,
          data: [],
          message: 'Records directory not found',
          timestamp: Date.now()
        });
        return;
      }

      const records = getRecordsList(recordsPath);
      res.json({
        success: true,
        data: records,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`Statistics API /records error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * 获取指定流的历史记录文件列表
   * GET /api/statistics/records/:streamPath
   */
  router.get('/records/:streamPath(*)', (req, res) => {
    try {
      const streamPath = req.params.streamPath;
      const pathParts = streamPath.split('/');
      
      if (pathParts.length < 2) {
        res.status(400).json({
          success: false,
          error: 'Invalid stream path',
          message: 'Stream path should be in format: app/streamName'
        });
        return;
      }

      const app = pathParts[0];
      const streamName = pathParts[1];
      const streamRecordsPath = path.join('./records', app, streamName);
      
      if (!fs.existsSync(streamRecordsPath)) {
        res.json({
          success: true,
          data: [],
          message: `No records found for stream ${streamPath}`,
          timestamp: Date.now()
        });
        return;
      }

      const files = fs.readdirSync(streamRecordsPath)
        .filter(file => file.endsWith('.flv'))
        .map(file => {
          const filePath = path.join(streamRecordsPath, file);
          const stats = fs.statSync(filePath);
          const match = file.match(/^(\d{14})_segment_(\d{3})\.flv$/);
          
          return {
            filename: file,
            path: `/records/${app}/${streamName}/${file}`,
            size: stats.size,
            created: stats.birthtime.toISOString(),
            modified: stats.mtime.toISOString(),
            duration: null, // 可以通过ffprobe获取，这里暂时为null
            date: match ? formatRecordDate(match[1]) : null,
            segment: match ? parseInt(match[2]) : null
          };
        })
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

      res.json({
        success: true,
        data: {
          streamPath: `/${streamPath}`,
          totalFiles: files.length,
          totalSize: files.reduce((sum, file) => sum + file.size, 0),
          files: files
        },
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`Statistics API /records/:streamPath error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * 删除指定的录制文件
   * DELETE /api/statistics/records/:streamPath/:filename
   */
  router.delete('/records/:streamPath(*)/:filename', (req, res) => {
    try {
      const streamPath = req.params.streamPath;
      const filename = req.params.filename;
      
      if (!filename.endsWith('.flv')) {
        res.status(400).json({
          success: false,
          error: 'Invalid file type',
          message: 'Only FLV files can be deleted'
        });
        return;
      }

      const pathParts = streamPath.split('/');
      if (pathParts.length < 2) {
        res.status(400).json({
          success: false,
          error: 'Invalid stream path',
          message: 'Stream path should be in format: app/streamName'
        });
        return;
      }

      const app = pathParts[0];
      const streamName = pathParts[1];
      const filePath = path.join('./records', app, streamName, filename);
      
      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          success: false,
          error: 'File not found',
          message: `File ${filename} not found`
        });
        return;
      }

      fs.unlinkSync(filePath);
      logger.info(`Deleted record file: ${filePath}`);

      res.json({
        success: true,
        message: `File ${filename} deleted successfully`,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`Statistics API DELETE /records error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  return router;
}

/**
 * 获取所有录制文件列表
 * @param {string} recordsPath 
 * @returns {Array}
 */
function getRecordsList(recordsPath) {
  const result = [];
  
  try {
    const apps = fs.readdirSync(recordsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory());
    
    for (const app of apps) {
      const appPath = path.join(recordsPath, app.name);
      const streams = fs.readdirSync(appPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory());
      
      for (const stream of streams) {
        const streamPath = path.join(appPath, stream.name);
        const files = fs.readdirSync(streamPath)
          .filter(file => file.endsWith('.flv'));
        
        if (files.length > 0) {
          const streamData = {
            streamPath: `/${app.name}/${stream.name}`,
            app: app.name,
            streamName: stream.name,
            totalFiles: files.length,
            totalSize: 0,
            lastRecord: '',
            files: /** @type {Array<any>} */ ([])
          };

          files.forEach(file => {
            const filePath = path.join(streamPath, file);
            const stats = fs.statSync(filePath);
            const fileData = {
              filename: file,
              path: `/records/${app.name}/${stream.name}/${file}`,
              size: stats.size,
              created: stats.birthtime.toISOString(),
              modified: stats.mtime.toISOString()
            };
            
            streamData.files.push(fileData);
            streamData.totalSize += stats.size;
            
            if (!streamData.lastRecord || new Date(fileData.created) > new Date(streamData.lastRecord)) {
              streamData.lastRecord = fileData.created;
            }
          });

          // 按创建时间倒序排列
          streamData.files.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
          result.push(streamData);
        }
      }
    }
  } catch (error) {
    logger.error(`Error reading records: ${error.message}`);
  }
  
  return result.sort((a, b) => new Date(b.lastRecord).getTime() - new Date(a.lastRecord).getTime());
}

/**
 * 格式化录制文件的日期
 * @param {string} dateStr - YYYYMMDDHHMMSS格式的日期字符串
 * @returns {string}
 */
function formatRecordDate(dateStr) {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  const hour = dateStr.substring(8, 10);
  const minute = dateStr.substring(10, 12);
  const second = dateStr.substring(12, 14);
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

module.exports = createStatisticsAPI; 