"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { getRequestLogs, clearRequestLogs } from "@/lib/storage";
import { RequestLog } from "@/lib/types";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function RequestLogsViewer() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    setIsLoading(true);
    try {
      const requestLogs = getRequestLogs();
      setLogs(requestLogs.reverse()); // Show newest first
    } catch (error) {
      console.error("Error loading logs:", error);
      toast.error("ログの読み込み中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearLogs = () => {
    if (window.confirm("すべてのリクエスト履歴を削除してもよろしいですか？この操作は元に戻せません。")) {
      try {
        clearRequestLogs();
        setLogs([]);
        toast.success("リクエスト履歴を削除しました。");
      } catch (error) {
        console.error("Error clearing logs:", error);
        toast.error("ログの削除中にエラーが発生しました。");
      }
    }
  };

  const downloadLogs = () => {
    try {
      // Format logs for better readability in text format
      let textContent = "# リクエスト履歴ログ\n\n";
      
      logs.forEach((log, index) => {
        const date = new Date(log.timestamp);
        const formattedDate = format(date, "yyyy年MM月dd日 HH:mm:ss", { locale: ja });
        
        textContent += `## リクエスト #${logs.length - index}\n`;
        textContent += `日時: ${formattedDate}\n`;
        textContent += `URL: ${log.url}\n`;
        textContent += `メソッド: ${log.method}\n`;
        textContent += `ステータス: ${log.status || "不明"}\n\n`;
        
        textContent += "### リクエストヘッダー\n";
        textContent += "```\n";
        for (const [key, value] of Object.entries(log.headers)) {
          textContent += `${key}: ${value}\n`;
        }
        textContent += "```\n\n";
        
        textContent += "### リクエストボディ\n";
        textContent += "```json\n";
        textContent += JSON.stringify(log.body, null, 2);
        textContent += "\n```\n\n";
        
        if (log.error) {
          textContent += "### エラー\n";
          textContent += `${log.error}\n\n`;
        } else if (log.response) {
          textContent += "### レスポンス\n";
          textContent += "```json\n";
          textContent += JSON.stringify(log.response, null, 2);
          textContent += "\n```\n\n";
        }
        
        textContent += "---\n\n";
      });
      
      // Create and download the file
      const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `request_logs_${format(new Date(), "yyyyMMdd_HHmmss")}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("リクエスト履歴をダウンロードしました。");
    } catch (error) {
      console.error("Error downloading logs:", error);
      toast.error("ログのダウンロード中にエラーが発生しました。");
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>リクエスト履歴</CardTitle>
          <CardDescription>
            これまでに送信されたAPIリクエストの履歴を表示します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-6">
            <Button onClick={loadLogs} variant="outline">
              更新
            </Button>
            <div className="space-x-2">
              <Button 
                onClick={downloadLogs} 
                variant="secondary"
                disabled={logs.length === 0}
              >
                ログをダウンロード
              </Button>
              <Button 
                onClick={handleClearLogs} 
                variant="destructive"
                disabled={logs.length === 0}
              >
                履歴を削除
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p>読み込み中...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 border rounded-md">
              <p className="text-muted-foreground">リクエスト履歴がありません。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log, index) => {
                const date = new Date(log.timestamp);
                const formattedDate = format(date, "yyyy年MM月dd日 HH:mm:ss", { locale: ja });
                
                return (
                  <details key={index} className="border rounded-md">
                    <summary className="p-3 font-medium cursor-pointer hover:bg-muted flex justify-between items-center">
                      <div>
                        <span className="mr-2">
                          {log.method} リクエスト
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          log.status && log.status >= 200 && log.status < 300 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status || "不明"}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formattedDate}
                      </span>
                    </summary>
                    <div className="p-4 border-t space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold mb-1">URL</h4>
                        <p className="text-sm break-all bg-muted p-2 rounded">{log.url}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold mb-1">リクエストヘッダー</h4>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                          {Object.entries(log.headers).map(([key, value]) => (
                            `${key}: ${value}\n`
                          ))}
                        </pre>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold mb-1">リクエストボディ</h4>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(log.body, null, 2)}
                        </pre>
                      </div>
                      
                      {log.error ? (
                        <div>
                          <h4 className="text-sm font-semibold mb-1 text-destructive">エラー</h4>
                          <p className="text-sm text-destructive">{log.error}</p>
                        </div>
                      ) : log.response ? (
                        <div>
                          <h4 className="text-sm font-semibold mb-1">レスポンス</h4>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-60">
                            {JSON.stringify(log.response, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            合計 {logs.length} 件のリクエスト履歴があります。
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}