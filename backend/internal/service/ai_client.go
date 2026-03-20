package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

// AIEstimateRequest はPythonのAIサーバーに送信するリクエストの構造体です
type AIEstimateRequest struct {
	Title       string  `json:"title"`
	Description *string `json:"description,omitempty"`
	Category    *string `json:"category,omitempty"`
	UserContext *string `json:"user_context,omitempty"`
}

// AIEstimateResponse はPythonのAIサーバーから受け取るレスポンスの構造体です
type AIEstimateResponse struct {
	EstimatedHours float64 `json:"estimated_hours"`
	Reasoning      string  `json:"reasoning"`
}

// httpClient はAPI呼び出し用の再利用可能なHTTPクライアントです（タイムアウト付き）
var httpClient = &http.Client{
	Timeout: 30 * time.Second, // AIの推論は少し時間がかかる可能性があるため長めに設定
}

// callAIEstimate はPythonのFastAPIサーバーにHTTP POSTリクエストを送り、見積もり結果を取得します。
func callAIEstimate(reqPayload AIEstimateRequest) (*AIEstimateResponse, error) {
	// 環境変数からAIサーバーのURLを取得（未設定ならDocker用のデフォルト値を使う）
	aiURL := os.Getenv("AI_SERVICE_URL")
	if aiURL == "" {
		aiURL = "http://ai:8000" // Docker Compose環境下におけるPythonコンテナのURL
	}
	endpoint := fmt.Sprintf("%s/estimate", aiURL)

	// リクエスト用の構造体をJSONに変換
	jsonData, err := json.Marshal(reqPayload)
	if err != nil {
		return nil, fmt.Errorf("AIリクエストのJSON化に失敗しました: %w", err)
	}

	// HTTP POSTリクエストを作成
	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("AIリクエストの作成に失敗しました: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// リクエストを送信
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("AIサーバーへのリクエスト送信に失敗しました: %w", err)
	}
	defer resp.Body.Close()

	// 200番台以外のステータスコードが返ってきた場合のエラーハンドリング
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("AIサーバーがエラーを返しました: ステータスコード %d", resp.StatusCode)
	}

	// レスポンスのJSONを構造体に変換（デコード）
	var aiResp AIEstimateResponse
	if err := json.NewDecoder(resp.Body).Decode(&aiResp); err != nil {
		return nil, fmt.Errorf("AIレスポンスのパースに失敗しました: %w", err)
	}

	// ★ ターミナルで確認できるように見積もり結果を標準出力にログ出力する
	fmt.Printf("[AI Estimate Result] Title: %s -> %.1fh (Reason: %s)\n", reqPayload.Title, aiResp.EstimatedHours, aiResp.Reasoning)

	return &aiResp, nil
}
