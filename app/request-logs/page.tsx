import RequestLogsViewer from "./request-logs-viewer";

export default function RequestLogsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">リクエスト履歴</h1>
        <RequestLogsViewer />
      </div>
    </main>
  );
}