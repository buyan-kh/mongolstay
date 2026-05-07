import { notFound } from "next/navigation";
import { FlowProvider } from "@/components/flow-provider";
import { FlowShell } from "@/components/flow-shell";
import { isFlowKind } from "@/lib/flow-data";

export default async function FileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  if (!isFlowKind(kind)) notFound();

  return (
    <FlowProvider kind={kind}>
      <FlowShell kind={kind}>{children}</FlowShell>
    </FlowProvider>
  );
}
