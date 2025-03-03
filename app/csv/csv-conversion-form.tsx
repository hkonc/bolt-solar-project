"use client";

import { useState, useRef, ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface JsonDataItem {
  generatedTime?: number;
  value?: number;
  [key: string]: any;
}

interface ProcessedData {
  generatedTime: number;
  roundTime: number;
  formatedTime: string;
  cumulative: number;
  difference: number;
}

export default function CsvConversionForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedData, setProcessedData] = useState<ProcessedData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      if (selectedFile.type !== "application/json" && !selectedFile.name.endsWith(".json")) {
        toast.error("JSONファイルを選択してください。");
        return;
      }
      
      setFile(selectedFile);
      toast.success(`${selectedFile.name}が選択されました。`);
      setProcessedData([]);
      setDebugInfo(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    setProcessedData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setDebugInfo(null);
  };

  const roundToNearestMinute = (timestamp: number): number => {
    const date = new Date(timestamp);
    const seconds = date.getSeconds();
    const milliseconds = date.getMilliseconds();
    
    // Create a new date with seconds and milliseconds set to 0
    const roundedDate = new Date(date);
    
    // If seconds >= 30, round up to the next minute
    if (seconds >= 30) {
      roundedDate.setMinutes(date.getMinutes() + 1);
    }
    
    roundedDate.setSeconds(0);
    roundedDate.setMilliseconds(0);
    
    return roundedDate.getTime();
  };

  const formatTimeToJST = (timestamp: number): string => {
    const date = new Date(timestamp);
    return format(date, "yyyy/MM/dd HH:mm:ss", { locale: ja });
  };

  const processFile = async () => {
    if (!file) {
      toast.error("ファイルが選択されていません。");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setDebugInfo(null);

    try {
      // Read file content
      const content = await readFileAsJson(file);
      
      let debugLog = "処理ログ:\n";
      debugLog += `ファイル: ${file.name}\n`;
      
      // Check if content is an array
      if (!Array.isArray(content)) {
        debugLog += "JSONデータが配列ではありません。\n";
        setDebugInfo(debugLog);
        throw new Error("JSONデータが配列形式ではありません。");
      }
      
      debugLog += `データ件数: ${content.length}件\n\n`;
      
      // Process data
      let processedItems: ProcessedData[] = [];
      
      for (let i = 0; i < content.length; i++) {
        const item = content[i];
        
        // Update progress
        setProgress(Math.round(((i + 1) / content.length) * 100));
        
        // Check if item has required fields
        if (item.generatedTime === undefined || item.value === undefined) {
          continue;
        }
        
        const generatedTime = typeof item.generatedTime === 'number' ? item.generatedTime : parseInt(item.generatedTime, 10);
        const roundTime = roundToNearestMinute(generatedTime);
        const formatedTime = formatTimeToJST(roundTime);
        const cumulative = typeof item.value === 'number' ? item.value : parseFloat(item.value);
        
        processedItems.push({
          generatedTime,
          roundTime,
          formatedTime,
          cumulative,
          difference: 0 // Default to 0, will be updated later
        });
        
        // Small delay to prevent UI freezing
        if (i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      // Sort by roundTime
      processedItems.sort((a, b) => a.roundTime - b.roundTime);
      
      // Filter to keep only one entry per 30 minutes
      const filteredItems: ProcessedData[] = [];
      let lastIncludedTime = 0;
      
      for (const item of processedItems) {
        // If this is the first item or it's at least 30 minutes after the last included item
        if (filteredItems.length === 0 || item.roundTime - lastIncludedTime >= 30 * 60 * 1000) {
          filteredItems.push(item);
          lastIncludedTime = item.roundTime;
        }
      }
      
      debugLog += `30分間隔でフィルタリング後のデータ件数: ${filteredItems.length}件\n\n`;
      
      // Calculate differences (30 minutes before)
      // First item already has difference set to 0
      for (let i = 1; i < filteredItems.length; i++) {
        const currentValue = filteredItems[i].cumulative;
        const previousValue = filteredItems[i - 1].cumulative;
        filteredItems[i].difference = currentValue - previousValue;
      }
      
      setProcessedData(filteredItems);
      setDebugInfo(debugLog);
      
      // Automatically download CSV
      downloadCsv(filteredItems);
      
      toast.success("JSONデータのCSV変換が完了しました。");
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error(error instanceof Error ? error.message : "ファイル処理中にエラーが発生しました。");
    } finally {
      setIsProcessing(false);
    }
  };

  const readFileAsJson = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const json = JSON.parse(content);
          resolve(json);
        } catch (error) {
          reject(new Error(`${file.name}の解析に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error(`${file.name}の読み込みに失敗しました。`));
      };
      
      reader.readAsText(file);
    });
  };

  const downloadCsv = (data: ProcessedData[]) => {
    if (data.length === 0) {
      toast.error("ダウンロード可能なデータがありません。");
      return;
    }
    
    try {
      // Create CSV header
      let csvContent = "generatedTime,roundTime,formatedTime,cumulative,difference\n";
      
      // Add data rows
      for (const item of data) {
        const row = [
          item.generatedTime,
          item.roundTime,
          item.formatedTime,
          item.cumulative,
          item.difference
        ].join(",");
        
        csvContent += row + "\n";
      }
      
      // Create a blob with the data
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link element
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = file ? `${file.name.replace(/\.[^/.]+$/, "")}_converted.csv` : "converted_data.csv";
      
      // Add to document, click it, and remove it
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("CSVファイルをダウンロードしました。");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast.error("CSVのダウンロード中にエラーが発生しました。");
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>JSON to CSV変換</CardTitle>
          <CardDescription>
            JSONファイルをアップロードして、指定された形式のCSVに変換します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="file">JSONファイル選択</Label>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full h-24 border-dashed"
                >
                  クリックしてJSONファイルを選択
                </Button>
              </div>
            </div>

            {file && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">
                    選択されたファイル: {file.name}
                  </p>
                  <Button variant="ghost" size="sm" onClick={clearFile}>
                    クリア
                  </Button>
                </div>
                
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm font-medium mb-2">変換内容:</p>
                  <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
                    <li><code className="bg-secondary px-1 rounded">generatedTime</code>: JSONのgeneratedTimeをそのまま使用</li>
                    <li><code className="bg-secondary px-1 rounded">roundTime</code>: generatedTimeを分単位で丸めたタイムスタンプ</li>
                    <li><code className="bg-secondary px-1 rounded">formatedTime</code>: roundTimeをJST形式で表示</li>
                    <li><code className="bg-secondary px-1 rounded">cumulative</code>: JSONのvalueをそのまま使用</li>
                    <li><code className="bg-secondary px-1 rounded">difference</code>: 30分前のcumulativeとの差分（最初のデータは0）</li>
                    <li>30分ごとのデータのみを抽出します</li>
                  </ul>
                </div>
                
                <Button 
                  onClick={processFile} 
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? "変換中..." : "CSVに変換"}
                </Button>
                
                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={progress} />
                    <p className="text-xs text-center text-muted-foreground">
                      {progress}% 完了
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {processedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>変換結果プレビュー</CardTitle>
            <CardDescription>
              変換されたデータのプレビューです。最大10件表示されます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border px-4 py-2 text-left">generatedTime</th>
                    <th className="border px-4 py-2 text-left">roundTime</th>
                    <th className="border px-4 py-2 text-left">formatedTime</th>
                    <th className="border px-4 py-2 text-left">cumulative</th>
                    <th className="border px-4 py-2 text-left">difference</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.slice(0, 10).map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                      <td className="border px-4 py-2">{item.generatedTime}</td>
                      <td className="border px-4 py-2">{item.roundTime}</td>
                      <td className="border px-4 py-2">{item.formatedTime}</td>
                      <td className="border px-4 py-2">{item.cumulative}</td>
                      <td className="border px-4 py-2">{item.difference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                合計 {processedData.length} 件のデータが変換されました。
                {processedData.length > 10 && " (上記は最初の10件のみ表示)"}
              </p>
            </div>
            
            <div className="mt-4">
              <Button 
                onClick={() => downloadCsv(processedData)}
                className="w-full"
              >
                CSVを再ダウンロード
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {debugInfo && (
        <Card>
          <CardHeader>
            <CardTitle>デバッグ情報</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-96 whitespace-pre-wrap">
              {debugInfo}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}