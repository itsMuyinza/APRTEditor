import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Layers, Music, Palette, Film, Sliders, Video,
  FolderOpen, ArrowLeft, Download, Search, Loader2, ChevronRight,
} from 'lucide-react';

const FFMPEG_URL = 'http://localhost:3333';

// ── Category config ──────────────────────────────────────────────
interface CategoryMeta {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;        // Tailwind gradient
  accentHex: string;    // For inline styles
}

const CATEGORIES: CategoryMeta[] = [
  { id: 'overlays',    label: 'Overlays',    icon: Layers,  color: 'from-amber-500 to-yellow-600',   accentHex: '#D4AF37' },
  { id: 'transitions', label: 'Transitions', icon: Film,    color: 'from-blue-500 to-cyan-500',      accentHex: '#3B82F6' },
  { id: 'logos',       label: 'Logos',       icon: Palette, color: 'from-purple-500 to-pink-500',    accentHex: '#A855F7' },
  { id: 'music',       label: 'Music/SFX',   icon: Music,   color: 'from-emerald-500 to-teal-500',   accentHex: '#10B981' },
  { id: 'luts',        label: 'LUTs',        icon: Sliders, color: 'from-orange-500 to-red-500',     accentHex: '#F97316' },
  { id: 'video',       label: 'Video',       icon: Video,   color: 'from-rose-500 to-fuchsia-500',   accentHex: '#F43F5E' },
];

// ── Types from the server ────────────────────────────────────────
interface LibraryFile {
  name: string;
  path: string;
  relativePath: string;
  subfolder: string;
  ext: string;
  size: number;
  modified: string;
  type: 'video' | 'image' | 'audio' | 'lut' | 'unknown';
  thumbnailUrl: string;
}

interface BrowseResponse {
  category: string;
  subfolder: string;
  subfolders: string[];
  files: LibraryFile[];
  total: number;
}

interface CategoryListItem {
  id: string;
  name: string;
  fileCount: number;
}

// ── Props ────────────────────────────────────────────────────────
interface LocalAssetBrowserProps {
  sessionId: string | null;
  onImportComplete: () => void;  // called after import so parent can refreshAssets
}

