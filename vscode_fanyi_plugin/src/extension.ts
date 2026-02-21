import * as vscode from 'vscode';
import { FanyiCoreClient } from './fanyi_core_client';

// 全局的 fanyi_core 客户端实例
let fanyiClient: FanyiCoreClient | null = null;

// SubCommand 接口定义
interface SubCommand {
    menu?: boolean;
    title: string;
    command: string;
    args?: {
        sourceLanguage?: string;
        targetLanguage?: string;
    };
}

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

    // 执行翻译并复制（支持自定义参数）
    const doTranslateAndCopy = async (text: string, sourceLanguage?: string, targetLanguage?: string) => {
        const config = getConfig();
        const srcLang = sourceLanguage || config.sourceLanguage;
        const tgtLang = targetLanguage || config.targetLanguage;

        try {
            if (!fanyiClient) {
                vscode.window.showErrorMessage('翻译客户端未初始化');
                return;
            }
            const translatedText = await fanyiClient.translate(
                text.trim(),
                srcLang,
                tgtLang
            );

            // 默认复制到剪贴板
            await vscode.env.clipboard.writeText(translatedText);

            // 根据配置显示通知
            if (config.showNotification) {
                vscode.window.showInformationMessage(`翻译结果已复制: ${translatedText}`);
            }
            
            // 根据配置显示在输出面板（调试用）
            if (config.showOutput) {
                outputChannel.appendLine(`原文: ${text}`);
                outputChannel.appendLine(`译文: ${translatedText}`);
                outputChannel.appendLine(`源语言: ${srcLang}, 目标语言: ${tgtLang}`);
                outputChannel.appendLine(`已复制到剪贴板`);
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
            outputChannel.appendLine(`源语言: ${srcLang}`);
            outputChannel.appendLine(`目标语言: ${tgtLang}`);
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

    // 执行子命令的通用函数
    const executeSubCommand = async (subCmd: SubCommand, text: string) => {
        const args = subCmd.args || {};
        
        switch (subCmd.command) {
            case 'vscode_fanyi_plugin.translateAndCopy':
                // 翻译并复制
                await doTranslateAndCopy(
                    text,
                    args.sourceLanguage,
                    args.targetLanguage
                );
                break;
            case 'vscode_fanyi_plugin.translateSelection':
                // 翻译选中文本（显示通知）
                // 临时修改配置以使用自定义的语言参数
                const originalConfig = getConfig();
                const tempConfig = {
                    ...originalConfig,
                    sourceLanguage: args.sourceLanguage || originalConfig.sourceLanguage,
                    targetLanguage: args.targetLanguage || originalConfig.targetLanguage
                };
                // 创建临时的翻译函数
                try {
                    if (!fanyiClient) {
                        vscode.window.showErrorMessage('翻译客户端未初始化');
                        return;
                    }
                    const translatedText = await fanyiClient.translate(
                        text.trim(),
                        tempConfig.sourceLanguage,
                        tempConfig.targetLanguage
                    );
                    
                    if (tempConfig.showNotification) {
                        vscode.window.showInformationMessage(`翻译结果: ${translatedText}`, '复制到剪贴板').then(selection => {
                            if (selection === '复制到剪贴板') {
                                vscode.env.clipboard.writeText(translatedText);
                            }
                        });
                    }
                    
                    if (tempConfig.showOutput) {
                        outputChannel.appendLine(`原文: ${text}`);
                        outputChannel.appendLine(`译文: ${translatedText}`);
                        outputChannel.show();
                    }
                } catch (error: any) {
                    const errorMessage = error.message || String(error);
                    outputChannel.appendLine('========================================');
                    outputChannel.appendLine(`[${new Date().toLocaleString()}] 翻译失败`);
                    outputChannel.appendLine('----------------------------------------');
                    outputChannel.appendLine(`原文: ${text}`);
                    outputChannel.appendLine(`源语言: ${tempConfig.sourceLanguage}`);
                    outputChannel.appendLine(`目标语言: ${tempConfig.targetLanguage}`);
                    outputChannel.appendLine(`错误信息: ${errorMessage}`);
                    outputChannel.appendLine('========================================');
                    outputChannel.appendLine('');
                    outputChannel.show(true);
                    vscode.window.showErrorMessage(`翻译失败: ${errorMessage}`, '查看详细日志').then(selection => {
                        if (selection === '查看详细日志') {
                            outputChannel.show(true);
                        }
                    });
                }
                break;
            default:
                // 默认使用 translateAndCopy
                console.warn(`未知的命令: ${subCmd.command}，使用默认的 translateAndCopy`);
                await doTranslateAndCopy(
                    text,
                    args.sourceLanguage,
                    args.targetLanguage
                );
                break;
        }
    };

    // 命令：翻译并复制（默认复制到剪贴板，支持参数）
    const translateCommand = vscode.commands.registerCommand('vscode_fanyi_plugin.translateAndCopy', async (args?: { sourceLanguage?: string; targetLanguage?: string }) => {
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

        await doTranslateAndCopy(text, args?.sourceLanguage, args?.targetLanguage);
    });

    // 注册子命令处理器（用于命令面板和右键菜单）
    const subCommandHandler = vscode.commands.registerCommand('vscode_fanyi_plugin.subCommand', async () => {
        const config = vscode.workspace.getConfiguration('vscode_fanyi_plugin');
        const subCommands = config.get<SubCommand[]>('subCommands', []);

        if (subCommands.length === 0) {
            vscode.window.showWarningMessage('未配置子命令，请在设置中配置 vscode_fanyi_plugin.subCommands');
            return;
        }

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

        // 显示快速选择菜单
        const items = subCommands.map((subCmd, index) => ({
            label: subCmd.title,
            description: subCmd.args ? `${subCmd.args.sourceLanguage || 'auto'} → ${subCmd.args.targetLanguage || 'zh'}` : '',
            index: index
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: '选择要执行的翻译命令'
        });

        if (selected) {
            const subCmd = subCommands[selected.index];
            // 根据配置的 command 字段执行对应的命令
            await executeSubCommand(subCmd, text);
        }
    });

    // 动态注册 subCommands
    const registerSubCommands = () => {
        const config = vscode.workspace.getConfiguration('vscode_fanyi_plugin');
        const subCommands = config.get<SubCommand[]>('subCommands', []);

        console.log(`[划词翻译] 开始注册 subCommands，共 ${subCommands.length} 个`);
        outputChannel.appendLine(`[${new Date().toLocaleString()}] 注册 subCommands，共 ${subCommands.length} 个`);

        const registeredCommands: vscode.Disposable[] = [];

        subCommands.forEach((subCmd, index) => {
            // 为每个子命令创建唯一的命令 ID
            const commandId = `vscode_fanyi_plugin.subCommand.${index}`;
            
            console.log(`[划词翻译] 注册命令: ${commandId}, 标题: ${subCmd.title}`);
            outputChannel.appendLine(`  注册命令: ${commandId} - ${subCmd.title}`);
            
            // 注册命令（用于命令面板和右键菜单）
            const disposable = vscode.commands.registerCommand(commandId, async () => {
                console.log(`[划词翻译] 执行命令: ${commandId}`);
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

                await executeSubCommand(subCmd, text);
            });

            registeredCommands.push(disposable);
        });

        console.log(`[划词翻译] subCommands 注册完成，共注册 ${registeredCommands.length} 个命令`);
        return registeredCommands;
    };

    // 初始注册 subCommands
    let subCommandDisposables = registerSubCommands();
    
    // 添加一个测试命令来验证 subCommands 是否正常工作
    const testSubCommandsCommand = vscode.commands.registerCommand('vscode_fanyi_plugin.testSubCommands', async () => {
        const config = vscode.workspace.getConfiguration('vscode_fanyi_plugin');
        const subCommands = config.get<SubCommand[]>('subCommands', []);
        
        const message = `当前配置了 ${subCommands.length} 个子命令:\n${subCommands.map((cmd, idx) => `${idx + 1}. ${cmd.title} (命令ID: vscode_fanyi_plugin.subCommand.${idx})`).join('\n')}`;
        vscode.window.showInformationMessage(message);
        outputChannel.appendLine(`[${new Date().toLocaleString()}] 测试 subCommands:`);
        outputChannel.appendLine(message);
        outputChannel.show();
    });

    // 监听配置变化，重新注册 subCommands
    const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('vscode_fanyi_plugin.subCommands')) {
            console.log('[划词翻译] 检测到 subCommands 配置变化，重新注册命令');
            outputChannel.appendLine(`[${new Date().toLocaleString()}] 检测到 subCommands 配置变化，重新注册命令`);
            // 注销旧的命令
            subCommandDisposables.forEach(d => d.dispose());
            // 从订阅中移除旧的命令
            const oldIndex = context.subscriptions.indexOf(subCommandDisposables[0]);
            if (oldIndex >= 0) {
                subCommandDisposables.forEach(d => {
                    const idx = context.subscriptions.indexOf(d);
                    if (idx >= 0) {
                        context.subscriptions.splice(idx, 1);
                    }
                });
            }
            // 重新注册
            subCommandDisposables = registerSubCommands();
            // 更新订阅
            subCommandDisposables.forEach(d => context.subscriptions.push(d));
        }
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

    context.subscriptions.push(
        translateSelectionCommand,
        translateCommand,
        subCommandHandler,
        testSubCommandsCommand,
        hoverProvider,
        configWatcher
    );
    // 添加动态注册的 subCommands
    subCommandDisposables.forEach(d => context.subscriptions.push(d));
}

export async function deactivate() {
    console.log('划词翻译插件已停用');
    // 关闭 fanyi_core 客户端
    if (fanyiClient) {
        await fanyiClient.close();
        fanyiClient = null;
    }
}
