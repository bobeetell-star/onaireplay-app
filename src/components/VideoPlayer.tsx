import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, X, SkipBack, SkipForward, Settings, PictureInPicture2, Subtitles, Zap } from 'lucide-react';
import { MovieWithProgress } from '../types/database';
import { supabase } from '../lib/supabase';

interface VideoPlayerProps {
  movie: MovieWithProgress;
  onClose: () => void;
  onProgressUpdate: (movieId: number, progressSeconds: number, totalDurationSeconds: number) => void;
  onEpisodeEnded?: (nextEpisode: MovieWithProgress | null) => void;
}

type VideoQuality = 'auto' | '720p' | '1080p' | '4k';
type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;
type SubtitleTrack = 'off' | 'en' | 'es';

const VideoPlayer: React.FC<VideoPlayerProps> = ({ movie, onClose, onProgressUpdate, onEpisodeEnded }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>('auto');
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [subtitleTrack, setSubtitleTrack] = useState<SubtitleTrack>('off');
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [nextEpisode, setNextEpisode] = useState<MovieWithProgress | null>(null);
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const progressUpdateIntervalRef = useRef<NodeJS.Timeout>();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when video player is active and not typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
          event.preventDefault();
          skip(10);
          break;
        case 'ArrowUp':
          event.preventDefault();
          const video = videoRef.current;
          if (video) {
            const newVolume = Math.min(1, volume + 0.1);
            video.volume = newVolume;
            setVolume(newVolume);
            setIsMuted(false);
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          const videoDown = videoRef.current;
          if (videoDown) {
            const newVolume = Math.max(0, volume - 0.1);
            videoDown.volume = newVolume;
            setVolume(newVolume);
            setIsMuted(newVolume === 0);
          }
          break;
        case 'KeyM':
          event.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          event.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            event.preventDefault();
            toggleFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [volume, isFullscreen]);

  // Get video URL based on quality selection
  const getVideoUrl = (quality: VideoQuality) => {
    switch (quality) {
      case '720p':
        return movie.video_url_720p || movie.video_url || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
      case '1080p':
        return movie.video_url_1080p || movie.video_url || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
      case '4k':
        return movie.video_url_4k || movie.video_url || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
      default:
        return movie.video_url || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    }
  };

  const videoUrl = getVideoUrl(videoQuality);
  const hasVideoUrl = Boolean(movie.video_url || movie.video_url_720p || movie.video_url_1080p || movie.video_url_4k);

  // Get available video qualities
  const getAvailableQualities = (): VideoQuality[] => {
    const qualities: VideoQuality[] = ['auto'];
    if (movie.video_url_720p) qualities.push('720p');
    if (movie.video_url_1080p) qualities.push('1080p');
    if (movie.video_url_4k) qualities.push('4k');
    return qualities;
  };

  // Get available subtitle tracks
  const getAvailableSubtitles = (): { value: SubtitleTrack; label: string }[] => {
    const subtitles: { value: SubtitleTrack; label: string }[] = [{ value: 'off', label: 'Off' }];
    if (movie.subtitle_url_en) subtitles.push({ value: 'en', label: 'English' });
    if (movie.subtitle_url_es) subtitles.push({ value: 'es', label: 'Español' });
    return subtitles;
  };

  // Fetch next episode
  const fetchNextEpisode = async () => {
    if (!movie.series_id || !movie.episode_number) return;

    try {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('series_id', movie.series_id)
        .eq('episode_number', movie.episode_number + 1)
        .single();

      if (error) throw error;
      if (data) {
        setNextEpisode(data as MovieWithProgress);
        console.log('Fetched next episode:', data);
      }
    } catch (err) {
      console.log('No next episode found');
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      
      // Set initial progress if continuing watching
      if (movie.progress_seconds && movie.progress_seconds > 0) {
        video.currentTime = movie.progress_seconds;
        setCurrentTime(movie.progress_seconds);
      }

      // Set initial playback speed
      video.playbackRate = playbackSpeed;
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Manual check for end of video if native 'ended' event is unreliable
      // Trigger handleEnded if current time is very close to duration and video is playing
      if (isPlaying && video.currentTime >= video.duration - 0.5 && video.duration > 0) {
        // Ensure this logic only runs once per video end
        if (!video.paused) {
          video.pause(); // Pause to prevent multiple triggers
          handleEnded(); // Manually trigger the end logic
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      // Mark as completed
      onProgressUpdate(movie.id, video.duration, video.duration);
      console.log('Video ended. Next episode:', nextEpisode);
      
      // Directly play next episode or close player
      playNextEpisode();
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleEnterpictureinpicture = () => setIsPictureInPicture(true);
    const handleLeavepictureinpicture = () => setIsPictureInPicture(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('enterpictureinpicture', handleEnterpictureinpicture);
    video.addEventListener('leavepictureinpicture', handleLeavepictureinpicture);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('enterpictureinpicture', handleEnterpictureinpicture);
      video.removeEventListener('leavepictureinpicture', handleLeavepictureinpicture);
    };
  }, [movie.id, movie.progress_seconds, onProgressUpdate]);

  // Fetch next episode on mount
  useEffect(() => {
    fetchNextEpisode();
  }, [movie.series_id, movie.episode_number]);

  // Update video quality
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const currentTime = video.currentTime;
    const wasPlaying = !video.paused;
    
    video.src = getVideoUrl(videoQuality);
    console.log('Video source updated to:', video.src, 'for movie:', movie.title, 'new movie object:', movie);
    video.currentTime = currentTime;
    
    if (wasPlaying) {
      video.play();
    }
  }, [videoQuality, movie.id, movie.video_url, movie.video_url_720p, movie.video_url_1080p, movie.video_url_4k]);

  // Update playback speed
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Update subtitle track
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Disable all tracks first
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = 'disabled';
    }

    // Enable selected track
    if (subtitleTrack !== 'off') {
      const trackIndex = subtitleTrack === 'en' ? 0 : 1;
      if (video.textTracks[trackIndex]) {
        video.textTracks[trackIndex].mode = 'showing';
      }
    }
  }, [subtitleTrack]);

  // Update watch history every 10 seconds
  useEffect(() => {
    if (isPlaying && duration > 0) {
      progressUpdateIntervalRef.current = setInterval(() => {
        if (videoRef.current) {
          onProgressUpdate(movie.id, videoRef.current.currentTime, duration);
        }
      }, 10000); // Update every 10 seconds
    } else {
      if (progressUpdateIntervalRef.current) {
        clearInterval(progressUpdateIntervalRef.current);
      }
    }

    return () => {
      if (progressUpdateIntervalRef.current) {
        clearInterval(progressUpdateIntervalRef.current);
      }
    };
  }, [isPlaying, duration, movie.id, onProgressUpdate]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = (parseFloat(e.target.value) / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value) / 100;
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleFullscreen = () => {
    const container = document.getElementById('video-player-container');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (isPictureInPicture) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error('Picture-in-picture error:', error);
    }
  };

  const playNextEpisode = () => {
    // Signal to parent component to play the next episode or close player
    if (onEpisodeEnded) {
      onEpisodeEnded(nextEpisode);
    } else {
      onClose();
    }
  };


  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      id="video-player-container"
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className={`absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <X className="w-8 h-8" />
      </button>

      {/* Movie Title */}
      <div className={`absolute top-4 left-4 z-10 text-white transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        <h1 className="text-2xl font-bold">{movie.title}</h1>
        <div className="flex items-center space-x-3">
          <p className="text-gray-300">{movie.genre}</p>
          {movie.episode_number && (
            <span className="text-gray-300">Episode {movie.episode_number}</span>
          )}
          {!hasVideoUrl && (
            <span className="bg-yellow-600 text-black px-2 py-1 rounded text-xs font-bold">
              DEMO
            </span>
          )}
        </div>
      </div>

      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        preload="metadata"
      >
        {/* Subtitle tracks */}
        {movie.subtitle_url_en && (
          <track
            kind="subtitles"
            src={movie.subtitle_url_en}
            srcLang="en"
            label="English"
          />
        )}
        {movie.subtitle_url_es && (
          <track
            kind="subtitles"
            src={movie.subtitle_url_es}
            srcLang="es"
            label="Español"
          />
        )}
      </video>

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">
              {hasVideoUrl ? 'Loading video...' : 'Loading demo video...'}
            </p>
            {!hasVideoUrl && (
              <p className="text-gray-400 text-sm mt-2">
                No video URL found for this movie. Playing demo content.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Play/Pause Overlay */}
      {!isPlaying && !isLoading && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center text-white hover:bg-black/20 transition-colors"
        >
          <Play className="w-20 h-20 fill-current" />
        </button>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className={`absolute bottom-20 right-6 bg-gray-900 rounded-lg shadow-xl p-4 min-w-64 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}>
          {/* Video Quality */}
          <div className="mb-4">
            <h4 className="text-white font-semibold mb-2 flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              Quality
            </h4>
            <div className="space-y-1">
              {getAvailableQualities().map((quality) => (
                <button
                  key={quality}
                  onClick={() => setVideoQuality(quality)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    videoQuality === quality
                      ? 'bg-red-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {quality === 'auto' ? 'Auto' : quality.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Playback Speed */}
          <div className="mb-4">
            <h4 className="text-white font-semibold mb-2">Speed</h4>
            <div className="space-y-1">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed as PlaybackSpeed)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-red-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Subtitles */}
          <div>
            <h4 className="text-white font-semibold mb-2 flex items-center">
              <Subtitles className="w-4 h-4 mr-2" />
              Subtitles
            </h4>
            <div className="space-y-1">
              {getAvailableSubtitles().map((subtitle) => (
                <button
                  key={subtitle.value}
                  onClick={() => setSubtitleTrack(subtitle.value)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    subtitleTrack === subtitle.value
                      ? 'bg-red-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {subtitle.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Progress Bar */}
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max="100"
            value={progressPercentage}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${progressPercentage}%, #4b5563 ${progressPercentage}%, #4b5563 100%)`
            }}
          />
          <div className="flex justify-between text-sm text-gray-300 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Skip Back */}
            <button
              onClick={() => skip(-10)}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <SkipBack className="w-6 h-6" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 fill-current" />}
            </button>

            {/* Skip Forward */}
            <button
              onClick={() => skip(10)}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <SkipForward className="w-6 h-6" />
            </button>

            {/* Volume */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="text-white hover:text-gray-300 transition-colors"
              >
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume * 100}
                onChange={handleVolumeChange}
                className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-4">
            {/* Picture-in-Picture */}
            <button
              onClick={togglePictureInPicture}
              className={`text-white hover:text-gray-300 transition-colors ${
                isPictureInPicture ? 'text-red-400' : ''
              }`}
            >
              <PictureInPicture2 className="w-6 h-6" />
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`text-white hover:text-gray-300 transition-colors ${
                showSettings ? 'text-red-400' : ''
              }`}
            >
              <Settings className="w-6 h-6" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <Maximize className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default VideoPlayer;