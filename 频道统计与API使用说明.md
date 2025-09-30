# 频道统计与API使用说明

## 📊 后端频道统计机制分析

### 1. 核心数据结构

#### Context.broadcasts (核心存储)
```javascript
// src/core/context.js
Context = {
  broadcasts: new Map(),  // key: streamPath (如 "/live/yard-1")
                         // value: BroadcastServer 实例
  sessions: new Map(),    // 存储所有会话
}
```

#### BroadcastServer 结构
```javascript
// src/server/broadcast_server.js
class BroadcastServer {
  publisher: BaseSession | null      // 推流者（只能有一个）
  subscribers: Map<string, BaseSession>  // 拉流者（可多个）
}
```

### 2. 频道统计流程

#### 2.1 频道创建
- 当有客户端推流或拉流时，系统自动在 `Context.broadcasts` 中创建频道
- **推流**: `postPublish()` → 设置 `publisher`
- **拉流**: `postPlay()` → 添加到 `subscribers`

#### 2.2 统计数据收集
StatisticsManager 每秒执行一次统计更新：

```javascript
// src/statistics/statistics_manager.js

// 1. 遍历所有 broadcasts
broadcasts.forEach((broadcast, streamPath) => {
  const publisher = broadcast.publisher;
  const isOnline = publisher !== null;
  const viewers = broadcast.subscribers.size;
  
  // 2. 收集频道信息
  streamInfo = {
    id: streamPath,              // "/live/yard-1"
    name: streamName,            // "yard-1"
    viewers: viewers,            // 观看者数量
    bitrate: "1024 kbps",       // 码率
    status: isOnline ? "online" : "offline",
    uptime: "00:15:30",         // 运行时间
    protocol: "RTMP",           // 协议类型
    totalBytes: publisher.inBytes  // 传输字节数
  };
  
  // 3. 存储到 streamStats Map
  this.streamStats.set(streamPath, streamInfo);
});
```

### 3. API 端点详解

#### 3.1 获取所有频道列表 ⭐
```http
GET /api/statistics/streams
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "/live/yard-1",
      "name": "yard-1",
      "viewers": 2,
      "bitrate": "1024 kbps",
      "status": "online",
      "uptime": "00:15:30",
      "protocol": "RTMP"
    },
    {
      "id": "/live/demo",
      "name": "demo",
      "viewers": 0,
      "bitrate": "0 kbps",
      "status": "offline",
      "uptime": "00:00:00",
      "protocol": "RTMP"
    }
  ],
  "timestamp": 1727683772855
}
```

#### 3.2 获取单个频道信息
```http
GET /api/statistics/streams/live/yard-1
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": "/live/yard-1",
    "name": "yard-1",
    "viewers": 2,
    "bitrate": "1024 kbps",
    "status": "online",
    "uptime": "00:15:30",
    "protocol": "RTMP",
    "createTime": 1727683000000,
    "totalBytes": 15728640,
    "lastBitrateUpdate": 1727683772855
  },
  "timestamp": 1727683772855
}
```

#### 3.3 获取仪表盘数据
```http
GET /api/statistics/dashboard
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "server": {
      "totalStreams": 5,
      "activeStreams": 2,
      "totalViewers": 8,
      "serverUptime": "2d 5h 30m"
    },
    "streams": [
      // 所有流的统计信息数组
    ]
  },
  "timestamp": 1727683772855
}
```

#### 3.4 获取录制文件列表
```http
GET /api/statistics/records
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "streamPath": "/live/yard-1",
      "app": "live",
      "streamName": "yard-1",
      "totalFiles": 3,
      "totalSize": 52428800,
      "lastRecord": "2025-09-30T10:29:32.000Z",
      "files": [
        {
          "filename": "20250930102932_segment_001.flv",
          "path": "/records/live/yard-1/20250930102932_segment_001.flv",
          "size": 17476266,
          "created": "2025-09-30T10:29:32.000Z",
          "modified": "2025-09-30T10:30:15.000Z"
        }
      ]
    }
  ],
  "timestamp": 1727683772855
}
```

#### 3.5 其他端点
```http
GET /api/statistics/server          # 获取服务器统计
GET /api/statistics/health          # 健康检查
POST /api/statistics/reset          # 重置统计数据
GET /api/statistics/records/:streamPath  # 获取指定流的录制文件
DELETE /api/statistics/records/:streamPath/:filename  # 删除录制文件
```

## 🎯 前端使用示例

### 1. 获取频道列表（用于下拉选择）

