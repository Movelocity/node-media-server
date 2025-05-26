// @ts-check
//
//  Pig Farm Monitoring System Configuration
//  养殖场监控系统配置示例
//

const config = {
  // RTMP 服务器配置
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },

  // HTTP 服务器配置（包含统计API）
  http: {
    port: 8000,
    allow_origin: '*',
    mediaroot: './media'
  },

  // 可选的HTTPS配置
  // https: {
  //   port: 8443,
  //   key: './privatekey.pem',
  //   cert: './certificate.pem'
  // },

  // 静态文件服务配置（可选，用于serving dashboard）
  static: {
    router: '/dashboard',
    root: './dashboard/dist'
  },

  // 录制配置（自动保存功能）
  record: {
    enabled: true,
    path: './records',
    hls: true,
    mp4: true,
    mp4Flags: '[f=mp4:movflags=faststart]'
  },

  // 中继配置（可选）
  relay: {
    ffmpeg: '/usr/local/bin/ffmpeg',
    tasks: [
      // 示例：将养殖区1的流中继到其他服务器
      // {
      //   app: 'live',
      //   mode: 'push',
      //   edge: 'rtmp://backup-server/live'
      // }
    ]
  },

  // 认证配置（可选）
  auth: {
    play: false,    // 是否启用播放认证
    publish: false, // 是否启用推流认证
    secret: 'your-secret-key'
  },

  // 日志配置
  logType: 3, // 0-不输出日志 1-只输出错误 2-输出错误和警告 3-输出所有信息

  // 事件钩子配置（可选）
  hooks: {
    // 推流开始事件
    postPublish: (id, StreamPath, args) => {
      console.log(`[${new Date().toISOString()}] 养殖区 ${StreamPath} 开始推流`);
      // 这里可以添加推流开始的业务逻辑
      // 例如：发送通知、记录日志、更新数据库等
    },

    // 推流结束事件
    donePublish: (id, StreamPath, args) => {
      console.log(`[${new Date().toISOString()}] 养殖区 ${StreamPath} 停止推流`);
      // 这里可以添加推流结束的业务逻辑
    },

    // 播放开始事件
    postPlay: (id, StreamPath, args) => {
      console.log(`[${new Date().toISOString()}] 用户开始观看 ${StreamPath}`);
    },

    // 播放结束事件
    donePlay: (id, StreamPath, args) => {
      console.log(`[${new Date().toISOString()}] 用户停止观看 ${StreamPath}`);
    }
  }
};

module.exports = config;

// 使用示例：
// const NodeMediaServer = require('node-media-server');
// const server = new NodeMediaServer(config);
// server.run();
//
// 统计API将自动在以下端点可用：
// http://localhost:8000/api/statistics/dashboard
// http://localhost:8000/api/statistics/server
// http://localhost:8000/api/statistics/streams 