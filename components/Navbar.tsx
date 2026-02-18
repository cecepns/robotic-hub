
import React, { useRef } from 'react';
import { User } from '../types';

interface NavbarProps {
  user: User;
  onUpdateUser: (user: User) => void;
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ user, onUpdateUser, toggleSidebar }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const updated = await import('../utils/api').then(m => m.api.patchMeAvatar(formData));
      onUpdateUser({
        ...user,
        avatar: updated.avatar
      });
    } catch (_) {
      // ignore or toast
    }
    e.target.value = '';
  };

  return (
    <nav className="fixed top-0 right-0 left-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-40 h-16 flex items-center px-4 md:px-6 justify-between shadow-sm">
      <div className="flex items-center gap-2 sm:gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-slate-100 rounded-xl lg:hidden text-slate-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h10m-10 6h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-1.5 rounded-lg shadow-sm">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2"></rect>
              <circle cx="12" cy="5" r="2"></circle>
              <path d="M12 7v4"></path>
              <line x1="8" y1="16" x2="8" y2="16"></line>
              <line x1="16" y1="16" x2="16" y2="16"></line>
            </svg>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tighter hidden xs:block">
            Robo <span className="text-blue-600">Hub</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-black text-slate-900 leading-none">{user.name}</p>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{user.role}</p>
        </div>
        <div 
          onClick={handleAvatarClick}
          className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 cursor-pointer overflow-hidden hover:ring-4 hover:ring-blue-500/10 transition-all shadow-sm group"
          title="Klik untuk ubah profil"
        >
          {user.avatar ? (
            <img src={user.avatar} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="Profile" />
          ) : (
            <span className="text-slate-400 group-hover:text-blue-600">{user.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileChange} 
        />
      </div>
    </nav>
  );
};

export default Navbar;
