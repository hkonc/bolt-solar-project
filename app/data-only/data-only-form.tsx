"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSettings, logRequest } from "@/lib/storage";
import { ApiResponse, RequestLog } from "@/lib/types";

export default function DataOnlyForm() {
  const [jsonData, setJsonData] = useState("");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const settings = getSettings();
    
    if (!settings) {
      toast.error("設定が見つかりません。設定ページで設定を行ってください。");
      return;
    }
    
    if (!settings.endpointUrl) {
      toast.error("エンドポイントURLが設定されていません。");
      return;
    }
    
    if (!settings.apiKey) {
      toast.error("APIキーが設定されていません。");
      return;
    }
    
    if (!jsonData) {
      toast.error("JSONデータを入力してください。");
      return;
    }
    
    try {
      // Validate JSON data
      const parsedData = JSON.parse(jsonData);
      
      setIsLoading(true);
      
      // Create request log
      const requestLog: RequestLog = {
        timestamp: Date.now(),
        url: settings.endpointUrl,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ND-TOKEN": "********" // Mask API key for security
        },
        body: parsedData
      };
      
      // Send POST request
      const response = await fetch(settings.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ND-TOKEN": settings.apiKey,
        },
        body: JSON.stringify(parsedData),
      });
      
      // Update request log with response status
      requestLog.status = response.status;
      
      if (!response.ok) {
        const errorMessage = `API request failed with status ${response.status}`;
        requestLog.error = errorMessage;
        logRequest(requestLog);
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      setResponse(responseData);
      
      // Update request log with response data
      requestLog.response = responseData;
      logRequest(requestLog);
      
      toast.success("データを取得しました。");
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "不明なエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>データだけ取得フォーム</CardTitle>
          <CardDescription>
            JSONデータを入力し、データを取得してください。ファイルには保存されません。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Textarea
                id="jsonData"
                placeholder='例: {"date": "2025-01-01", "location": "Tokyo"}'
                rows={8}
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                className="font-mono"
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "取得中..." : "データを取得"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {response && (
        <Card>
          <CardHeader>
            <CardTitle>レスポンス結果</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto max-h-96 font-mono text-sm">
              {JSON.stringify(response, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}