```javascript
/**
 * 获取所有可用频道列表
 */
async function fetchAvailableStreams() {
  try {
    const response = await fetch('http://localhost:8000/api/statistics/streams');
    const result = await response.json();
    
    if (result.success) {
      return result.data.map(stream => ({
        value: stream.id,        // "/live/yard-1"
        label: stream.name,      // "yard-1"
        status: stream.status,   // "online" 或 "offline"
        viewers: stream.viewers  // 观看者数量
      }));
    }
    
    throw new Error('Failed to fetch streams');
  } catch (error) {
    console.error('获取频道列表失败:', error);
    return [];
  }
}

/**
 * 渲染频道选择下拉框
 */
async function renderStreamSelector() {
  const streams = await fetchAvailableStreams();
  const select = document.getElementById('streamSelect');
  
  select.innerHTML = '<option value="">请选择频道</option>';
  
  streams.forEach(stream => {
    const option = document.createElement('option');
    option.value = stream.value;
    option.textContent = `${stream.label} ${stream.status === 'online' ? '🟢' : '⚫'} (${stream.viewers}人观看)`;
    option.disabled = stream.status === 'offline';
    select.appendChild(option);
  });
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
  renderStreamSelector();
  
  // 每5秒刷新一次频道列表
  setInterval(renderStreamSelector, 5000);
});
```

### 2. 完整的频道选择器组件

```html
<!DOCTYPE html>
<html>
<head>
  <title>频道选择器</title>
  <style>
    .stream-selector {
      max-width: 500px;
      margin: 20px auto;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
    }
    
    .stream-option {
      padding: 10px;
      margin: 5px 0;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .stream-option:hover {
      background-color: #f0f0f0;
    }
    
    .stream-option.offline {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .stream-option.selected {
      background-color: #4CAF50;
      color: white;
    }
    
    .status-indicator {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 8px;
    }
    
    .status-online { background-color: #4CAF50; }
    .status-offline { background-color: #999; }
    
    .stream-info {
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="stream-selector">
    <h2>选择养殖区</h2>
    <div id="streamList"></div>
    <div id="selectedInfo" style="margin-top: 20px;"></div>
  </div>

  <script>
    class StreamSelector {
      constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.selectedStream = null;
        this.streams = [];
        this.init();
      }
      
      async init() {
        await this.loadStreams();
        this.render();
        
        // 定时刷新
        setInterval(() => this.loadStreams(), 5000);
      }
      
      async loadStreams() {
        try {
          const response = await fetch('http://localhost:8000/api/statistics/streams');
          const result = await response.json();
          
          if (result.success) {
            this.streams = result.data;
            this.render();
          }
        } catch (error) {
          console.error('加载频道失败:', error);
        }
      }
      
      render() {
        if (this.streams.length === 0) {
          this.container.innerHTML = '<p>暂无可用频道</p>';
          return;
        }
        
        this.container.innerHTML = this.streams.map(stream => `
          <div class="stream-option ${stream.status === 'offline' ? 'offline' : ''} 
                      ${this.selectedStream?.id === stream.id ? 'selected' : ''}"
               onclick="streamSelector.selectStream('${stream.id}')"
               data-stream-id="${stream.id}">
            <div>
              <span class="status-indicator status-${stream.status}"></span>
              <strong>${stream.name}</strong>
            </div>
            <div class="stream-info">
              ${stream.status === 'online' 
                ? `📡 ${stream.bitrate} | 👥 ${stream.viewers}人 | ⏱️ ${stream.uptime}`
                : '离线'}
            </div>
          </div>
        `).join('');
      }
      
      selectStream(streamId) {
        this.selectedStream = this.streams.find(s => s.id === streamId);
        if (this.selectedStream && this.selectedStream.status === 'online') {
          this.render();
          this.showSelectedInfo();
          
          // 触发自定义事件
          window.dispatchEvent(new CustomEvent('streamSelected', {
            detail: this.selectedStream
          }));
        }
      }
      
      showSelectedInfo() {
        const info = document.getElementById('selectedInfo');
        if (this.selectedStream) {
          info.innerHTML = `
            <h3>已选择: ${this.selectedStream.name}</h3>
            <p>播放地址: <code>http://localhost:8000${this.selectedStream.id}.flv</code></p>
            <p>当前状态: ${this.selectedStream.status}</p>
            <p>观看人数: ${this.selectedStream.viewers}</p>
            <p>码率: ${this.selectedStream.bitrate}</p>
          `;
        }
      }
    }
    
    // 初始化
    const streamSelector = new StreamSelector('streamList');
    
    // 监听频道选择事件
    window.addEventListener('streamSelected', (event) => {
      console.log('选择了频道:', event.detail);
      // 这里可以启动播放器等操作
    });
  </script>
</body>
</html>
```

### 3. React/Vue 组件示例

#### React 版本
```jsx
import React, { useState, useEffect } from 'react';

function StreamSelector({ onStreamSelect }) {
  const [streams, setStreams] = useState([]);
  const [selectedStream, setSelectedStream] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchStreams();
    const interval = setInterval(fetchStreams, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const fetchStreams = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/statistics/streams');
      const result = await response.json();
      if (result.success) {
        setStreams(result.data);
        setLoading(false);
      }
    } catch (error) {
      console.error('获取频道失败:', error);
      setLoading(false);
    }
  };
  
  const handleSelect = (stream) => {
    if (stream.status === 'online') {
      setSelectedStream(stream);
      onStreamSelect?.(stream);
    }
  };
  
  if (loading) return <div>加载中...</div>;
  
  return (
    <div className="stream-selector">
      <h2>选择养殖区</h2>
      {streams.map(stream => (
        <div 
          key={stream.id}
          className={`stream-option ${stream.status} ${selectedStream?.id === stream.id ? 'selected' : ''}`}
          onClick={() => handleSelect(stream)}
        >
          <div className="stream-name">
            <span className={`status-dot ${stream.status}`}></span>
            {stream.name}
          </div>
          <div className="stream-stats">
            {stream.status === 'online' && (
              <>
                <span>👥 {stream.viewers}</span>
                <span>📡 {stream.bitrate}</span>
                <span>⏱️ {stream.uptime}</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default StreamSelector;
```

