package fanyi

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"sync"
	"time"
	"vscode_fanyi_core/pkg/settings"

	"github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common"
	"github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common/profile"
	"github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common/regions"
	"golang.org/x/sync/singleflight"

	tmt "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/tmt/v20180321"
)

type TencentFanyi struct {
	Key           string
	KeySecret     string
	cli           *tmt.Client
	logFileEnable bool
	group         singleflight.Group // 用于避免并发重复请求
	timeout time.Duration
}

var (
	myOnce      sync.Once
	tencent     *TencentFanyi
	logFileMutex sync.Mutex // 保护日志文件写入的互斥锁
)

const (
	logFileName = "app.log"
	maxLogSize  = 10 * 1024 * 1024 // 10MB
)

func GetTencentAPI() *TencentFanyi {
	myOnce.Do(func() {
		tencent = getTencent()
	})
	return tencent
}

func getTencent() *TencentFanyi {
	timeout := settings.GetInt("timeout")
	if timeout <= 0 {
		timeout = 60
	}
	x := time.Duration(timeout) * time.Second
	return &TencentFanyi{
		Key:           settings.GetKey("tencent_ak"),
		KeySecret:     settings.GetKey("tencent_secret"),
		logFileEnable: settings.GetBool("log_file_enable"),
		timeout: x,
	}
}

func (t *TencentFanyi) initClient() error {
	if t.cli != nil {
		return nil
	}
	credential := common.NewCredential(t.Key, t.KeySecret)
	client, err := tmt.NewClient(credential, regions.Guangzhou, profile.NewClientProfile())
	if err != nil {
		return err
	}
	t.cli = client
	return nil
}

// logToFile 将日志写入文件，如果文件超过10M则清空
func (t *TencentFanyi) logToFile(message string) {
	if !t.logFileEnable {
		return
	}

	logFileMutex.Lock()
	defer logFileMutex.Unlock()

	// 检查文件大小，如果超过10M则清空
	if fileInfo, err := os.Stat(logFileName); err == nil {
		if fileInfo.Size() >= maxLogSize {
			// 清空文件
			os.Truncate(logFileName, 0)
		}
	}

	// 打开文件（追加模式）
	file, err := os.OpenFile(logFileName, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		// 如果无法打开文件，静默失败，不影响翻译功能
		return
	}
	defer file.Close()

	// 写入日志（带时间戳）
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	logEntry := fmt.Sprintf("[%s] %s\n", timestamp, message)
	file.WriteString(logEntry)
}

// generateKey 为翻译请求生成唯一 key
func (t *TencentFanyi) generateKey(text string, src string, to string) string {
	// 规范化语言代码
	if src == "" {
		src = "en"
	}
	if to == "" {
		to = "zh"
	}
	// 使用 SHA256 生成唯一 key
	key := fmt.Sprintf("%s|%s|%s", text, src, to)
	hash := sha256.Sum256([]byte(key))
	return hex.EncodeToString(hash[:])
}

// doTranslate 执行实际的翻译操作
func (t *TencentFanyi) doTranslate(text string, src string, to string) (string, error) {
	if err := t.initClient(); err != nil {
		t.logToFile(fmt.Sprintf("初始化客户端失败: %v", err))
		return "", err
	}
	// 初始化认证信息
	// 创建请求
	request := tmt.NewTextTranslateRequest()
	request.SourceText = common.StringPtr(text)
	request.Source = common.StringPtr(src)
	request.Target = common.StringPtr(to)
	request.ProjectId = common.Int64Ptr(88)
	
	// 记录翻译请求日志
	t.logToFile(fmt.Sprintf("翻译请求 - 原文: %s, 源语言: %s, 目标语言: %s", text, src, to))
	
	ctx,abort := context.WithTimeout(context.Background(), t.timeout)
	defer abort()
	// 发送请求
	response, err := t.cli.TextTranslateWithContext(ctx, request)
	if err != nil {
		t.logToFile(fmt.Sprintf("翻译失败 - 原文: %s, 错误: %v", text, err))
		return "", err
	}
	if response.Response.TargetText == nil {
		err := errors.New("target text is nil")
		t.logToFile(fmt.Sprintf("翻译响应为空 - 原文: %s, 错误: %v", text, err))
		return "", err
	}
	
	result := *response.Response.TargetText
	// 记录翻译成功日志
	t.logToFile(fmt.Sprintf("翻译成功 - 原文: %s, 译文: %s, 源语言: %s, 目标语言: %s", text, result, src, to))
	
	return result, nil
}

// Translate 翻译文本，使用 singleflight 避免并发重复请求
func (t *TencentFanyi) Translate(text string, src string, to string) (string, error) {
	// 规范化语言代码
	if src == "" || to == "" {
		src = "en"
		to = "zh"
	}
	
	// 生成唯一 key
	key := t.generateKey(text, src, to)
	
	// 使用 singleflight 确保相同请求只执行一次
	result, err, _ := t.group.Do(key, func() (interface{}, error) {
		return t.doTranslate(text, src, to)
	})
	
	if err != nil {
		return "", err
	}
	
	return result.(string), nil
}
