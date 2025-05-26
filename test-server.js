// @ts-check
//
//  Test server for pig-project monitoring system
//  用于测试养殖场监控系统的简单服务器
//

const NodeMediaServer = require('./src/index.js');

// 测试配置
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
    allow_origin: '*'
  },

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

  // 日志配置
  logType: 3 // 输出所有信息
};

// 创建并启动服务器
const nms = new NodeMediaServer(config);

// 添加事件监听器
nms.on('postPublish', (id, StreamPath, args) => {
  console.log(`[${new Date().toISOString()}] 🐷 养殖区 ${StreamPath} 开始推流`);
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log(`[${new Date().toISOString()}] 🔴 养殖区 ${StreamPath} 停止推流`);
});

nms.on('postPlay', (id, StreamPath, args) => {
  console.log(`[${new Date().toISOString()}] 👀 用户开始观看 ${StreamPath}`);
});

nms.on('donePlay', (id, StreamPath, args) => {
  console.log(`[${new Date().toISOString()}] 👋 用户停止观看 ${StreamPath}`);
});

// 启动服务器
console.log('\n🚀 启动养殖场监控系统...\n');
console.log('配置信息:');
console.log(`📡 RTMP 端口: ${config.rtmp.port}`);
console.log(`🌐 HTTP 端口: ${config.http.port}`);
console.log(`📊 统计API: http://localhost:${config.http.port}/api/statistics/dashboard`);
console.log(`🎯 健康检查: http://localhost:${config.http.port}/api/statistics/health`);
console.log('\n可用的API端点:');
console.log('  GET /api/statistics/server - 服务器统计信息');
console.log('  GET /api/statistics/streams - 所有流统计信息');
console.log('  GET /api/statistics/dashboard - 完整监控数据');
console.log('  GET /api/statistics/health - 健康检查');
console.log('  POST /api/statistics/reset - 重置统计数据');

console.log('\n推流测试命令:');
console.log(`  ffmpeg -re -i your_video.mp4 -c copy -f flv rtmp://localhost:${config.rtmp.port}/live/pig-area-1`);
console.log('\n播放测试地址:');
console.log(`  RTMP: rtmp://localhost:${config.rtmp.port}/live/pig-area-1`);
console.log(`  FLV:  http://localhost:${config.http.port}/live/pig-area-1.flv`);

nms.run();

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n\n🛑 正在关闭服务器...');
  process.exit(0);
});

console.log('\n✅ 服务器启动完成！按 Ctrl+C 停止服务器\n'); 