import DatabaseManager from "./database-manager";

export default function DatabasePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">データベース管理</h1>
        <DatabaseManager />
      </div>
    </main>
  );
}