#### Vue 3 版本
```vue
<template>
  <div class="stream-selector">
    <h2>选择养殖区</h2>
    <div v-if="loading">加载中...</div>
    <div v-else>
      <div 
        v-for="stream in streams" 
        :key="stream.id"
        :class="['stream-option', stream.status, { selected: selectedStream?.id === stream.id }]"
        @click="selectStream(stream)"
      >
        <div class="stream-name">
          <span :class="['status-dot', stream.status]"></span>
          {{ stream.name }}
        </div>
        <div v-if="stream.status === 'online'" class="stream-stats">
          <span>👥 {{ stream.viewers }}</span>
          <span>📡 {{ stream.bitrate }}</span>
          <span>⏱️ {{ stream.uptime }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const streams = ref([]);
const selectedStream = ref(null);
const loading = ref(true);
let intervalId = null;

const emit = defineEmits(['streamSelected']);

const fetchStreams = async () => {
  try {
    const response = await fetch('http://localhost:8000/api/statistics/streams');
    const result = await response.json();
    if (result.success) {
      streams.value = result.data;
      loading.value = false;
    }
  } catch (error) {
    console.error('获取频道失败:', error);
    loading.value = false;
  }
};

const selectStream = (stream) => {
  if (stream.status === 'online') {
    selectedStream.value = stream;
    emit('streamSelected', stream);
  }
};

onMounted(() => {
  fetchStreams();
  intervalId = setInterval(fetchStreams, 5000);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>
```

## 🔧 实现建议

### 1. 频道列表过滤
```javascript
// 只显示在线频道
const onlineStreams = streams.filter(s => s.status === 'online');

// 按观看人数排序
const sortedStreams = streams.sort((a, b) => b.viewers - a.viewers);

// 按名称搜索
const searchStreams = (keyword) => {
  return streams.filter(s => 
    s.name.toLowerCase().includes(keyword.toLowerCase())
  );
};
```

### 2. 实时更新策略
```javascript
// WebSocket 实时推送（推荐）
const ws = new WebSocket('ws://localhost:8000/ws/statistics');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateStreamList(data.streams);
};

// 轮询策略
const pollInterval = 5000; // 5秒
setInterval(fetchStreams, pollInterval);

// 智能轮询（在线时频率高，离线时频率低）
let pollInterval = isActive ? 2000 : 10000;
```

### 3. 错误处理
```javascript
async function fetchStreamsWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:8000/api/statistics/streams');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## 📈 性能优化

### 1. 数据缓存
```javascript
class StreamCache {
  constructor(ttl = 5000) {
    this.cache = null;
    this.lastFetch = 0;
    this.ttl = ttl;
  }
  
  async getStreams() {
    const now = Date.now();
    if (this.cache && (now - this.lastFetch) < this.ttl) {
      return this.cache;
    }
    
    const response = await fetch('http://localhost:8000/api/statistics/streams');
    const result = await response.json();
    
    if (result.success) {
      this.cache = result.data;
      this.lastFetch = now;
    }
    
    return this.cache;
  }
}
```

### 2. 防抖处理
```javascript
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const debouncedSearch = debounce((keyword) => {
  searchStreams(keyword);
}, 300);
```

## 🎨 UI 设计建议

### 频道卡片布局
```
┌─────────────────────────────────┐
│ 🟢 yard-1        📡 1024 kbps   │
│                  👥 5人观看      │
│                  ⏱️ 01:23:45     │
└─────────────────────────────────┘
```

### 状态指示
- 🟢 在线 (online)
- ⚫ 离线 (offline)
- 🟡 连接中 (connecting)
- 🔴 错误 (error)

## 📝 总结

后端通过以下机制统计频道：

1. **Context.broadcasts** - 存储所有频道的 BroadcastServer 实例
2. **StatisticsManager** - 每秒轮询并更新统计数据
3. **统计 API** - 通过 HTTP 接口暴露数据

前端可以通过：

1. **GET /api/statistics/streams** - 获取所有频道列表
2. **实时轮询或 WebSocket** - 保持数据更新
3. **React/Vue 组件** - 构建交互式选择器

关键数据字段：
- `id`: 频道路径 (如 "/live/yard-1")
- `name`: 频道名称 (如 "yard-1")
- `status`: 在线状态 ("online" / "offline")
- `viewers`: 观看人数
- `bitrate`: 码率
- `uptime`: 运行时间
