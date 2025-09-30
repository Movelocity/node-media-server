# Node Media Server 技术文档

## 项目概述

Node Media Server 是一个基于 Node.js 的流媒体服务器，支持 RTMP 推流和 HTTP-FLV 拉流。项目采用模块化架构，分为四个核心功能区域。

## 四个核心功能区

### 1. Core 核心模块 (`/src/core/`)

核心模块提供基础设施和公共组件：

- **`context.js`**: 全局上下文管理
  - 存储全局配置信息
  - 管理会话映射 (`sessions`)
  - 管理广播服务映射 (`broadcasts`)
  - 提供事件发射器 (`EventEmitter`)

- **`logger.js`**: 日志系统
  - 统一的日志输出接口
  - 支持不同日志级别

- **`avpacket.js`**: 音视频数据包定义
  - 定义音视频包结构
  - 包含编解码器信息

- **`avcodec.js`**: 编解码器常量定义

### 2. Protocol 协议处理模块 (`/src/protocol/`)

负责各种流媒体协议的解析和处理：

- **`rtmp.js`**: RTMP 协议实现
  - 握手处理 (Handshake)
  - 消息解析和封装
  - 支持推流和拉流命令
  - 块 (Chunk) 处理机制

- **`flv.js`**: FLV 协议实现
  - FLV 文件格式处理
  - 音视频数据打包

- **`amf.js`**: AMF (Action Message Format) 数据格式处理
  - AMF0/AMF3 序列化和反序列化
  - 用于 RTMP 协议中的命令和元数据传输

### 3. Session 会话管理模块 (`/src/session/`)

管理客户端连接会话：

- **`base_session.js`**: 基础会话类
  - 定义会话基本属性：ID、IP、协议类型
  - 流信息：应用名、流名、路径
  - 统计信息：带宽、编解码参数
  - 抽象方法：`sendBuffer()`, `close()`

- **`rtmp_session.js`**: RTMP 会话处理
  - 继承自 `BaseSession`
  - 处理 RTMP 连接、推流、拉流
  - 与广播服务器交互

- **`flv_session.js`**: HTTP-FLV 会话处理
  - 处理 HTTP GET/POST 请求
  - 支持 FLV 格式的推流和拉流

- **`record_session.js`**: 录制会话  - 处理流媒体录制功能  - 支持按流名称分文件夹录制  - 支持30分钟自动分片  - 提供录制生命周期管理

### 4. Server 服务器模块 (`/src/server/`)

提供各种服务器实现：

- **`rtmp_server.js`**: RTMP 服务器
  - 监听 RTMP 端口
  - 创建 RTMP 会话
  - 支持 TLS 加密 (RTMPS)

- **`http_server.js`**: HTTP 服务器
  - 处理 HTTP-FLV 请求
  - 支持静态文件服务
  - 支持 HTTPS

- **`broadcast_server.js`**: 广播服务器 (核心分发组件)
  - 管理推流者和观众
  - 实现 1:N 广播分发
  - 缓存关键帧 (GOP Cache)

- **`record_server.js`**: 录制服务器  - 管理录制会话生命周期  - 支持分片时长配置  - 提供录制状态监控API- **`notify_server.js`**: 通知服务器

## 推流机制

### 1. RTMP 推流流程

```
客户端连接 → RTMP握手 → connect命令 → createStream → publish → 数据传输
```

#### 详细步骤：

1. **连接建立**
   ```1:49:src/server/rtmp_server.js
   handleRequest = (socket) => {
     const session = new RtmpSession(socket);
     session.run();
   };
   ```

2. **RTMP 握手**
   - C0/C1/C2 握手过程
   - 验证客户端合法性

3. **Connect 命令处理**
   ```47:54:src/session/rtmp_session.js
   onConnect = (req) => {
     this.streamApp = req.app;
     this.streamName = req.name;
     this.streamHost = req.host;
     this.streamPath = "/" + req.app + "/" + req.name;
     this.streamQuery = req.query;
     this.broadcast = Context.broadcasts.get(this.streamPath) ?? new BroadcastServer();
     Context.broadcasts.set(this.streamPath, this.broadcast);
   };
   ```

4. **Publish 命令处理**
   ```65:75:src/session/rtmp_session.js
   onPush = () => {
     const err = this.broadcast.postPublish(this);
     if (err != null) {
       logger.error(`RTMP session ${this.id} ${this.ip} push ${this.streamPath} error, ${err}`);
       this.socket.end();
       return;
     }
     this.isPublisher = true;
     logger.info(`RTMP session ${this.id} ${this.ip} start push ${this.streamPath}`);
   };
   ```

5. **数据包处理**
   ```84:87:src/session/rtmp_session.js
   onPacket = (packet) => {
     this.broadcast.broadcastMessage(packet);
   };
   ```

### 2. HTTP-FLV 推流流程

支持通过 HTTP POST 方式推送 FLV 数据：