// ── Helpers ──────────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileTypeLabel(type: LibraryFile['type']): string {
  switch (type) {
    case 'video': return 'VID';
    case 'image': return 'IMG';
    case 'audio': return 'SFX';
    case 'lut':   return 'LUT';
    default:      return 'FILE';
  }
}

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════
export default function LocalAssetBrowser({ sessionId, onImportComplete }: LocalAssetBrowserProps) {
  // ── State ────────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubfolder, setActiveSubfolder] = useState<string>('');
  const [browseData, setBrowseData] = useState<BrowseResponse | null>(null);
  const [categoryList, setCategoryList] = useState<CategoryListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null); // path of file being imported
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Fetch category listing (root) ──────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${FFMPEG_URL}/local-library/browse`);
      if (!res.ok) throw new Error('Failed to load library');
      const data = await res.json();
      setCategoryList(data.categories || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load library');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch files for a category (optionally with subfolder) ─
  const fetchCategory = useCallback(async (categoryId: string, subfolder = '') => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ category: categoryId });
      if (subfolder) params.set('subfolder', subfolder);
      const res = await fetch(`${FFMPEG_URL}/local-library/browse?${params}`);
      if (!res.ok) throw new Error('Failed to browse category');
      const data: BrowseResponse = await res.json();
      setBrowseData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to browse');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Import file into current session ────────────────────────
  const handleImport = useCallback(async (file: LibraryFile) => {
    if (!sessionId || importing) return;
    setImporting(file.path);
    try {
      const res = await fetch(`${FFMPEG_URL}/session/${sessionId}/import-from-library`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: file.path }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Import failed');
      }
      onImportComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(null);
    }
  }, [sessionId, importing, onImportComplete]);

  // ── Load categories on mount ────────────────────────────────
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Scroll to top when navigating
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeCategory, activeSubfolder]);

  // ── Navigation helpers ──────────────────────────────────────
  const goToCategory = useCallback((id: string) => {
    setActiveCategory(id);
    setActiveSubfolder('');
    setSearch('');
    fetchCategory(id);
  }, [fetchCategory]);

  const goToSubfolder = useCallback((folder: string) => {
    if (!activeCategory) return;
    setActiveSubfolder(folder);
    setSearch('');
    fetchCategory(activeCategory, folder);
  }, [activeCategory, fetchCategory]);

  const goBack = useCallback(() => {
    if (activeSubfolder) {
      // Go back to category root
      setActiveSubfolder('');
      if (activeCategory) fetchCategory(activeCategory);
    } else {
      // Go back to category list
      setActiveCategory(null);
      setBrowseData(null);
    }
    setSearch('');
  }, [activeSubfolder, activeCategory, fetchCategory]);

  // ── Filtered files ──────────────────────────────────────────
  const filteredFiles = browseData?.files.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const currentCategoryMeta = CATEGORIES.find(c => c.id === activeCategory);

  // ═════════════════════════════════════════════════════════════
  // Render
  // ═════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full bg-zinc-900/50">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/50">
        {activeCategory && (
          <button
            onClick={goBack}
            className="p-1 hover:bg-zinc-700/50 rounded transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        )}
        <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
          {currentCategoryMeta ? (
            <>
              <currentCategoryMeta.icon className="w-3 h-3" style={{ color: currentCategoryMeta.accentHex }} />
              {currentCategoryMeta.label}
              {activeSubfolder && (
                <>
                  <ChevronRight className="w-3 h-3 text-zinc-600" />
                  <span className="text-zinc-500 truncate max-w-[100px]">{activeSubfolder}</span>
                </>
              )}
            </>
          ) : (
            'My Library'
          )}
        </span>
        {browseData && (
          <span className="text-[10px] text-zinc-600 ml-auto">{browseData.total} files</span>
        )}
      </div>

      {/* ── Search (when browsing a category) ───────────────── */}
      {activeCategory && (
        <div className="px-3 py-1.5 border-b border-zinc-800/30">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter files..."
              className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded pl-7 pr-2 py-1 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        {/* Error state */}
        {error && (
          <div className="p-3">
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
              {error}
              <button
                onClick={() => { setError(null); activeCategory ? fetchCategory(activeCategory, activeSubfolder) : fetchCategories(); }}
                className="ml-2 text-red-300 underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
          </div>
        )}

        {/* ── Category Grid (root) ───────────────────────── */}
        {!loading && !activeCategory && categoryList && (
          <div className="p-2 grid grid-cols-2 gap-2">
            {CATEGORIES.map(cat => {
              const serverCat = categoryList.find(c => c.id === cat.id);
              const count = serverCat?.fileCount ?? 0;
              return (
                <button
                  key={cat.id}
                  onClick={() => goToCategory(cat.id)}
                  className="group relative flex flex-col items-center justify-center gap-1.5 aspect-[4/3] bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/40 hover:border-zinc-600/60 rounded-lg transition-all duration-200 overflow-hidden"
                >
                  {/* Subtle glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: `radial-gradient(circle at center, ${cat.accentHex}08 0%, transparent 70%)`,
                    }}
                  />
                  <cat.icon
                    className="w-6 h-6 transition-colors duration-200"
                    style={{ color: `${cat.accentHex}99` }}
                  />
                  <span className="text-[11px] font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
                    {cat.label}
                  </span>
                  {count > 0 && (
                    <span className="text-[9px] text-zinc-600">{count} files</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Subfolder list + Files ─────────────────────── */}
        {!loading && activeCategory && browseData && (
          <div className="p-2 space-y-2">
            {/* Subfolders (only at category root) */}
            {!activeSubfolder && browseData.subfolders.length > 0 && (
              <div className="space-y-1">
                {browseData.subfolders.map(folder => (
                  <button
                    key={folder}
                    onClick={() => goToSubfolder(folder)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-700/30 hover:border-zinc-600/50 rounded-lg transition-colors group text-left"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-400 flex-shrink-0" />
                    <span className="text-xs text-zinc-300 group-hover:text-zinc-100 truncate">{folder}</span>
                    <ChevronRight className="w-3 h-3 text-zinc-600 ml-auto flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* File grid */}
            {filteredFiles.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5">
                {filteredFiles.map(file => (
                  <LibraryFileCard
                    key={file.path}
                    file={file}
                    categoryMeta={currentCategoryMeta!}
                    isImporting={importing === file.path}
                    onImport={() => handleImport(file)}
                    disabled={!sessionId || !!importing}
                  />
                ))}
              </div>
            ) : (
              !loading && browseData.subfolders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-zinc-600">
                  <FolderOpen className="w-6 h-6 mb-1.5" />
                  <span className="text-xs">{search ? 'No matching files' : 'Empty folder'}</span>
                </div>
              )
            )}
          </div>
        )}

        {/* No session warning */}
        {!sessionId && !loading && (
          <div className="px-3 py-6 text-center">
            <p className="text-[11px] text-zinc-500">
              Drop footage onto the timeline first to start a session, then import library assets.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// File Card (thumbnail + import button)
// ═══════════════════════════════════════════════════════════════════
interface LibraryFileCardProps {
  file: LibraryFile;
  categoryMeta: CategoryMeta;
  isImporting: boolean;
  onImport: () => void;
  disabled: boolean;
}

function LibraryFileCard({ file, categoryMeta, isImporting, onImport, disabled }: LibraryFileCardProps) {
  const [thumbError, setThumbError] = useState(false);
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const Icon = categoryMeta.icon;

  const isMedia = file.type === 'video' || file.type === 'image';
  const showThumb = isMedia && !thumbError;

  return (
    <div
      className={`group relative aspect-video bg-zinc-800/80 rounded-lg overflow-hidden border transition-all duration-150 ${
        isImporting
          ? 'border-yellow-500/50 ring-1 ring-yellow-500/20'
          : 'border-zinc-700/30 hover:border-zinc-600/50'
      }`}
    >
      {/* Thumbnail or icon fallback */}
      {showThumb ? (
        <>
          {!thumbLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
              <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />
            </div>
          )}
          <img
            src={file.thumbnailUrl}
            alt={file.name}
            className={`w-full h-full object-cover transition-opacity duration-200 ${thumbLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            draggable={false}
            onLoad={() => setThumbLoaded(true)}
            onError={() => setThumbError(true)}
          />
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Icon className="w-6 h-6" style={{ color: `${categoryMeta.accentHex}66` }} />
        </div>
      )}

      {/* Type badge */}
      <div
        className={`absolute top-1 left-1 px-1.5 py-0.5 rounded bg-gradient-to-r ${categoryMeta.color} text-[8px] font-bold uppercase tracking-wider`}
      >
        {getFileTypeLabel(file.type)}
      </div>

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-1.5 py-1">
        <div className="text-[9px] text-white truncate leading-tight">{file.name}</div>
        <div className="text-[8px] text-zinc-400">{formatFileSize(file.size)}</div>
      </div>

      {/* Import overlay on hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-150 flex items-center justify-center">
        <button
          onClick={e => { e.stopPropagation(); onImport(); }}
          disabled={disabled}
          className={`opacity-0 group-hover:opacity-100 transition-all duration-150 px-2.5 py-1.5 rounded-md text-[10px] font-medium flex items-center gap-1.5 ${
            isImporting
              ? 'bg-yellow-600 text-white cursor-wait'
              : 'bg-white/90 text-zinc-900 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed'
          }`}
        >
          {isImporting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Download className="w-3 h-3" />
          )}
          {isImporting ? 'Importing...' : 'Import'}
        </button>
      </div>
    </div>
  );
}
