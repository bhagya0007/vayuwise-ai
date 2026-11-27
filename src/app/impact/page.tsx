import { Suspense } from "react";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { ImpactView } from "@/components/modules/ImpactView";
import { Skeleton } from "@/components/ui/skeleton";

export default function ImpactPage() {
  return (
    <WorkspaceShell>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-3xl" />}>
        <ImpactView />
      </Suspense>
    </WorkspaceShell>
  );
}
