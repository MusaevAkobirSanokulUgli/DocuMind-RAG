import { NavLink } from "react-router-dom";
import {
  MessageSquare,
  Upload,
  Database,
  BarChart3,
  Settings,
  FileText,
} from "lucide-react";

const navItems = [
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/knowledge-base", label: "Knowledge Base", icon: Database },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">DocuMind</h1>
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            RAG Document Q&A
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-500">Powered by</p>
          <p className="text-xs text-gray-400">
            sentence-transformers + ChromaDB
          </p>
        </div>
      </div>
    </aside>
  );
}
