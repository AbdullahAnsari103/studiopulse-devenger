/**
 * ViralClipsPage — Pulse AI Viral Clips Studio.
 * Seamlessly manages the 3-screen workflow:
 * 1. Your YouTube Videos List
 * 2. Real-Time 7-Stage Analysis Progress
 * 3. Generated 9:16 Clips Review Studio & Publisher
 */

import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { ViralVideoList } from "@/components/viral-clips/ViralVideoList";
import { ViralAnalysisProgress } from "@/components/viral-clips/ViralAnalysisProgress";
import { ViralClipsStudio } from "@/components/viral-clips/ViralClipsStudio";
import { useViralClips, type ViralVideoItem } from "@/hooks/useViralClips";
import { Menu, Flame, Bell } from "lucide-react";
import { UserButton } from "@clerk/clerk-react";

export default function ViralClipsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewState, setViewState] = useState<"videos" | "analyzing" | "results">("videos");
  const [selectedVideo, setSelectedVideo] = useState<ViralVideoItem | null>(null);

  const {
    search,
    setSearch,
    sortBy,
    setSortBy,
    page,
    setPage,
    videos,
    totalVideos,
    isLoadingVideos,
    setActiveJobId,
    activeJob,
    startJob,
    isStartingJob,
    publishClip,
    isPublishing,
    addToAutopilotQueue,
    isAddingToAutopilot,
    updateClip,
    addClip,
    deleteClip,
  } = useViralClips();

  // Handle Video Selection -> Start AI Analysis
  const handleSelectVideo = async (video: ViralVideoItem) => {
    setSelectedVideo(video);
    try {
      await startJob(video);
      setViewState("analyzing");
    } catch {
      // Handled by hook toast
    }
  };

  // Watch job progress to transition from "analyzing" to "results"
  useEffect(() => {
    if (activeJob) {
      if (activeJob.currentStage === "completed" && activeJob.clips.length > 0) {
        setViewState("results");
      } else if (activeJob.currentStage === "failed") {
        setViewState("videos");
      }
    }
  }, [activeJob]);

  const handleBackToVideos = () => {
    setViewState("videos");
    setActiveJobId(null);
  };

  const handleReanalyze = (options?: { selectedGenre?: string; customInstructions?: string }) => {
    const videoToAnalyze = selectedVideo || (activeJob ? {
      id: activeJob.videoId,
      videoId: activeJob.videoId,
      platform: "youtube",
      title: activeJob.videoTitle,
      description: activeJob.videoDescription || "",
      thumbnail: activeJob.videoThumbnail,
      duration: activeJob.videoDuration,
      views: activeJob.views,
      likes: 0,
      comments: 0,
      publishedAt: activeJob.publishedAt,
    } : null);

    if (videoToAnalyze) {
      startJob({
        video: videoToAnalyze,
        selectedGenre: options?.selectedGenre,
        customInstructions: options?.customInstructions,
      });
      setViewState("analyzing");
    }
  };

  return (
    <div className="h-screen flex bg-[#08080f] overflow-hidden text-slate-100 font-sans" id="viral-clips-page">
      {/* Ambient Background Accents */}
      <div className="absolute top-0 left-1/4 w-[450px] h-[450px] bg-purple-600/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-indigo-600/10 blur-[120px] pointer-events-none rounded-full" />

      {/* ── Unified Sidebar ── */}
      <Sidebar activePage="/viral-clips" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── Main Workspace ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#070712] relative">
        {/* Top Navbar Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#14142a] bg-[#08080f]/90 backdrop-blur-md flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-white/5 text-gray-300 lg:hidden border border-white/10"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-white font-extrabold text-base tracking-tight">StudioPulse</span>
              <span className="text-[10px] font-extrabold bg-purple-500/20 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full">
                AI Clips
              </span>
            </div>
          </div>

          {/* Right Header: Credits + Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Credits Badge */}
            <div className="flex items-center gap-1.5 bg-[#0f0f22] border border-[#202045] px-3 py-1.5 rounded-xl shadow-inner">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span className="text-white font-extrabold text-[12px]">2,450</span>
              <span className="text-gray-400 text-[11px]">Credits</span>
              <button className="ml-1 text-purple-400 hover:text-purple-300 text-xs font-bold">+</button>
            </div>

            {/* Notification Bell */}
            <button className="p-2 bg-[#0d0d1e] border border-[#202040] text-gray-400 hover:text-white rounded-xl">
              <Bell className="w-4 h-4" />
            </button>

            {/* User Avatar */}
            <div className="pl-1">
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </div>
        </header>

        {/* Scrollable Content Workspace */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
          {viewState === "videos" && (
            <ViralVideoList
              videos={videos}
              totalVideos={totalVideos}
              isLoading={isLoadingVideos}
              search={search}
              onSearchChange={setSearch}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              page={page}
              onPageChange={setPage}
              onSelectVideo={handleSelectVideo}
              isStartingJob={isStartingJob}
            />
          )}

          {viewState === "analyzing" && (
            activeJob ? (
              <ViralAnalysisProgress
                job={activeJob}
                onBack={handleBackToVideos}
              />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[420px] space-y-4">
                <div className="w-12 h-12 rounded-full border-3 border-purple-500 border-t-transparent animate-spin" />
                <p className="text-gray-300 text-[13.5px] font-bold">Initializing Pulse AI Multi-Layer Engine...</p>
                <p className="text-gray-500 text-[11.5px]">Preparing speech waveforms and video context...</p>
              </div>
            )
          )}

          {viewState === "results" && (
            activeJob && activeJob.clips && activeJob.clips.length > 0 ? (
              <ViralClipsStudio
                job={activeJob}
                onBack={handleBackToVideos}
                onReanalyze={handleReanalyze}
                onPublishClip={publishClip}
                isPublishing={isPublishing}
                onAddToAutopilot={addToAutopilotQueue}
                isAddingToAutopilot={isAddingToAutopilot}
                onUpdateClip={updateClip}
                onAddClip={addClip}
                onDeleteClip={deleteClip}
              />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[420px] space-y-4 text-center">
                <p className="text-gray-300 text-base font-bold">No clips extracted yet</p>
                <p className="text-gray-500 text-xs max-w-sm">
                  We could not find standalone moments in this segment. Try picking another video or adjusting the AI focus.
                </p>
                <button
                  onClick={handleBackToVideos}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-900/30 transition-all"
                >
                  Back to Videos
                </button>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
