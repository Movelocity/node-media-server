// @ts-check
//
//  Created by Chen Mingliang on 25/04/24.
//  illuspas@msn.com
//  Copyright (c) 2025 Nodemedia. All rights reserved.
//

const fs = require("node:fs");
const path = require("node:path");
const logger = require("../core/logger.js");
const Context = require("../core/context.js");
const NodeRecordSession = require("../session/record_session.js");

class NodeRecordServer {
  constructor(config) {
    this.config = config;
    this.recordSessions = new Map(); // 存储活跃的录制会话
  }

  run() {
    if (this.config.record?.path) {
      try {
        fs.mkdirSync(this.config.record.path, { recursive: true });
        fs.accessSync(this.config.record.path, fs.constants.W_OK);
      } catch (error) {
        logger.error(`record path ${this.config.record.path} has no write permission. ${error}`);
        return;
      }
      
      // 获取分片时长配置，默认30分钟
      const segmentDuration = this.config.record.segmentDuration || 1800;
      
      logger.info(`Record server start on the path ${this.config.record.path}`);
      logger.info(`Record segment duration: ${segmentDuration} seconds`);
      
      Context.eventEmitter.on("postPublish", (session) => {
        // 检查是否已经有录制会话在运行
        if (this.recordSessions.has(session.streamPath)) {
          logger.warn(`Record session for ${session.streamPath} already exists`);
          return;
        }
        
        // 创建新的录制会话
        let recordSession = new NodeRecordSession(session, this.config.record.path, segmentDuration);
        this.recordSessions.set(session.streamPath, recordSession);
        recordSession.run();
        
        logger.info(`Started recording for stream: ${session.streamPath}`);
      });
      
      // 监听推流结束事件，清理录制会话
      Context.eventEmitter.on("donePublish", (session) => {
        const recordSession = this.recordSessions.get(session.streamPath);
        if (recordSession) {
          this.recordSessions.delete(session.streamPath);
          logger.info(`Stopped recording for stream: ${session.streamPath}`);
        }
      });
      
      // 监听录制完成事件
      Context.eventEmitter.on("doneRecord", (session) => {
        logger.info(`Record completed for stream: ${session.streamPath}`);
      });
    }
  }

  /**
   * 手动停止指定流的录制
   * @param {string} streamPath 
   */
  stopRecord(streamPath) {
    const recordSession = this.recordSessions.get(streamPath);
    if (recordSession) {
      recordSession.stop();
      this.recordSessions.delete(streamPath);
      logger.info(`Manually stopped recording for stream: ${streamPath}`);
      return true;
    }
    return false;
  }

  /**
   * 获取所有活跃的录制会话
   * @returns {Array} 
   */
  getActiveRecords() {
    return Array.from(this.recordSessions.keys());
  }

  /**
   * 停止所有录制
   */
  stopAllRecords() {
    this.recordSessions.forEach((session, streamPath) => {
      session.stop();
      logger.info(`Stopped recording for stream: ${streamPath}`);
    });
    this.recordSessions.clear();
  }
}

module.exports = NodeRecordServer;
