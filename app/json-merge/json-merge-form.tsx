"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";

interface JsonData {
  data?: {
    normalUsage?: any[];
    reverseUsage?: any[];
    instanceElectricity?: any[];
    [key: string]: any;
  };
  [key: string]: any;
}

export default function JsonMergeForm() {
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDownloading, setIsDownloading] = useState<{
    normalUsage: boolean;
    reverseUsage: boolean;
    instanceElectricity: boolean;
  }>({
    normalUsage: false,
    reverseUsage: false,
    instanceElectricity: false,
  });
  const [autoDownload, setAutoDownload] = useState(true);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

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
      toast.success(`${fileArray.length}個のJSONファイルが選択されました。`);
      setProcessingComplete(false);
      setDebugInfo(null);
    }
  };

  const clearFiles = () => {
    setFiles([]);
    setMergedData({
      normalUsage: [],
      reverseUsage: [],
      instanceElectricity: [],
    });
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

  const processFiles = async () => {
    if (files.length === 0) {
      toast.error("ファイルが選択されていません。");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessingComplete(false);
    setDebugInfo(null);

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

      // Process each file
      for (let i = 0; i < sortedFiles.length; i++) {
        const file = sortedFiles[i];
        
        // Update progress
        setProgress(Math.round(((i + 1) / sortedFiles.length) * 100));
        
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
      debugLog += `- instanceElectricity: ${merged.instanceElectricity.length}件\n`;
      
      setDebugInfo(debugLog);
      setMergedData(merged);
      setProcessingComplete(true);
      
      const totalDataCount = merged.normalUsage.length + merged.reverseUsage.length + merged.instanceElectricity.length;
      if (totalDataCount > 0) {
        toast.success(`JSONデータの結合が完了しました。合計${totalDataCount}件のデータを結合しました。`);
      } else {
        toast.warning("結合可能なデータが見つかりませんでした。選択したJSONファイルに必要なデータが含まれているか確認してください。");
      }
    } catch (error) {
      console.error("Error processing files:", error);
      toast.error(error instanceof Error ? error.message : "ファイル処理中にエラーが発生しました。");
      setDebugInfo(`エラー発生: ${error instanceof Error ? error.message : "不明なエラー"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Effect to trigger auto-download when processing is complete
  useEffect(() => {
    if (processingComplete && autoDownload) {
      // Small delay to ensure UI updates first
      const timer = setTimeout(() => {
        const hasData = mergedData.normalUsage.length > 0 || 
                       mergedData.reverseUsage.length > 0 || 
                       mergedData.instanceElectricity.length > 0;
        
        if (hasData) {
          downloadAllData();
        } else {
          toast.error("ダウンロード可能なデータがありません。");
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [processingComplete, autoDownload, mergedData]);

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

  const downloadMergedData = async (dataType: 'normalUsage' | 'reverseUsage' | 'instanceElectricity') => {
    if (!mergedData[dataType] || mergedData[dataType].length === 0) {
      toast.error(`${dataType}のデータがありません。`);
      return;
    }
    
    try {
      // Set downloading state for this data type
      setIsDownloading(prev => ({ ...prev, [dataType]: true }));
      
      // Create the JSON string
      const dataStr = JSON.stringify(mergedData[dataType], null, 2);
      
      // Create a blob with the data
      const blob = new Blob([dataStr], { type: "application/json" });
      
      // Create a URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Small delay to ensure browser is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create a temporary link element
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `merged_${dataType}.json`;
      
      // Add to document, click it, and remove it
      document.body.appendChild(a);
      a.click();
      
      // Small delay before cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`${dataType}のデータをダウンロードしました。`);
    } catch (error) {
      console.error(`Error downloading ${dataType}:`, error);
      toast.error(`${dataType}のダウンロード中にエラーが発生しました。`);
    } finally {
      // Reset downloading state
      setIsDownloading(prev => ({ ...prev, [dataType]: false }));
    }
  };

  // Alternative download method using Blob URL directly
  const downloadWithBlobUrl = (dataType: 'normalUsage' | 'reverseUsage' | 'instanceElectricity') => {
    if (!mergedData[dataType] || mergedData[dataType].length === 0) {
      toast.error(`${dataType}のデータがありません。`);
      return false;
    }
    
    try {
      // Set downloading state
      setIsDownloading(prev => ({ ...prev, [dataType]: true }));
      
      // Create JSON string and blob
      const dataStr = JSON.stringify(mergedData[dataType], null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      
      // Create download link
      const fileName = `merged_${dataType}.json`;
      const url = window.URL.createObjectURL(blob);
      
      // Create a link and set it up for download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      link.setAttribute('target', '_blank');
      
      // Append to body, click and remove
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
      // Clean up the URL
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        toast.success(`${dataType}のデータをダウンロードしました。`);
        setIsDownloading(prev => ({ ...prev, [dataType]: false }));
      }, 100);
      
      return true;
    } catch (error) {
      console.error(`Error downloading ${dataType}:`, error);
      toast.error(`${dataType}のダウンロード中にエラーが発生しました。`);
      setIsDownloading(prev => ({ ...prev, [dataType]: false }));
      return false;
    }
  };

  // Function to download all data types
  const downloadAllData = async () => {
    const dataTypes: ('normalUsage' | 'reverseUsage' | 'instanceElectricity')[] = [
      'normalUsage', 'reverseUsage', 'instanceElectricity'
    ];
    
    let downloadCount = 0;
    let hasAttemptedDownload = false;
    
    for (const dataType of dataTypes) {
      if (mergedData[dataType] && mergedData[dataType].length > 0) {
        hasAttemptedDownload = true;
        // Add a small delay between downloads to prevent browser issues
        await new Promise(resolve => setTimeout(resolve, 300));
        const success = await downloadWithBlobUrl(dataType);
        if (success) {
          downloadCount++;
        }
      }
    }
    
    if (!hasAttemptedDownload) {
      toast.error("ダウンロード可能なデータがありません。");
    } else if (downloadCount === 0) {
      toast.error("データのダウンロードに失敗しました。");
    } else {
      toast.success(`${downloadCount}種類のデータをダウンロードしました。`);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>JSONデータ結合</CardTitle>
          <CardDescription>
            複数のJSONファイルをアップロードし、dataキー内のnormalUsage、reverseUsage、instanceElectricityの項目を結合します。
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
              <Label htmlFor="auto-download">結合完了後に自動ダウンロード</Label>
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
                
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm font-medium mb-2">注意事項:</p>
                  <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
                    <li>JSONファイル内の<code className="bg-secondary px-1 rounded">data</code>キー内にある以下の項目を結合します:</li>
                    <li><code className="bg-secondary px-1 rounded">normalUsage</code></li>
                    <li><code className="bg-secondary px-1 rounded">reverseUsage</code></li>
                    <li><code className="bg-secondary px-1 rounded">instanceElectricity</code></li>
                    <li>ファイル名の右端の<code className="bg-secondary px-1 rounded">__数字</code>の順番で結合されます</li>
                  </ul>
                </div>
                
                <Button 
                  onClick={processFiles} 
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? "処理中..." : "JSONデータを結合"}
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

      {(mergedData.normalUsage.length > 0 || mergedData.reverseUsage.length > 0 || mergedData.instanceElectricity.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>結合結果</CardTitle>
            <CardDescription>
              各データタイプごとに結合されたデータをダウンロードできます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-2 border-chart-1/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">normalUsage</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {mergedData.normalUsage.length > 0
                      ? `${mergedData.normalUsage.length}件のデータ` 
                      : "データなし"}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => downloadWithBlobUrl('normalUsage')} 
                    disabled={mergedData.normalUsage.length === 0 || isDownloading.normalUsage}
                    variant="outline"
                    className="w-full"
                  >
                    {isDownloading.normalUsage ? "ダウンロード中..." : "ダウンロード"}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="border-2 border-chart-2/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">reverseUsage</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {mergedData.reverseUsage.length > 0
                      ? `${mergedData.reverseUsage.length}件のデータ` 
                      : "データなし"}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => downloadWithBlobUrl('reverseUsage')} 
                    disabled={mergedData.reverseUsage.length === 0 || isDownloading.reverseUsage}
                    variant="outline"
                    className="w-full"
                  >
                    {isDownloading.reverseUsage ? "ダウンロード中..." : "ダウンロード"}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="border-2 border-chart-3/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">instanceElectricity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {mergedData.instanceElectricity.length > 0
                      ? `${mergedData.instanceElectricity.length}件のデータ` 
                      : "データなし"}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => downloadWithBlobUrl('instanceElectricity')} 
                    disabled={mergedData.instanceElectricity.length === 0 || isDownloading.instanceElectricity}
                    variant="outline"
                    className="w-full"
                  >
                    {isDownloading.instanceElectricity ? "ダウンロード中..." : "ダウンロード"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div className="mt-6">
              <Button 
                onClick={downloadAllData}
                disabled={isProcessing || 
                  (mergedData.normalUsage.length === 0 && 
                   mergedData.reverseUsage.length === 0 && 
                   mergedData.instanceElectricity.length === 0)}
                className="w-full"
              >
                すべてのデータをダウンロード
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