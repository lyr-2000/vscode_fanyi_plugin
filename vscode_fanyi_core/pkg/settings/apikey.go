package settings

import "sync"

var (
	mu        sync.Mutex
	FanyiKeys map[string]interface{}
)

func SetKeys(keys map[string]interface{}) {
	mu.Lock()
	defer mu.Unlock()
	FanyiKeys = keys
}

func GetKey(key string) string {
	mu.Lock()
	defer mu.Unlock()
	if FanyiKeys == nil {
		return ""
	}
	if _, ok := FanyiKeys[key]; !ok {
		return ""
	}
	str, ok := FanyiKeys[key].(string)
	if !ok {
		return ""
	}
	return str
}

func GetBool(key string) bool {
	mu.Lock()
	defer mu.Unlock()
	if FanyiKeys == nil {
		return false
	}
	if _, ok := FanyiKeys[key]; !ok {
		return false
	}
	switch el := FanyiKeys[key].(type) {
	case string:
		return el == "true"
	case bool:
		return el
	case int:
		return el != 0
	case float64:
		return el != 0
	default:
		return false
	}
}
