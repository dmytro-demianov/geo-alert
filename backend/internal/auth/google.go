package auth

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

type GoogleUserInfo struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

type GoogleOAuth struct {
	clientID     string
	clientSecret string
	httpClient   *http.Client
}

func NewGoogleOAuth(clientID, clientSecret string) *GoogleOAuth {
	return &GoogleOAuth{
		clientID:     clientID,
		clientSecret: clientSecret,
		httpClient:   &http.Client{},
	}
}

func (g *GoogleOAuth) ExchangeCode(code, redirectURI string) (*GoogleUserInfo, error) {
	resp, err := g.httpClient.PostForm("https://oauth2.googleapis.com/token", url.Values{
		"code":          {code},
		"client_id":     {g.clientID},
		"client_secret": {g.clientSecret},
		"redirect_uri":  {redirectURI},
		"grant_type":    {"authorization_code"},
	})
	if err != nil {
		return nil, fmt.Errorf("exchange code: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google token error: %s", string(body))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("parse token response: %w", err)
	}

	req, err := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return nil, fmt.Errorf("build userinfo request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+tokenResp.AccessToken)

	uResp, err := g.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get userinfo: %w", err)
	}
	defer uResp.Body.Close()

	uBody, _ := io.ReadAll(uResp.Body)
	var userInfo GoogleUserInfo
	if err := json.Unmarshal(uBody, &userInfo); err != nil {
		return nil, fmt.Errorf("parse userinfo: %w", err)
	}
	return &userInfo, nil
}
