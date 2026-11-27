import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { SettingsView } from "@/components/settings/SettingsView";

export default function SettingsPage() {
  return (
    <WorkspaceShell>
      <SettingsView />
    </WorkspaceShell>
  );
}
