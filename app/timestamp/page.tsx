import TimestampForm from "./timestamp-form";

export default function TimestampPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">タイムスタンプ変換</h1>
        <TimestampForm />
      </div>
    </main>
  );
}