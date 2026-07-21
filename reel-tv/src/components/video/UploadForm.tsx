"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, CheckCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type UploadState = "idle" | "uploading" | "processing" | "success" | "error";

export function UploadForm() {
  const [state, setState] = useState<UploadState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setState("idle");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setState("uploading");
    setProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setState("processing");
          // Simulate processing
          setTimeout(() => setState("success"), 2000);
          return 100;
        }
        return p + 10;
      });
    }, 200);
  };

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div className="relative">
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={state === "uploading" || state === "processing"}
        />
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-muted/20 py-12 transition-colors hover:border-reel/50 hover:bg-muted/30">
          <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="mb-2 text-sm font-medium">
            {file ? file.name : "Drag & drop your video here"}
          </p>
          <p className="text-xs text-muted-foreground">
            MP4, MOV, or WebM. Max 100MB.
          </p>
        </div>
      </div>

      {/* File Info */}
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎬</span>
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>
              {state === "idle" && (
                <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress */}
      <AnimatePresence>
        {(state === "uploading" || state === "processing") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-reel" />
                {state === "uploading" ? "Uploading..." : "Processing..."}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full bg-reel"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success */}
      <AnimatePresence>
        {state === "success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-green-500"
          >
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">
              Video uploaded successfully! It will be reviewed shortly.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" placeholder="Give your Reel a catchy title" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Tell viewers what your Reel is about"
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="channel">Target Channel</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select a channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fitness-tv">💪 Fitness TV</SelectItem>
              <SelectItem value="ai-tv">🤖 AI TV</SelectItem>
              <SelectItem value="startup-tv">🚀 Startup TV</SelectItem>
              <SelectItem value="gaming-tv">🎮 Gaming TV</SelectItem>
              <SelectItem value="food-tv">🍕 Food TV</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Submit */}
      <Button
        className="w-full bg-reel hover:bg-reel/90"
        disabled={!file || state === "uploading" || state === "processing"}
        onClick={handleUpload}
      >
        {state === "uploading" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : state === "processing" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload Reel
          </>
        )}
      </Button>
    </div>
  );
}
