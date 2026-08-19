import { google } from "googleapis";
import { getAuthenticatedYouTubeClient } from "./auth";
import fs from "fs";
import path from "path";
import sharp from "sharp";

// ─── YouTube Video Categories ────────────────────────────────────────────────
export const YOUTUBE_CATEGORIES = [
  { id: "1", name: "Film & Animation" },
  { id: "2", name: "Autos & Vehicles" },
  { id: "10", name: "Music" },
  { id: "15", name: "Pets & Animals" },
  { id: "17", name: "Sports" },
  { id: "18", name: "Short Movies" },
  { id: "19", name: "Travel & Events" },
  { id: "20", name: "Gaming" },
  { id: "21", name: "Videoblogging" },
  { id: "22", name: "People & Blogs" },
  { id: "23", name: "Comedy" },
  { id: "24", name: "Entertainment" },
  { id: "25", name: "News & Politics" },
  { id: "26", name: "Howto & Style" },
  { id: "27", name: "Education" },
  { id: "28", name: "Science & Technology" },
  { id: "29", name: "Nonprofits & Activism" },
];

export interface YouTubeUploadOptions {
  title: string;
  description: string;
  tags: string[];
  videoFilePath: string;
  thumbnailPath?: string;
  visibility: "public" | "private" | "unlisted";
  scheduledAt?: string;
  categoryId?: string;
  playlistId?: string;
  license?: "youtube" | "creativeCommon";
  notifySubscribers?: boolean;
  madeForKids?: boolean;
  allowComments?: boolean;
  language?: string;
  recordingDate?: string;
  ageRestricted?: boolean;
}

/**
 * Sanitize tags for YouTube's snippet.tags field.
 * YouTube rejects tags with: < > & " quotes, angle brackets, leading/trailing whitespace,
 * empty strings, or tags that are purely special characters.
 * Total combined tag bytes must be under 500.
 * Individual tags must be <= 100 characters.
 */
