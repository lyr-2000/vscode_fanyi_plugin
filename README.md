# VSCode 划词翻译项目

一个功能强大的 VSCode 划词翻译插件项目，采用插件 + 核心程序的架构设计，可定制扩展接入多种翻译服务提供商。

## 📦 项目结构

本项目包含两个主要模块：

- **[vscode_fanyi_plugin](./vscode_fanyi_plugin/README.md)** - VSCode 插件前端，负责用户界面和交互
- **[vscode_fanyi_core](./vscode_fanyi_core/README.md)** - 翻译核心程序，使用 Go 语言编写，负责处理翻译 API 调用和进程通信

## 📚 文档

- **[插件使用文档](./vscode_fanyi_plugin/README.md)** - 详细的安装、配置和使用说明
- **[核心程序开发文档](./vscode_fanyi_core/README.md)** - 核心程序的通信协议、开发指南和 API 说明

## 🚀 快速开始

### 用户使用

如果您是用户，想要安装和使用插件，请查看：

👉 **[插件使用文档](./vscode_fanyi_plugin/README.md)**

### 开发者

如果您是开发者，想要了解项目架构或进行二次开发，请查看：

👉 **[核心程序开发文档](./vscode_fanyi_core/README.md)**

## 📝 许可证

MIT
