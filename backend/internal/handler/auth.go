package handler

import (
	"crypto/sha256"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/dmytro-demianov/geo-alert/internal/auth"
	"github.com/dmytro-demianov/geo-alert/internal/domain"
	"github.com/dmytro-demianov/geo-alert/internal/repository"
)

type AuthHandler struct {
	google *auth.GoogleOAuth
	jwt    *auth.JWTService
	users  *repository.UserRepo
	tokens *repository.RefreshTokenRepo
}

func NewAuthHandler(
	google *auth.GoogleOAuth,
	jwt *auth.JWTService,
	users *repository.UserRepo,
	tokens *repository.RefreshTokenRepo,
) *AuthHandler {
	return &AuthHandler{google: google, jwt: jwt, users: users, tokens: tokens}
}

type googleAuthRequest struct {
	Code        string `json:"code" binding:"required"`
	RedirectURI string `json:"redirect_uri" binding:"required"`
}

func (h *AuthHandler) GoogleAuth(c *gin.Context) {
	var req googleAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	gUser, err := h.google.ExchangeCode(req.Code, req.RedirectURI)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "google auth failed"})
		return
	}

	user, err := h.users.FindByGoogleID(gUser.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	if user == nil {
		user = &domain.User{
			ID:          uuid.New(),
			GoogleID:    gUser.ID,
			Email:       gUser.Email,
			DisplayName: gUser.Name,
			AvatarURL:   gUser.Picture,
		}
	} else {
		user.DisplayName = gUser.Name
		user.AvatarURL = gUser.Picture
	}

	if err := h.users.Upsert(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	accessToken, err := h.jwt.GenerateAccessToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token error"})
		return
	}

	rawRefresh, err := h.jwt.GenerateRefreshToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token error"})
		return
	}

	rt := &repository.RefreshToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: hashToken(rawRefresh),
		ExpiresAt: time.Now().Add(30 * 24 * time.Hour),
	}
	if err := h.tokens.Create(rt); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token":  accessToken,
		"refresh_token": rawRefresh,
		"user": gin.H{
			"id":           user.ID,
			"email":        user.Email,
			"display_name": user.DisplayName,
			"avatar_url":   user.AvatarURL,
		},
	})
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rt, err := h.tokens.FindByHash(hashToken(req.RefreshToken))
	if err != nil || rt == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh token"})
		return
	}

	user, err := h.users.FindByID(rt.UserID)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	if err := h.tokens.DeleteByHash(hashToken(req.RefreshToken)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	newRawRefresh, _ := h.jwt.GenerateRefreshToken()
	newRT := &repository.RefreshToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: hashToken(newRawRefresh),
		ExpiresAt: time.Now().Add(30 * 24 * time.Hour),
	}
	if err := h.tokens.Create(newRT); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	accessToken, _ := h.jwt.GenerateAccessToken(user.ID)
	c.JSON(http.StatusOK, gin.H{
		"access_token":  accessToken,
		"refresh_token": newRawRefresh,
	})
}

type logoutRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func (h *AuthHandler) Logout(c *gin.Context) {
	var req logoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	_ = h.tokens.DeleteByHash(hashToken(req.RefreshToken))
	// Clear FCM token so the device stops receiving pushes after logout.
	if userID, ok := c.Get("user_id"); ok {
		_ = h.users.ClearFCMToken(userID.(uuid.UUID))
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)
	user, err := h.users.FindByID(userID)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"id":           user.ID,
		"email":        user.Email,
		"display_name": user.DisplayName,
		"avatar_url":   user.AvatarURL,
		"bio":          user.Bio,
		"is_private":   user.IsPrivate,
		"created_at":   user.CreatedAt,
	})
}

func hashToken(token string) string {
	h := sha256.New()
	h.Write([]byte(token))
	return fmt.Sprintf("%x", h.Sum(nil))
}
