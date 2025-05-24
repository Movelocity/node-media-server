// @ts-check
//
//  Created by Chen Mingliang on 25/04/24.
//  illuspas@msn.com
//  Copyright (c) 2025 Nodemedia. All rights reserved.
//

const fs = require("node:fs");
const path = require("node:path");
const logger = require("../core/logger.js");
const BaseSession = require("./base_session");
const BroadcastServer = require("../server/broadcast_server.js");
const Context = require("../core/context.js");

class NodeRecordSession extends BaseSession {

  /**
   * 
   * @param {BaseSession} session 
   * @param {string} recordPath 
   * @param {number} segmentDuration 分片时长(秒)，默认30分钟
   */
  constructor(session, recordPath, segmentDuration = 1800) {
    super();
    this.protocol = "flv";
    this.streamApp = session.streamApp;
    this.streamName = session.streamName;
    this.streamPath = session.streamPath;
    this.recordPath = recordPath;
    this.segmentDuration = segmentDuration * 1000; // 转换为毫秒
    this.currentSegmentStartTime = Date.now();
    this.segmentIndex = 0;
    
    // 创建流目录
    this.streamDir = path.join(recordPath, this.streamApp, this.streamName);
    fs.mkdirSync(this.streamDir, { recursive: true });
    
    // 创建第一个分片文件
    this.createNewSegment();
    
    /**@type {BroadcastServer} */
    this.broadcast = Context.broadcasts.get(this.streamPath) ?? new BroadcastServer();
    Context.broadcasts.set(this.streamPath, this.broadcast);
    
    // 设置分片轮转定时器
    this.segmentTimer = null;
  }

  /**
   * 创建新的分片文件
   */
  createNewSegment() {
    // 关闭当前文件流
    if (this.fileStream && this.fileStream.writable) {
      this.fileStream.end();
      logger.info(`Record segment completed: ${this.currentFilePath}`);
    }
    
    // 生成新的文件名：YYYYMMDD_HHMMSS_segment_N.flv
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(0, 14);
    this.segmentIndex++;
    
    const fileName = `${dateStr}_segment_${this.segmentIndex.toString().padStart(3, '0')}.flv`;
    this.currentFilePath = path.join(this.streamDir, fileName);
    this.currentSegmentStartTime = now.getTime();
    
    // 创建新的文件流
    this.fileStream = fs.createWriteStream(this.currentFilePath);
    logger.info(`Record new segment started: ${this.currentFilePath}`);
  }

  /**
   * 检查是否需要轮转到新分片
   */
  checkSegmentRotation() {
    const now = Date.now();
    if (now - this.currentSegmentStartTime >= this.segmentDuration) {
      this.createNewSegment();
      
      // 重新订阅广播，确保新文件接收到完整的流信息
      this.broadcast.donePlay(this);
      this.broadcast.postPlay(this);
    }
  }

  run() {
    this.broadcast.postPlay(this);
    logger.info(`Record session ${this.id} ${this.streamPath} start record in ${this.streamDir}`);
    
    // 设置分片检查定时器（每分钟检查一次）
    this.segmentTimer = setInterval(() => {
      this.checkSegmentRotation();
    }, 60000);
    
    // Store the listener as a class property so we can remove it later
    this.donePublishListener = (session) => {
      if (session.streamPath === this.streamPath) {
        // Remove the listener first to prevent multiple calls
        Context.eventEmitter.removeListener("donePublish", this.donePublishListener);
        
        // 清理定时器
        if (this.segmentTimer) {
          clearInterval(this.segmentTimer);
          this.segmentTimer = null;
        }
        
        // Only close if not already closed
        if (this.fileStream && this.fileStream.writable) {
          this.fileStream.end();  // Use end() instead of close() to ensure data is flushed
          this.broadcast.donePlay(this);
          logger.info(`Record session ${this.id} ${this.streamPath} done record. Total segments: ${this.segmentIndex}`);
          Context.eventEmitter.emit("doneRecord", session);
        }
      }
    };
    
    Context.eventEmitter.on("donePublish", this.donePublishListener);
  }

  /**
   * @override
   * @param {Buffer} buffer
   */
  sendBuffer = (buffer) => {
    if (this.fileStream && this.fileStream.writable) {
      this.outBytes += buffer.length;
      this.fileStream.write(buffer);
    }
  };

  /**
   * 手动停止录制
   */
  stop() {
    if (this.segmentTimer) {
      clearInterval(this.segmentTimer);
      this.segmentTimer = null;
    }
    
    if (this.fileStream && this.fileStream.writable) {
      this.fileStream.end();
    }
    
    if (this.donePublishListener) {
      Context.eventEmitter.removeListener("donePublish", this.donePublishListener);
    }
    
    this.broadcast.donePlay(this);
    logger.info(`Record session ${this.id} manually stopped`);
  }
}

module.exports = NodeRecordSession;
