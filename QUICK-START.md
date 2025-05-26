 # 🚀 养殖场监控系统 - 快速开始

## 一键启动

```bash
# 1. 进入目录
cd node-media-server

# 2. 安装依赖
npm install

# 3. 启动监控系统
npm run pig-monitoring
```

## 测试推流

```bash
# 推流到养殖区1（需要有测试视频文件）
ffmpeg -re -i test-video.mp4 -c copy -f flv rtmp://localhost:1935/live/pig-area-1

# 推流到养殖区2
ffmpeg -re -i test-video.mp4 -c copy -f flv rtmp://localhost:1935/live/pig-area-2
```

## 查看监控数据

在浏览器中访问：

- **完整监控面板**: http://localhost:8000/api/statistics/dashboard
- **服务器状态**: http://localhost:8000/api/statistics/server  
- **流列表**: http://localhost:8000/api/statistics/streams
- **系统健康**: http://localhost:8000/api/statistics/health

## 观看直播

- **FLV播放**: http://localhost:8000/live/pig-area-1.flv
- **RTMP播放**: rtmp://localhost:1935/live/pig-area-1

## 前端集成

更新Monitor组件已集成实时API，启动dashboard后可以看到真实的监控数据！

## 端口说明

- **1935**: RTMP推流端口
- **8000**: HTTP服务端口（包含API和FLV流）

## 完整文档

查看 [README-PIG-MONITORING.md](./README-PIG-MONITORING.md) 获取详细说明。