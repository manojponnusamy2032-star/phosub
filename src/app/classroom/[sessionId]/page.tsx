import ClassroomDisplay from "@/components/classroom-display";

export const dynamic = "force-dynamic";

export default async function ClassroomPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <ClassroomDisplay sessionId={sessionId} />;
}