import DataOnlyForm from "./data-only-form";

export default function DataOnlyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">データだけ取得</h1>
        <DataOnlyForm />
      </div>
    </main>
  );
}