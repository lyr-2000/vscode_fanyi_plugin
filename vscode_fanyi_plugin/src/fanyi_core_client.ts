import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface InitRequest {
    tencent_ak?: string;
    tencent_secret?: string;
    baidu_ak?: string;
    baidu_secret?: string;
    youdao_ak?: string;
    youdao_secret?: string;
}

interface TranslateRequest {
    text: string;
    src: string;
    to: string;
}

interface Response {
    code: number;
    message: string;
    data?: any;
}

interface TranslateResponse {
    text: string;
    original: string;
    src: string;
    to: string;
}

/**
 * FanyiCore 客户端，用于与 fanyi_core.exe 进程通信
 */
export class FanyiCoreClient {
    private process: ChildProcess | null = null;
    private initialized: boolean = false;
    private responseQueue: Array<{ resolve: (value: Response) => void; reject: (error: Error) => void }> = [];
    private outputBuffer: string = '';

    constructor() {
        // 不在构造函数中读取配置，改为在实际使用时动态读取
    }

    /**
     * 检查文件是否存在
     */
    private fileExists(filePath: string): boolean {
        try {
            return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
        } catch {
            return false;
        }
    }

    /**
     * 从 VSCode 配置读取 binPath（支持字符串或字符串数组）
     * 如果是数组，返回第一个存在的文件路径
     */
    private getBinPath(): string {
        // 方法1: 使用命名空间读取
        const vscodeConfig = vscode.workspace.getConfiguration('vscode_fanyi_plugin');
        const binPathConfig = vscodeConfig.get<string | string[]>('binPath', '');
        
        // 方法2: 如果方法1失败，尝试直接读取完整配置名
        let binPathValue: string | string[] = binPathConfig;
        if (!binPathValue || (Array.isArray(binPathValue) && binPathValue.length === 0)) {
            const fullConfig = vscode.workspace.getConfiguration();
            binPathValue = fullConfig.get<string | string[]>('vscode_fanyi_plugin.binPath', '');
        }
        
        // 处理配置值
        let binPath: string = '';
        
        if (typeof binPathValue === 'string') {
            // 如果是字符串，直接使用
            binPath = binPathValue;
        } else if (Array.isArray(binPathValue)) {
            // 如果是数组，查找第一个存在的文件
            for (const pathItem of binPathValue) {
                if (typeof pathItem === 'string' && pathItem.trim()) {
                    const normalizedPath = pathItem.trim();
                    if (this.fileExists(normalizedPath)) {
                        binPath = normalizedPath;
                        console.log(`从 binPath 数组中找到存在的文件: ${binPath}`);
                        break;
                    }
                }
            }
            
            // 如果数组中没有找到存在的文件，记录调试信息
            if (!binPath) {
                console.warn('binPath 数组中的所有路径都不存在:');
                binPathValue.forEach((p, index) => {
                    console.warn(`  [${index}]: ${p} - ${this.fileExists(p) ? '存在' : '不存在'}`);
                });
            }
        }
        
        // 调试信息
        if (!binPath) {
            console.error('vscode_fanyi_plugin.binPath 未配置或所有路径都不存在');
            console.error('工作区文件夹:', vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath));
        } else {
            console.log('使用的 binPath:', binPath);
        }
        
