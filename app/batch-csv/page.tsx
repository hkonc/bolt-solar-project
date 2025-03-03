import BatchCsvForm from "./batch-csv-form";

export default function BatchCsvPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">一括CSV作成</h1>
        <BatchCsvForm />
      </div>
    </main>
  );
}