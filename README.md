# Node-Media-Server v4
[![npm](https://img.shields.io/node/v/node-media-server.svg)](https://nodejs.org/en/)
[![npm](https://img.shields.io/npm/v/node-media-server.svg)](https://npmjs.org/package/node-media-server)
[![npm](https://img.shields.io/npm/dm/node-media-server.svg)](https://npmjs.org/package/node-media-server)
[![npm](https://img.shields.io/npm/l/node-media-server.svg)](LICENSE) 

## Introduction
Node-Media-Server is a high-performance/low-latency/open-source Live Streaming Server developed based on Nodejs.  
v4 is design to implement enhanced RTMP FLV v1 support for native HEVC, VP9, AV1.  
v4 is no longer compatible with the cn_cdn extension id flv_265 standard.  
v4 is no longer compatible with flashplayer's rtmp protocol.  
v4 is incompatible with v2. Do not upgrade across major versions.

## Features
* HTTP/HTTP2-flv Push/Play
* RTMP/RTMPS Push/Play
* GOP cache
* Notification
* Authentication
* Static file server
* Record to flv file

## Roadmap
* HTTP-API
* Rtmp Relay

## Supported clients
|Client   | H.264  | HEVC | VP9 | AV1|
| ------------ | ------------ |------------ |------------ |------------ |
|  OBS_29.1+|  ✅   | ✅ |  ❌|  ✅ |
|  FFmpeg/FFplay_6.1+ |   ✅  |  ✅ |  ✅ |  ✅ |
|  NodePlayer.js_1.0+ |   ✅  |  ✅ |  ❌ |  ❌ |
|  NodeMediaClient_3.0+ |   ✅  |  ✅ |  ❌ |  ❌ |

## Dev

```bash
# 1. 安装
yarn install
# 2. 运行
yarn start
```

## Usage
* obs_29.1 or above is required
* ffmpeg_6.1 or above is required

### Push Streaming

```bash
ffmpeg -re -i test_265.mp4 -c copy -f flv rtmp://localhost/live/test_265
```

```bash
ffmpeg -re -i test_av1.mp4 -c copy -f flv http://localhost:8000/live/test_av1.flv
```

### Play Streaming
```bash
ffplay http://localhost:8000/live/test_265.flv
```

### [NodePlayer.js](https://www.nodemedia.cn/product/nodeplayer-js/) pure javascript implementation live streaming player
[Online Demo](http://demo.nodemedia.cn/)
- ASM.js, WASM, SIMD, WebWorker, WebCodecs, MediaSource multiple technical implementations
- H.264/H.265+AAC/G711 software and hardware decoder
- Ultra-low latency, Under extreme conditions less than 100 milliseconds
- Enhanced HTTP/WS-FLV Protocol, Natively support h.265
- Android/iOS/HarmonyOS/Chrome/Edge/Firefox/Safari, All modern browsers or platforms

## 使用OBS推流到服务器

设置 > 直播 > 选择服务 > 自定义服务 

填写服务器为 `rtmp://localhost/live`, 推流码自己定义一个名字，比如 `demo`

然后保存关闭弹窗，点击开始直播

在浏览器打开客户端，拉流观看直播 `http://localhost:8000?stream=demo`

## 配置文件
配置项一览，实际应用中不用写全配置
```jsonc
{
  "rtmp": {   //配置rtmp服务器，用于设备推流
    "port": 1935,  // rtmp://localhost/live 使用 1935 作为默认端口
    "chunk_size": 60000,
    "gop_cache": true,
    "ping": 60,
    "ping_timeout": 30,
  },  
  "rtmps": {  // rtmp 服务器，有加密传输
    "port": 1936,
    "key": "./demo/key.pem",
    "cert": "./demo/cert.pem"
  },
  "bind": "0.0.0.0", // http | https 服务器的监听地址范围
  "http": {   // 配置http服务器，用于客户端拉流 flv 视频
    "port": 8000,
  },
  "https": {   // http服务器，加密传输
    "port": 8000,
    "key": "",
    "cert": "",
  },
  "notify": {
    "url": "http://example.com"  // 直播事件会以json格式发送到 POST http://example.com
  },
  "static": {  // 配置静态文件服务器，用于客户端网页看flv视频
    "root": "./demo/public",    // 静态文件根目录
    "router": "/",              // 静态文件路由前缀
    "allow_origin": "*"
  },  
  "record": {  // 配置录制功能，用于录制推流视频
    "path": "./demo/record"  // 保存到的路径
  }
}
```

## Static file services
Node-Media-Server can provide static file services for a directory.
```jsonc
{
  // ...
  "static": {
    "router": "/",
    "root": "./html"
  }
}
```

## Record to flv file
Node-Media-Server can record live streams as FLV files.  
When the static file server is enabled and recordings are saved in its directory.  
It can provide video-on-demand services.

```jsonc
{
  // ...
  "record": {
    "path": "./html/record"
  }
}
```

```
http://server_ip:8000/record/live/stream/unix_time.flv  
or  
https://server_ip:8443/record/live/stream/unix_time.flv  
```

## License
Apache 2.0
