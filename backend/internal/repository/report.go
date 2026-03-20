package repository

import (
	"github.com/salmon-ai/salmon-ai/internal/model"
	"gorm.io/gorm"
)

type ReportRepository struct {
	db *gorm.DB
}

func NewReportRepository(db *gorm.DB) *ReportRepository {
	return &ReportRepository{db: db}
}

// FindLatestByUserID は指定ユーザーの最新レポートを1件取得します。
// レポートが存在しない場合は gorm.ErrRecordNotFound を返します。
func (r *ReportRepository) FindLatestByUserID(userID uint) (*model.Report, error) {
	var report model.Report
	err := r.db.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		First(&report).Error
	if err != nil {
		return nil, err
	}
	return &report, nil
}

// FindAllByUserID は指定ユーザーの全レポートを新しい順に取得します（履歴用）。
func (r *ReportRepository) FindAllByUserID(userID uint) ([]model.Report, error) {
	var reports []model.Report
	err := r.db.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&reports).Error
	return reports, err
}

// Create はレポートをDBに新規保存します。Report は BaseReadOnly なので上書きしません。
func (r *ReportRepository) Create(report *model.Report) error {
	return r.db.Create(report).Error
}
