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
   * @param {string} filePath
   */
  constructor(session, filePath) {
    super();
    this.protocol = "flv";
    this.streamApp = session.streamApp;
    this.streamName = session.streamName;
    this.streamPath = session.streamPath;
    this.filePath = filePath;
    this.fileStream = this.createWriteStreamWithDirsSync(filePath);
    /**@type {BroadcastServer} */
    this.broadcast = Context.broadcasts.get(this.streamPath) ?? new BroadcastServer();
    Context.broadcasts.set(this.streamPath, this.broadcast);
  }

  /**
   * 
   * @param {string} filePath 
   * @returns {fs.WriteStream}
   */
  createWriteStreamWithDirsSync(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    return fs.createWriteStream(filePath);
  }

  run() {
    this.broadcast.postPlay(this);
    logger.info(`Record session ${this.id} ${this.streamPath} start record ${this.filePath}`);
    
    // Store the listener as a class property so we can remove it later
    this.donePublishListener = (session) => {
      if (session.streamPath === this.streamPath) {
        // Remove the listener first to prevent multiple calls
        Context.eventEmitter.removeListener("donePublish", this.donePublishListener);
        
        // Only close if not already closed
        if (this.fileStream.writable) {
          this.fileStream.end();  // Use end() instead of close() to ensure data is flushed
          this.broadcast.donePlay(this);
          logger.info(`Record session ${this.id} ${this.streamPath} done record ${this.filePath}`);
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
    this.outBytes += buffer.length;
    this.fileStream.write(buffer);
  };

};

module.exports = NodeRecordSession;
