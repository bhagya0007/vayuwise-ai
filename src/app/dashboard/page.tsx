import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { DashboardView } from "@/components/dashboard/DashboardView";

export default function DashboardPage() {
  return (
    <WorkspaceShell>
      <DashboardView />
    </WorkspaceShell>
  );
}
