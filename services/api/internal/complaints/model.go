package complaints

import "errors"

var (
	ErrInvalidInput      = errors.New("subjek, uraian keluhan, atau status tidak valid")
	ErrComplaintNotFound = errors.New("data keluhan tidak ditemukan")
)

type ComplaintView struct {
	ID            string `json:"id"`
	DBID          int64  `json:"dbId"`
	MemberID      string `json:"memberId"`
	MemberName    string `json:"memberName"`
	BookingCode   string `json:"bookingCode,omitempty"`
	Subject       string `json:"subject"`
	Message       string `json:"message"`
	Status        string `json:"status"`
	AdminResponse string `json:"adminResponse,omitempty"`
	CreatedAt     string `json:"createdAt"`
	ResolvedAt    string `json:"resolvedAt,omitempty"`
}

type CreateComplaintRequest struct {
	BookingID string `json:"bookingId"`
	Subject   string `json:"subject"`
	Message   string `json:"message"`
}

type ReplyComplaintRequest struct {
	AdminResponse string `json:"adminResponse"`
	Status        string `json:"status"`
}
