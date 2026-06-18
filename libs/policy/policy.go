package policy

type MatchPolicy struct {
	AutoMatchThreshold      float64
	SuggestedMatchThreshold float64
	DuplicateWindowDays     int
	PaymentToleranceMinor   int64
}

func DefaultSME() MatchPolicy {
	return MatchPolicy{
		AutoMatchThreshold:      0.95,
		SuggestedMatchThreshold: 0.70,
		DuplicateWindowDays:     7,
		PaymentToleranceMinor:   100,
	}
}

func Tier(score float64, p MatchPolicy) string {
	switch {
	case score >= p.AutoMatchThreshold:
		return "auto"
	case score >= p.SuggestedMatchThreshold:
		return "suggested"
	default:
		return "review"
	}
}

