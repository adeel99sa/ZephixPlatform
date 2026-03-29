import { NavLink } from "react-router-dom";

type SidebarItemProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
};

export function SidebarItem({ to, icon, label }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
          isActive
            ? "bg-blue-50 font-semibold text-blue-700"
            : "text-slate-700 hover:bg-slate-100"
        }`
      }
    >
      <span className="inline-flex h-4 w-4 items-center justify-center">{icon}</span>
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

