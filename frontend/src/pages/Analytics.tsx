import { useState, useEffect } from "react";
import {
  FileText,
  MessageSquare,
  Layers,
  TrendingUp,
  Loader2,
  BarChart3,
  Target,
} from "lucide-react";
import {
  QueryVolumeChart,
  PopularDocsChart,
  DocTypesChart,
} from "../components/analytics/Charts";
import {
  getAnalyticsOverview,
  getQueryVolume,
  getPopularDocuments,
  getResponseQuality,
  getDocumentTypes,
} from "../lib/api";
import type {
  AnalyticsOverview,
  QueryVolumeItem,
  PopularDocument,
  ResponseQuality,
  DocumentTypeInfo,
} from "../lib/types";

export default function Analytics() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [queryVolume, setQueryVolume] = useState<QueryVolumeItem[]>([]);
  const [popularDocs, setPopularDocs] = useState<PopularDocument[]>([]);
  const [quality, setQuality] = useState<ResponseQuality | null>(null);
  const [docTypes, setDocTypes] = useState<DocumentTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [ov, qv, pd, rq, dt] = await Promise.all([
          getAnalyticsOverview().catch(() => null),
          getQueryVolume().catch(() => []),
          getPopularDocuments().catch(() => []),
          getResponseQuality().catch(() => null),
          getDocumentTypes().catch(() => []),
        ]);
        setOverview(ov);
        setQueryVolume(qv);
        setPopularDocs(pd);
        setQuality(rq);
        setDocTypes(dt);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor usage, quality metrics, and knowledge base health
        </p>
      </div>

      {/* Overview Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<FileText className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-100"
          label="Documents"
          value={overview?.totalDocuments ?? 0}
          sub={`${overview?.readyDocuments ?? 0} ready`}
        />
        <StatCard
          icon={<Layers className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-100"
          label="Total Chunks"
          value={overview?.totalChunks ?? 0}
        />
        <StatCard
          icon={<MessageSquare className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-100"
          label="Total Queries"
          value={overview?.totalQueries ?? 0}
          sub={`${overview?.totalSessions ?? 0} sessions`}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-orange-600" />}
          iconBg="bg-orange-100"
          label="Citations"
          value={overview?.totalCitations ?? 0}
        />
      </div>

      {/* Quality Metrics */}
      {quality && (
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium uppercase text-gray-400">
                Answer Rate
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {Math.round(quality.answerRate * 100)}%
            </p>
            <p className="text-xs text-gray-500">
              {quality.answeredWithSources} / {quality.totalQueries} answered
              with sources
            </p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium uppercase text-gray-400">
                Avg Citations / Answer
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {quality.avgCitationsPerAnswer}
            </p>
            <p className="text-xs text-gray-500">
              Sources referenced per response
            </p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-medium uppercase text-gray-400">
                Avg Relevance Score
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {Math.round(quality.avgRelevanceScore * 100)}%
            </p>
            <p className="text-xs text-gray-500">
              Vector similarity of retrieved chunks
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <QueryVolumeChart data={queryVolume} />
        <PopularDocsChart data={popularDocs} />
        <DocTypesChart data={docTypes} />
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number;
  sub?: string;
}

function StatCard({ icon, iconBg, label, value, sub }: StatCardProps) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`rounded-lg p-2.5 ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">
          {value.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500">{label}</p>
        {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}
