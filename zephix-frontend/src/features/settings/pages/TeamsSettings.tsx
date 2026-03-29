import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { MoreHorizontal } from "lucide-react";

import { SettingsPageHeader } from "../components/ui/SettingsPageHeader";

import { Input } from "@/components/ui/input/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/overlay/Modal";
import { cn } from "@/lib/utils";


type TeamCardModel = {
  id: string;
  name: string;
  memberCount: number;
  leadName: string;
  /** Up to 3 initials for overlapping avatars */
  previewInitials: [string, string?, string?];
};

const MOCK_TEAMS: TeamCardModel[] = [
  {
    id: "t1",
    name: "Frontend Engineering",
    memberCount: 8,
    leadName: "Sarah Connor",
    previewInitials: ["SC", "MW", "DA"],
  },
  {
    id: "t2",
    name: "Marketing",
    memberCount: 5,
    leadName: "Jordan Lee",
    previewInitials: ["JL", "AR"],
  },
  {
    id: "t3",
    name: "Enterprise Portfolio Operations",
    memberCount: 12,
    leadName: "Priya Nandakumar",
    previewInitials: ["PN", "SC", "RC"],
  },
];

export default function TeamsSettings(): ReactElement {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const trimmedTeamName = newTeamName.trim();
  const canCreateTeam = trimmedTeamName.length > 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MOCK_TEAMS;
    return MOCK_TEAMS.filter((t) => t.name.toLowerCase().includes(q));
  }, [search]);

  return (
    <div data-settings-teams>
      <SettingsPageHeader
        title="Teams"
        description="Group members into teams for resource allocation and capacity planning."
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          className="max-w-md"
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search teams"
        />
        <Button
          type="button"
          variant="primary"
          className="shrink-0 bg-indigo-600 hover:bg-indigo-700"
          onClick={() => {
            setNewTeamName("");
            setCreateOpen(true);
          }}
        >
          Create Team
        </Button>
      </div>

      <ul className="flex flex-col gap-0 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {filtered.map((team) => (
          <li
            key={team.id}
            className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="text-base font-medium text-slate-900">{team.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2" aria-hidden>
                    {team.previewInitials
                      .filter(Boolean)
                      .map((ini, i) => (
                        <span
                          key={`${team.id}-av-${i}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-indigo-100 text-[10px] font-bold text-indigo-800"
                        >
                          {ini}
                        </span>
                      ))}
                  </div>
                  <span className="text-sm text-slate-600">
                    {team.memberCount} members
                  </span>
                </div>
                <span className="text-sm text-slate-500">
                  Lead: <span className="font-medium text-slate-700">{team.leadName}</span>
                </span>
              </div>
            </div>

            <div className="relative inline-block self-end sm:self-center">
              <Menu>
              <MenuButton
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                aria-label={`Actions for ${team.name}`}
              >
                <MoreHorizontal className="h-5 w-5" />
              </MenuButton>
              <MenuItems
                anchor="bottom end"
                modal={false}
                className="z-50 mt-1 w-40 origin-top-right rounded-md border border-slate-200 bg-white py-1 shadow-lg outline-none"
              >
                <MenuItem>
                  {({ focus }) => (
                    <button
                      type="button"
                      className={cn(
                        "block w-full px-3 py-2 text-left text-sm text-slate-700",
                        focus && "bg-slate-50",
                      )}
                    >
                      Edit team
                    </button>
                  )}
                </MenuItem>
                <MenuItem>
                  {({ focus }) => (
                    <button
                      type="button"
                      className={cn(
                        "block w-full px-3 py-2 text-left text-sm text-red-600",
                        focus && "bg-red-50",
                      )}
                    >
                      Delete team
                    </button>
                  )}
                </MenuItem>
              </MenuItems>
              </Menu>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        isOpen={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setNewTeamName("");
        }}
        title="Create team"
        size="md"
      >
        <p className="text-sm text-slate-500">
          Teams are used as resource pools for the capacity engine. No data is saved yet.
        </p>
        <div className="mt-4">
          <label htmlFor="new-team-name" className="text-sm font-medium text-slate-900">
            Team name
          </label>
          <Input
            id="new-team-name"
            className="mt-1"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="e.g. Platform Engineering"
            aria-describedby="new-team-name-hint"
          />
          <p
            id="new-team-name-hint"
            className={cn(
              "mt-1 text-xs",
              canCreateTeam ? "text-slate-500" : "text-red-600",
            )}
          >
            {canCreateTeam
              ? "Name will be shown across capacity and allocation views."
              : "Enter a team name to create a team."}
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setCreateOpen(false);
              setNewTeamName("");
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={!canCreateTeam}
            onClick={() => setCreateOpen(false)}
          >
            Create Team
          </Button>
        </div>
      </Modal>
    </div>
  );
}
