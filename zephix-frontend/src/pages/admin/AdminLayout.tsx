import { Outlet, NavLink } from "react-router-dom";

const nav = [
  { to: "/admin/users", label: "Users" },
  { to: "/admin/departments", label: "Departments" },
  { to: "/admin/billing", label: "Billing" },
  { to: "/admin/permissions", label: "Permissions" },
  { to: "/admin/trash", label: "Trash" },
];

export default function AdminLayout() {
  return (
    <div className="grid grid-cols-12 gap-6">
      <aside className="col-span-12 md:col-span-3">
        <ul className="space-y-1">
          {nav.map(n => (
            <li key={n.to}>
              <NavLink className="block rounded px-3 py-2 hover:bg-slate-50" to={n.to}>
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>
      <main className="col-span-12 md:col-span-9"><Outlet /></main>
    </div>
  );
}