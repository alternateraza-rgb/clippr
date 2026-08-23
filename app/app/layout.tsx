import { AppShell } from "@/components/app/AppShell";
import { ClipAutoDownload } from "@/components/app/ClipAutoDownload";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      {/* Renders finish long after you leave Studio; this catches them anywhere. */}
      <ClipAutoDownload />
      {children}
    </AppShell>
  );
}
