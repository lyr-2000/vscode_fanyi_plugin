import * as vscode from 'vscode';
import { FanyiCoreClient } from './fanyi_core_client';

// 全局的 fanyi_core 客户端实例
let fanyiClient: FanyiCoreClient | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log('划词翻译插件已激活');

    // 创建全局的 fanyi_core 客户端实例
    fanyiClient = new FanyiCoreClient();

    // 创建输出面板（复用）
    const outputChannel = vscode.window.createOutputChannel('划词翻译');

    // 获取配置
    const getConfig = () => {
        const config = vscode.workspace.getConfiguration('vscode_fanyi_plugin');
        return {
            sourceLanguage: config.get<string>('sourceLanguage', 'auto'),
            targetLanguage: config.get<string>('targetLanguage', 'zh'),
            showNotification: config.get<boolean>('showNotification', true),
            showOutput: config.get<boolean>('showOutput', false)
        };
    };

    // 执行翻译
    const doTranslate = async (text: string) => {
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
            const translatedText = await fanyiClient.translate(
                text.trim(),
                config.sourceLanguage,
                config.targetLanguage
            );

            // 根据配置显示通知
            if (config.showNotification) {
                vscode.window.showInformationMessage(`翻译结果: ${translatedText}`, '复制到剪贴板').then(selection => {
                    if (selection === '复制到剪贴板') {
                        vscode.env.clipboard.writeText(translatedText);
                    }
                });
            }
            
            // 根据配置显示在输出面板（调试用）
            if (config.showOutput) {
                outputChannel.appendLine(`原文: ${text}`);
                outputChannel.appendLine(`译文: ${translatedText}`);
                outputChannel.show();
            }
        } catch (error: any) {
            const errorMessage = error.message || String(error);
            const errorStack = error.stack || '';
            
            // 输出详细错误信息到输出面板
            outputChannel.appendLine('========================================');
            outputChannel.appendLine(`[${new Date().toLocaleString()}] 翻译失败`);
            outputChannel.appendLine('----------------------------------------');
            outputChannel.appendLine(`原文: ${text}`);
            outputChannel.appendLine(`源语言: ${config.sourceLanguage}`);
            outputChannel.appendLine(`目标语言: ${config.targetLanguage}`);
            outputChannel.appendLine(`错误信息: ${errorMessage}`);
            if (errorStack) {
                outputChannel.appendLine(`错误堆栈:`);
                outputChannel.appendLine(errorStack);
            }
            if (error.code) {
                outputChannel.appendLine(`错误代码: ${error.code}`);
            }
            outputChannel.appendLine('========================================');
            outputChannel.appendLine('');
            outputChannel.show(true); // 显示并聚焦到输出面板
            
            // 显示简短错误提示
            vscode.window.showErrorMessage(`翻译失败: ${errorMessage}`, '查看详细日志').then(selection => {
                if (selection === '查看详细日志') {
                    outputChannel.show(true);
                }
            });
        }
    };

    // 命令：翻译选中文本
    const translateSelectionCommand = vscode.commands.registerCommand('vscode_fanyi_plugin.translateSelection', async () => {
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
    const translateCommand = vscode.commands.registerCommand('vscode_fanyi_plugin.translate', async () => {
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

            let textToTranslate: string = '';
            let hoverRange: vscode.Range | undefined;

            // 优先检查是否有选中的文本
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document === document) {
                const selection = activeEditor.selection;
                if (!selection.isEmpty) {
                    // 如果光标位置在选中范围内，使用选中的文本
                    if (selection.contains(position) || selection.start.isEqual(position) || selection.end.isEqual(position)) {
                        textToTranslate = document.getText(selection);
                        hoverRange = selection;
                    }
                }
            }

            // 如果没有选中文本，则获取光标位置的单词
            if (!textToTranslate) {
                const wordRange = document.getWordRangeAtPosition(position);
                if (wordRange) {
                    textToTranslate = document.getText(wordRange);
                    hoverRange = wordRange;
                }
            }

            // 如果仍然没有文本，返回 null
            if (!textToTranslate || textToTranslate.trim().length === 0) {
                return null;
            }

            try {
                if (!fanyiClient) {
                    return null;
                }
                const translatedText = await fanyiClient.translate(
                    textToTranslate.trim(),
                    config.sourceLanguage,
                    config.targetLanguage
                );

                const markdown = new vscode.MarkdownString();
                markdown.appendMarkdown(`**翻译结果:** \n\n${translatedText}\n\n`);
                markdown.appendMarkdown(`*原文: \n\n${textToTranslate}*`);
                markdown.isTrusted = true;

                return new vscode.Hover(markdown, hoverRange);
            } catch (error: any) {
                // 翻译失败时输出错误日志到输出面板
                const errorMessage = error.message || String(error);
                outputChannel.appendLine(`[${new Date().toLocaleString()}] 悬停翻译失败: ${textToTranslate}`);
                outputChannel.appendLine(`错误: ${errorMessage}`);
                if (error.stack) {
                    outputChannel.appendLine(`堆栈: ${error.stack}`);
                }
                outputChannel.appendLine('');
                // 不显示悬停提示，静默失败
                return null;
            }
        }
    });

    context.subscriptions.push(translateSelectionCommand, translateCommand, hoverProvider);
}

export async function deactivate() {
    console.log('划词翻译插件已停用');
    // 关闭 fanyi_core 客户端
    if (fanyiClient) {
        await fanyiClient.close();
        fanyiClient = null;
    }
}
