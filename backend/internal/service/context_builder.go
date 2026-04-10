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
// AIが解釈しやすい構造化テキストとタスク件数を返します。
// 施策1: 達成率100%のスケジュール済みタスクをExemplar Injection（参照データ注入）として末尾に付与します。
// 施策3: データ品質サマリーを先頭に付与し、欠損データをLLMが認識できるようにします。
// タスク件数はコールドスタート判定のためにAIサービスへ明示的に渡します。
func (cb *ContextBuilder) BuildFullContext(userID uint) (string, int, error) {
	tasks, err := cb.taskRepo.FindByUserID(userID)
	if err != nil {
		return "", 0, fmt.Errorf("context_builder: failed to fetch tasks: %w", err)
	}

	reflections, err := cb.reflectionRepo.FindAllByUserID(userID)
	if err != nil {
		return "", 0, fmt.Errorf("context_builder: failed to fetch reflections: %w", err)
	}

	categories, err := cb.categoryRepo.FindByUserID(userID)
	if err != nil {
		return "", 0, fmt.Errorf("context_builder: failed to fetch categories: %w", err)
	}

	var sb strings.Builder

	// ── 施策3: データ品質サマリー ──────────────────────────────
	sb.WriteString(buildDataQualitySummary(tasks, reflections))

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

	// ── 施策1: Exemplar Injection（参照データ注入）────────────
	sb.WriteString(buildFewShotSection(tasks))

	return sb.String(), len(tasks), nil
}

// buildDataQualitySummary はデータ欠損の状況をサマリーテキストとして返します。
// LLMが欠損を認識した上で分析できるようにします（施策3）。
func buildDataQualitySummary(tasks []model.Task, reflections []model.Reflection) string {
	var sb strings.Builder
	sb.WriteString("## データ品質サマリー\n\n")

	// 振り返りの記録率
	reflectionWithContent := 0
	for _, r := range reflections {
		if r.Content != nil && *r.Content != "" {
			reflectionWithContent++
		}
	}
	reflectionMissing := len(reflections) - reflectionWithContent
	sb.WriteString(fmt.Sprintf("- 振り返り記録あり: %d日 / 記録なし: %d日\n", reflectionWithContent, reflectionMissing))

	// タスクの達成率入力率・タイムブロッキング率
	achievementFilled := 0
	timeBlocked := 0
	for _, t := range tasks {
		if t.AchievementRate != nil {
			achievementFilled++
		}
		if t.StartTime != nil {
			timeBlocked++
		}
	}
	achievementMissing := len(tasks) - achievementFilled
	sb.WriteString(fmt.Sprintf("- 達成率入力済み: %dタスク / 未入力: %dタスク\n", achievementFilled, achievementMissing))
	sb.WriteString(fmt.Sprintf("- タイムブロッキング済み: %dタスク / 未配置: %dタスク\n", timeBlocked, len(tasks)-timeBlocked))
	sb.WriteString("- 注意: 達成率が未入力のタスクはパターン分析から除外し、その旨をレポートに明記してください。\n")
	sb.WriteString("- 注意: 振り返りが記録されていない日は欠損として扱い、継続的な記録の重要性を指摘してください。\n")
	sb.WriteString("\n")
	return sb.String()
}

// buildFewShotSection は達成率100%かつタイムブロッキング済みのタスクを最大3件抽出し、
// Exemplar Injection（参照データ注入）としてフォーマットしたテキストを返します（施策1）。
func buildFewShotSection(tasks []model.Task) string {
	var examples []model.Task
	for _, t := range tasks {
		if t.AchievementRate != nil && *t.AchievementRate == 100 &&
			t.StartTime != nil && t.EstimatedHours != nil {
			examples = append(examples, t)
			if len(examples) >= 3 {
				break
			}
		}
	}
	if len(examples) == 0 {
		return ""
	}

	var sb strings.Builder
	sb.WriteString("## 成功事例（参照データ）\n\n")
	sb.WriteString("以下は達成率100%を記録したタスクの実例です（Exemplar Injection）。これと同様の粒度（具体的なタスク名・時間帯・工数・条件）で成功パターンを分析してください。\n\n")
	for _, t := range examples {
		sb.WriteString(fmt.Sprintf("- **%s**", t.Title))
		sb.WriteString(fmt.Sprintf("（開始: %s", t.StartTime.Format("15:04")))
		if t.EndTime != nil {
			sb.WriteString(fmt.Sprintf("〜%s", t.EndTime.Format("15:04")))
		}
		sb.WriteString(fmt.Sprintf("、自己見積もり: %.1fh", *t.EstimatedHours))
		if t.AiEstimatedHours != nil {
			sb.WriteString(fmt.Sprintf("、AI見積もり: %.1fh", *t.AiEstimatedHours))
		}
		if t.Priority != nil {
			if label, ok := priorityLabels[*t.Priority]; ok {
				sb.WriteString(fmt.Sprintf("、優先度: %s", label))
			}
		}
		sb.WriteString("）→ 達成率100%\n")
	}
	sb.WriteString("\n")
	return sb.String()
}

// ────────────────────────────────────────────
// フォーマットヘルパー
// ────────────────────────────────────────────

// priorityLabels は優先度の数値ラベルマップです。
// formatTask から毎回生成されないよう package-level で定義します。
var priorityLabels = map[int]string{1: "高", 2: "中", 3: "低"}

func formatTask(t model.Task) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("### %s\n", t.Title))

	status := "未完了"
	if t.IsCompleted {
		status = "完了"
	}
	sb.WriteString(fmt.Sprintf("- ステータス: %s\n", status))

	if t.Priority != nil {
		if label, ok := priorityLabels[*t.Priority]; ok {
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