```55:66:src/session/flv_session.js
onPush = () => {
  const err = this.broadcast.postPublish(this);
  if (err != null) {
    logger.error(`FLV session ${this.id} ${this.ip} push ${this.streamPath} error, ${err}`);
    this.res.end();
    return;
  }
  this.isPublisher = true;
  this.flv.onPacketCallback = this.onPacket;
  logger.info(`FLV session ${this.id} ${this.ip} start push ${this.streamPath}`);
};
```

## 观众注册机制

### 1. 观众连接注册

观众通过以下方式连接：
- **RTMP 拉流**: `rtmp://server/app/stream`
- **HTTP-FLV 拉流**: `http://server/app/stream.flv`

### 2. 注册流程

#### RTMP 拉流注册：
```56:64:src/session/rtmp_session.js
onPlay = () => {
  const err = this.broadcast.postPlay(this);
  if (err != null) {
    logger.error(`RTMP session ${this.id} ${this.ip} play ${this.streamPath} error, ${err}`);
    this.socket.end();
    return;
  }
  this.isPublisher = false;
  logger.info(`RTMP session ${this.id} ${this.ip} start play ${this.streamPath}`);
};
```

#### HTTP-FLV 拉流注册：
```45:53:src/session/flv_session.js
onPlay = () => {
  const err = this.broadcast.postPlay(this);
  if (err != null) {
    logger.error(`FLV session ${this.id} ${this.ip} play ${this.streamPath} error, ${err}`);
    this.res.end();
    return;
  }
  this.isPublisher = false;
  logger.info(`FLV session ${this.id} ${this.ip} start play ${this.streamPath}`);
};
```

### 3. 广播服务器注册逻辑

```72:105:src/server/broadcast_server.js
postPlay = (session) => {
  if (Context.config.auth?.play && session.ip !== "") {
    if (!this.verifyAuth(Context.config.auth?.secret, session)) {
      return `play stream ${session.streamPath} authentication verification failed`;
    }
  }
  if (session.ip !== "") {
    Context.eventEmitter.emit("postPlay", session);
  }
  switch (session.protocol) {
  case "flv":
    session.sendBuffer(this.flvHeader);
    if (this.flvMetaData !== null) {
      session.sendBuffer(this.flvMetaData);
    }
    if (this.flvAudioHeader !== null) {
      session.sendBuffer(this.flvAudioHeader);
    }
    if (this.flvVideoHeader !== null) {
      session.sendBuffer(this.flvVideoHeader);
    }
    if (this.flvGopCache !== null) {
      this.flvGopCache.forEach((v) => {
        session.sendBuffer(v);
      });
    }
    break;
  case "rtmp":
    // RTMP 协议的初始化数据发送
  }

  this.subscribers.set(session.id, session);
  return null;
};
```

## 核心数据流

### 1. 推流数据流
```
推流客户端 → RTMP/FLV Session → Protocol Parser → AVPacket → BroadcastServer
```

### 2. 分发数据流
```
BroadcastServer → Protocol Encoder → Session Buffer → 观众客户端
```

### 3. 广播分发机制

```158:233:src/server/broadcast_server.js
broadcastMessage = (packet) => {
  const flvMessage = Flv.createMessage(packet);
  const rtmpMessage = Rtmp.createMessage(packet);
  
  // 根据包类型处理
  switch (packet.flags) {
  case 0: // 音频头
    this.flvAudioHeader = Buffer.from(flvMessage);
    this.rtmpAudioHeader = Buffer.from(rtmpMessage);
    break;
  case 2: // 视频头
    this.flvVideoHeader = Buffer.from(flvMessage);
    this.rtmpVideoHeader = Buffer.from(rtmpMessage);
    break;
  case 3: // 关键帧
    this.flvGopCache?.clear();
    this.rtmpGopCache?.clear();
    this.flvGopCache = new Set();
    this.rtmpGopCache = new Set();
    this.flvGopCache.add(flvMessage);
    this.rtmpGopCache.add(rtmpMessage);
    break;
  }
  
  // 向所有订阅者广播
  this.subscribers.forEach((v, k) => {
    switch (v.protocol) {
    case "flv":
      v.sendBuffer(flvMessage);
      break;
    case "rtmp":
      v.sendBuffer(rtmpMessage);
    }
  });
};
```

## 认证机制

### URL 签名认证
```49:66:src/server/broadcast_server.js
verifyAuth = (authKey, session) => {
  if (authKey === "") {
    return true;
  }
  let signStr = session.streamQuery?.sign;
  if (signStr?.split("-")?.length !== 2) {
    return false;
  }
  let now = Date.now() / 1000 | 0;
  let exp = parseInt(signStr.split("-")[0]);
  let shv = signStr.split("-")[1];
  let str = session.streamPath + "-" + exp + "-" + authKey;
  if (exp < now) {
    return false;
  }
  let md5 = crypto.createHash("md5");
  let ohv = md5.update(str).digest("hex");
  return shv === ohv;
};
```