function cleanYouTubeTags(rawTags: string[]): string[] {
  if (!Array.isArray(rawTags)) return [];
  const cleaned: string[] = [];
  let totalLength = 0;

  for (const rawTag of rawTags) {
    if (typeof rawTag !== "string") continue;

    // If tag contains commas, split into individual tags
    const subTags = rawTag.split(",");

    for (const subTag of subTags) {
      let tag = subTag
        .replace(/^#+/, "")                       // remove leading #
        .replace(/[<>"&\\{}|^~`\[\]]/g, "")        // remove YouTube-illegal characters
        .replace(/[\r\n\t]/g, " ")                 // convert newlines/tabs to spaces
        .replace(/\s+/g, " ")                      // collapse multiple spaces
        .trim();

      // Skip empty or whitespace-only tags
      if (!tag || tag.length === 0) continue;

      // Skip tags that are purely numbers/special chars with no letters
      // YouTube sometimes rejects these
      if (!/[a-zA-Z]/.test(tag) && tag.length < 2) continue;

      // Truncate to 100 chars max
      if (tag.length > 100) {
        tag = tag.substring(0, 100).trim();
      }

      // Check total combined tag length (YouTube limit is 500 bytes total)
      if (totalLength + tag.length + 1 > 480) {
        break;
      }

      // No duplicates (case-insensitive)
      if (!cleaned.some(t => t.toLowerCase() === tag.toLowerCase())) {
        cleaned.push(tag);
        totalLength += tag.length + 1;
      }
    }
  }

  // Final safety: if the cleaned list is empty, return empty (no tags is valid)
  return cleaned;
}

/**
 * Upload a video to YouTube using the authenticated user's credentials.
 * Supports full metadata: category, playlist, license, notifications, audience, language, etc.
 */
export async function uploadToYouTube(userId: string, options: YouTubeUploadOptions) {
  const oauth2Client = await getAuthenticatedYouTubeClient(userId);
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  // Resolve the absolute path for the video file
  const resolvedVideoPath = path.resolve(options.videoFilePath);
  if (!fs.existsSync(resolvedVideoPath)) {
    throw new Error(`Video file not found: ${resolvedVideoPath}`);
  }

  // Determine privacy status and scheduling
  let privacyStatus = options.visibility;
  const publishAt = options.scheduledAt || undefined;

  // If scheduling, the video must be set to "private" initially
  if (publishAt) {
    privacyStatus = "private";
  }

  // Format tags as description hashtags
  let finalDescription = options.description || "";
  if (options.tags && options.tags.length > 0) {
    const hashtagBlock = options.tags
      .map(tag => {
        const cleanTag = tag.trim()
          .replace(/^#+/, "")
          .replace(/[<>"&\\{}|^~`\[\]]/g, "")
          .replace(/\s+/g, "")  // hashtags can't have spaces
          .trim();
        return cleanTag ? `#${cleanTag}` : "";
      })
      .filter(Boolean)
      .slice(0, 15)  // YouTube allows max ~15 hashtags in description
      .join(" ");

    if (hashtagBlock && !finalDescription.toLowerCase().includes(hashtagBlock.toLowerCase())) {
      finalDescription = finalDescription ? `${finalDescription.trim()}\n\n${hashtagBlock}` : hashtagBlock;
    }
  }

  // Sanitize tags for YouTube snippet.tags
  const sanitizedTags = cleanYouTubeTags(options.tags || []);
  console.log(`[YouTube Upload] Sanitized ${(options.tags || []).length} raw tags → ${sanitizedTags.length} clean tags:`, sanitizedTags.slice(0, 5).join(", ") + (sanitizedTags.length > 5 ? "..." : ""));

  // Resolve category ID safely (ensure numeric string ID like "22" or "27")
  let resolvedCategoryId = "22";
  if (options.categoryId) {
    const matchByName = YOUTUBE_CATEGORIES.find(c => c.name.toLowerCase() === options.categoryId?.toLowerCase());
    if (matchByName) {
      resolvedCategoryId = matchByName.id;
    } else if (/^\d+$/.test(options.categoryId)) {
      resolvedCategoryId = options.categoryId;
    }
  }

  // Build snippet — only include tags if we have valid ones
  const snippet: Record<string, unknown> = {
    title: options.title.trim().substring(0, 100),
    description: finalDescription.substring(0, 5000),
    categoryId: resolvedCategoryId,
  };

  // Only add tags if the sanitized array is non-empty
  if (sanitizedTags.length > 0) {
    snippet.tags = sanitizedTags;
  }

  if (options.language) {
    snippet.defaultLanguage = options.language;
    snippet.defaultAudioLanguage = options.language;
  }

  // Build status
  const status: Record<string, unknown> = {
    privacyStatus,
    publishAt: publishAt || undefined,
    selfDeclaredMadeForKids: options.madeForKids ?? false,
    license: options.license || "youtube",
  };

  // Upload the video
  const fileStats = fs.statSync(resolvedVideoPath);
  const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(1);
  console.log(`[YouTube Upload] Starting upload for user ${userId.substring(0, 8)}... Title: "${options.title}" (${fileSizeMB} MB)`);

  let uploadRes;
  try {
    uploadRes = await youtube.videos.insert({
      part: ["snippet", "status"],
      notifySubscribers: options.notifySubscribers ?? true,
      requestBody: {
        snippet,
        status,
        recordingDetails: options.recordingDate ? {
          recordingDate: options.recordingDate,
        } : undefined,
      },
      media: {
        body: fs.createReadStream(resolvedVideoPath),
      },
    });
  } catch (uploadErr) {
    const errMsg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
    console.error(`[YouTube Upload] ❌ Upload failed after starting: ${errMsg}`);
    // Check for common issues
    if (errMsg.includes("quota") || errMsg.includes("rateLimitExceeded")) {
      throw new Error("YouTube API quota exceeded. Please wait and try again later.");
    }
    if (errMsg.includes("unauthorized") || errMsg.includes("invalid_grant")) {
      throw new Error("YouTube session expired. Please reconnect your YouTube channel.");
    }
    throw uploadErr;
  }

  const videoId = uploadRes.data.id;
  if (!videoId) {
    throw new Error("Video upload completed but no video ID returned.");
  }

  console.log(`[YouTube Upload] ✅ Video uploaded successfully! ID: ${videoId}`);

  // If a thumbnail was provided, auto-compress and set it
  let thumbnailStatus: "set" | "failed" | "not_provided" | "channel_not_verified" = "not_provided";
  if (options.thumbnailPath) {
    const resolvedThumbPath = path.resolve(options.thumbnailPath);
    if (fs.existsSync(resolvedThumbPath)) {
      try {
        const originalStats = fs.statSync(resolvedThumbPath);
        const originalSizeMB = originalStats.size / (1024 * 1024);
        console.log(`[YouTube Upload] Original thumbnail: ${resolvedThumbPath} (${originalSizeMB.toFixed(2)} MB)`);

        if (originalStats.size === 0) {
          console.warn(`[YouTube Upload] ⚠ Thumbnail file is empty (0 bytes), skipping`);
          thumbnailStatus = "failed";
        } else {
          // Auto-compress thumbnail to meet YouTube requirements:
          // - Must be JPEG or PNG
          // - Must be under 2MB
          // - Recommended: 1280x720 pixels

          // Convert to JPEG, resize to 1280x720 (YouTube standard), compress
          let quality = 90;
          let optimizedBuffer: Buffer;

          // Progressive quality reduction to get under 2MB
          do {
            optimizedBuffer = await sharp(resolvedThumbPath)
              .resize(1280, 720, {
                fit: "cover",
                position: "center",
              })
              .jpeg({ quality, mozjpeg: true })
              .toBuffer();

            const sizeMB = optimizedBuffer.length / (1024 * 1024);
            if (sizeMB <= 1.9) break; // Leave margin below 2MB
            quality -= 10;
          } while (quality >= 30);

          const finalSizeMB = optimizedBuffer.length / (1024 * 1024);
          console.log(`[YouTube Upload] Optimized thumbnail: ${finalSizeMB.toFixed(2)} MB (JPEG q=${quality}, 1280x720)`);

          // Stream the buffer directly to YouTube — no temp file needed
          const { Readable } = await import("stream");
          await youtube.thumbnails.set({
            videoId,
            media: {
              mimeType: "image/jpeg",
              body: Readable.from(optimizedBuffer),
            },
          });
          console.log(`[YouTube Upload] ✅ Thumbnail set for video ${videoId}`);
          thumbnailStatus = "set";
        }
      } catch (thumbErr) {
        const errMsg = thumbErr instanceof Error ? thumbErr.message : String(thumbErr);
        console.warn(`[YouTube Upload] ⚠ Thumbnail upload failed:`, errMsg);
        if (errMsg.includes("verified") || errMsg.includes("forbidden") || errMsg.includes("403")) {
          console.warn(`[YouTube Upload] ℹ Your YouTube channel may need phone verification to set custom thumbnails.`);
          console.warn(`[YouTube Upload] ℹ Visit: https://www.youtube.com/verify`);
          thumbnailStatus = "channel_not_verified";
        } else {
          thumbnailStatus = "failed";
        }
      }
    } else {
      console.warn(`[YouTube Upload] ⚠ Thumbnail file not found at: ${resolvedThumbPath}`);
      thumbnailStatus = "failed";
    }
  } else {
    console.log(`[YouTube Upload] ℹ No thumbnail path provided, skipping thumbnail upload`);
  }

  // If a playlist was specified, add the video to it
  if (options.playlistId) {
    try {
      await youtube.playlistItems.insert({
        part: ["snippet"],
        requestBody: {
          snippet: {
            playlistId: options.playlistId,
            resourceId: {
              kind: "youtube#video",
              videoId,
            },
          },
        },
      });
      console.log(`[YouTube Upload] ✅ Video added to playlist ${options.playlistId}`);
    } catch (playlistErr) {
      console.warn(`[YouTube Upload] ⚠ Failed to add to playlist:`, playlistErr instanceof Error ? playlistErr.message : playlistErr);
    }
  }

  return {
    success: true,
    platformVideoId: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    processingStatus: uploadRes.data.processingDetails?.processingStatus || "processing",
    publishedAt: uploadRes.data.snippet?.publishedAt || new Date().toISOString(),
    channelId: uploadRes.data.snippet?.channelId || "",
    thumbnailStatus,
  };
}

/**
 * Fetch the authenticated user's YouTube playlists.
 */
export async function getYouTubePlaylists(userId: string) {
  const oauth2Client = await getAuthenticatedYouTubeClient(userId);
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  const response = await youtube.playlists.list({
    part: ["snippet"],
    mine: true,
    maxResults: 50,
  });

  return (response.data.items || []).map((item) => ({
    id: item.id || "",
    title: item.snippet?.title || "Untitled Playlist",
    thumbnail: item.snippet?.thumbnails?.default?.url || "",
    itemCount: item.contentDetails?.itemCount || 0,
  }));
}
