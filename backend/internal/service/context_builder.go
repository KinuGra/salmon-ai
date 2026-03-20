package service

import (
	"fmt"
	"strings"

	"github.com/salmon-ai/salmon-ai/internal/model"
	"github.com/salmon-ai/salmon-ai/internal/repository"
)

// ContextBuilder はAIに渡すコンテキスト文字列を生成する共通処理です。
// 全AI機能（レポート生成・振り返り対話等）がこれを通じて一貫したコンテキストを受け取ります。
type ContextBuilder struct {
	taskRepo       *repository.TaskRepository
	reflectionRepo *repository.ReflectionRepository
	categoryRepo   *repository.CategoryRepository
}

func NewContextBuilder(
	taskRepo *repository.TaskRepository,
	reflectionRepo *repository.ReflectionRepository,
	categoryRepo *repository.CategoryRepository,
) *ContextBuilder {
	return &ContextBuilder{
		taskRepo:       taskRepo,
		reflectionRepo: reflectionRepo,
		categoryRepo:   categoryRepo,
	}
}

// BuildFullContext はユーザーの全データ（タスク・振り返り・カテゴリ）を収集し、
// AIが解釈しやすい構造化テキストとして返します。
func (cb *ContextBuilder) BuildFullContext(userID uint) (string, error) {
	tasks, err := cb.taskRepo.FindByUserID(userID)
	if err != nil {
		return "", fmt.Errorf("context_builder: failed to fetch tasks: %w", err)
	}

	reflections, err := cb.reflectionRepo.FindAllByUserID(userID)
	if err != nil {
		return "", fmt.Errorf("context_builder: failed to fetch reflections: %w", err)
	}

	categories, err := cb.categoryRepo.FindByUserID(userID)
	if err != nil {
		return "", fmt.Errorf("context_builder: failed to fetch categories: %w", err)
	}

	var sb strings.Builder

	// ── カテゴリ ──────────────────────────────────────────────
	sb.WriteString("## カテゴリ一覧\n\n")
	if len(categories) == 0 {
		sb.WriteString("（カテゴリなし）\n")
	} else {
		for _, cat := range categories {
			sb.WriteString(fmt.Sprintf("- %s\n", cat.Name))
		}
	}
	sb.WriteString("\n")

	// ── タスク ────────────────────────────────────────────────
	sb.WriteString("## タスク一覧\n\n")
	if len(tasks) == 0 {
		sb.WriteString("（タスクなし）\n")
	} else {
		// 完了・未完了を分けて集計サマリーを先頭に付与
		completed := 0
		for _, t := range tasks {
			if t.IsCompleted {
				completed++
			}
		}
		sb.WriteString(fmt.Sprintf(
			"合計: %d件 / 完了: %d件 / 未完了: %d件\n\n",
			len(tasks), completed, len(tasks)-completed,
		))
		for _, t := range tasks {
			sb.WriteString(formatTask(t))
		}
	}

	// ── 振り返り ──────────────────────────────────────────────
	sb.WriteString("## 振り返り履歴\n\n")
	if len(reflections) == 0 {
		sb.WriteString("（振り返り記録なし）\n")
	} else {
		for _, r := range reflections {
			sb.WriteString(formatReflection(r))
		}
	}

	return sb.String(), nil
}

// ────────────────────────────────────────────
// フォーマットヘルパー
// ────────────────────────────────────────────

func formatTask(t model.Task) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("### %s\n", t.Title))

	status := "未完了"
	if t.IsCompleted {
		status = "完了"
	}
	sb.WriteString(fmt.Sprintf("- ステータス: %s\n", status))

	if t.Priority != nil {
		priorityLabel := map[int]string{1: "高", 2: "中", 3: "低"}
		if label, ok := priorityLabel[*t.Priority]; ok {
			sb.WriteString(fmt.Sprintf("- 優先度: %s\n", label))
		}
	}

	if t.EstimatedHours != nil {
		sb.WriteString(fmt.Sprintf("- 自己見積もり工数: %.1f時間\n", *t.EstimatedHours))
	}
	if t.AiEstimatedHours != nil {
		sb.WriteString(fmt.Sprintf("- AI見積もり工数: %.1f時間\n", *t.AiEstimatedHours))
	}
	if t.EstimatedHours != nil && t.AiEstimatedHours != nil {
		diff := *t.AiEstimatedHours - *t.EstimatedHours
		sb.WriteString(fmt.Sprintf("- 見積もり差分(AI-自己): %+.1f時間\n", diff))
	}

	if t.StartTime != nil {
		sb.WriteString(fmt.Sprintf("- 開始時刻: %s\n", t.StartTime.Format("2006-01-02 15:04")))
	}
	if t.EndTime != nil {
		sb.WriteString(fmt.Sprintf("- 終了時刻: %s\n", t.EndTime.Format("2006-01-02 15:04")))
	}
	if t.StartTime != nil && t.EndTime != nil {
		actualHours := t.EndTime.Sub(*t.StartTime).Hours()
		sb.WriteString(fmt.Sprintf("- 実作業時間: %.1f時間\n", actualHours))
		if t.EstimatedHours != nil && *t.EstimatedHours > 0 {
			ratio := actualHours / *t.EstimatedHours
			sb.WriteString(fmt.Sprintf("- 実際/見積もり比: %.2f倍\n", ratio))
		}
	}

	if t.AchievementRate != nil {
		sb.WriteString(fmt.Sprintf("- 達成率: %d%%\n", *t.AchievementRate))
	}
	if t.DueDate != nil {
		sb.WriteString(fmt.Sprintf("- 期限: %s\n", t.DueDate.Format("2006-01-02")))
	}
	sb.WriteString(fmt.Sprintf("- 登録日: %s\n", t.CreatedAt.Format("2006-01-02")))

	sb.WriteString("\n")
	return sb.String()
}

func formatReflection(r model.Reflection) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("### %s\n", r.Date.Format("2006-01-02")))
	if r.Content != nil && *r.Content != "" {
		sb.WriteString(fmt.Sprintf("内容: %s\n", *r.Content))
	} else {
		sb.WriteString("内容: （記録なし）\n")
	}
	sb.WriteString("\n")
	return sb.String()
}
