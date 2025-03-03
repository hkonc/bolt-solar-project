"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface JsonData {
  data?: {
    normalUsage?: any[];
    reverseUsage?: any[];
    instanceElectricity?: any[];
    [key: string]: any;
  };
  [key: string]: any;
}

interface ProcessedItem {
  generatedTime: number;
  roundTime: number;
  formatedTime: string;
  normalUsage_cumulative: number | null;
  normalUsage_difference: number | null;
  reverseUsage_cumulative: number | null;
  reverseUsage_difference: number | null;
}

export default function BatchCsvForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mergedData, setMergedData] = useState<{
    normalUsage: any[];
    reverseUsage: any[];
    instanceElectricity: any[];
  }>({
    normalUsage: [],
    reverseUsage: [],
    instanceElectricity: [],
  });
  const [processedData, setProcessedData] = useState<ProcessedItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [autoDownload, setAutoDownload] = useState(true);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [baseFileName, setBaseFileName] = useState<string>("");

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Convert FileList to array and filter for JSON files
      const fileArray = Array.from(e.target.files).filter(file => 
        file.type === "application/json" || file.name.endsWith(".json")
      );
      
      if (fileArray.length === 0) {
        toast.error("JSONファイルを選択してください。");
        return;
      }
      
      setFiles(fileArray);
      
      // Extract base file name from the first file
      if (fileArray.length > 0) {
        const firstFileName = fileArray[0].name;
        const baseNameMatch = firstFileName.match(/^(.*?)___/);
        if (baseNameMatch && baseNameMatch[1]) {
          setBaseFileName(baseNameMatch[1]);
        } else {
          // If no ___ pattern found, use the file name without extension
          setBaseFileName(firstFileName.replace(/\.[^/.]+$/, ""));
        }
      }
      
      toast.success(`${fileArray.length}個のJSONファイルが選択されました。`);
      setProcessingComplete(false);
      setDebugInfo(null);
      setProcessedData([]);
    }
  };

  const clearFiles = () => {
    setFiles([]);
    setMergedData({
      normalUsage: [],
      reverseUsage: [],
      instanceElectricity: [],
    });
    setProcessedData([]);
    setBaseFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setProcessingComplete(false);
    setDebugInfo(null);
  };

  const extractSequenceNumber = (filename: string): number => {
    // Extract sequence number after the last "__" in the filename
    const match = filename.match(/__(\d+)(?:\.\w+)?$/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return 0; // Default if no sequence number found
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

  const processFiles = async () => {
    if (files.length === 0) {
      toast.error("ファイルが選択されていません。");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessingComplete(false);
    setDebugInfo(null);
    setProcessedData([]);

    try {
      // Sort files by sequence number
      const sortedFiles = [...files].sort((a, b) => {
        const seqA = extractSequenceNumber(a.name);
        const seqB = extractSequenceNumber(b.name);
        return seqA - seqB;
      });

      // Initialize merged data containers
      const merged = {
        normalUsage: [] as any[],
        reverseUsage: [] as any[],
        instanceElectricity: [] as any[],
      };

      let debugLog = "処理ログ:\n";
      debugLog += `ファイル処理順序:\n`;
      sortedFiles.forEach((file, index) => {
        const seqNum = extractSequenceNumber(file.name);
        debugLog += `${index + 1}. ${file.name} (順序番号: ${seqNum || "なし"})\n`;
      });
      debugLog += `\n`;

      // Process each file
      for (let i = 0; i < sortedFiles.length; i++) {
        const file = sortedFiles[i];
        
        // Update progress
        setProgress(Math.round(((i + 1) / sortedFiles.length) * 50)); // First half of progress
        
        debugLog += `\nファイル処理: ${file.name}\n`;
        
        // Read file content
        const content = await readFileAsJson(file);
        
        // Check if data key exists
        if (!content.data) {
          debugLog += `- dataキーが見つかりません\n`;
          continue;
        }
        
        // Extract and merge data from the data key
        if (content.data.normalUsage && Array.isArray(content.data.normalUsage)) {
          debugLog += `- normalUsage: ${content.data.normalUsage.length}件のデータを追加\n`;
          merged.normalUsage = [...merged.normalUsage, ...content.data.normalUsage];
        } else {
          debugLog += `- normalUsage: データなし\n`;
        }
        
        if (content.data.reverseUsage && Array.isArray(content.data.reverseUsage)) {
          debugLog += `- reverseUsage: ${content.data.reverseUsage.length}件のデータを追加\n`;
          merged.reverseUsage = [...merged.reverseUsage, ...content.data.reverseUsage];
        } else {
          debugLog += `- reverseUsage: データなし\n`;
        }
        
        if (content.data.instanceElectricity && Array.isArray(content.data.instanceElectricity)) {
          debugLog += `- instanceElectricity: ${content.data.instanceElectricity.length}件のデータを追加\n`;
          merged.instanceElectricity = [...merged.instanceElectricity, ...content.data.instanceElectricity];
        } else {
          debugLog += `- instanceElectricity: データなし\n`;
        }
        
        // Small delay to prevent UI freezing
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      debugLog += `\n結合結果:\n`;
      debugLog += `- normalUsage: ${merged.normalUsage.length}件\n`;
      debugLog += `- reverseUsage: ${merged.reverseUsage.length}件\n`;
      debugLog += `- instanceElectricity: ${merged.instanceElectricity.length}件\n\n`;
      
      setMergedData(merged);
      
      // Process normalUsage data
      if (merged.normalUsage.length === 0) {
        debugLog += `normalUsageデータがないため、CSV変換を中止します。\n`;
        setDebugInfo(debugLog);
        setIsProcessing(false);
        toast.error("normalUsageデータがないため、CSV変換を中止します。");
        return;
      }
      
      debugLog += `CSV変換処理を開始します...\n`;
      
      // Process normalUsage data
      const normalUsageItems = merged.normalUsage.map(item => ({
        generatedTime: typeof item.generatedTime === 'number' ? item.generatedTime : parseInt(item.generatedTime, 10),
        value: typeof item.value === 'number' ? item.value : parseFloat(item.value),
      }));
      
      // Sort by generatedTime
      normalUsageItems.sort((a, b) => a.generatedTime - b.generatedTime);
      
      // Round times and create initial processed data
      const processedItems: Map<number, ProcessedItem> = new Map();
      
      for (let i = 0; i < normalUsageItems.length; i++) {
        setProgress(50 + Math.round(((i + 1) / normalUsageItems.length) * 25)); // Second quarter of progress
        
        const item = normalUsageItems[i];
        const roundTime = roundToNearestMinute(item.generatedTime);
        
        if (!processedItems.has(roundTime)) {
          processedItems.set(roundTime, {
            generatedTime: item.generatedTime,
            roundTime: roundTime,
            formatedTime: formatTimeToJST(roundTime),
            normalUsage_cumulative: item.value,
            normalUsage_difference: null, // Will calculate later
            reverseUsage_cumulative: null,
            reverseUsage_difference: null,
          });
        }
        
        // Small delay to prevent UI freezing
        if (i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      debugLog += `- normalUsageデータから${processedItems.size}件の一意のroundTimeを抽出しました\n`;
      
      // Filter to keep only one entry per 30 minutes
      const filteredTimes: number[] = [];
      let lastIncludedTime = 0;
      
      // Sort the round times
      const sortedRoundTimes = Array.from(processedItems.keys()).sort((a, b) => a - b);
      
      for (const roundTime of sortedRoundTimes) {
        // If this is the first item or it's at least 30 minutes after the last included item
        if (filteredTimes.length === 0 || roundTime - lastIncludedTime >= 30 * 60 * 1000) {
          filteredTimes.push(roundTime);
          lastIncludedTime = roundTime;
        }
      }
      
      debugLog += `- 30分間隔でフィルタリング後のデータ件数: ${filteredTimes.length}件\n`;
      
      // Create final filtered data array
      const finalProcessedData: ProcessedItem[] = filteredTimes.map(time => processedItems.get(time)!);
      
      // Calculate normalUsage differences
      for (let i = 0; i < finalProcessedData.length; i++) {
        if (i === 0) {
          finalProcessedData[i].normalUsage_difference = 0;
        } else {
          const currentValue = finalProcessedData[i].normalUsage_cumulative!;
          const previousValue = finalProcessedData[i - 1].normalUsage_cumulative!;
          finalProcessedData[i].normalUsage_difference = currentValue - previousValue;
        }
      }
      
      // Process reverseUsage data if available
      if (merged.reverseUsage.length > 0) {
        debugLog += `reverseUsageデータの処理を開始します...\n`;
        
        const reverseUsageItems = merged.reverseUsage.map(item => ({
          generatedTime: typeof item.generatedTime === 'number' ? item.generatedTime : parseInt(item.generatedTime, 10),
          value: typeof item.value === 'number' ? item.value : parseFloat(item.value),
        }));
        
        // Sort by generatedTime
        reverseUsageItems.sort((a, b) => a.generatedTime - b.generatedTime);
        
        // Create a map of roundTime to value for reverseUsage
        const reverseUsageMap = new Map<number, number>();
        
        for (let i = 0; i < reverseUsageItems.length; i++) {
          setProgress(75 + Math.round(((i + 1) / reverseUsageItems.length) * 25)); // Last quarter of progress
          
          const item = reverseUsageItems[i];
          const roundTime = roundToNearestMinute(item.generatedTime);
          
          // Only keep the latest value for each roundTime
          reverseUsageMap.set(roundTime, item.value);
          
          // Small delay to prevent UI freezing
          if (i % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        
        debugLog += `- reverseUsageデータから${reverseUsageMap.size}件の一意のroundTimeを抽出しました\n`;
        
        // Add reverseUsage data to the processed items
        for (let i = 0; i < finalProcessedData.length; i++) {
          const item = finalProcessedData[i];
          const reverseValue = reverseUsageMap.get(item.roundTime);
          
          if (reverseValue !== undefined) {
            item.reverseUsage_cumulative = reverseValue;
          }
        }
        
        // Calculate reverseUsage differences
        for (let i = 0; i < finalProcessedData.length; i++) {
          if (i === 0 || finalProcessedData[i].reverseUsage_cumulative === null) {
            if (finalProcessedData[i].reverseUsage_cumulative !== null) {
              finalProcessedData[i].reverseUsage_difference = 0;
            }
          } else if (finalProcessedData[i - 1].reverseUsage_cumulative === null) {
            finalProcessedData[i].reverseUsage_difference = 0;
          } else {
            const currentValue = finalProcessedData[i].reverseUsage_cumulative!;
            const previousValue = finalProcessedData[i - 1].reverseUsage_cumulative!;
            finalProcessedData[i].reverseUsage_difference = currentValue - previousValue;
          }
        }
      } else {
        debugLog += `reverseUsageデータがないため、この項目は処理しません。\n`;
      }
      
      setProcessedData(finalProcessedData);
      setDebugInfo(debugLog);
      setProcessingComplete(true);
      
      toast.success(`CSVデータの変換が完了しました。合計${finalProcessedData.length}件のデータを変換しました。`);
      
      // Auto download if enabled
      if (autoDownload) {
        setTimeout(() => {
          downloadCsv(finalProcessedData);
        }, 500);
      }
    } catch (error) {
      console.error("Error processing files:", error);
      toast.error(error instanceof Error ? error.message : "ファイル処理中にエラーが発生しました。");
      setDebugInfo(`エラー発生: ${error instanceof Error ? error.message : "不明なエラー"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const readFileAsJson = (file: File): Promise<JsonData> => {
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

  const downloadCsv = (data: ProcessedItem[]) => {
    if (data.length === 0) {
      toast.error("ダウンロード可能なデータがありません。");
      return;
    }
    
    try {
      // Create CSV header
      let csvContent = "generatedTime,roundTime,formatedTime,normalUsage_cumulative,normalUsage_difference";
      
      // Add reverseUsage headers if any data has reverseUsage values
      const hasReverseUsage = data.some(item => item.reverseUsage_cumulative !== null);
      if (hasReverseUsage) {
        csvContent += ",reverseUsage_cumulative,reverseUsage_difference";
      }
      
      csvContent += "\n";
      
      // Add data rows
      for (const item of data) {
        const row = [
          item.generatedTime,
          item.roundTime,
          item.formatedTime,
          item.normalUsage_cumulative !== null ? item.normalUsage_cumulative : "",
          item.normalUsage_difference !== null ? item.normalUsage_difference : ""
        ];
        
        if (hasReverseUsage) {
          row.push(
            item.reverseUsage_cumulative !== null ? item.reverseUsage_cumulative : "",
            item.reverseUsage_difference !== null ? item.reverseUsage_difference : ""
          );
        }
        
        csvContent += row.join(",") + "\n";
      }
      
      // Create a blob with the data
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link element
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      
      // Use the base file name from the first uploaded file + "mergedcsv"
      const fileName = baseFileName ? `${baseFileName}_mergedcsv.csv` : "merged_solar_data.csv";
      a.download = fileName;
      
      // Add to document, click it, and remove it
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`CSVファイル「${fileName}」をダウンロードしました。`);
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast.error("CSVのダウンロード中にエラーが発生しました。");
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>一括CSV作成</CardTitle>
          <CardDescription>
            複数のJSONファイルをアップロードし、normalUsageとreverseUsageのデータを結合してCSVに変換します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <Switch
                id="auto-download"
                checked={autoDownload}
                onCheckedChange={setAutoDownload}
              />
              <Label htmlFor="auto-download">変換完了後に自動ダウンロード</Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="files">JSONファイル選択</Label>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  id="files"
                  type="file"
                  multiple
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
                  <br />
                  <span className="text-xs text-muted-foreground">
                    （複数選択可能）
                  </span>
                </Button>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">
                    {files.length}個のファイルが選択されています
                  </p>
                  <Button variant="ghost" size="sm" onClick={clearFiles}>
                    クリア
                  </Button>
                </div>
                
                <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                  <ul className="space-y-2 text-sm">
                    {files.map((file, index) => {
                      const seqNum = extractSequenceNumber(file.name);
                      return (
                        <li key={index} className="flex justify-between items-center">
                          <span className="truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {seqNum > 0 ? `順序: ${seqNum}` : "順序なし"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                
                {baseFileName && (
                  <div className="bg-primary/10 p-4 rounded-md">
                    <p className="text-sm font-medium">
                      出力ファイル名: <span className="font-bold">{baseFileName}_mergedcsv.csv</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      最初のJSONファイル名から自動生成されます
                    </p>
                  </div>
                )}
                
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm font-medium mb-2">処理内容:</p>
                  <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
                    <li>JSONファイル内の<code className="bg-secondary px-1 rounded">data</code>キー内にある<code className="bg-secondary px-1 rounded">normalUsage</code>と<code className="bg-secondary px-1 rounded">reverseUsage</code>を結合します</li>
                    <li>ファイル名の右端の<code className="bg-secondary px-1 rounded">__数字</code>の順番で結合されます</li>
                    <li><code className="bg-secondary px-1 rounded">generatedTime</code>を分単位で丸めた<code className="bg-secondary px-1 rounded">roundTime</code>を計算します</li>
                    <li>30分ごとのデータのみを抽出します</li>
                    <li>各データの30分前との差分を計算します</li>
                  </ul>
                </div>
                
                <Button 
                  onClick={processFiles} 
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? "処理中..." : "CSVに変換"}
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
                    <th className="border px-4 py-2 text-left">normalUsage_cumulative</th>
                    <th className="border px-4 py-2 text-left">normalUsage_difference</th>
                    {processedData.some(item => item.reverseUsage_cumulative !== null) && (
                      <>
                        <th className="border px-4 py-2 text-left">reverseUsage_cumulative</th>
                        <th className="border px-4 py-2 text-left">reverseUsage_difference</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {processedData.slice(0, 10).map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                      <td className="border px-4 py-2">{item.generatedTime}</td>
                      <td className="border px-4 py-2">{item.roundTime}</td>
                      <td className="border px-4 py-2">{item.formatedTime}</td>
                      <td className="border px-4 py-2">{item.normalUsage_cumulative}</td>
                      <td className="border px-4 py-2">{item.normalUsage_difference}</td>
                      {processedData.some(item => item.reverseUsage_cumulative !== null) && (
                        <>
                          <td className="border px-4 py-2">{item.reverseUsage_cumulative}</td>
                          <td className="border px-4 py-2">{item.reverseUsage_difference}</td>
                        </>
                      )}
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