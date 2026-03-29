import { useState } from "react";
import { Settings as SettingsIcon, Save, RotateCcw, Info } from "lucide-react";
import type { AppSettings } from "../lib/types";

const DEFAULT_SETTINGS: AppSettings = {
  chunkSize: 512,
  chunkOverlap: 50,
  topK: 5,
  scoreThreshold: 0.0,
};

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem("documind-settings");
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem("documind-settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem("documind-settings");
  };

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-lg bg-gray-100 p-2.5">
          <SettingsIcon className="h-6 w-6 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">
            Configure RAG pipeline parameters
          </p>
        </div>
      </div>

      {/* Document Processing Settings */}
      <section className="card mb-6 p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Document Processing
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          Configure how documents are split into chunks for embedding and retrieval.
        </p>

        <div className="space-y-6">
          {/* Chunk Size */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
              Chunk Size (characters)
              <Tooltip text="Number of characters per text chunk. Larger chunks provide more context but may reduce precision." />
            </label>
            <input
              type="range"
              min={128}
              max={2048}
              step={64}
              value={settings.chunkSize}
              onChange={(e) =>
                updateSetting("chunkSize", Number(e.target.value))
              }
              className="w-full accent-brand-600"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>128</span>
              <span className="font-medium text-brand-600">
                {settings.chunkSize}
              </span>
              <span>2048</span>
            </div>
          </div>

          {/* Chunk Overlap */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
              Chunk Overlap (characters)
              <Tooltip text="Number of overlapping characters between consecutive chunks. Helps maintain context across chunk boundaries." />
            </label>
            <input
              type="range"
              min={0}
              max={256}
              step={10}
              value={settings.chunkOverlap}
              onChange={(e) =>
                updateSetting("chunkOverlap", Number(e.target.value))
              }
              className="w-full accent-brand-600"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>0</span>
              <span className="font-medium text-brand-600">
                {settings.chunkOverlap}
              </span>
              <span>256</span>
            </div>
          </div>
        </div>
      </section>

      {/* Retrieval Settings */}
      <section className="card mb-6 p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Retrieval Parameters
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          Control how many and which chunks are retrieved for answering questions.
        </p>

        <div className="space-y-6">
          {/* Top K */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
              Top K Results
              <Tooltip text="Maximum number of document chunks to retrieve per query. More results provide broader context." />
            </label>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={settings.topK}
              onChange={(e) => updateSetting("topK", Number(e.target.value))}
              className="w-full accent-brand-600"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>1</span>
              <span className="font-medium text-brand-600">{settings.topK}</span>
              <span>20</span>
            </div>
          </div>

          {/* Score Threshold */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
              Minimum Relevance Score
              <Tooltip text="Minimum similarity score (0-100%) for a chunk to be included. Higher values return only highly relevant results." />
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(settings.scoreThreshold * 100)}
              onChange={(e) =>
                updateSetting("scoreThreshold", Number(e.target.value) / 100)
              }
              className="w-full accent-brand-600"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>0%</span>
              <span className="font-medium text-brand-600">
                {Math.round(settings.scoreThreshold * 100)}%
              </span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Embedding Model Info */}
      <section className="card mb-6 p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Embedding Model
        </h2>
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-500">Model</p>
              <p className="text-gray-900">all-MiniLM-L6-v2</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">Dimensions</p>
              <p className="text-gray-900">384</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">Max Sequence Length</p>
              <p className="text-gray-900">256 tokens</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">Vector Store</p>
              <p className="text-gray-900">ChromaDB (local)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} className="btn-primary">
          <Save className="h-4 w-4" />
          Save Settings
        </button>
        <button onClick={handleReset} className="btn-secondary">
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </button>
        {saved && (
          <span className="animate-fade-in text-sm font-medium text-green-600">
            Settings saved!
          </span>
        )}
      </div>
    </div>
  );
}

function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative">
      <Info className="h-3.5 w-3.5 text-gray-400" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-lg bg-gray-900 p-2.5 text-xs font-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}
