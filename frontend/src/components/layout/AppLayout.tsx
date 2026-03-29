import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import DemoBanner from "../DemoBanner";

export default function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-64">
        <DemoBanner />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
