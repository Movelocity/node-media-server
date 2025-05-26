// @ts-check
//
//  Created for pig-project monitoring system
//  Statistics manager for live streaming monitoring
//

const Context = require("../core/context.js");
const logger = require("../core/logger.js");

/**
 * 统计管理器类 - 负责收集和管理直播流统计信息
 */
class StatisticsManager {
  constructor() {
    this.serverStartTime = Date.now();
    this.streamStats = new Map(); // 存储每个流的统计信息
    this.serverStats = {
      totalStreams: 0,
      activeStreams: 0,
      totalViewers: 0,
      serverUptime: '0s'
    };
    
    // 定期更新统计信息
    this.updateInterval = setInterval(() => {
      this.updateStatistics();
    }, 1000); // 每秒更新一次
  }

  /**
   * 更新统计信息
   */
  updateStatistics() {
    this.updateServerStats();
    this.updateStreamStats();
  }

  /**
   * 更新服务器统计信息
   */
  updateServerStats() {
    const broadcasts = Context.broadcasts;
    const sessions = Context.sessions;
    
    let totalViewers = 0;
    let activeStreams = 0;
    
    // 统计活跃流和观看者
    broadcasts.forEach((broadcast, streamPath) => {
      if (broadcast.publisher !== null) {
        activeStreams++;
        totalViewers += broadcast.subscribers.size;
      }
    });
    
    this.serverStats = {
      totalStreams: broadcasts.size,
      activeStreams: activeStreams,
      totalViewers: totalViewers,
      serverUptime: this.formatUptime(Date.now() - this.serverStartTime)
    };
  }

  /**
   * 更新流统计信息
   */
  updateStreamStats() {
    const broadcasts = Context.broadcasts;
    
    broadcasts.forEach((broadcast, streamPath) => {
      const pathParts = streamPath.split('/');
      const streamName = pathParts[pathParts.length - 1];
      
      // 获取发布者session信息
      const publisher = broadcast.publisher;
      const isOnline = publisher !== null;
      const viewers = broadcast.subscribers.size;
      
      let streamInfo = this.streamStats.get(streamPath) || {
        id: streamPath,
        name: streamName,
        viewers: 0,
        bitrate: '0 kbps',
        status: 'offline',
        uptime: '00:00:00',
        protocol: 'RTMP',
        createTime: Date.now(),
        totalBytes: 0,
        lastBitrateUpdate: Date.now()
      };
      
      if (isOnline && publisher) {
        streamInfo.status = 'online';
        streamInfo.viewers = viewers;
        streamInfo.protocol = publisher.protocol?.toUpperCase() || 'RTMP';
        streamInfo.uptime = this.formatUptime(Date.now() - (publisher.createTime || streamInfo.createTime));
        
        // 计算比特率（基于输入字节数变化）
        const currentTime = Date.now();
        const timeDiff = (currentTime - streamInfo.lastBitrateUpdate) / 1000; // 秒
        const bytesDiff = (publisher.inBytes || 0) - streamInfo.totalBytes;
        
        if (timeDiff > 0) {
          const bitrate = Math.round((bytesDiff * 8) / timeDiff / 1024); // kbps
          streamInfo.bitrate = `${bitrate} kbps`;
          streamInfo.totalBytes = publisher.inBytes || 0;
          streamInfo.lastBitrateUpdate = currentTime;
        }
      } else {
        streamInfo.status = 'offline';
        streamInfo.viewers = 0;
        streamInfo.bitrate = '0 kbps';
        streamInfo.uptime = '00:00:00';
      }
      
      this.streamStats.set(streamPath, streamInfo);
    });
  }

  /**
   * 格式化运行时间
   * @param {number} milliseconds 
   * @returns {string}
   */
  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h ${minutes}m`;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * 获取服务器统计信息
   * @returns {object} 服务器统计数据
   */
  getServerStats() {
    return { ...this.serverStats };
  }

  /**
   * 获取所有流的统计信息
   * @returns {Array} 流统计数据数组
   */
  getStreamStats() {
    return Array.from(this.streamStats.values()).map(stream => ({
      id: stream.id,
      name: stream.name,
      viewers: stream.viewers,
      bitrate: stream.bitrate,
      status: stream.status,
      uptime: stream.uptime,
      protocol: stream.protocol
    }));
  }

  /**
   * 获取指定流的统计信息
   * @param {string} streamPath 流路径
   * @returns {object|null} 流统计数据
   */
  getStreamStatById(streamPath) {
    const stream = this.streamStats.get(streamPath);
    return stream ? { ...stream } : null;
  }

  /**
   * 重置统计信息
   */
  reset() {
    this.serverStartTime = Date.now();
    this.streamStats.clear();
  }

  /**
   * 销毁统计管理器
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      // this.updateInterval = undefined;
    }
  }
}

module.exports = StatisticsManager; 