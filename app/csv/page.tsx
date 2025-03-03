import CsvConversionForm from "./csv-conversion-form";

export default function CsvPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">CSV化</h1>
        <CsvConversionForm />
      </div>
    </main>
  );
}