import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2, CheckCircle2, XCircle, Film, Mic, Image, Sparkles,
  Wand2, Play, Wrench, Video, Palette, Eraser, Music, VolumeX,
  Clock, Activity,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────

interface Job {
  id: string;
  sessionId: string;
  type: string;
  status: 'processing' | 'complete' | 'error';
  progress: number;
  description: string;
  assetId?: string | null;
  startedAt: number;
  completedAt?: number | null;
  error?: string | null;
  result?: Record<string, unknown>;
}

interface ProcessingViewProps {
  sessionId: string | null;
  /** Called when any job becomes active — parent can auto-switch to this tab */
  onJobStarted?: () => void;
  /** Called when all jobs complete — parent can switch back to previous tab */
  onAllJobsComplete?: () => void;
}

// ── Job Type Config ──────────────────────────────────────────────────

const JOB_TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  'render':             { icon: Film,     label: 'Render',           color: 'text-blue-400' },
  'transcribe':         { icon: Mic,      label: 'Transcribe',       color: 'text-green-400' },
  'generate-image':     { icon: Image,    label: 'Generate Image',   color: 'text-yellow-300' },
  'generate-animation': { icon: Sparkles, label: 'Animation',        color: 'text-purple-400' },
  'edit-animation':     { icon: Wand2,    label: 'Edit Animation',   color: 'text-purple-300' },
  'create-gif':         { icon: Play,     label: 'Create GIF',       color: 'text-pink-400' },
  'ffmpeg-edit':        { icon: Wrench,   label: 'Process Asset',    color: 'text-yellow-400' },
  'process-asset':      { icon: Wrench,   label: 'Process Asset',    color: 'text-yellow-400' },
  'generate-video':     { icon: Video,    label: 'Generate Video',   color: 'text-cyan-400' },
  'restyle-video':      { icon: Palette,  label: 'Restyle Video',    color: 'text-amber-400' },
  'remove-video-bg':    { icon: Eraser,   label: 'Remove BG',        color: 'text-teal-400' },
  'remove-bg':          { icon: Eraser,   label: 'Remove BG',        color: 'text-teal-400' },
  'extract-audio':      { icon: Music,    label: 'Extract Audio',    color: 'text-indigo-400' },
  'remove-dead-air':    { icon: VolumeX,  label: 'Remove Dead Air',  color: 'text-red-400' },
};

const DEFAULT_JOB_CONFIG = { icon: Activity, label: 'Processing', color: 'text-zinc-400' };

function getJobConfig(type: string) {
  return JOB_TYPE_CONFIG[type] || DEFAULT_JOB_CONFIG;
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

// ── Component ────────────────────────────────────────────────────────

export default function ProcessingView({
  sessionId,
  onJobStarted,
  onAllJobsComplete,
}: ProcessingViewProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const prevActiveCountRef = useRef(0);

  // Merge a single job update into state
  const upsertJob = useCallback((updated: Job) => {
    setJobs(prev => {
      const idx = prev.findIndex(j => j.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [updated, ...prev];
    });
  }, []);

  // Connect SSE stream
  useEffect(() => {
    if (!sessionId) return;

    const url = `http://localhost:3333/session/${sessionId}/jobs/stream`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Snapshot message (initial full state)
        if (data.type === 'snapshot' && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
          return;
        }

        // Individual job update
        if (data.id && data.status) {
          upsertJob(data as Job);
        }
      } catch {
        // Ignore parse errors (heartbeats, etc.)
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects — no action needed
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [sessionId, upsertJob]);

  // Notify parent of job lifecycle changes
  const activeJobs = jobs.filter(j => j.status === 'processing');
  const completedJobs = jobs
    .filter(j => j.status === 'complete' || j.status === 'error')
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    .slice(0, 10);

  useEffect(() => {
    const prevCount = prevActiveCountRef.current;
    const currentCount = activeJobs.length;
    prevActiveCountRef.current = currentCount;

    // A new job started
    if (currentCount > 0 && prevCount === 0) {
      onJobStarted?.();
    }
    // All jobs finished
    if (currentCount === 0 && prevCount > 0) {
      onAllJobsComplete?.();
    }
  }, [activeJobs.length, onJobStarted, onAllJobsComplete]);

  return (
    <div className="flex flex-col h-full bg-zinc-900/80">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/50">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-semibold">Processing</h2>
          {activeJobs.length > 0 && (
            <span className="ml-auto text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-medium">
              {activeJobs.length} active
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-400">
          Track rendering, transcription, and AI generation progress
        </p>
      </div>

      {/* Job List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Empty State */}
        {jobs.length === 0 && (
          <div className="text-center text-sm text-zinc-500 py-12">
            <Activity className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>No active jobs</p>
            <p className="text-xs mt-1 text-zinc-600">
              Jobs appear here when you render, transcribe, or generate content
            </p>
          </div>
        )}

        {/* Active Jobs */}
        {activeJobs.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-1">
              Active
            </h3>
            {activeJobs.map(job => (
              <ActiveJobCard key={job.id} job={job} />
            ))}
          </div>
        )}

        {/* Completed Jobs */}
        {completedJobs.length > 0 && (
          <div className="space-y-2 mt-4">
            <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-1">
              Recent
            </h3>
            {completedJobs.map(job => (
              <CompletedJobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Active Job Card ──────────────────────────────────────────────────

function ActiveJobCard({ job }: { job: Job }) {
  const config = getJobConfig(job.type);
  const Icon = config.icon;
  const elapsed = formatDuration(Date.now() - job.startedAt);

  // Re-render periodically to update elapsed time
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-zinc-800/80 rounded-lg p-3 border border-zinc-700/50">
      <div className="flex items-start gap-2.5">
        {/* Type Icon */}
        <div className={`mt-0.5 ${config.color}`}>
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-zinc-300 truncate">
              {config.label}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span className="text-[10px] text-zinc-500">{elapsed}</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
            {job.description}
          </p>

          {/* Progress Bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-400 w-8 text-right font-mono">
              {Math.round(job.progress)}%
            </span>
          </div>
        </div>

        {/* Spinner */}
        <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
      </div>
    </div>
  );
}

// ── Completed Job Card ───────────────────────────────────────────────

function CompletedJobCard({ job }: { job: Job }) {
  const config = getJobConfig(job.type);
  const Icon = config.icon;
  const isError = job.status === 'error';
  const duration = job.completedAt
    ? formatDuration(job.completedAt - job.startedAt)
    : '—';
  const timeAgo = job.completedAt ? formatTimeAgo(job.completedAt) : '';

  return (
    <div className={`bg-zinc-800/50 rounded-lg p-2.5 border ${
      isError ? 'border-red-500/20' : 'border-zinc-700/30'
    }`}>
      <div className="flex items-center gap-2.5">
        {/* Type Icon */}
        <div className={isError ? 'text-red-400' : config.color}>
          <Icon className="w-3.5 h-3.5" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-zinc-400 truncate">
              {config.label}
            </span>
            <span className="text-[10px] text-zinc-600">·</span>
            <span className="text-[10px] text-zinc-500">{duration}</span>
          </div>
          {isError && job.error && (
            <p className="text-[10px] text-red-300/70 mt-0.5 truncate">
              {job.error}
            </p>
          )}
          {!isError && (
            <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
              {job.description}
            </p>
          )}
        </div>

        {/* Status + Time */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] text-zinc-600">{timeAgo}</span>
          {isError ? (
            <XCircle className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          )}
        </div>
      </div>
    </div>
  );
}
