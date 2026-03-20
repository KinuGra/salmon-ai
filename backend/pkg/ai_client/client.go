package aiclient

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// Client は Python AIサービスへのHTTPクライアントです。
// AI_SERVICE_URL 環境変数でエンドポイントを切り替えます。
type Client struct {
	baseURL    string
	httpClient *http.Client
}

func NewClient() *Client {
	baseURL := os.Getenv("AI_SERVICE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8000"
	}
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 120 * time.Second, // AI生成は時間がかかるため長めに設定
		},
	}
}

// Post は指定パスへ JSON ボディを POST し、レスポンスを result にデコードします。
func (c *Client) Post(path string, body any, result any) error {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("ai_client: failed to marshal request: %w", err)
	}

	resp, err := c.httpClient.Post(
		c.baseURL+path,
		"application/json",
		bytes.NewReader(jsonBody),
	)
	if err != nil {
		return fmt.Errorf("ai_client: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("ai_client: unexpected status %d: %s", resp.StatusCode, string(raw))
	}

	if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
		return fmt.Errorf("ai_client: failed to decode response: %w", err)
	}

	return nil
}
