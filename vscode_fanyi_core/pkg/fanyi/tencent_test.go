package fanyi

import (
	"fmt"
	"testing"
	"vscode_fanyi_core/pkg/settings"
)

func Test_t(t *testing.T) {
	// set your key
	settings.SetKeys(map[string]interface{}{
		"tencent_ak":     "",
		"tencent_secret": "",
	})
	cli := GetTencentAPI()
	if err := cli.initClient(); err != nil {
		t.Fatalf("init client failed: %v", err)
	}

	response, err := cli.Translate("hello", "auto", "zh")
	if err != nil {
		t.Fatalf("translate failed: %v", err)
	}
	fmt.Println(response)

}
