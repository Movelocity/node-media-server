# 养殖场监控系统 - 统计模块

## 概述

本模块为养殖场监控项目提供实时的直播流统计功能，包括服务器统计信息和各个养殖区（直播流）的监控数据。

## 功能特性

- **实时统计更新**: 每秒自动更新统计信息
- **服务器监控**: 总流数、活跃流数、总观看数、服务器运行时间
- **流监控**: 各个流的观看者数、比特率、在线状态、运行时间
- **RESTful API**: 提供标准的HTTP API接口
- **自动集成**: 与现有的node-media-server无缝集成

## 模块结构

```
src/statistics/
├── index.js                 # 模块入口
├── statistics_manager.js    # 统计数据管理器
├── statistics_api.js        # API路由定义
├── statistics_server.js     # 统计服务器
└── README.md                # 说明文档
```

## API 端点

### 1. 服务器统计信息
```
GET /api/statistics/server
```

返回示例：
```json
{
  "success": true,
  "data": {
    "totalStreams": 3,
    "activeStreams": 2,
    "totalViewers": 15,
    "serverUptime": "02:34:12"
  },
  "timestamp": 1703123456789
}
```

### 2. 所有流统计信息
```
GET /api/statistics/streams
```

返回示例：
```json
{
  "success": true,
  "data": [
    {
      "id": "/live/pig-area-1",
      "name": "pig-area-1",
      "viewers": 8,
      "bitrate": "1024 kbps",
      "status": "online",
      "uptime": "01:22:45",
      "protocol": "RTMP"
    }
  ],
  "timestamp": 1703123456789
}
```

### 3. 指定流统计信息
```
GET /api/statistics/streams/:streamPath
```

### 4. Dashboard完整数据
```
GET /api/statistics/dashboard
```

返回示例：
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
    "streams": [...]
  },
  "timestamp": 1703123456789
}
```

### 5. 健康检查
```
GET /api/statistics/health
```

### 6. 重置统计数据
```
POST /api/statistics/reset
```

## 使用说明

### 自动启动

统计功能已经集成到HTTP服务器中，当启动node-media-server时会自动启动统计功能。

### 配置

无需额外配置，使用默认设置即可正常工作。

### Dashboard集成

前端dashboard可以通过以下方式获取数据：

```javascript
// 获取完整监控数据
const response = await fetch('/api/statistics/dashboard');
const data = await response.json();

if (data.success) {
  const { server, streams } = data.data;
  // 更新UI显示
}
```

## 数据格式

### 服务器统计
- `totalStreams`: 总流数（包括在线和离线）
- `activeStreams`: 当前在线的流数
- `totalViewers`: 所有流的观看者总数
- `serverUptime`: 服务器运行时间

### 流统计
- `id`: 流的唯一标识（路径）
- `name`: 流名称（养殖区名称）
- `viewers`: 当前观看者数量
- `bitrate`: 当前比特率
- `status`: 状态（"online" | "offline"）
- `uptime`: 流运行时间
- `protocol`: 使用的协议（RTMP/FLV/HLS等）

## 扩展功能

如需扩展统计功能，可以：

1. 修改 `StatisticsManager` 类添加新的统计指标
2. 在 `statistics_api.js` 中添加新的API端点
3. 根据需要调整统计更新频率（默认1秒）

## 注意事项

- 统计数据在内存中维护，服务器重启后会重置
- 比特率计算基于输入字节数的变化
- 运行时间从流开始推送时计算
- 观看者数量基于当前连接的session数量 