import SettingsForm from "./settings-form";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">設定</h1>
        <SettingsForm />
      </div>
    </main>
  );
}