        return binPath;
    }

    /**
     * 从 VSCode 配置读取 config
     */
    private getConfig(): any {
        const vscodeConfig = vscode.workspace.getConfiguration('vscode_fanyi_plugin');
        return vscodeConfig.get<any>('config', {});
    }

    /**
     * 启动 fanyi_core.exe 进程
     */
    private async startProcess(): Promise<void> {
        if (this.process) {
            return;
        }

        const binPath = this.getBinPath();
        if (!binPath) {
            throw new Error('未配置 vscode_fanyi_plugin.binPath，请先设置 fanyi_core.exe 的路径');
        }

        return new Promise((resolve, reject) => {
            let processStarted = false;
            
            try {
                const binPath = this.getBinPath();
                this.process = spawn(binPath, [], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                this.process.on('error', (error) => {
                    this.process = null;
                    if (!processStarted) {
                        const binPath = this.getBinPath();
                        const errorMsg = `启动 fanyi_core.exe 失败
路径: ${binPath}
错误: ${error.message}
错误代码: ${(error as any).code || 'N/A'}
错误名称: ${error.name || 'N/A'}`;
                        reject(new Error(errorMsg));
                    }
                });

                // 设置 stdout 监听器，处理所有响应
                this.process.stdout?.on('data', (data: Buffer) => {
                    this.outputBuffer += data.toString();
                    this.processResponses();
                });

                this.process.stderr?.on('data', (data: Buffer) => {
                    // 错误输出记录到控制台，extension.ts 会捕获并输出到输出面板
                    const stderrMsg = data.toString();
                    console.error(`fanyi_core.exe stderr: ${stderrMsg}`);
                    // 将 stderr 信息附加到错误中，以便在 extension.ts 中显示
                    if (stderrMsg.trim()) {
                        // 如果进程还未启动，可以将 stderr 信息包含在错误中
                        // 这里我们通过 console.error 输出，extension.ts 的错误处理会捕获
                    }
                });

                this.process.on('exit', (code: number | null, signal: string | null) => {
                    if (code !== null && code !== 0) {
                        // 进程异常退出，拒绝所有待处理的请求
                        const errorMsg = `fanyi_core.exe 进程异常退出
退出代码: ${code}
信号: ${signal || 'N/A'}
待处理请求数: ${this.responseQueue.length}`;
                        const error = new Error(errorMsg);
                        while (this.responseQueue.length > 0) {
                            const item = this.responseQueue.shift();
                            if (item) {
                                item.reject(error);
                            }
                        }
                    }
                    this.process = null;
                    this.initialized = false;
                });

                // 等待进程启动
                setTimeout(() => {
                    if (this.process && this.process.pid) {
                        processStarted = true;
                        resolve();
                    } else {
                        // 进程启动失败
                        this.process = null;
                        reject(new Error('fanyi_core.exe 进程启动失败'));
                    }
                }, 100);
            } catch (error: any) {
                this.process = null;
                reject(new Error(`启动 fanyi_core.exe 失败: ${error.message || error}`));
            }
        });
    }

    /**
     * 处理响应缓冲区中的 JSON 响应
     */
    private processResponses(): void {
        const lines = this.outputBuffer.split('\n');
        
        // 保留最后一行（可能不完整）
        this.outputBuffer = lines.pop() || '';

        // 处理完整的行
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
                continue;
            }

            try {
                const response: Response = JSON.parse(trimmedLine);
                const item = this.responseQueue.shift();
                if (item) {
                    item.resolve(response);
                }
            } catch (e) {
                // 如果不是有效的 JSON，可能是其他输出，忽略
                console.warn(`无法解析响应: ${trimmedLine}`);
            }
        }
    }

    /**
     * 初始化翻译服务
     */
    private async init(): Promise<void> {
        if (this.initialized) {
            return;
        }

        await this.startProcess();

        // 直接发送整个 config 对象，由下游处理
        const config = this.getConfig();

        const request = {
            command: 'init',
            data: config
        };

        const response = await this.sendRequest(request);
        
        if (response.code !== 0) {
            // 显示配置状态（不显示实际密钥值）
            const configKeys = Object.keys(config);
            const configStatus: any = {};
            configKeys.forEach(key => {
                configStatus[key] = config[key] ? '已配置' : '未配置';
            });
            
            const errorMsg = `初始化失败
响应代码: ${response.code}
错误消息: ${response.message}
配置项状态: ${JSON.stringify(configStatus, null, 2)}`;
            throw new Error(errorMsg);
        }

        this.initialized = true;
    }

    /**
     * 发送请求到 fanyi_core.exe
     */
    private async sendRequest(request: any): Promise<Response> {
        if (!this.process) {
            throw new Error('fanyi_core.exe 进程未启动');
        }

        return new Promise((resolve, reject) => {
            const requestJson = JSON.stringify(request) + '\n';
            
            // 创建队列项
            let timeout: NodeJS.Timeout;
            const queueItem = {
                resolve: (value: Response) => {
                    clearTimeout(timeout);
                    resolve(value);
                },
                reject: (error: Error) => {
                    clearTimeout(timeout);
                    reject(error);
                }
            };

            // 设置超时
            timeout = setTimeout(() => {
                // 从队列中移除这个请求
                const index = this.responseQueue.indexOf(queueItem);
                if (index >= 0) {
                    this.responseQueue.splice(index, 1);
                }
                const errorMsg = `请求超时 (30秒)
待处理请求数: ${this.responseQueue.length}
进程状态: ${this.process ? (this.process.killed ? '已终止' : '运行中') : '未启动'}
请求内容: ${requestJson.trim()}`;
                reject(new Error(errorMsg));
            }, 30000);

            // 添加到响应队列
            this.responseQueue.push(queueItem);

            // 发送请求
            this.process!.stdin?.write(requestJson, (err) => {
                if (err) {
                    // 从队列中移除这个请求
                    const index = this.responseQueue.indexOf(queueItem);
                    if (index >= 0) {
                        this.responseQueue.splice(index, 1);
                    }
                    clearTimeout(timeout);
                    const errorMsg = `发送请求失败
错误: ${err.message}
错误代码: ${(err as any).code || 'N/A'}
请求内容: ${requestJson.trim()}
进程状态: ${this.process ? (this.process.killed ? '已终止' : '运行中') : '未启动'}`;
                    reject(new Error(errorMsg));
                }
            });
        });
    }

    /**
     * 翻译文本
     * 语言代码直接传递给 fanyi_core，由 fanyi_core 处理映射
     */
    async translate(text: string, from: string, to: string): Promise<string> {
        // 确保已初始化
        await this.init();

        const translateData: TranslateRequest = {
            text: text,
            src: from,
            to: to
        };

        const request = {
            command: 'translateText',
            data: translateData
        };

        const response = await this.sendRequest(request);

        if (response.code !== 0) {
            const errorMsg = `翻译失败
响应代码: ${response.code}
错误消息: ${response.message}
原文: ${text}
源语言: ${from}
目标语言: ${to}`;
            throw new Error(errorMsg);
        }

        const translateResponse = response.data as TranslateResponse;
        return translateResponse.text || '';
    }

    /**
     * 关闭进程
     */
    async close(): Promise<void> {
        if (this.process) {
            const processRef = this.process;
            
            try {
                const request = {
                    command: 'exit',
                    data: {}
                };
                const requestJson = JSON.stringify(request) + '\n';
                processRef.stdin?.write(requestJson);
            } catch (e) {
                // 忽略错误
            }

            // 等待进程退出
            await new Promise<void>((resolve) => {
                // 检查进程是否已经退出
                if (processRef.killed || processRef.exitCode !== null) {
                    resolve();
                    return;
                }

                // 监听退出事件
                processRef.once('exit', () => resolve());
                
                // 设置超时，如果进程不退出则强制 resolve
                setTimeout(() => {
                    resolve();
                }, 1000);
            });

            // 如果进程还在运行，强制终止
            if (processRef.exitCode === null && !processRef.killed) {
                try {
                    processRef.kill();
                } catch (e) {
                    // 忽略错误
                }
            }

            this.process = null;
            this.initialized = false;
        }
    }
}
