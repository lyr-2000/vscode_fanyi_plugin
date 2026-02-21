# VSCode 划词翻译插件

一个功能强大的 VSCode 划词翻译插件，采用插件 + 核心程序的架构设计，支持多种翻译服务提供商。

**GitHub 仓库**: [https://github.com/lyr-2000/vscode_fanyi_plugin](https://github.com/lyr-2000/vscode_fanyi_plugin)

## 📋 目录

- [项目架构](#项目架构)
- [核心程序原理](#核心程序原理)
- [功能特性](#功能特性)
- [安装](#安装)
- [配置](#配置)
- [使用方法](#使用方法)
- [开发](#开发)

## 🏗️ 项目架构

本项目采用**前后端分离**的架构设计：

```
┌─────────────────────────────────┐
│   vscode_fanyi_plugin            │
│   (VSCode 扩展插件)              │
│   - TypeScript                   │
│   - UI 交互                      │
│   - 命令注册                     │
│   - 配置管理                     │
└──────────────┬──────────────────┘
               │ stdin/stdout
               │ JSON 协议
               ▼
┌─────────────────────────────────┐
│   vscode_fanyi_core             │
│   (翻译核心程序)                │
│   - Go 语言                     │
│   - 进程通信                    │
│   - API 调用                    │
│   - 日志记录                    │
└─────────────────────────────────┘
```

### 架构优势

1. **语言隔离**：插件使用 TypeScript，核心程序使用 Go，各司其职
2. **性能优化**：Go 程序编译为独立可执行文件，启动快速
3. **易于扩展**：核心程序可独立更新，不影响插件
4. **跨平台**：核心程序可编译为不同平台的可执行文件

## 🔧 核心程序原理 (vscode_fanyi_core)

### 通信协议

`vscode_fanyi_core` 是一个**命令行程序**，通过 **stdin/stdout** 与插件进行 JSON 格式的进程间通信。

#### 请求格式

```json
{
  "command": "init|translateText|exit",
  "data": { ... }
}
```

#### 响应格式

```json
{
  "code": 0,
  "message": "成功/错误信息",
  "data": { ... }
}
```

### 工作流程

1. **进程启动**
   - 插件通过 `spawn()` 启动 `fanyi_core.exe` 进程
   - 配置 `stdio: ['pipe', 'pipe', 'pipe']` 建立标准输入输出通道

2. **初始化阶段**
   ```json
   // 插件发送
   {
     "command": "init",
     "data": {
       "tencent_ak": "your_ak",
       "tencent_secret": "your_secret"
     }
   }
   
   // 核心程序响应
   {
     "code": 0,
     "message": "初始化成功",
     "data": { "success": true }
   }
   ```

3. **翻译请求**
   ```json
   // 插件发送
   {
     "command": "translateText",
     "data": {
       "text": "Hello",
       "src": "en",
       "to": "zh"
     }
   }
   
   // 核心程序响应
   {
     "code": 0,
     "message": "翻译成功",
     "data": {
       "text": "你好",
       "original": "Hello",
       "src": "en",
       "to": "zh"
     }
   }
   ```

4. **退出程序**
   ```json
   {
     "command": "exit",
     "data": {}
   }
   ```

### 请求队列机制

插件使用**请求队列**管理异步请求：

- 每个请求分配一个 Promise
- 请求按顺序发送到核心程序
- 响应按顺序从队列中取出并解析
- 支持 30 秒超时机制

### 日志功能

核心程序支持日志记录功能：

- 当 `log_file_enable` 配置为 `true` 时，记录翻译日志到 `app.log`
- 日志文件超过 10MB 时自动清空
- 记录内容：翻译请求、成功/失败信息、错误堆栈

## ✨ 功能特性

- ✅ **划词翻译**：选中文本后使用快捷键或命令进行翻译
- ✅ **悬停翻译**：鼠标悬停在单词或选中文本上自动显示翻译结果
- ✅ **多服务支持**：支持腾讯翻译 API
- ✅ **多语言支持**：支持多种语言互译
- ✅ **配置灵活**：可自定义翻译服务、源语言和目标语言
- ✅ **错误日志**：翻译失败时输出详细错误信息到输出面板
- ✅ **调试模式**：支持在输出面板显示翻译结果

## 📦 安装

### 前置要求

1. **编译核心程序**（如果使用源码）
   ```bash
   cd vscode_fanyi_core
   go build -o fanyi_core.exe
   ```

2. **安装插件依赖**
   ```bash
   cd vscode_fanyi_plugin
   npm install
   npm run compile
   ```

### 安装方式

#### 方式一：开发模式
1. 在 VSCode 中打开项目
2. 按 `F5` 启动调试窗口

#### 方式二：打包安装
```bash
cd vscode_fanyi_plugin
npm install -g vsce
vsce package
# 安装生成的 .vsix 文件
```

## ⚙️ 配置

在 VSCode 设置文件（`.vscode/settings.json` 或用户设置）中配置：

### 基本配置

```json
{
  // fanyi_core.exe 的路径（支持字符串或数组）, 负责处理翻译的代码逻辑,翻译core.exe 需要自行下载 
  // 下载链接: https://github.com/lyr-2000/vscode_fanyi_plugin/releases
  "vscode_fanyi_plugin.binPath": [
    "C:\\path1\\fanyi_core.exe",
    "C:\\path2\\fanyi_core.exe"
  ],
  
  // API 密钥配置, 默认使用腾讯翻译 的 api key , 如果有其他的翻译服务，需要你下载 vscode_fanyi_core项目，接入逻辑编译成对应的可执行文件
  // 目前只有腾讯api的实现， 如有需要，自行开发fanyi_core的逻辑 接入其他翻译服务
  "vscode_fanyi_plugin.config": {
    "tencent_ak": "your_tencent_ak",
    "tencent_secret": "your_tencent_secret"
  },
  
  // 翻译配置
  "vscode_fanyi_plugin.sourceLanguage": "auto",
  "vscode_fanyi_plugin.targetLanguage": "zh",
  "vscode_fanyi_plugin.showNotification": true,
  "vscode_fanyi_plugin.showOutput": false
}
```

### 配置说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `binPath` | string \| string[] | `""` | fanyi_core.exe 的路径，数组时自动查找第一个存在的文件 |
| `config` | object | `{}` | API 密钥配置对象 |
| `sourceLanguage` | string | `"auto"` | 源语言（auto 为自动检测） |
| `targetLanguage` | string | `"zh"` | 目标语言 |
| `showNotification` | boolean | `true` | 是否显示通知弹窗 |
| `showOutput` | boolean | `false` | 是否在输出面板显示结果（调试用） |

### 核心程序配置（通过 init 命令传递）

核心程序支持以下配置项（通过 `config` 对象传递）：

- `tencent_ak`: 腾讯翻译 API Access Key
- `tencent_secret`: 腾讯翻译 API Secret Key
- `log_file_enable`: 是否启用日志文件（boolean）

## 🚀 使用方法

### 方法一：快捷键翻译

1. 选中要翻译的文本
2. 按 `Ctrl+Shift+T`（Mac: `Cmd+Shift+T`）
3. 翻译结果会显示在通知中

### 方法二：命令面板

1. 选中要翻译的文本
2. 按 `Ctrl+Shift+P` 打开命令面板
3. 输入 "翻译选中文本" 并执行

### 方法三：悬停翻译

1. **选中文本后悬停**：选中一段文字，将鼠标悬停在选中文本上，会翻译整个选中文本
2. **单词悬停**：将鼠标悬停在单词上，会翻译该单词

### 命令列表

- `vscode_fanyi_plugin.translate` - 翻译选中文本
- `vscode_fanyi_plugin.translateSelection` - 翻译选中文本（显示在通知中）

## 🛠️ 开发

### 项目结构

```
vscode_fanyi_api/
├── vscode_fanyi_plugin/          # VSCode 扩展插件
│   ├── src/
│   │   ├── extension.ts         # 插件主入口
│   │   └── fanyi_core_client.ts # 核心程序客户端
│   ├── package.json
│   └── tsconfig.json
└── vscode_fanyi_core/            # 翻译核心程序
    ├── main.go                   # 主程序入口
    ├── pkg/
    │   ├── fanyi/               # 翻译服务实现
    │   └── settings/            # 配置管理
    └── go.mod
```

### 开发命令

#### 插件开发

```bash
cd vscode_fanyi_plugin

# 安装依赖
npm install

# 编译
npm run compile

# 监听模式编译
npm run watch
```

#### 核心翻译程序开发

```bash
cd vscode_fanyi_core

# 编译
go build -o fanyi_core.exe

# 运行测试
go test ./...
```

### 调试

1. **插件调试**：在 VSCode 中按 `F5` 启动调试窗口
2. **核心程序调试**：直接运行 `fanyi_core.exe`，通过 stdin 输入 JSON 测试
3. **查看日志**：如果启用了日志，查看 `app.log` 文件
4. **输出面板**：翻译失败时，查看 VSCode 输出面板中的详细错误信息

### 错误排查

1. **binPath 未找到**
   - 检查配置路径是否正确
   - 如果使用数组，检查是否有文件存在
   - 查看开发者控制台的错误信息

2. **翻译失败**
   - 检查 API 密钥是否正确配置
   - 查看输出面板的详细错误信息
   - 检查网络连接
   - 查看 `app.log` 日志文件（如果启用）

3. **进程启动失败**
   - 确认 `fanyi_core.exe` 文件存在且可执行
   - 检查文件权限
   - 查看错误信息中的详细路径和错误代码

## 📝 许可证

MIT
