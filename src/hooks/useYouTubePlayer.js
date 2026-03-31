/**
 * @fileoverview useYouTubePlayer — YouTube IFrame API hook
 * @description
 * Singleton API loader + per-instance player management.
 * Tracks watch progress every 2 seconds while playing.
 * Cleans up properly on unmount.
 *
 * Usage:
 *   const { containerRef, isReady, playerState, progress } =
 *     useYouTubePlayer(youtubeId, { onProgress, onStateChange });
 */

import { useEffect, useRef, useState, useCallback } from "react";

// ── Singleton API Loader ───────────────────────────────────────────────────

let _ytApiState = "idle"; // 'idle' | 'loading' | 'ready'
const _ytApiWaiters = [];

const loadYouTubeAPI = () => {
  if (_ytApiState === "ready") return Promise.resolve();

  return new Promise((resolve) => {
    _ytApiWaiters.push(resolve);

    if (_ytApiState === "loading") return;

    _ytApiState = "loading";

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      _ytApiState = "ready";
      if (prev) prev();
      _ytApiWaiters.forEach((cb) => cb());
      _ytApiWaiters.length = 0;
    };

    document.head.appendChild(tag);
  });
};

// ── Player States ──────────────────────────────────────────────────────────

export const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
};

export const YT_STATE_LABELS = {
  [-1]: "Unstarted",
  [0]: "Ended",
  [1]: "Playing",
  [2]: "Paused",
  [3]: "Buffering",
  [5]: "Cued",
};

// ── Hook ───────────────────────────────────────────────────────────────────

/**
 * @param {string|null} youtubeId - YouTube video ID
 * @param {object} options
 * @param {(prog: {currentTime: number, duration: number, percentage: number}) => void} [options.onProgress]
 * @param {(state: number) => void} [options.onStateChange]
 * @param {boolean} [options.autoplay]
 */
export const useYouTubePlayer = (youtubeId, options = {}) => {
  const { onProgress, onStateChange, autoplay = false } = options;

  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const destroyedRef = useRef(false);
  const onProgressRef = useRef(onProgress);
  const onStateChangeRef = useRef(onStateChange);

  // Keep refs current without recreating effect
  onProgressRef.current = onProgress;
  onStateChangeRef.current = onStateChange;

  const [isReady, setIsReady] = useState(false);
  const [playerState, setPlayerState] = useState(YT_STATE.UNSTARTED);
  const [progress, setProgress] = useState({
    currentTime: 0,
    duration: 0,
    percentage: 0,
  });

  const captureProgress = useCallback((player) => {
    if (!player?.getCurrentTime) return;
    try {
      const currentTime = player.getCurrentTime() || 0;
      const duration = player.getDuration() || 0;
      const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;
      const prog = { currentTime, duration, percentage };
      setProgress(prog);
      onProgressRef.current?.(prog);
    } catch {}
  }, []);

  const startTracking = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (playerRef.current) captureProgress(playerRef.current);
    }, 2000);
  }, [captureProgress]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Final progress capture after stop/pause
  const finalCapture = useCallback(
    (eventTarget) => {
      stopTracking();
      if (eventTarget) captureProgress(eventTarget);
    },
    [stopTracking, captureProgress],
  );

  useEffect(() => {
    if (!youtubeId) return;
    destroyedRef.current = false;

    const initPlayer = async () => {
      await loadYouTubeAPI();
      if (destroyedRef.current || !containerRef.current) return;

      // Tear down any existing player on this element
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }

      // Give element a stable unique ID for YT API targeting
      const pid = `yt_${youtubeId}_${Math.random().toString(36).slice(2, 7)}`;
      containerRef.current.id = pid;

      playerRef.current = new window.YT.Player(pid, {
        videoId: youtubeId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (destroyedRef.current) return;
            setIsReady(true);
          },
          onStateChange: (event) => {
            if (destroyedRef.current) return;
            const state = event.data;
            setPlayerState(state);
            onStateChangeRef.current?.(state);

            if (state === YT_STATE.PLAYING) {
              startTracking();
            } else if (state === YT_STATE.PAUSED || state === YT_STATE.ENDED) {
              finalCapture(event.target);
            }
          },
          onError: (event) => {
            console.warn("[useYouTubePlayer] YT error code:", event.data);
          },
        },
      });
    };

    initPlayer();

    return () => {
      destroyedRef.current = true;
      stopTracking();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
      setIsReady(false);
      setPlayerState(YT_STATE.UNSTARTED);
    };
  }, [youtubeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Expose manual progress snapshot
  const snapshotProgress = useCallback(() => {
    if (playerRef.current) captureProgress(playerRef.current);
    return progress;
  }, [captureProgress, progress]);

  return {
    containerRef,
    playerRef,
    isReady,
    playerState,
    progress,
    snapshotProgress,
  };
};
