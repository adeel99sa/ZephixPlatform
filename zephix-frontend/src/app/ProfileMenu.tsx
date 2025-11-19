import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useState } from 'react';

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const logout = useAuthStore(s => s.logout);

  const go = (path: string) => { setOpen(false); nav(path); };

  return (
    <div className="relative">
      <button className="h-9 w-9 rounded-full bg-gray-200" onClick={() => setOpen(v => !v)} />
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow">
          <Item onClick={() => go('/settings?tab=account')}>My Account</Item>
          <Item onClick={() => go('/settings?tab=organization')}>Organization Settings</Item>
          <Item onClick={() => go('/settings?tab=workspace')}>Workspace Settings</Item>
          <Item onClick={() => go('/settings?tab=keys')}>API Keys</Item>
          <div className="h-px bg-gray-100 my-1" />
          <Item onClick={() => go('/admin')}>Administration</Item>
          <Item onClick={() => go('/hub')}>Switch Workspace…</Item>
          <Item onClick={logout} className="text-red-600">Sign Out</Item>
        </div>
      )}
    </div>
  );
}

function Item({ children, onClick, className = '' }:{children: React.ReactNode; onClick:()=>void; className?:string}) {
  return <button onClick={onClick} className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${className}`}>{children}</button>;
}
