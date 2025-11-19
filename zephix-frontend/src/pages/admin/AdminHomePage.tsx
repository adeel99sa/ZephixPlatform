import { NavLink } from "react-router-dom";

export default function AdminHomePage(){
  return (
    <div data-testid="admin-home" className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Administration</h1>
      <div className="grid grid-cols-2 gap-4">
        <NavLink to="/admin/teams" className="card p-4 text-center">Teams</NavLink>
        <NavLink to="/admin/invite" className="card p-4 text-center">Invite</NavLink>
        <NavLink to="/admin/archive" className="card p-4 text-center">Archive</NavLink>
        <NavLink to="/admin/trash" className="card p-4 text-center">Trash</NavLink>
      </div>
    </div>
  );
}

