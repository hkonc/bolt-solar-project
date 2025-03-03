"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function TimestampForm() {
  const [timestamp, setTimestamp] = useState("");
  const [realtimeJst, setRealtimeJst] = useState<string | null>(null);
  const [result, setResult] = useState<{
    originalTimestamp: number;
    nearestMinuteTimestamp: number;
    jstTime: string;
  } | null>(null);

  // Real-time conversion effect
  useEffect(() => {
    if (!timestamp) {
      setRealtimeJst(null);
      return;
    }

    try {
      const timestampValue = parseInt(timestamp, 10);
      
      if (isNaN(timestampValue)) {
        setRealtimeJst("無効なタイムスタンプです");
        return;
      }
      
      const date = new Date(timestampValue);
      
      if (date.toString() === "Invalid Date") {
        setRealtimeJst("無効な日付です");
        return;
      }
      
      // Format the date in JST
      const jstTime = format(date, "yyyy年MM月dd日 HH時mm分ss秒", { locale: ja });
      setRealtimeJst(jstTime);
    } catch (error) {
      setRealtimeJst("変換エラー");
    }
  }, [timestamp]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!timestamp) {
      toast.error("タイムスタンプを入力してください。");
      return;
    }
    
    try {
      // Parse the timestamp
      const timestampValue = parseInt(timestamp, 10);
      
      if (isNaN(timestampValue)) {
        throw new Error("無効なタイムスタンプです。数値を入力してください。");
      }
      
      // Create a Date object from the timestamp
      const date = new Date(timestampValue);
      
      if (date.toString() === "Invalid Date") {
        throw new Error("無効な日付になりました。正しいタイムスタンプを入力してください。");
      }
      
      // Round to the nearest minute
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
      
      // Format the date in JST
      const jstTime = format(roundedDate, "yyyy年MM月dd日 HH時mm分", { locale: ja });
      
      setResult({
        originalTimestamp: timestampValue,
        nearestMinuteTimestamp: roundedDate.getTime(),
        jstTime: jstTime,
      });
      
      toast.success("タイムスタンプを変換しました。");
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "不明なエラーが発生しました。");
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>タイムスタンプ変換フォーム</CardTitle>
          <CardDescription>
            ミリ秒単位のタイムスタンプを入力し、一番近い分に変換します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="timestamp">タイムスタンプ（ミリ秒）</Label>
              <Input
                id="timestamp"
                type="number"
                placeholder="例: 1714500000000"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">
                現在のタイムスタンプ: {Date.now()}
              </p>
            </div>

            {realtimeJst && (
              <div className="p-3 bg-secondary rounded-md">
                <p className="text-sm font-medium text-secondary-foreground mb-1">リアルタイム変換:</p>
                <p className="font-semibold text-primary">{realtimeJst}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <Button type="submit">
                一番近い分に変換する
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>変換結果</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>元のタイムスタンプ</Label>
                <div className="p-2 bg-muted rounded-md font-mono">
                  {result.originalTimestamp}
                </div>
              </div>
              <div className="space-y-2">
                <Label>一番近い分に変換したタイムスタンプ</Label>
                <div className="p-2 bg-muted rounded-md font-mono">
                  {result.nearestMinuteTimestamp}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>JST形式の時刻</Label>
              <div className="p-4 bg-muted rounded-md text-center text-lg font-semibold">
                {result.jstTime}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}