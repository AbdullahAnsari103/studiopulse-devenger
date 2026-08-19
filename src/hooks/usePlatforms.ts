import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import apiClient from "@/lib/apiClient";
import type { PlatformStatusResponse, SupportedPlatform } from "@/types/platform";
import toast from "react-hot-toast";

/**
 * Hook to fetch the connection status of all platforms for the current user.
 */
export function usePlatformStatus() {
  const { user } = useUser();
  const userId = user?.id;

  return useQuery<PlatformStatusResponse>({
    queryKey: ["platformStatus", userId],
    queryFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      const res = await apiClient.get(`/api/platforms/status?userId=${userId}`);
      return res.data;
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000,
  });
}

/**
 * Hook to initiate a YouTube connection (starts OAuth flow).
 */
export function useConnectYouTube() {
  const { user } = useUser();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const res = await apiClient.post("/api/platforms/youtube/connect", {
        userId: user.id,
      });
      return res.data;
    },
    onSuccess: (data: { authUrl: string }) => {
      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    },
  });
}

/**
 * Hook to initiate a Meta connection (Facebook + Instagram unified OAuth flow).
 */
export function useConnectMeta() {
  const { user } = useUser();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const res = await apiClient.post("/api/platforms/meta/connect", {
        userId: user.id,
      });
      return res.data;
    },
    onSuccess: (data: { authUrl: string }) => {
      // Redirect to Meta / Facebook Login OAuth dialog
      window.location.href = data.authUrl;
    },
  });
}

/**
 * Hook to directly connect Instagram, Facebook, or other platforms without Meta OAuth block.
 */
export function useDirectConnectPlatform() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ platform, accountName }: { platform: SupportedPlatform | string; accountName?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const res = await apiClient.post("/api/platforms/direct-connect", {
        userId: user.id,
        platform,
        accountName,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platformStatus"] });
    },
  });
}

/**
 * Hook to disconnect a platform.
 */
export function useDisconnectPlatform() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (platform: SupportedPlatform) => {
      if (!user?.id) throw new Error("Not authenticated");
      const res = await apiClient.post("/api/platforms/disconnect", {
        userId: user.id,
        platform,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platformStatus"] });
    },
  });
}

/**
 * Hook to trigger a manual sync for a platform.
 */
export function useSyncPlatform() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (platform: SupportedPlatform) => {
      if (!user?.id) throw new Error("Not authenticated");
      const res = await apiClient.post("/api/platforms/sync", {
        userId: user.id,
        platform,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platformStatus"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["platformStatus"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
