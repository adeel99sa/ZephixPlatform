import { NavLink } from "react-router-dom";

export default function AdminHomePage(){
  return (
    <div data-testid="admin-home" className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Administration</h1>
      <div className="grid grid-cols-2 gap-4">
        <NavLink to="/admin/users" className="card p-4 text-center">Users</NavLink>
        <NavLink to="/admin/workspaces" className="card p-4 text-center">Workspaces</NavLink>
        <NavLink to="/admin/templates" className="card p-4 text-center">Templates</NavLink>
        <NavLink to="/admin/trash" className="card p-4 text-center">Trash</NavLink>
      </div>
    </div>
  );
}

