package ratelimit

import (
	"sync"
	"time"
)

// Limiter はユーザーごとに最低間隔を強制するシンプルなレートリミッターです。
// インメモリで動作するため、サーバー再起動でリセットされます。
type Limiter struct {
	mu       sync.Mutex
	lastCall map[uint]time.Time
	interval time.Duration
}

func New(interval time.Duration) *Limiter {
	return &Limiter{
		lastCall: make(map[uint]time.Time),
		interval: interval,
	}
}

// Allow は userID のリクエストを許可するか判定します。
// 許可する場合は (true, 0) を返します。
// 拒否する場合は (false, 残り待機時間) を返します。
func (l *Limiter) Allow(userID uint) (bool, time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()

	last, ok := l.lastCall[userID]
	if !ok {
		l.lastCall[userID] = time.Now()
		return true, 0
	}

	elapsed := time.Since(last)
	if elapsed < l.interval {
		return false, l.interval - elapsed
	}

	l.lastCall[userID] = time.Now()
	return true, 0
}
