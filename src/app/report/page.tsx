import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { PrintableReportView } from "@/components/report/PrintableReportView";

export default function ReportPage() {
  return (
    <WorkspaceShell>
      <PrintableReportView />
    </WorkspaceShell>
  );
}
