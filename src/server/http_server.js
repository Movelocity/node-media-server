// @ts-check
//
//  Created by Chen Mingliang on 23/12/01.
//  illuspas@msn.com
//  Copyright (c) 2023 Nodemedia. All rights reserved.
//

const fs = require("fs");
const http = require("http");
const http2 = require("http2");
const express = require("express");
const cors = require("cors");
const logger = require("../core/logger.js");
const http2Express = require("http2-express");
const FlvSession = require("../session/flv_session.js");
const StatisticsServer = require("../statistics/statistics_server.js");

class NodeHttpServer {
  // @ts-ignore
  constructor(config) {
    this.config = config;
    const app = http2Express(express);

    // 初始化统计服务器
    this.statisticsServer = new StatisticsServer(config);

    if (config.static?.router && config.static?.root) {
      // @ts-ignore
      app.use(config.static.router, express.static(config.static.root));
      logger.info(`Static server enabled at ${config.static.router} -> ${config.static.root}`);
    }

    // 添加录制文件的静态服务
    if (config.record?.path) {
      // @ts-ignore
      app.use('/records', express.static(config.record.path));
      logger.info(`Records static server enabled at /records -> ${config.record.path}`);
      
      // 如果dashboard有自定义路由，也在dashboard路径下提供录制文件访问
      if (config.static?.router && config.static.router !== '/') {
        // @ts-ignore
        app.use(config.static.router + '/records', express.static(config.record.path));
        logger.info(`Records static server also enabled at ${config.static.router}/records -> ${config.record.path}`);
      }
    }

    // @ts-ignore
    app.use(cors());
    
    // @ts-ignore
    app.use(express.json());

    // @ts-ignore
    app.all("/:app/:name.flv", this.handleFlv);

    // 存储app实例供run方法使用
    this.app = app;

    if (this.config.http?.port) {
      this.httpServer = http.createServer(app);
    }
    if (this.config.https?.port) {
      const opt = {
        key: fs.readFileSync(this.config.https.key),
        cert: fs.readFileSync(this.config.https.cert),
        allowHTTP1: true
      };
      this.httpsServer = http2.createSecureServer(opt, app);
    }

  }

  run = () => {
    // 启动统计服务器
    this.statisticsServer.run();
    
    // 注册统计API路由
    const statisticsApiRouter = this.statisticsServer.getApiRouter();
    if (statisticsApiRouter) {
      // @ts-ignore
      this.app.use('/api/statistics', statisticsApiRouter);
      logger.info('Statistics API endpoints registered at /api/statistics/*');
    }

    this.httpServer?.listen(this.config.http.port, this.config.bind, () => {
      logger.info(`HTTP server listening on port ${this.config.bind}:${this.config.http.port}`);
    });
    this.httpsServer?.listen(this.config.https.port, this.config.bind, () => {
      logger.info(`HTTPS server listening on port ${this.config.bind}:${this.config.https.port}`);
    });
  };

  /**
   * @param {express.Request} req
   * @param {express.Response} res
   */
  handleFlv = (req, res) => {
    const session = new FlvSession(req, res);
    session.run();
  };
}

module.exports = NodeHttpServer;
