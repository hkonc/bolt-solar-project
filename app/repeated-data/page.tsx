import RepeatedDataForm from "./repeated-data-form";

export default function RepeatedDataPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">データ繰り返し取得</h1>
        <RepeatedDataForm />
      </div>
    </main>
  );
}