## 事件系统

系统通过 EventEmitter 提供事件机制：
- `postPlay`: 观众开始播放
- `donePlay`: 观众停止播放  
- `postPublish`: 推流者开始推流
- `donePublish`: 推流者停止推流

## 性能优化特性

### 1. GOP 缓存
- 缓存关键帧到下一个关键帧之间的数据
- 新观众连接时立即发送缓存数据，减少等待时间

### 2. 协议转换
- 推流和拉流可以使用不同协议
- RTMP 推流可以被 HTTP-FLV 拉取

### 3. 连接复用
- 同一流路径的多个观众共享广播服务器实例
- 减少资源消耗

## 录制功能详解### 

1. 录制架构录制功能基于观察者模式实现：
- **RecordSession**: 作为特殊的观众会话，订阅推流数据
- **RecordServer**: 管理录制会话的创建和销毁
- **分片机制**: 自动按时间切分录制文件

### 2. 目录结构设计
```
recordPath/├── app1/│   ├── stream1/│   │   ├── 20241201143022_segment_001.flv│   │   ├── 20241201173022_segment_002.flv│   │   └── 20241201203022_segment_003.flv│   └── stream2/│       └── 20241201144500_segment_001.flv└── app2/    └── test/        ├── 20241201150000_segment_001.flv        └── 20241201180000_segment_002.flv
```

### 3. 分片轮转机制
```mermaid
graph LR    A[推流开始] --> B[创建录制会话]    B --> C[创建第一个分片]    C --> D[写入数据]    D --> E{30分钟到？}    E -->|否| D    E -->|是| F[关闭当前分片]    F --> G[创建新分片]    G --> D    H[推流结束] --> I[关闭最后分片]
```

### 4. 配置示例
```javascript
const config = {  record: {    path: "./records",           // 录制根目录    segmentDuration: 1800        // 30分钟分片  }};
```

### 5. API 扩展
- `stopRecord(streamPath)`: 手动停止录制
- `getActiveRecords()`: 获取活跃录制列表
- `stopAllRecords()`: 停止所有录制

## 总结Node Media Server 采用了清晰的模块化架构：
- **Core**: 提供基础设施
- **Protocol**: 处理协议解析
- **Session**: 管理连接会话  
- **Server**: 提供服务接口推流和注册机制通过广播服务器实现了高效的 1:N 分发，支持多种协议混合使用。新增的录制功能支持按流分文件夹和自动分片，为长时间直播录制提供了完善的解决方案，具有良好的扩展性和性能。 


# 播放统计

### 后端情况
- 后端有完整的统计API（`/api/statistics/streams/:streamPath`）
- 但这些统计数据是**流级别**的（推流的码率、观看者数等），不是**播放器级别**的统计

### 前端情况
- 播放统计面板显示的数据（码率、帧率、缓冲、丢帧）**全部是模拟数据**（随机数生成）
- flv.js 播放器理论上可以通过 `player.statisticsInfo` 获取部分统计数据
- 但这些数据可能不够准确或不完整

### 建议方案
由于这是一个**测试播放器页面**，而真正的监控数据在 `monitor.html` 页面中有完整的展示（包括服务器统计和流统计），这个播放器页面的"播放统计"面板确实没有太大意义，建议**移除**。

## 完成分析和修改

### 📊 分析结果

经过对前后端代码的深入分析，我发现：

**后端情况：**
- ✅ 有完整的统计API系统（`/api/statistics/`）
- ⚠️ 但这些是**流级别统计**（推流码率、观看者数、服务器状态等）
- ⚠️ 不是**播放器级别统计**（播放帧率、缓冲、丢帧等）

**前端情况：**
- ❌ "播放统计"面板显示的所有数据（码率、帧率、缓冲、丢帧）都是**模拟数据**（随机数）
- ⚠️ flv.js 播放器理论上有 `statisticsInfo` API，但数据不完整且不够准确
- ✅ 真正的监控数据在 `monitor.html` 页面有完整展示

### ✅ 已完成的修改

已移除播放统计面板，包括：

1. **删除HTML结构**：移除了整个"播放统计"面板（221-244行）
2. **清理JavaScript代码**：
   - 移除了 `statsInterval` 和 `connectionCheckInterval` 属性
   - 移除了统计相关的DOM元素引用（`bitrateValue`, `fpsValue`, `bufferValue`, `droppedValue`）
   - 移除了 `startStatsMonitoring()` 方法
   - 移除了 `updateStats()` 方法

### 💡 说明

这个 `index.html` 是一个**测试播放器页面**，主要用于测试直播流播放功能。真正的监控统计数据应该查看：
- **monitor.html** - 完整的性能监控页面，包含服务器和流的实时统计
- **后端API** - `/api/statistics/` 提供完整的统计数据接口

移除这个模拟的播放统计面板可以避免误导用户，并简化界面。