import DataRetrievalForm from "./data-retrieval-form";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">発電量データ取得</h1>
        <DataRetrievalForm />
      </div>
    </main>
  );
}