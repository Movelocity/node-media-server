# 养殖场监控系统 - 完整指南

## 系统概述

这是一个基于Node-Media-Server的养殖场实时监控系统，提供：

- 🎥 **实时视频流监控** - 支持RTMP/FLV/HLS等多种协议
- 📊 **实时统计分析** - 服务器状态、流状态、观看者统计
- 💾 **自动录制保存** - 自动切片保存监控视频
- 🌐 **Web管理界面** - Dashboard实时监控面板
- 🔌 **RESTful API** - 提供完整的统计数据接口

## 快速开始

### 1. 启动测试服务器

```bash
# 进入node-media-server目录
cd node-media-server

# 安装依赖
npm install

# 启动测试服务器
node test-server.js
```

服务器启动后会显示：
- RTMP端口: 1935
- HTTP端口: 8000
- 统计API: http://localhost:8000/api/statistics/dashboard

### 2. 测试推流

使用FFmpeg推送测试视频流：

```bash
# 推流到养殖区1
ffmpeg -re -i your_video.mp4 -c copy -f flv rtmp://localhost:1935/live/pig-area-1

# 推流到养殖区2  
ffmpeg -re -i your_video.mp4 -c copy -f flv rtmp://localhost:1935/live/pig-area-2
```

### 3. 观看直播流

在支持的播放器中打开：
- **RTMP**: `rtmp://localhost:1935/live/pig-area-1`
- **FLV**: `http://localhost:8000/live/pig-area-1.flv`

### 4. 查看监控数据

**浏览器访问API端点：**
- 完整监控数据: http://localhost:8000/api/statistics/dashboard
- 服务器统计: http://localhost:8000/api/statistics/server
- 流统计: http://localhost:8000/api/statistics/streams
- 健康检查: http://localhost:8000/api/statistics/health

## 系统架构

```
养殖场监控系统
├── 📡 RTMP服务器 (端口1935)
│   ├── 接收养殖区摄像头推流
│   └── 支持多路并发流
├── 🌐 HTTP服务器 (端口8000)
│   ├── FLV流分发
│   ├── 静态文件服务
│   └── RESTful API
├── 📊 统计模块
│   ├── 实时数据收集
│   ├── 统计分析
│   └── API接口
├── 💾 录制模块
│   ├── 自动MP4录制
│   ├── HLS切片
│   └── 文件管理
└── 🎯 监控面板
    ├── 实时状态显示
    ├── 流管理
    └── 数据可视化
```

## API 接口文档

### 1. 获取完整监控数据
```http
GET /api/statistics/dashboard
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "server": {
      "totalStreams": 3,
      "activeStreams": 2,
      "totalViewers": 15,
      "serverUptime": "02:34:12"
    },
    "streams": [
      {
        "id": "/live/pig-area-1",
        "name": "pig-area-1",
        "viewers": 8,
        "bitrate": "1024 kbps",
        "status": "online",
        "uptime": "01:22:45",
        "protocol": "RTMP"
      }
    ]
  },
  "timestamp": 1703123456789
}
```

### 2. 获取服务器统计
```http
GET /api/statistics/server
```

### 3. 获取流统计
```http
GET /api/statistics/streams
```

### 4. 获取特定流统计
```http
GET /api/statistics/streams/:streamPath
```

### 5. 重置统计数据
```http
POST /api/statistics/reset
```

### 6. 健康检查
```http
GET /api/statistics/health
```

## Dashboard集成

前端可以通过以下方式获取实时数据：

```javascript
// 获取完整监控数据
const fetchMonitoringData = async () => {
  try {
    const response = await fetch('/api/statistics/dashboard');
    const data = await response.json();
    
    if (data.success) {
      const { server, streams } = data.data;
      // 更新UI显示
      updateServerStats(server);
      updateStreamList(streams);
    }
  } catch (error) {
    console.error('获取监控数据失败:', error);
  }
};

// 定时更新（建议3-5秒间隔）
setInterval(fetchMonitoringData, 3000);
```

## 配置选项

### 基础配置
```javascript
const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*'
  }
};
```

### 录制配置
```javascript
record: {
  enabled: true,
  path: './records',
  hls: true,
  mp4: true,
  mp4Flags: '[f=mp4:movflags=faststart]'
}
```

### 认证配置
```javascript
auth: {
  play: false,    // 播放认证
  publish: false, // 推流认证  
  secret: 'your-secret-key'
}
```

## 部署说明

### 生产环境部署

1. **安装依赖**
```bash
npm install --production
```

2. **配置环境变量**
```bash
export NODE_ENV=production
export RTMP_PORT=1935
export HTTP_PORT=8000
```

3. **启动服务**
```bash
# 使用PM2管理进程
pm2 start src/index.js --name pig-monitoring

# 或使用systemd
sudo systemctl start pig-monitoring
```

### Docker部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 1935 8000
CMD ["node", "test-server.js"]
```

## 监控指标

### 服务器指标
- **总流数**: 所有注册的流（包括在线和离线）
- **活跃流数**: 当前正在推流的数量
- **总观看数**: 所有流的观看者总和
- **服务器运行时间**: 自启动以来的运行时间

### 流指标
- **观看者数**: 当前连接的播放客户端数量
- **比特率**: 实时计算的流比特率
- **状态**: online/offline
- **运行时间**: 流推送的持续时间
- **协议**: RTMP/FLV/HLS等

## 故障排除

### 常见问题

1. **无法推流**
   - 检查RTMP端口1935是否开放
   - 确认推流地址格式正确
   - 查看服务器日志

2. **API无响应**
   - 检查HTTP端口8000是否开放
   - 确认统计服务是否启动
   - 检查CORS设置

3. **统计数据不更新**
   - 检查统计管理器是否正常运行
   - 确认定时器是否设置
   - 查看错误日志

### 日志查看
```bash
# 查看服务器日志
tail -f logs/server.log

# 查看错误日志  
tail -f logs/error.log
```

## 扩展功能

### 添加新的统计指标

1. 修改 `StatisticsManager` 类
2. 添加新的数据收集逻辑
3. 更新API响应格式
4. 修改前端显示

### 集成外部系统

可以通过API接口将监控数据推送到：
- 数据库系统
- 监控平台
- 告警系统
- 第三方分析工具

## 技术支持

- 📚 [完整技术文档](./src/statistics/README.md)
- 🔧 [配置示例](./examples/pig-farm-config.js)
- 💻 [API详细说明](./src/statistics/README.md#api-端点)

## 许可证

本项目基于NodeMediaServer开发，遵循相应的开源许可证。 