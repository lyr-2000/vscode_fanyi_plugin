package settings

import "sync"
import "strconv"

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


func GetInt(key string) int {
	mu.Lock()
	defer mu.Unlock()
	if FanyiKeys == nil {
		return 0
	}
	if _, ok := FanyiKeys[key]; !ok {
		return 0
	}
	switch el := FanyiKeys[key].(type) {
	case string:
		i, err := strconv.Atoi(el)
		if err != nil {
			return 0
		}
		return i
	case int:
		return el
	case float64:
		return int(el)
	case int64:
		return int(el)
	case uint64:
		return int(el)
	case int32:
		return int(el)
	case uint32:
		return int(el)
	case int16:
		return int(el)
	case uint16:
		return int(el)
	case int8:
		return int(el)
	case uint8:
		return int(el)
	default:
		return 0
	}
}