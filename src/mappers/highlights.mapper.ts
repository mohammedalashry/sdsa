// src/integrations/korastats/mappers/highlights.mapper.ts
import { HighlightsResponse } from "@/legacy-types/highlights.types";

export class HighlightsMapper {
  /**
   * Map KoraStats match video data to Django highlights format
   */
  static mapToHighlightsResponse(matchVideoData: any): HighlightsResponse {
    console.log("HighlightsMapper: Mapping match video data to highlights format");
    console.log("Match video data:", JSON.stringify(matchVideoData, null, 2));

    // Default response if no video data available
    const defaultResponse: HighlightsResponse = {
      host: "youtube-channel",
      url: "https://youtube.com/@saudisportscompany",
    };

    if (!matchVideoData?.data) {
      console.warn("No match video data found, returning default highlights");
      return defaultResponse;
    }

    const videoData = matchVideoData.data;

    // Check if we have video streams available
    if (!videoData.objMatch?.arrHalves || videoData.objMatch.arrHalves.length === 0) {
      console.warn("No video halves found, returning default highlights");
      return defaultResponse;
    }

    // Look for the best quality video stream
    let bestVideoUrl = "-";
    let bestQuality = 0;

    for (const half of videoData.objMatch.arrHalves) {
      if (half.arrStreams && half.arrStreams.length > 0) {
        for (const stream of half.arrStreams) {
          if (stream.arrQualities && stream.arrQualities.length > 0) {
            for (const quality of stream.arrQualities) {
              // Prefer higher resolution videos
              const currentQuality = quality.intHeight || 0;
              if (currentQuality > bestQuality) {
                bestQuality = currentQuality;
                bestVideoUrl = quality.strLink;
              }
            }
          }
        }
      }
    }

    if (bestVideoUrl) {
      console.log(`Found video highlights: ${bestVideoUrl} (${bestQuality}p)`);
      return {
        host: "korastats-video",
        url: bestVideoUrl,
      };
    }

    console.warn("No video URLs found, returning default highlights");
    return defaultResponse;
  }
}

