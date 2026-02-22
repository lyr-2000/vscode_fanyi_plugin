# VSCode 划词翻译插件

一个功能强大的 VSCode 划词翻译插件，采用插件 + 核心程序的架构设计，可定制扩展接入多种翻译服务提供商。

**GitHub 仓库**: [https://github.com/lyr-2000/vscode_fanyi_plugin](https://github.com/lyr-2000/vscode_fanyi_plugin)

## 📋 目录

- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [安装](#安装)
- [配置](#配置)
- [使用方法](#使用方法)
- [自定义子命令](#自定义子命令)
- [常见问题](#常见问题)


## ✨ 功能特性

- ✅ **划词翻译**：选中文本后使用快捷键或命令进行翻译
- ✅ **悬停翻译**：鼠标悬停在单词或选中文本上自动显示翻译结果
- ✅ **多服务支持**：支持腾讯翻译 API
- ✅ **多语言支持**：支持多种语言互译
- ✅ **配置灵活**：可自定义翻译服务、源语言和目标语言
- ✅ **自定义子命令**：支持配置多个自定义翻译命令，快速切换不同语言对
- ✅ **错误日志**：翻译失败时输出详细错误信息到输出面板
- ✅ **调试模式**：支持在输出面板显示翻译结果

## 🚀 快速开始

1. **安装插件**
   - 从 VSCode 扩展商店搜索 "VSCode 划词翻译插件" 并安装
   - 或下载 `.vsix` 文件手动安装

2. **下载翻译核心程序**
   - 访问 [Releases 页面](https://github.com/lyr-2000/vscode_fanyi_plugin/releases) 下载 `fanyi_core.exe`
   - 将文件保存到本地任意目录

3. **配置插件**
   - 打开 VSCode 设置（`Ctrl+,`）
   - 配置 `fanyi_core.exe` 的路径
   - 配置腾讯翻译 API 密钥

4. **开始使用**
   - 选中文本，按 `Ctrl+Shift+T` 进行翻译
   - 或悬停在文本上自动显示翻译结果

## 📦 安装

### 方式一：从扩展商店安装（推荐）

1. 打开 VSCode
2. 点击左侧扩展图标（或按 `Ctrl+Shift+X`）
3. 搜索 "VSCode 划词翻译插件"
4. 点击安装

### 方式二：手动安装

1. 从 [Releases 页面](https://github.com/lyr-2000/vscode_fanyi_plugin/releases) 下载 `.vsix` 文件
2. 在 VSCode 中按 `Ctrl+Shift+P` 打开命令面板
3. 输入 "Extensions: Install from VSIX..."
4. 选择下载的 `.vsix` 文件进行安装

### 下载翻译核心程序

安装插件后，还需要下载翻译核心程序：

1. 访问 [Releases 页面](https://github.com/lyr-2000/vscode_fanyi_plugin/releases)
2. 下载对应平台的 `fanyi_core.exe`（Windows）或 `fanyi_core`（Linux/macOS）
3. 将文件保存到本地目录（建议放在固定位置，如 `C:\Tools\fanyi_core.exe`）

## ⚙️ 配置

### 步骤 1：配置核心程序路径

打开 VSCode 设置（`Ctrl+,`），搜索 "fanyi"，配置 `fanyi_core.exe` 的路径：

**方式一：单个路径**
```json
{
  "vscode_fanyi_plugin.binPath": "C:\\Tools\\fanyi_core.exe"
}
```

**方式二：多个路径（推荐）**
如果配置多个路径，插件会自动查找第一个存在的文件：
```json
{
  "vscode_fanyi_plugin.binPath": [
    "C:\\Tools\\fanyi_core.exe",
    "D:\\Programs\\fanyi_core.exe",
    "fanyi_core.exe"  // 如果在 PATH 环境变量中
  ]
}
```

### 步骤 2：配置 API 密钥

1. **获取腾讯翻译 API 密钥**
   - 访问 [腾讯云控制台](https://console.cloud.tencent.com/)
   - 开通"机器翻译"服务
   - 获取 Access Key ID 和 Secret Access Key

2. **在 VSCode 设置中配置**
   ```json
   {
     "vscode_fanyi_plugin.config": {
       "tencent_ak": "你的腾讯云 Access Key",
       "tencent_secret": "你的腾讯云 Secret Key",
       "timeout": 60// 60 sec timeout 
     }
   }
   ```

### 步骤 3：配置翻译选项（可选）

```json
{
  // 源语言：auto（自动检测）、en（英语）、zh（中文）、ja（日语）等
  "vscode_fanyi_plugin.sourceLanguage": "auto",
  
  // 目标语言：zh（中文）、en（英语）、ja（日语）等
  "vscode_fanyi_plugin.targetLanguage": "zh",
  
  // 是否显示通知弹窗
  "vscode_fanyi_plugin.showNotification": true,
  
  // 是否在输出面板显示结果（用于调试）
  "vscode_fanyi_plugin.showOutput": false
}
```

### 步骤 4：配置自定义子命令（可选）

`subCommands` 允许你配置多个自定义翻译命令，每个命令可以有不同的语言对和翻译方式。这对于需要频繁切换翻译方向（如中英互译）的场景非常有用。

**配置示例：**
```json
{
  "vscode_fanyi_plugin.subCommands": [
    {
      "title": "翻译选中内容并复制(中->英)",
      "command": "vscode_fanyi_plugin.translateAndCopy",
      "args": {
        "sourceLanguage": "zh",
        "targetLanguage": "en"
      }
    },
    {
      "title": "翻译选中文本(英->中)",
      "command": "vscode_fanyi_plugin.translateSelection",
      "args": {
        "sourceLanguage": "en",
        "targetLanguage": "zh"
      }
    }
  ]
}
```

**配置项说明：**
- `title`（必填）：命令标题，显示在命令面板和快速选择菜单中
- `command`（必填）：要执行的命令类型
  - `vscode_fanyi_plugin.translateAndCopy`：翻译并自动复制到剪贴板
  - `vscode_fanyi_plugin.translateSelection`：翻译选中文本（显示通知，可选择复制）
- `args`（可选）：命令参数
  - `sourceLanguage`：源语言（如 `"zh"`, `"en"`, `"auto"`）
  - `targetLanguage`：目标语言（如 `"zh"`, `"en"`）

### 完整配置示例

```json
{
  "vscode_fanyi_plugin.binPath": "C:\\Tools\\fanyi_core.exe",
  "vscode_fanyi_plugin.config": {
    "tencent_ak": "AKIDxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "tencent_secret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  },
  "vscode_fanyi_plugin.sourceLanguage": "auto",
  "vscode_fanyi_plugin.targetLanguage": "zh",
  "vscode_fanyi_plugin.showNotification": true,
  "vscode_fanyi_plugin.showOutput": false,
  "vscode_fanyi_plugin.subCommands": [
    {
      "title": "翻译并复制(中->英)",
      "command": "vscode_fanyi_plugin.translateAndCopy",
      "args": {
        "sourceLanguage": "zh",
        "targetLanguage": "en"
      }
    },
    {
      "title": "翻译文本(英->中)",
      "command": "vscode_fanyi_plugin.translateSelection",
      "args": {
        "sourceLanguage": "en",
        "targetLanguage": "zh"
      }
    }
  ]
}
```

### 配置项说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `binPath` | string \| string[] | `""` | 翻译核心程序路径，支持单个路径或路径数组 |
| `config.tencent_ak` | string | `""` | 腾讯翻译 API Access Key（必填） |
| `config.tencent_secret` | string | `""` | 腾讯翻译 API Secret Key（必填） |
| `sourceLanguage` | string | `"auto"` | 源语言，`auto` 为自动检测 |
| `targetLanguage` | string | `"zh"` | 目标语言 |
| `showNotification` | boolean | `true` | 翻译时是否显示通知弹窗 |
| `showOutput` | boolean | `false` | 是否在输出面板显示结果（调试用） |
| `subCommands` | array | `[]` | 自定义子命令列表，支持配置多个翻译命令 |

**subCommands 配置项说明：**
| 配置项 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `title` | string | 是 | 命令标题（显示在命令面板和快速选择菜单中） |
| `command` | string | 是 | 命令类型：`translateAndCopy`（翻译并复制）或 `translateSelection`（翻译显示） |
| `args.sourceLanguage` | string | 否 | 源语言（覆盖全局配置） |
| `args.targetLanguage` | string | 否 | 目标语言（覆盖全局配置） |

## 🚀 使用方法

### 方法一：快捷键翻译（最常用）

1. **选中文本**：在编辑器中选中要翻译的文本（可以是单词、短语或句子）
2. **按快捷键**：`Ctrl+Shift+T`（Windows/Linux）或 `Cmd+Shift+T`（macOS）
3. **查看结果**：翻译结果会以通知弹窗的形式显示

**示例：**
- 选中 "Hello World" → 按 `Ctrl+Shift+T` → 显示 "你好，世界"

### 方法二：命令面板翻译

1. **选中文本**：在编辑器中选中要翻译的文本
2. **打开命令面板**：按 `Ctrl+Shift+P`（Windows/Linux）或 `Cmd+Shift+P`（macOS）
3. **输入命令**：输入 "翻译选中文本" 或 "translate"
4. **执行命令**：选择并执行命令

### 方法三：悬停翻译（自动翻译）

#### 单词悬停翻译
- 将鼠标悬停在任意单词上
- 自动显示该单词的翻译结果
- 无需选中文本，无需按快捷键

#### 选中文本悬停翻译
- 先选中一段文本
- 将鼠标悬停在选中的文本上
- 自动显示整个选中文本的翻译结果

**提示：** 悬停翻译会在鼠标移开时自动消失，非常适合快速查看翻译。

### 方法四：自定义子命令（subCommands）

如果你配置了 `subCommands`，可以使用自定义的翻译命令：

#### 使用方式一：命令面板

1. **选中文本**：在编辑器中选中要翻译的文本
2. **打开命令面板**：按 `Ctrl+Shift+P`
3. **输入命令**：输入 "翻译: 自定义子命令"
4. **选择子命令**：在弹出的快速选择菜单中选择要执行的子命令

#### 使用方式二：右键菜单

1. **选中文本**：在编辑器中选中要翻译的文本
2. **右键点击**：在右键菜单中选择 "翻译: 自定义子命令"
3. **选择子命令**：在弹出的快速选择菜单中选择要执行的子命令

#### 使用方式三：测试配置

在命令面板中输入 "翻译: 测试子命令配置"，可以查看当前配置的所有 subCommands 及其详细信息。

### 使用技巧

1. **翻译长文本**：选中多行文本，使用快捷键或命令面板翻译
2. **快速查看单词**：直接悬停在单词上，无需选中
3. **查看翻译历史**：如果翻译失败，可以在输出面板（`Ctrl+Shift+U`）查看详细错误信息
4. **切换语言**：在设置中修改 `sourceLanguage` 和 `targetLanguage` 来改变翻译方向
5. **使用自定义子命令**：配置多个 subCommands，快速切换不同的语言对和翻译方式

### 支持的语言

- **中文** (zh)
- **英语** (en)
- **日语** (ja)
- **韩语** (ko)
- **法语** (fr)
- **德语** (de)
- **西班牙语** (es)
- **俄语** (ru)
- **葡萄牙语** (pt)
- **意大利语** (it)
- 更多语言请参考腾讯翻译 API 文档

## 🎯 自定义子命令

自定义子命令（subCommands）功能允许你配置多个预设的翻译命令，每个命令可以有不同的语言对和翻译方式。这对于需要频繁切换翻译方向的场景非常有用。

### 功能特点

- ✅ **快速切换语言对**：配置多个命令，一键切换不同的翻译方向
- ✅ **灵活的命令类型**：支持翻译并复制，或翻译显示两种方式
- ✅ **动态配置**：修改配置后无需重启，自动生效

### 配置示例

#### 示例 1：中英互译

```json
{
  "vscode_fanyi_plugin.subCommands": [
    {
      "title": "翻译并复制(中->英)",
      "command": "vscode_fanyi_plugin.translateAndCopy",
      "args": {
        "sourceLanguage": "zh",
        "targetLanguage": "en"
      }
    },
    {
      "title": "翻译并复制(英->中)",
      "command": "vscode_fanyi_plugin.translateAndCopy",
      "args": {
        "sourceLanguage": "en",
        "targetLanguage": "zh"
      }
    }
  ]
}
```

#### 示例 2：多语言翻译

```json
{
  "vscode_fanyi_plugin.subCommands": [
    {
      "title": "中->英",
      "command": "vscode_fanyi_plugin.translateAndCopy",
      "args": {
        "sourceLanguage": "zh",
        "targetLanguage": "en"
      }
    },
    {
      "title": "中->日",
      "command": "vscode_fanyi_plugin.translateAndCopy",
      "args": {
        "sourceLanguage": "zh",
        "targetLanguage": "ja"
      }
    },
    {
      "title": "英->中",
      "command": "vscode_fanyi_plugin.translateAndCopy",
      "args": {
        "sourceLanguage": "en",
        "targetLanguage": "zh"
      }
    },
    {
      "title": "日->中",
      "command": "vscode_fanyi_plugin.translateSelection",
      "args": {
        "sourceLanguage": "ja",
        "targetLanguage": "zh"
      }
    }
  ]
}
```

### 使用场景

1. **中英互译**：配置两个命令，快速在中英文之间切换翻译
2. **多语言翻译**：配置多个命令，支持中文、英文、日文、韩文等多种语言
3. **不同翻译方式**：有些命令自动复制，有些命令显示通知可选择复制

### 命令类型对比

| 命令类型 | 行为 | 适用场景 |
|---------|------|---------|
| `translateAndCopy` | 翻译后自动复制到剪贴板 | 需要快速复制翻译结果 |
| `translateSelection` | 翻译后显示通知，可选择复制 | 需要查看翻译结果后再决定是否复制 |

### 配置说明

- **`title`**：命令的显示名称，建议简洁明了
- **`command`**：命令类型，必须是 `vscode_fanyi_plugin.translateAndCopy` 或 `vscode_fanyi_plugin.translateSelection`
- **`args`**：命令参数，会覆盖全局的 `sourceLanguage` 和 `targetLanguage` 配置

### 使用技巧

1. **快速访问**：配置subCommands 后，选中文本右键即可快速访问
2. **命令面板**：所有 subCommands 都可以通过命令面板访问
3. **测试配置**：使用 "翻译: 测试子命令配置" 命令查看当前配置的所有子命令
4. **动态更新**：修改配置后，插件会自动重新加载，无需重启 VSCode

## ❓ 常见问题

### Q1: 提示 "找不到 fanyi_core.exe"

**原因：** 未配置或配置的路径不正确。

**解决方法：**
1. 确认已下载 `fanyi_core.exe` 文件
2. 在 VSCode 设置中配置正确的路径：
   ```json
   {
     "vscode_fanyi_plugin.binPath": "C:\\完整路径\\fanyi_core.exe"
   }
   ```
3. 如果文件在 PATH 环境变量中，可以直接写文件名：
   ```json
   {
     "vscode_fanyi_plugin.binPath": "fanyi_core.exe"
   }
   ```

### Q2: 翻译失败，提示 API 错误

**原因：** API 密钥未配置或配置错误。

**解决方法：**
1. 检查腾讯云 API 密钥是否正确
2. 确认已开通"机器翻译"服务
3. 检查 API 密钥是否有余额或权限
4. 在输出面板（`Ctrl+Shift+U`）查看详细错误信息

### Q3: 悬停翻译不工作

**原因：** 可能是编辑器焦点问题或配置问题。

**解决方法：**
1. 确保编辑器处于焦点状态
2. 尝试先选中文本再悬停
3. 检查 VSCode 版本是否满足要求（>= 1.74.0）

### Q4: 翻译结果不准确

**原因：** 可能是源语言检测不准确。

**解决方法：**
1. 在设置中手动指定源语言，而不是使用 `auto`
2. 例如：如果翻译英文，设置 `"sourceLanguage": "en"`

### Q5: 如何查看详细的错误日志？

**解决方法：**
1. 打开输出面板：`Ctrl+Shift+U`（Windows/Linux）或 `Cmd+Shift+U`（macOS）
2. 在输出面板的下拉菜单中选择 "VSCode 划词翻译插件"
3. 查看详细的错误信息和调试日志

### Q6: 如何配置和使用自定义子命令（subCommands）？

**配置方法：**
在 VSCode 设置中添加 `subCommands` 配置：
```json
{
  "vscode_fanyi_plugin.subCommands": [
    {
      "title": "翻译并复制(中->英)",
      "command": "vscode_fanyi_plugin.translateAndCopy",
      "args": {
        "sourceLanguage": "zh",
        "targetLanguage": "en"
      }
    }
  ]
}
```

**使用方法：**
1. 选中文本后，在命令面板中输入 "翻译: 自定义子命令"
2. 或右键点击选中文本，选择 "翻译: 自定义子命令"
3. 在弹出的快速选择菜单中选择要执行的子命令

**命令类型说明：**
- `vscode_fanyi_plugin.translateAndCopy`：翻译后自动复制到剪贴板
- `vscode_fanyi_plugin.translateSelection`：翻译后显示通知，可选择复制

### Q7: 支持哪些翻译服务？

**当前支持：**
- 腾讯翻译 API

**扩展其他服务：**
如果需要接入其他翻译服务（如百度、有道、Google 等），需要：
1. 下载 `vscode_fanyi_core` 项目源码
2. 参考现有实现添加新的翻译服务
3. 重新编译生成可执行文件
4. 更新配置使用新的可执行文件

详细开发文档请参考 [vscode_fanyi_core README](https://github.com/lyr-2000/vscode_fanyi_plugin/tree/main/vscode_fanyi_core/README.md)

## 📝 许可证

MIT
`