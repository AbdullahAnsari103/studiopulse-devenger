import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import LandingPage from "@/pages/LandingPage";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import DashboardPage from "@/pages/DashboardPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import ContentStudioPage from "@/pages/ContentStudioPage";
import StudioAIPage from "@/pages/StudioAIPage";
import GeminiHealthPage from "@/pages/GeminiHealthPage";
import UploadCenterPage from "@/pages/UploadCenterPage";
import MyVideosPage from "@/pages/MyVideosPage";
import SettingsPage from "@/pages/SettingsPage";
import { CalendarPage } from "@/pages/CalendarPage";
import AutopilotPage from "@/pages/AutopilotPage";
import AudiencePage from "@/pages/AudiencePage";
import VideoEditorPage from "@/pages/VideoEditorPage";
import ViralClipsPage from "@/pages/ViralClipsPage";
import { SettingsProvider } from "@/context/SettingsContext";

import { useActivityTracker } from "@/hooks/useActivityTracker";
import { GlobalNotificationCenter } from "@/components/GlobalNotificationCenter";
import { GlobalCommandPalette } from "@/components/common/GlobalCommandPalette";

function ActivityTrackerWrapper() {
  useActivityTracker();
  return null;
}

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in environment variables");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <ClerkProvider
          publishableKey={PUBLISHABLE_KEY}
          afterSignOutUrl="/"
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/dashboard"
          telemetry={{ disabled: true }}
          appearance={{
            variables: {
              colorPrimary: "#8200DB",
              colorBackground: "#111118",
              colorText: "#ffffff",
              colorTextSecondary: "#9ca3af",
              colorInputBackground: "#1f2937",
              colorInputText: "#ffffff",
              borderRadius: "0.75rem",
            },
          }}
        >
          <BrowserRouter>
            <ActivityTrackerWrapper />
            <GlobalNotificationCenter />
            <GlobalCommandPalette />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/sign-in/*" element={<SignInPage />} />
              <Route path="/sign-up/*" element={<SignUpPage />} />

              {/* ── Video Editor — standalone full-viewport, no sidebar ── */}
              <Route path="/editor" element={<><SignedIn><VideoEditorPage /></SignedIn><SignedOut><RedirectToSignIn /></SignedOut></>} />
              <Route path="/editor/:projectId" element={<><SignedIn><VideoEditorPage /></SignedIn><SignedOut><RedirectToSignIn /></SignedOut></>} />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <>
                    <SignedIn>
                      <DashboardPage />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              />
              <Route
                path="/analytics"
                element={
                  <>
                    <SignedIn>
                      <AnalyticsPage />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              />
              <Route
                path="/content-studio"
                element={
                  <>
                    <SignedIn>
                      <ContentStudioPage />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              />
              <Route
                path="/studio-ai"
                element={
                  <>
                    <SignedIn>
                      <StudioAIPage />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              />
              <Route
                path="/gemini-health"
                element={
                  <>
                    <SignedIn>
                      <GeminiHealthPage />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              />
              <Route
                path="/upload-center"
                element={
                  <>
                    <SignedIn>
                      <UploadCenterPage />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              />
              <Route
                path="/my-videos"
                element={
                  <>
                    <SignedIn>
                      <MyVideosPage />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              />
              <Route
                path="/viral-clips"
                element={
                  <>
                    <SignedIn>
                      <ViralClipsPage />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              />
              <Route
                path="/calendar"
                element={
                  <>
                    <SignedIn>
                      <CalendarPage />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              />
              <Route
                path="/settings"
                element={
                  <>
                    <SignedIn>
                      <SettingsPage />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              />
              <Route
                path="/autopilot"
                element={
                  <>
                    <SignedIn>
                      <AutopilotPage />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              />
              <Route
                path="/audience"
                element={
                  <>
                    <SignedIn>
                      <AudiencePage />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              />
            </Routes>
          </BrowserRouter>

          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#1a1a2e",
                color: "#fff",
                border: "1px solid rgba(130, 0, 219, 0.2)",
                borderRadius: "12px",
                fontSize: "13px",
              },
              success: {
                iconTheme: {
                  primary: "#8200DB",
                  secondary: "#fff",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
              },
            }}
          />
        </ClerkProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}
