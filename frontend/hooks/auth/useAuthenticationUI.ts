"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { useDeployment } from "@/components/providers/deploymentProvider";
import { AUTH_EVENTS } from "@/const/auth";
import { getEffectiveRoutePath } from "@/lib/auth";
import { authEvents, authEventUtils } from "@/lib/authEvents";
import { AuthenticationUIReturn } from "@/types/auth";
import { oauthService } from "@/services/oauthService";
import log from "@/lib/logger";

/**
 * Custom hook for authentication UI management
 * Handles login/register modals, auth prompt modals, and session expired modal
 * Must be used within AuthenticationProvider
 */
export function useAuthenticationUI({
  isAuthenticated,
  isAuthChecking,
  clearLocalSession,
}: {
  isAuthenticated: boolean;
  isAuthChecking: boolean;
  clearLocalSession: () => void;
}): AuthenticationUIReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation("common");
  const { isSpeedMode } = useDeployment();

  // UI state for modals - managed locally within the hook
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isAuthPromptModalOpen, setIsAuthPromptModalOpen] = useState(false);
  const [isSessionExpiredModalOpen, setIsSessionExpiredModalOpen] = useState(false);
  const [ssoConfig, setSsoConfig] = useState<{ sso_enabled: boolean; sso_provider: string } | null>(null);

  useEffect(() => {
    const fetchSSOConfig = async () => {
      try {
        const config = await oauthService.getSSOConfig();
        setSsoConfig(config);
      } catch (error) {
        log.error("Failed to fetch SSO config:", error);
      }
    };
    fetchSSOConfig();
  }, []);

  const handleUnauthenticatedModalClose = (() => {
    if (!isAuthenticated && !isSpeedMode) {
      authEventUtils.emitBackToHome();
      const effectivePath = pathname ? getEffectiveRoutePath(pathname) : "/";
      if (effectivePath !== "/") {
        router.push("/");
      }
    }
  });

  // Modal control functions
  const openLoginModal = useCallback(() => setIsLoginModalOpen(true), []);

  const closeLoginModal = useCallback(() => {
    setIsLoginModalOpen(false);
    handleUnauthenticatedModalClose();
  }, [handleUnauthenticatedModalClose]);

  const openRegisterModal = useCallback(() => setIsRegisterModalOpen(true), []);

  const closeRegisterModal = useCallback(() => {
    setIsRegisterModalOpen(false);
    handleUnauthenticatedModalClose();
  }, [handleUnauthenticatedModalClose]);

  const openAuthPromptModal = useCallback(() => setIsAuthPromptModalOpen(true), []);

  const closeAuthPromptModal = useCallback(() => {
    setIsAuthPromptModalOpen(false);
    handleUnauthenticatedModalClose();
  }, [handleUnauthenticatedModalClose]);

  const openSessionExpiredModal = useCallback(() => setIsSessionExpiredModalOpen(true), []);

  const closeSessionExpiredModal = useCallback(() => {
    clearLocalSession();
    setIsSessionExpiredModalOpen(false);
    handleUnauthenticatedModalClose();
  }, [handleUnauthenticatedModalClose]);

  useEffect(() => {
    if (isSpeedMode) return;

    const handleSessionExpired = () => {
      setIsSessionExpiredModalOpen(true);
    };

    const handleRegisterSuccess = () => {
      setIsRegisterModalOpen(false);
    };

    const cleanup = authEvents.on(
      AUTH_EVENTS.SESSION_EXPIRED,
      handleSessionExpired
    );
    const cleanupRegister = authEvents.on(
      AUTH_EVENTS.REGISTER_SUCCESS,
      handleRegisterSuccess
    );

    return () => {
      cleanup();
      cleanupRegister();
    };
  }, [isSpeedMode, setIsSessionExpiredModalOpen]);

  // Auto-open login modal when returning from a failed OAuth redirect
  useEffect(() => {
    if (isSpeedMode) return;
    if (isAuthChecking) return;
    if (isAuthenticated) {
      const oauthError = searchParams.get("oauth_error");
      if (oauthError) {
        router.replace("/");
      }
      return;
    }

    const oauthError = searchParams.get("oauth_error");
    if (oauthError && !isLoginModalOpen) {
      setIsLoginModalOpen(true);
    }
  }, [searchParams, isAuthChecking, isAuthenticated, isSpeedMode, isLoginModalOpen, router]);

  // Route guard for unauthenticated users - check when pathname changes
  // When SSO is enabled, skip showing auth prompt modal and let user browse freely
  useEffect(() => {
    if (isSpeedMode) return;
    if (isAuthChecking) return;
    if (isAuthenticated) return;
    if (isSessionExpiredModalOpen) return;
    if (isLoginModalOpen) return;
    if (isRegisterModalOpen) return;

    // If SSO config is still loading or SSO is enabled, skip showing auth prompt modal
    if (ssoConfig === null || ssoConfig?.sso_enabled) {
      return;
    }

    openAuthPromptModal();
  }, [pathname, isAuthenticated, isSpeedMode, isAuthChecking, isSessionExpiredModalOpen, openAuthPromptModal, ssoConfig]);


  return {
    // Login/Register Modal
    isLoginModalOpen,
    openLoginModal,
    closeLoginModal,
    isRegisterModalOpen,
    openRegisterModal,
    closeRegisterModal,

    // Auth prompt modal
    isAuthPromptModalOpen,
    openAuthPromptModal,
    closeAuthPromptModal,

    // Session expired modal
    isSessionExpiredModalOpen,
    openSessionExpiredModal,
    closeSessionExpiredModal,
  };
}
