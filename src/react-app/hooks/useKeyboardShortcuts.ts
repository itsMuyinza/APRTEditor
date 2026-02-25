import { useEffect, useRef, useCallback } from 'react';

/**
 * Premiere Pro-style keyboard shortcuts for ClipWise.
 *
 * Mounted once in Home.tsx. Captures global keydown events and dispatches
 * to the appropriate action callbacks. All NLE-standard shortcuts are here:
 * J/K/L shuttle, arrow-key frame stepping, S to split, etc.
 *
 * Input fields (text inputs, textareas, contentEditable) are automatically
 * excluded so typing in the AI panels doesn't trigger shortcuts.
 */

export interface KeyboardShortcutActions {
  // Playback
  togglePlayback: () => void;
  pause: () => void;
  seekRelative: (seconds: number) => void;
  seekTo: (seconds: number) => void;
  getDuration: () => number;

  // Editing
  splitAtPlayhead: () => void;
  deleteSelectedClip: () => void;
  selectedClipId: string | null;
  undo: () => void;
  redo: () => void;

  // Project
  saveProject: () => void;
  handleExport: () => void;

  // Timeline
  toggleAutoSnap: () => void;
  setZoomDelta: (delta: number) => void;

  // Documentary quick keys (Cmd+Shift combos → submit Director prompt)
  submitDirectorPrompt?: (prompt: string) => void;
}

const FPS = 30;

export function useKeyboardShortcuts(actions: KeyboardShortcutActions) {
  // J/K/L shuttle state: tracks current playback rate for double-tap acceleration
  const shuttleRef = useRef<number>(0); // -2, -1, 0, 1, 2
  const lastLTapRef = useRef<number>(0);
  const lastJTapRef = useRef<number>(0);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // ── Guard: don't intercept when user is typing in a text field ──
    const target = e.target as HTMLElement;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target.isContentEditable
    ) {
      return;
    }

    const isMeta = e.metaKey || e.ctrlKey;
    const isShift = e.shiftKey;
    const key = e.key;

    // ═══════════════════════════════════════════
    // PLAYBACK CONTROLS
    // ═══════════════════════════════════════════

    // Space → Play/Pause toggle
    if (key === ' ') {
      e.preventDefault();
      actions.togglePlayback();
      return;
    }

    // K → Pause (always)
    if (key === 'k' || key === 'K') {
      if (!isMeta) {
        e.preventDefault();
        actions.pause();
        shuttleRef.current = 0;
        return;
      }
    }

    // L → Play forward (double-tap for 2x)
    if (key === 'l' || key === 'L') {
      if (!isMeta) {
        e.preventDefault();
        const now = Date.now();
        if (now - lastLTapRef.current < 400) {
          // Double-tap L → fast forward (step 2 seconds)
          actions.seekRelative(2);
        } else {
          actions.togglePlayback();
        }
        lastLTapRef.current = now;
        return;
      }
    }

    // J → Play backward (double-tap for fast rewind)
    if (key === 'j' || key === 'J') {
      if (!isMeta) {
        e.preventDefault();
        const now = Date.now();
        if (now - lastJTapRef.current < 400) {
          // Double-tap J → fast rewind (step back 2 seconds)
          actions.seekRelative(-2);
        } else {
          // Single tap → step back 1 second
          actions.seekRelative(-1);
        }
        lastJTapRef.current = now;
        return;
      }
    }

    // ← → Frame step (Shift for 5-frame jump)
    if (key === 'ArrowLeft') {
      e.preventDefault();
      const step = isShift ? 5 / FPS : 1 / FPS;
      actions.seekRelative(-step);
      return;
    }

    if (key === 'ArrowRight') {
      e.preventDefault();
      const step = isShift ? 5 / FPS : 1 / FPS;
      actions.seekRelative(step);
      return;
    }

    // Home → Go to start
    if (key === 'Home') {
      e.preventDefault();
      actions.seekTo(0);
      return;
    }

    // End → Go to end
    if (key === 'End') {
      e.preventDefault();
      actions.seekTo(actions.getDuration());
      return;
    }

    // ═══════════════════════════════════════════
    // EDITING
    // ═══════════════════════════════════════════

    // S → Split at playhead (also Cmd+K for Premiere compatibility)
    if ((key === 's' || key === 'S') && !isMeta) {
      e.preventDefault();
      actions.splitAtPlayhead();
      return;
    }

    if (key === 'k' || key === 'K') {
      if (isMeta) {
        e.preventDefault();
        actions.splitAtPlayhead();
        return;
      }
    }

    // Delete / Backspace → Delete selected clip
    if ((key === 'Delete' || key === 'Backspace') && actions.selectedClipId) {
      e.preventDefault();
      actions.deleteSelectedClip();
      return;
    }

    // A → Toggle auto-snap (ripple mode)
    if ((key === 'a' || key === 'A') && !isMeta) {
      e.preventDefault();
      actions.toggleAutoSnap();
      return;
    }

    // ═══════════════════════════════════════════
    // ZOOM
    // ═══════════════════════════════════════════

    // + / = → Zoom in
    if (key === '+' || key === '=') {
      e.preventDefault();
      actions.setZoomDelta(0.25);
      return;
    }

    // - → Zoom out
    if (key === '-' && !isMeta) {
      e.preventDefault();
      actions.setZoomDelta(-0.25);
      return;
    }

    // ═══════════════════════════════════════════
    // PROJECT COMMANDS (with modifier)
    // ═══════════════════════════════════════════

    // Cmd+S → Save project
    if (key === 's' && isMeta && !isShift) {
      e.preventDefault();
      actions.saveProject();
      return;
    }

    // Cmd+E → Export
    if (key === 'e' && isMeta) {
      e.preventDefault();
      actions.handleExport();
      return;
    }

    // Cmd+Z → Undo
    if (key === 'z' && isMeta && !isShift) {
      e.preventDefault();
      actions.undo();
      return;
    }

    // Cmd+Shift+Z → Redo
    if ((key === 'z' || key === 'Z') && isMeta && isShift) {
      e.preventDefault();
      actions.redo();
      return;
    }

    // ═══════════════════════════════════════════
    // DOCUMENTARY QUICK KEYS (Cmd+Shift combos)
    // ═══════════════════════════════════════════

    if (isMeta && isShift && actions.submitDirectorPrompt) {
      const quickKeyMap: Record<string, string> = {
        'c': 'Add narration captions',
        'C': 'Add narration captions',
        'd': 'Remove dead air from video',
        'D': 'Remove dead air from video',
        'g': 'Apply warm vintage grade',
        'G': 'Apply warm vintage grade',
        'v': 'Enhance voice clarity',
        'V': 'Enhance voice clarity',
        'n': 'Normalize audio to -14 LUFS',
        'N': 'Normalize audio to -14 LUFS',
        'r': 'Cut repeated lines (keep last take)',
        'R': 'Cut repeated lines (keep last take)',
      };

      const prompt = quickKeyMap[key];
      if (prompt) {
        e.preventDefault();
        actions.submitDirectorPrompt(prompt);
        return;
      }
    }

  }, [actions]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
