"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { saveSettings, getSettings } from "@/lib/storage";
import { Settings } from "@/lib/types";

export default function SettingsForm() {
  const [settings, setSettings] = useState<Settings>({
    endpointUrl: "",
    apiKey: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load settings on component mount
    const savedSettings = getSettings();
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!settings.endpointUrl) {
      toast.error("エンドポイントURLを入力してください。");
      return;
    }
    
    if (!settings.apiKey) {
      toast.error("APIキーを入力してください。");
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Validate URL format
      new URL(settings.endpointUrl);
      
      // Save settings
      saveSettings(settings);
      toast.success("設定を保存しました。");
    } catch (error) {
      console.error("Error saving settings:", error);
      if (error instanceof TypeError) {
        toast.error("無効なURLフォーマットです。");
      } else {
        toast.error("設定の保存中にエラーが発生しました。");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API設定</CardTitle>
        <CardDescription>
          発電量データ取得に必要なAPIの設定を行います。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="endpointUrl">エンドポイントURL</Label>
            <Input
              id="endpointUrl"
              type="url"
              placeholder="https://api.example.com/solar-data"
              value={settings.endpointUrl}
              onChange={(e) => setSettings({ ...settings, endpointUrl: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">APIキー</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="APIキーを入力"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">
              APIキーは暗号化されてローカルに保存されます。
            </p>
          </div>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "保存中..." : "設定を保存"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-start">
        <p className="text-sm text-muted-foreground">
          これらの設定は発電量データ取得ページでAPIリクエストを行う際に使用されます。
        </p>
      </CardFooter>
    </Card>
  );
}