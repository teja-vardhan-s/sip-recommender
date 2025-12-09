import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileSidebar from "./MobileSidebar";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Desktop Sidebar */}
      <Sidebar
        collapsed={collapsed}
        toggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Mobile Drawer Sidebar */}
      <MobileSidebar open={sidebarOpen} close={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-6 flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
