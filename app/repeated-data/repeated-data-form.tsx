"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSettings, logRequest } from "@/lib/storage";
import { ApiResponse, RequestLog } from "@/lib/types";

export default function RepeatedDataForm() {
  const [deviceUuid, setDeviceUuid] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [sequenceNumber, setSequenceNumber] = useState("1");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [nextValue, setNextValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isContinuousLoading, setIsContinuousLoading] = useState(false);
  const [allResponses, setAllResponses] = useState<ApiResponse[]>([]);
  const [continuousProgress, setContinuousProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [currentSequence, setCurrentSequence] = useState(1);

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
    
    if (!deviceUuid) {
      toast.error("DeviceUuidを入力してください。");
      return;
    }
    
    if (!startTime) {
      toast.error("startTimeを入力してください。");
      return;
    }
    
    if (!endTime) {
      toast.error("endTimeを入力してください。");
      return;
    }
    
    try {
      // Create request data
      const requestData = {
        deviceUuid: deviceUuid,
        scopes: [
          "normalUsage",
          "reverseUsage",
          "instanceElectricity"
        ],
        startTime: parseInt(startTime, 10),
        endTime: parseInt(endTime, 10)
      };
      
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
        body: requestData
      };
      
      // Send POST request
      const response = await fetch(settings.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ND-TOKEN": settings.apiKey,
        },
        body: JSON.stringify(requestData),
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
      
      // Check if "next" key exists in the response
      if (responseData && responseData.next !== undefined) {
        setNextValue(responseData.next !== null ? responseData.next.toString() : null);
      } else {
        setNextValue(null);
      }
      
      toast.success("データを取得しました。");
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "不明なエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinuousRetrieval = async () => {
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
    
    if (!deviceUuid) {
      toast.error("DeviceUuidを入力してください。");
      return;
    }
    
    if (!startTime) {
      toast.error("startTimeを入力してください。");
      return;
    }
    
    if (!endTime) {
      toast.error("endTimeを入力してください。");
      return;
    }
    
    if (!sequenceNumber || isNaN(parseInt(sequenceNumber, 10))) {
      toast.error("連番の開始番号を正しく入力してください。");
      return;
    }
    
    try {
      setIsContinuousLoading(true);
      setAllResponses([]);
      setContinuousProgress({ current: 0, total: 0 });
      
      // Set the initial sequence number
      const initialSequence = parseInt(sequenceNumber, 10);
      setCurrentSequence(initialSequence);
      
      const originalStartTime = parseInt(startTime, 10);
      const finalEndTime = parseInt(endTime, 10);
      let nextVal: number | null = null;
      let requestCount = 0;
      let allCollectedResponses: ApiResponse[] = [];
      
      toast.info("連続データ取得を開始します...");
      
      do {
        requestCount++;
        setContinuousProgress({ current: requestCount, total: 0 });
        
        // Create request data - always use the original startTime
        const requestData: any = {
          deviceUuid: deviceUuid,
          scopes: [
            "normalUsage",
            "reverseUsage",
            "instanceElectricity"
          ],
          startTime: originalStartTime,
          endTime: finalEndTime
        };
        
        // Add next value if we have one from previous response
        if (nextVal !== null) {
          requestData["next"] = nextVal;
        }
        
        // Create request log
        const requestLog: RequestLog = {
          timestamp: Date.now(),
          url: settings.endpointUrl,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ND-TOKEN": "********" // Mask API key for security
          },
          body: requestData
        };
        
        // Send POST request
        const response = await fetch(settings.endpointUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ND-TOKEN": settings.apiKey,
          },
          body: JSON.stringify(requestData),
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
        
        // Update request log with response data
        requestLog.response = responseData;
        logRequest(requestLog);
        
        // Add to our collection
        allCollectedResponses.push(responseData);
        
        // Update UI with progress
        setAllResponses([...allCollectedResponses]);
        
        // Download this response with sequential number
        downloadSingleResponse(responseData, initialSequence + requestCount - 1);
        
        // Check if "next" key exists and is not null
        if (responseData && responseData.next !== undefined && responseData.next !== null) {
          nextVal = responseData.next;
          toast.info(`データ取得中... (${requestCount}回目)`);
        } else {
          nextVal = null;
        }
        
        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } while (nextVal !== null);
      
      setContinuousProgress({ current: requestCount, total: requestCount });
      toast.success(`データ取得完了！合計${requestCount}回のリクエストを実行しました。`);
      
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "不明なエラーが発生しました。");
    } finally {
      setIsContinuousLoading(false);
    }
  };

  const downloadSingleResponse = (responseData: ApiResponse, seqNum: number) => {
    try {
      // Format the sequence number with leading zeros (e.g., 001, 002, etc.)
      const formattedSeqNum = String(seqNum).padStart(3, '0');
      
      // Create a downloadable file
      const fileContent = JSON.stringify(responseData, null, 2);
      const blob = new Blob([fileContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `${deviceUuid}___${formattedSeqNum}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error("Error downloading single response:", error);
      toast.error("データのダウンロード中にエラーが発生しました。");
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>データ繰り返し取得フォーム</CardTitle>
          <CardDescription>
            DeviceUuid、startTime、endTimeを入力し、データを取得してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="deviceUuid">DeviceUuid</Label>
              <Input
                id="deviceUuid"
                placeholder="例: 12345678-1234-1234-1234-123456789012"
                value={deviceUuid}
                onChange={(e) => setDeviceUuid(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">startTime（ミリ秒タイムスタンプ）</Label>
              <Input
                id="startTime"
                type="number"
                placeholder="例: 1714500000000"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">
                現在のタイムスタンプ: {Date.now()}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">endTime（ミリ秒タイムスタンプ）</Label>
              <Input
                id="endTime"
                type="number"
                placeholder="例: 1714586400000"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sequenceNumber">連番開始番号</Label>
              <Input
                id="sequenceNumber"
                type="number"
                placeholder="例: 1"
                value={sequenceNumber}
                onChange={(e) => setSequenceNumber(e.target.value)}
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">
                連続データ取得時のファイル名に使用する連番の開始番号
              </p>
            </div>
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm font-medium mb-2">送信されるJSONデータ:</p>
              <pre className="text-xs overflow-auto">
{`{
  "deviceUuid": "${deviceUuid || ''}",
  "scopes": [
    "normalUsage",
    "reverseUsage",
    "instanceElectricity"
  ],
  "startTime": ${startTime || ''},
  "endTime": ${endTime || ''}${nextValue ? ',\n  "next": ' + nextValue : ''}
}`}
              </pre>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="submit" disabled={isLoading || isContinuousLoading}>
                {isLoading ? "取得中..." : "単一データ取得"}
              </Button>
              <Button 
                type="button" 
                variant="secondary"
                disabled={isLoading || isContinuousLoading}
                onClick={handleContinuousRetrieval}
              >
                {isContinuousLoading ? "連続取得中..." : "連続データ取得"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {continuousProgress && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>連続データ取得状況</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-primary/10 rounded-md">
              <p className="font-semibold text-primary">
                {isContinuousLoading 
                  ? `データ取得中... (${continuousProgress.current}回目のリクエスト)` 
                  : `データ取得完了！合計${continuousProgress.current}回のリクエストを実行しました。`}
              </p>
              
              <p className="text-sm mt-2">
                ファイル名形式: <code className="bg-muted px-2 py-1 rounded">{deviceUuid}___[連番].json</code>
              </p>
              <p className="text-sm mt-1">
                連番範囲: <code className="bg-muted px-2 py-1 rounded">{sequenceNumber}</code> から <code className="bg-muted px-2 py-1 rounded">{parseInt(sequenceNumber) + continuousProgress.current - 1}</code> まで
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {nextValue && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>次のデータポイント</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-primary/10 rounded-md">
              <p className="font-semibold text-primary">next: {nextValue}</p>
              <p className="text-sm text-muted-foreground mt-2">
                このタイムスタンプを次回のstartTimeとして使用できます。
              </p>
              <Button 
                variant="outline" 
                className="mt-3"
                onClick={() => {
                  setStartTime(nextValue);
                  toast.success("startTimeに次のタイムスタンプをセットしました。");
                }}
              >
                このタイムスタンプをstartTimeにセット
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {response && (
        <Card>
          <CardHeader>
            <CardTitle>単一リクエストのレスポンス結果</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto max-h-96 font-mono text-sm">
              {JSON.stringify(response, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {allResponses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>連続リクエストの結果 ({allResponses.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allResponses.map((resp, index) => (
                <details key={index} className="border rounded-md">
                  <summary className="p-3 font-medium cursor-pointer hover:bg-muted">
                    リクエスト #{index + 1} {resp.next !== null ? `(next: ${resp.next})` : '(最終レスポンス)'}
                  </summary>
                  <div className="p-3 border-t">
                    <pre className="bg-muted p-4 rounded-md overflow-auto max-h-60 font-mono text-xs">
                      {JSON.stringify(resp, null, 2)}
                    </pre>
                  </div>
                </details>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}