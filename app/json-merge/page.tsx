import JsonMergeForm from "./json-merge-form";

export default function JsonMergePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">JSONデータ結合テスト</h1>
        <JsonMergeForm />
      </div>
    </main>
  );
}