#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
// const config = require("./config.json");
const { parse } = require('jsonc-parser');

// 可带注释的jsonc文件
const jsoncContent = fs.readFileSync('demo/config.jsonc', 'utf-8');
const config = parse(jsoncContent);  // 解析 JSONC 内容

console.log("read config: ", config);
const NodeMediaServer = require("..");

if (config.rtmps?.key && !fs.existsSync(config.rtmps.key)) {
  config.rtmps.key = path.join(__dirname, config.rtmps.key);

}
if (config.rtmps?.cert && !fs.existsSync(config.rtmps.cert)) {
  config.rtmps.cert = path.join(__dirname, config.rtmps.cert);
}

if (config.https?.key && !fs.existsSync(config.https.key)) {
  config.https.key = path.join(__dirname, config.https.key);

}
if (config.https?.cert && !fs.existsSync(config.https.cert)) {
  config.https.cert = path.join(__dirname, config.https.cert);
}

const nms = new NodeMediaServer(config);
nms.run(); 