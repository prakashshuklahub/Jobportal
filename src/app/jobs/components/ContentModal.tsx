"use client";

import { useState } from "react";

interface ContentModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => Promise<string>;
}

export function ContentModal({
  title,
  isOpen,
  onClose,
  onGenerate,
}: ContentModalProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);

  if (!isOpen) return null;

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const result = await onGenerate();
      setContent(result);
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(content);
  }

  function handleDownload() {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!generated && !loading && (
            <p className="text-gray-500 text-sm">
              Click Generate to create tailored content using Claude Haiku.
            </p>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Generating...
            </div>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {content && (
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
              {content}
            </pre>
          )}
        </div>

        <div className="flex gap-2 p-5 border-t">
          {!generated ? (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate"}
            </button>
          ) : (
            <>
              <button
                onClick={handleCopy}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Copy
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                Download
              </button>
              <button
                onClick={() => {
                  setGenerated(false);
                  setContent("");
                  handleGenerate();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Regenerate
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
