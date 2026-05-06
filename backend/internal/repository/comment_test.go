package repository

import (
	"testing"
)

func TestExtractMentions(t *testing.T) {
	validUUID := "123e4567-e89b-12d3-a456-426614174000"

	tests := []struct {
		name  string
		text  string
		want  []string
	}{
		{
			name: "single valid mention",
			text: "@" + validUUID + " nice",
			want: []string{validUUID},
		},
		{
			name: "two mentions",
			text: "@" + validUUID + " and @" + validUUID,
			want: []string{validUUID, validUUID},
		},
		{
			name: "no mentions",
			text: "hello world",
			want: nil,
		},
		{
			name: "@ without uuid",
			text: "@notauuid",
			want: nil,
		},
		{
			name: "partial uuid after @",
			text: "@123e4567-e89b",
			want: nil,
		},
		{
			name: "mention at start of text",
			text: "@" + validUUID,
			want: []string{validUUID},
		},
		{
			name: "mention embedded in sentence",
			text: "hey @" + validUUID + " how are you",
			want: []string{validUUID},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := ExtractMentions(tc.text)
			if len(got) != len(tc.want) {
				t.Fatalf("len mismatch: want %v, got %v", tc.want, got)
			}
			for i := range got {
				if got[i] != tc.want[i] {
					t.Errorf("index %d: want %q, got %q", i, tc.want[i], got[i])
				}
			}
		})
	}
}
