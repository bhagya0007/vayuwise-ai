import { AssistantView } from "@/components/assistant/AssistantView";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";

export default function AssistantPage() {
  return (
    <WorkspaceShell>
      <AssistantView />
    </WorkspaceShell>
  );
}
