"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const fanyi_core_client_1 = require("./fanyi_core_client");
// 全局的 fanyi_core 客户端实例
let fanyiClient = null;
function activate(context) {
    console.log('划词翻译插件已激活');
    // 创建全局的 fanyi_core 客户端实例
    fanyiClient = new fanyi_core_client_1.FanyiCoreClient();
    // 创建输出面板（复用）
    const outputChannel = vscode.window.createOutputChannel('划词翻译');
    // 获取配置
    const getConfig = () => {
        const config = vscode.workspace.getConfiguration('fanyi');
        return {
            sourceLanguage: config.get('sourceLanguage', 'auto'),
            targetLanguage: config.get('targetLanguage', 'zh'),
            showNotification: config.get('showNotification', true)
        };
    };
    // 执行翻译
    const doTranslate = async (text) => {
        if (!text || text.trim().length === 0) {
            vscode.window.showWarningMessage('请先选中要翻译的文本');
            return;
        }
        const config = getConfig();
        try {
            if (!fanyiClient) {
                vscode.window.showErrorMessage('翻译客户端未初始化');
                return;
            }
            const translatedText = await fanyiClient.translate(text.trim(), config.sourceLanguage, config.targetLanguage);
            if (config.showNotification) {
                vscode.window.showInformationMessage(`翻译结果: ${translatedText}`, '复制到剪贴板').then(selection => {
                    if (selection === '复制到剪贴板') {
                        vscode.env.clipboard.writeText(translatedText);
                    }
                });
            }
            else {
                // 显示在输出面板
                outputChannel.appendLine(`原文: ${text}`);
                outputChannel.appendLine(`译文: ${translatedText}`);
                outputChannel.show();
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`翻译失败: ${error.message || error}`);
        }
    };
    // 命令：翻译选中文本
    const translateSelectionCommand = vscode.commands.registerCommand('fanyi.translateSelection', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('请先打开一个文件');
            return;
        }
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        if (!text || text.trim().length === 0) {
            vscode.window.showWarningMessage('请先选中要翻译的文本');
            return;
        }
        await doTranslate(text);
    });
    // 命令：翻译（通用）
    const translateCommand = vscode.commands.registerCommand('fanyi.translate', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('请先打开一个文件');
            return;
        }
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        if (!text || text.trim().length === 0) {
            vscode.window.showWarningMessage('请先选中要翻译的文本');
            return;
        }
        await doTranslate(text);
    });
    // 悬停提示翻译
    const hoverProvider = vscode.languages.registerHoverProvider('*', {
        async provideHover(document, position, token) {
            const config = getConfig();
            const range = document.getWordRangeAtPosition(position);
            if (!range) {
                return null;
            }
            const word = document.getText(range);
            if (!word || word.trim().length === 0) {
                return null;
            }
            try {
                if (!fanyiClient) {
                    return null;
                }
                const translatedText = await fanyiClient.translate(word, config.sourceLanguage, config.targetLanguage);
                const markdown = new vscode.MarkdownString();
                markdown.appendMarkdown(`**翻译结果:** ${translatedText}\n\n`);
                markdown.appendMarkdown(`*原文: ${word}*`);
                markdown.isTrusted = true;
                return new vscode.Hover(markdown, range);
            }
            catch (error) {
                // 翻译失败时不显示悬停提示
                return null;
            }
        }
    });
    context.subscriptions.push(translateSelectionCommand, translateCommand, hoverProvider);
}
exports.activate = activate;
async function deactivate() {
    console.log('划词翻译插件已停用');
    // 关闭 fanyi_core 客户端
    if (fanyiClient) {
        await fanyiClient.close();
        fanyiClient = null;
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map