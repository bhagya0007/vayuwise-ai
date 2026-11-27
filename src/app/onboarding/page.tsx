import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default function OnboardingPage() {
  return (
    <WorkspaceShell>
      <OnboardingWizard />
    </WorkspaceShell>
  );
}
