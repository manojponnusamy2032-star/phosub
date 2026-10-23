import StudentForm from "@/components/student-form";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <StudentForm sessionId={sessionId} />;
}