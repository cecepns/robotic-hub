
import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Activities from './pages/Activities';
import Learning from './pages/Learning';
import Attendance from './pages/Attendance';
import Gallery from './pages/Gallery';
import AdminPanel from './pages/AdminPanel';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { User } from './types';
import { setOnUnauthorized, clearAuth } from './utils/api';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('robo_hub_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setOnUnauthorized(() => setUser(null));
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('robo_hub_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('robo_hub_user');
    }
  }, [user]);

  const handleSetTab = (tab: string) => {
    setCurrentTab(tab);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setCurrentTab('dashboard');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard isAdmin={user.role === 'ADMIN'} />;
      case 'profile': return <Profile isAdmin={user.role === 'ADMIN'} />;
      case 'activities': return <Activities isAdmin={user.role === 'ADMIN'} />;
      case 'learning': return <Learning isAdmin={user.role === 'ADMIN'} />;
      case 'attendance': return <Attendance isAdmin={user.role === 'ADMIN'} currentUserId={user.id} />;
      case 'gallery': return <Gallery isAdmin={user.role === 'ADMIN'} />;
      case 'admin': return user.role === 'ADMIN' ? <AdminPanel /> : <Dashboard isAdmin={false} />;
      default: return <Dashboard isAdmin={user.role === 'ADMIN'} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar 
        isOpen={isSidebarOpen} 
        activeTab={currentTab} 
        setTab={handleSetTab} 
        role={user.role} 
        onLogout={handleLogout}
      />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 w-full ${isSidebarOpen ? 'lg:ml-64' : 'ml-0 lg:ml-64'}`}>
        <Navbar 
          user={user} 
          onUpdateUser={handleUpdateUser}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          isSidebarOpen={isSidebarOpen} 
        />
        <main className="p-4 md:p-6 lg:p-10 mt-16 max-w-7xl mx-auto w-full overflow-x-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
