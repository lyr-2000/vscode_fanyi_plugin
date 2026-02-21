package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"vscode_fanyi_core/pkg/fanyi"
	"vscode_fanyi_core/pkg/settings"
)

// Request 通用请求结构
type Request struct {
	Command string          `json:"command"`
	Data    json.RawMessage `json:"data"`
}

// InitRequest 初始化秘钥请求
type InitRequest struct {
	TencentAK     string `json:"tencent_ak"`
	TencentSecret string `json:"tencent_secret"`
}

// TranslateRequest 翻译请求
type TranslateRequest struct {
	Text string `json:"text"`
	Src  string `json:"src"`
	To   string `json:"to"`
}

// Response 通用响应结构
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// InitResponse 初始化响应
type InitResponse struct {
	Success bool `json:"success"`
}

// TranslateResponse 翻译响应
type TranslateResponse struct {
	Text     string `json:"text"`
	Original string `json:"original"`
	Src      string `json:"src"`
	To       string `json:"to"`
}

func main() {
	scanner := bufio.NewScanner(os.Stdin)

	for scanner.Scan() {
		input := strings.TrimSpace(scanner.Text())

		// 跳过空输入
		if input == "" {
			continue
		}

		// 处理 JSON 输入
		shouldExit := handleInput(input)
		if shouldExit {
			break
		}
	}

	if err := scanner.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "错误: %v\n", err)
		os.Exit(1)
	}
}

// handleInput 处理单次输入，返回是否应该退出
func handleInput(input string) bool {
	var req Request
	if err := json.Unmarshal([]byte(input), &req); err != nil {
		outputError("无效的 JSON 格式", err.Error())
		return false
	}

	// 根据命令路由处理
	var resp Response
	switch req.Command {
	case "init":
		resp = handleInit(req.Data)
	case "translateText":
		resp = handleTranslate(req.Data)
	case "exit":
		resp = Response{
			Code:    0,
			Message: "退出程序",
		}
		outputJSON(resp)
		return true
	default:
		resp = Response{
			Code:    1,
			Message: fmt.Sprintf("未知命令: %s", req.Command),
		}
	}

	// 输出结果
	outputJSON(resp)
	return false
}

// handleInit 处理初始化命令
func handleInit(data json.RawMessage) Response {
	// var initReq InitRequest
	var keys map[string]interface{}
	if err := json.Unmarshal(data, &keys); err != nil {
		return Response{
			Code:    1,
			Message: "解析 init 请求失败: " + err.Error(),
		}
	}

	// 设置秘钥
	settings.SetKeys(keys)

	return Response{
		Code:    0,
		Message: "初始化成功",
		Data: InitResponse{
			Success: true,
		},
	}
}

// handleTranslate 处理翻译命令
func handleTranslate(data json.RawMessage) Response {
	var transReq TranslateRequest
	if err := json.Unmarshal(data, &transReq); err != nil {
		return Response{
			Code:    1,
			Message: "解析 translateText 请求失败: " + err.Error(),
		}
	}

	// 验证必填字段
	if transReq.Text == "" {
		return Response{
			Code:    1,
			Message: "text 字段不能为空",
		}
	}

	// 调用翻译服务
	tencent := fanyi.GetTencentAPI()
	result, err := tencent.Translate(transReq.Text, transReq.Src, transReq.To)
	if err != nil {
		return Response{
			Code:    1,
			Message: "翻译失败: " + err.Error(),
		}
	}

	return Response{
		Code:    0,
		Message: "翻译成功",
		Data: TranslateResponse{
			Text:     result,
			Original: transReq.Text,
			Src:      transReq.Src,
			To:       transReq.To,
		},
	}
}

// outputJSON 输出 JSON
func outputJSON(data interface{}) {
	jsonData, _ := json.Marshal(data)
	fmt.Println(string(jsonData))
}

// outputError 输出错误信息
func outputError(err, msg string) {
	resp := Response{
		Code:    1,
		Message: err + ": " + msg,
	}
	outputJSON(resp)
}
