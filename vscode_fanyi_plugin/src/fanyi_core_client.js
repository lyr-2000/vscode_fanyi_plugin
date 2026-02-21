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
exports.FanyiCoreClient = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
/**
 * FanyiCore 客户端，用于与 fanyi_core.exe 进程通信
 */
class FanyiCoreClient {
    constructor() {
        this.process = null;
        this.initialized = false;
        this.responseQueue = [];
        this.outputBuffer = '';
        // 从 VSCode 配置读取 binPath
        const vscodeConfig = vscode.workspace.getConfiguration('vscode_fanyi_plugin');
        this.binPath = vscodeConfig.get('binPath', '');
        // 从 VSCode 配置读取 config
        this.config = vscodeConfig.get('config', {});
    }
    /**
     * 启动 fanyi_core.exe 进程
     */
    async startProcess() {
        if (this.process) {
            return;
        }
        if (!this.binPath) {
            throw new Error('未配置 vscode_fanyi_plugin.binPath，请先设置 fanyi_core.exe 的路径');
        }
        return new Promise((resolve, reject) => {
            let processStarted = false;
            try {
                this.process = (0, child_process_1.spawn)(this.binPath, [], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                this.process.on('error', (error) => {
                    this.process = null;
                    if (!processStarted) {
                        reject(new Error(`启动 fanyi_core.exe 失败: ${error.message}`));
                    }
                });
                // 设置 stdout 监听器，处理所有响应
                this.process.stdout?.on('data', (data) => {
                    this.outputBuffer += data.toString();
                    this.processResponses();
                });
                this.process.stderr?.on('data', (data) => {
                    // 错误输出可以记录，但不影响正常流程
                    console.error(`fanyi_core.exe stderr: ${data.toString()}`);
                });
                this.process.on('exit', (code) => {
                    if (code !== null && code !== 0) {
                        // 进程异常退出，拒绝所有待处理的请求
                        const error = new Error(`fanyi_core.exe 进程退出，代码: ${code}`);
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
                    }
                    else {
                        // 进程启动失败
                        this.process = null;
                        reject(new Error('fanyi_core.exe 进程启动失败'));
                    }
                }, 100);
            }
            catch (error) {
                this.process = null;
                reject(new Error(`启动 fanyi_core.exe 失败: ${error.message || error}`));
            }
        });
    }
    /**
     * 处理响应缓冲区中的 JSON 响应
     */
    processResponses() {
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
                const response = JSON.parse(trimmedLine);
                const item = this.responseQueue.shift();
                if (item) {
                    item.resolve(response);
                }
            }
            catch (e) {
                // 如果不是有效的 JSON，可能是其他输出，忽略
                console.warn(`无法解析响应: ${trimmedLine}`);
            }
        }
    }
    /**
     * 初始化翻译服务
     */
    async init() {
        if (this.initialized) {
            return;
        }
        await this.startProcess();
        const initData = {};
        // 从配置中读取密钥
        if (this.config.tencent_ak) {
            initData.tencent_ak = this.config.tencent_ak;
        }
        if (this.config.tencent_secret) {
            initData.tencent_secret = this.config.tencent_secret;
        }
        if (this.config.baidu_ak) {
            initData.baidu_ak = this.config.baidu_ak;
        }
        if (this.config.baidu_secret) {
            initData.baidu_secret = this.config.baidu_secret;
        }
        if (this.config.youdao_ak) {
            initData.youdao_ak = this.config.youdao_ak;
        }
        if (this.config.youdao_secret) {
            initData.youdao_secret = this.config.youdao_secret;
        }
        const request = {
            command: 'init',
            data: initData
        };
        const response = await this.sendRequest(request);
        if (response.code !== 0) {
            throw new Error(`初始化失败: ${response.message}`);
        }
        this.initialized = true;
    }
    /**
     * 发送请求到 fanyi_core.exe
     */
    async sendRequest(request) {
        if (!this.process) {
            throw new Error('fanyi_core.exe 进程未启动');
        }
        return new Promise((resolve, reject) => {
            const requestJson = JSON.stringify(request) + '\n';
            // 创建队列项
            let timeout;
            const queueItem = {
                resolve: (value) => {
                    clearTimeout(timeout);
                    resolve(value);
                },
                reject: (error) => {
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
                reject(new Error('请求超时'));
            }, 30000);
            // 添加到响应队列
            this.responseQueue.push(queueItem);
            // 发送请求
            this.process.stdin?.write(requestJson, (err) => {
                if (err) {
                    // 从队列中移除这个请求
                    const index = this.responseQueue.indexOf(queueItem);
                    if (index >= 0) {
                        this.responseQueue.splice(index, 1);
                    }
                    clearTimeout(timeout);
                    reject(new Error(`发送请求失败: ${err.message}`));
                }
            });
        });
    }
    /**
     * 翻译文本
     * 语言代码直接传递给 fanyi_core，由 fanyi_core 处理映射
     */
    async translate(text, from, to) {
        // 确保已初始化
        await this.init();
        const translateData = {
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
            throw new Error(`翻译失败: ${response.message}`);
        }
        const translateResponse = response.data;
        return translateResponse.text || '';
    }
    /**
     * 关闭进程
     */
    async close() {
        if (this.process) {
            const processRef = this.process;
            try {
                const request = {
                    command: 'exit',
                    data: {}
                };
                const requestJson = JSON.stringify(request) + '\n';
                processRef.stdin?.write(requestJson);
            }
            catch (e) {
                // 忽略错误
            }
            // 等待进程退出
            await new Promise((resolve) => {
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
                }
                catch (e) {
                    // 忽略错误
                }
            }
            this.process = null;
            this.initialized = false;
        }
    }
}
exports.FanyiCoreClient = FanyiCoreClient;
//# sourceMappingURL=fanyi_core_client.js.map