import { API_ENDPOINTS } from "@/services/api";
import { fetchWithAuth } from "@/lib/auth";
import log from "@/lib/logger";

export interface OAuthProvider {
  name: string;
  display_name: string;
  icon: string;
  enabled: boolean;
}

export interface OAuthAccount {
  provider: string;
  provider_username: string | null;
  provider_email: string | null;
  linked_at: string | null;
}

export interface SSOCheckResult {
  sso_enabled: boolean;
  provider: string;
  linked: boolean;
  has_token: boolean;
}

export interface SSOReauthorizeResult {
  sso_enabled: boolean;
  provider: string;
  reauthorize_url: string | null;
}

export const oauthService = {
  getEnabledProviders: async (): Promise<OAuthProvider[]> => {
    try {
      const response = await fetch(API_ENDPOINTS.oauth.providers);
      if (!response.ok) {
        log.warn("Failed to fetch OAuth providers");
        return [];
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      log.error("Failed to fetch OAuth providers:", error);
      return [];
    }
  },

  startOAuthLogin: (provider: string): void => {
    window.location.href = `${API_ENDPOINTS.oauth.authorize}?provider=${provider}`;
  },

  startOAuthLink: (provider: string): void => {
    window.location.href = `${API_ENDPOINTS.oauth.link}?provider=${provider}`;
  },

  getLinkedAccounts: async (): Promise<OAuthAccount[]> => {
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.oauth.accounts);
      if (!response.ok) {
        log.warn("Failed to fetch linked OAuth accounts");
        return [];
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      log.error("Failed to fetch linked OAuth accounts:", error);
      return [];
    }
  },

  unlinkAccount: async (provider: string): Promise<boolean> => {
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.oauth.unlink(provider), {
        method: "DELETE",
      });
      return response.ok;
    } catch (error) {
      log.error(`Failed to unlink ${provider} account:`, error);
      return false;
    }
  },

  getSSOConfig: async (): Promise<{ sso_enabled: boolean; sso_provider: string } | null> => {
    try {
      const response = await fetch(API_ENDPOINTS.oauth.ssoConfig);
      if (!response.ok) {
        log.warn("Failed to fetch SSO config");
        return null;
      }
      const data = await response.json();
      return data.data || null;
    } catch (error) {
      log.error("Failed to fetch SSO config:", error);
      return null;
    }
  },

  getSSOStatus: async (): Promise<SSOCheckResult | null> => {
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.oauth.ssoStatus);
      if (!response.ok) {
        log.warn("Failed to fetch SSO status");
        return null;
      }
      const data = await response.json();
      return data.data || null;
    } catch (error) {
      log.error("Failed to fetch SSO status:", error);
      return null;
    }
  },

  reauthorizeSSO: async (): Promise<SSOReauthorizeResult | null> => {
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.oauth.ssoReauthorize);
      if (!response.ok) {
        log.warn("Failed to reauthorize SSO");
        return null;
      }
      const data = await response.json();
      return data.data || null;
    } catch (error) {
      log.error("Failed to reauthorize SSO:", error);
      return null;
    }
  },
};
