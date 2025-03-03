"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SolarData {
  id: number;
  deviceUuid: string;
  generatedTime: bigint;
  roundTime: bigint;
  formatedTime: string;
  cumulative: number;
  difference: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RequestLog {
  id: number;
  timestamp: bigint;
  url: string;
  method: string;
  headers: string;
  body: string;
  response: string | null;
  status: number | null;
  error: string | null;
  createdAt: Date;
}

interface Setting {
  id: number;
  key: string;
  value: string;
  description: string | null;
}

export default function DatabaseManager() {
  const [solarData, setSolarData] = useState<SolarData[]>([]);
  const [requestLogs, setRequestLogs] = useState<RequestLog[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("solar-data");
  const [newSetting, setNewSetting] = useState({ key: "", value: "", description: "" });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "solar-data") {
        const response = await fetch("/api/database/solar-data");
        if (!response.ok) throw new Error("Failed to fetch solar data");
        const data = await response.json();
        setSolarData(data);
      } else if (activeTab === "request-logs") {
        const response = await fetch("/api/database/request-logs");
        if (!response.ok) throw new Error("Failed to fetch request logs");
        const data = await response.json();
        setRequestLogs(data);
      } else if (activeTab === "settings") {
        const response = await fetch("/api/database/settings");
        if (!response.ok) throw new Error("Failed to fetch settings");
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("データの読み込み中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSetting = async () => {
    if (!newSetting.key || !newSetting.value) {
      toast.error("キーと値は必須です。");
      return;
    }

    try {
      const response = await fetch("/api/database/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSetting),
      });

      if (!response.ok) throw new Error("Failed to save setting");
      
      toast.success("設定を保存しました。");
      setNewSetting({ key: "", value: "", description: "" });
      
      // Reload settings
      if (activeTab === "settings") {
        loadData();
      }
    } catch (error) {
      console.error("Error saving setting:", error);
      toast.error("設定の保存中にエラーが発生しました。");
    }
  };

  const handleDeleteSetting = async (id: number) => {
    if (!confirm("この設定を削除してもよろしいですか？")) {
      return;
    }

    try {
      const response = await fetch(`/api/database/settings/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete setting");
      
      toast.success("設定を削除しました。");
      
      // Reload settings
      if (activeTab === "settings") {
        loadData();
      }
    } catch (error) {
      console.error("Error deleting setting:", error);
      toast.error("設定の削除中にエラーが発生しました。");
    }
  };

  const handleImportFromLocalStorage = async () => {
    try {
      // Get settings from localStorage
      const storedSettings = localStorage.getItem('solar_power_settings');
      if (!storedSettings) {
        toast.error("LocalStorageに設定が見つかりません。");
        return;
      }

      const parsedSettings = JSON.parse(storedSettings);
      
      // Import endpoint URL
      if (parsedSettings.endpointUrl) {
        await fetch("/api/database/settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: "endpointUrl",
            value: parsedSettings.endpointUrl,
            description: "API Endpoint URL",
          }),
        });
      }

      // Import API key (encrypted in localStorage)
      if (parsedSettings.apiKey) {
        await fetch("/api/database/settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: "apiKey",
            value: parsedSettings.apiKey, // Still encrypted
            description: "API Key (encrypted)",
          }),
        });
      }

      toast.success("LocalStorageから設定をインポートしました。");
      loadData();
    } catch (error) {
      console.error("Error importing from localStorage:", error);
      toast.error("LocalStorageからのインポート中にエラーが発生しました。");
    }
  };

  return (
    <div className="grid gap-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="solar-data">発電量データ</TabsTrigger>
          <TabsTrigger value="request-logs">リクエストログ</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="solar-data">
          <Card>
            <CardHeader>
              <CardTitle>発電量データ</CardTitle>
              <CardDescription>
                データベースに保存されている発電量データを表示します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-6">
                <Button onClick={loadData} variant="outline">
                  更新
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <p>読み込み中...</p>
                </div>
              ) : solarData.length === 0 ? (
                <div className="text-center py-8 border rounded-md">
                  <p className="text-muted-foreground">データがありません。</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border px-4 py-2 text-left">ID</th>
                        <th className="border px-4 py-2 text-left">Device UUID</th>
                        <th className="border px-4 py-2 text-left">Formatted Time</th>
                        <th className="border px-4 py-2 text-left">Cumulative</th>
                        <th className="border px-4 py-2 text-left">Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {solarData.map((item, index) => (
                        <tr key={item.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                          <td className="border px-4 py-2">{item.id}</td>
                          <td className="border px-4 py-2">{item.deviceUuid}</td>
                          <td className="border px-4 py-2">{item.formatedTime}</td>
                          <td className="border px-4 py-2">{item.cumulative}</td>
                          <td className="border px-4 py-2">{item.difference}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="request-logs">
          <Card>
            <CardHeader>
              <CardTitle>リクエストログ</CardTitle>
              <CardDescription>
                データベースに保存されているAPIリクエストログを表示します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-6">
                <Button onClick={loadData} variant="outline">
                  更新
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <p>読み込み中...</p>
                </div>
              ) : requestLogs.length === 0 ? (
                <div className="text-center py-8 border rounded-md">
                  <p className="text-muted-foreground">ログがありません。</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requestLogs.map((log) => {
                    const date = new Date(Number(log.timestamp));
                    
                    return (
                      <details key={log.id} className="border rounded-md">
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
                            {date.toLocaleString()}
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
                              {log.headers}
                            </pre>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-semibold mb-1">リクエストボディ</h4>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                              {log.body}
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
                                {log.response}
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
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>設定</CardTitle>
              <CardDescription>
                データベースに保存されている設定を管理します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-6">
                <Button onClick={loadData} variant="outline">
                  更新
                </Button>
                <Button onClick={handleImportFromLocalStorage} variant="secondary">
                  LocalStorageから設定をインポート
                </Button>
              </div>

              <div className="space-y-6">
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="key" className="text-right">
                      キー
                    </Label>
                    <Input
                      id="key"
                      value={newSetting.key}
                      onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="value" className="text-right">
                      値
                    </Label>
                    <Input
                      id="value"
                      value={newSetting.value}
                      onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      説明
                    </Label>
                    <Input
                      id="description"
                      value={newSetting.description}
                      onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <Button onClick={handleSaveSetting}>設定を保存</Button>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <p>読み込み中...</p>
                </div>
              ) : settings.length === 0 ? (
                <div className="text-center py-8 border rounded-md mt-6">
                  <p className="text-muted-foreground">設定がありません。</p>
                </div>
              ) : (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">保存された設定</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border px-4 py-2 text-left">キー</th>
                          <th className="border px-4 py-2 text-left">値</th>
                          <th className="border px-4 py-2 text-left">説明</th>
                          <th className="border px-4 py-2 text-left">アクション</th>
                        </tr>
                      </thead>
                      <tbody>
                        {settings.map((setting, index) => (
                          <tr key={setting.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                            <td className="border px-4 py-2">{setting.key}</td>
                            <td className="border px-4 py-2">
                              {setting.key.toLowerCase().includes('key') || setting.key.toLowerCase().includes('password') 
                                ? '********' 
                                : setting.value}
                            </td>
                            <td className="border px-4 py-2">{setting.description || '-'}</td>
                            <td className="border px-4 py-2">
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteSetting(setting.id)}
                              >
                                削除
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}