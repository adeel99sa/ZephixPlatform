import { useState } from "react";
import type { ReactElement } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";

import { SettingsPageHeader } from "../components/ui/SettingsPageHeader";
import { InviteMembersModal } from "../components/InviteMembersModal";
import { MembersTable } from "../components/MembersTable";

const tabClass = ({ selected }: { selected: boolean }) =>
  selected
    ? "border-b-2 border-indigo-600 pb-2 text-sm font-medium text-indigo-600"
    : "border-b-2 border-transparent pb-2 text-sm text-slate-500 hover:text-slate-700";

export default function MembersSettings(): ReactElement {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div data-settings-members>
      <SettingsPageHeader
        title="Members & Roles"
        description="Preview layout with sample members — not live workspace data from the server."
      />

      <TabGroup>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabList className="flex flex-wrap gap-6 border-b border-slate-200">
            <Tab className={tabClass}>Full Members (sample)</Tab>
            <Tab className={tabClass}>Guests (sample)</Tab>
            <Tab className={tabClass}>Pending invites (sample)</Tab>
          </TabList>
          <button
            type="button"
            className="shrink-0 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={() => setInviteOpen(true)}
          >
            Open invite preview
          </button>
        </div>

        <TabPanels>
          <TabPanel>
            <MembersTable variant="members" />
          </TabPanel>
          <TabPanel>
            <MembersTable variant="guests" />
          </TabPanel>
          <TabPanel>
            <MembersTable variant="pending" />
          </TabPanel>
        </TabPanels>
      </TabGroup>

      <InviteMembersModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
