"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analysisApi } from "@/lib/api";
import {
  buildEditedPdf,
  deriveEditableItems,
  itemToCssBox,
  loadPdf,
  rgbCss,
  type LoadedPdf,
  type PdfEdit,
  type PdfTextItem,
} from "@/lib/pdf-edit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Pencil, Check, ShieldUser } from "lucide-react";

type Props = {
  file: File;
  onCancel: () => void;
  onApply: (edited: File) => void;
};

export function ResumePiiEditor({ file, onCancel, onApply }: Props) {
  const [pdf, setPdf] = useState<LoadedPdf | null>(null);
  const [editItems, setEditItems] = useState<PdfTextItem[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    (async () => {
      try {
        const loaded = await loadPdf(file);
        if (cancelled.current) return;
        setPdf(loaded);

        if (loaded.lines.length === 0) {
          setError("This resume has no selectable text (it may be a scanned image), so personal info can't be edited here.");
          setLoading(false);
          return;
        }

        try {
          const res = await analysisApi.detectPii(loaded.fullText);
          if (cancelled.current) return;
          const d = res.data;
          const values = d
            ? [d.name, d.email, d.phone, d.location, ...(d.links || [])].filter((v): v is string => !!v)
            : [];
          setEditItems(deriveEditableItems(loaded.pages, loaded.lines, values));
        } catch {
          if (!cancelled.current) toast.message("Couldn't auto-detect fields — try a different resume.");
        }
      } catch {
        if (!cancelled.current) setError("Could not open this PDF for editing.");
      } finally {
        if (!cancelled.current) setLoading(false);
      }
    })();
    return () => {
      cancelled.current = true;
    };
  }, [file]);

  const itemsById = useMemo(() => {
    const m = new Map<string, PdfTextItem>();
    editItems.forEach((it) => m.set(it.id, it));
    return m;
  }, [editItems]);

  const commitEdit = useCallback((id: string, value: string) => {
    setEdits((prev) => {
      const item = itemsById.get(id);
      const next = { ...prev };
      if (!item || value.trim() === item.str.trim()) {
        delete next[id];
      } else {
        next[id] = value;
      }
      return next;
    });
    setEditingId(null);
  }, [itemsById]);

  const editCount = Object.keys(edits).length;

  // Lock background scroll while the full-screen editor is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const apply = useCallback(async () => {
    if (!pdf) return;
    setApplying(true);
    try {
      const pdfEdits: PdfEdit[] = Object.entries(edits)
        .map(([id, newText]) => {
          const item = itemsById.get(id);
          return item ? { item, newText } : null;
        })
        .filter((e): e is PdfEdit => e !== null);

      if (pdfEdits.length === 0) {
        onApply(file);
        return;
      }

      const bytes = await buildEditedPdf(file, pdfEdits);
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const edited = new File([blob], file.name, { type: "application/pdf" });
      onApply(edited);
    } catch {
      toast.error("Could not save your edits. Try again.");
      setApplying(false);
    }
  }, [pdf, edits, itemsById, file, onApply]);

  // First click warns (small toast); confirming in the toast does the conversion,
  // since it permanently rewrites the PDF and the original can't be recovered.
  const requestConvert = useCallback(() => {
    if (editCount === 0) {
      onApply(file);
      return;
    }
    toast("This permanently changes your resume. To get the original back you'd need to re-upload it.", {
      action: { label: "Convert", onClick: () => void apply() },
      duration: 8000,
    });
  }, [editCount, apply, onApply, file]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <header className="shrink-0 border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-primary text-primary-foreground">
              <ShieldUser className="size-5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-base tracking-tight leading-none">Edit personal info</h2>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                Click any highlighted field to change it before publishing.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={applying}
              className="h-9 rounded-lg border border-border font-heading text-xs uppercase tracking-wider shadow-[var(--shadow-2xs)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] transition-all"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={requestConvert}
              disabled={applying || loading}
              className="h-9 rounded-lg border border-border font-heading text-xs uppercase tracking-wider shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] transition-all"
            >
              {applying ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {editCount > 0 ? "Convert" : "Use as-is"}
            </Button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-auto bg-muted/30 p-4 sm:p-8">
        {loading && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
            <p className="font-heading text-sm uppercase tracking-wider">Opening your resume…</p>
          </div>
        )}

        {error && !loading && (
          <div className="mx-auto mt-10 max-w-md border border-destructive bg-destructive/10 p-5 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="mt-4 rounded-lg border border-border font-heading text-xs uppercase tracking-wider"
            >
              Go back
            </Button>
          </div>
        )}

        {pdf && !error && (
          <div className="mx-auto flex w-fit flex-col items-center gap-6">
            {pdf.pages.map((page) => {
              const pageItems = editItems.filter((it) => it.pageIndex === page.pageIndex);
              return (
                <div
                  key={page.pageIndex}
                  className="relative border border-border bg-white shadow-[var(--shadow-md)]"
                  style={{ width: page.cssWidth, height: page.cssHeight }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={page.dataUrl}
                    alt={`Resume page ${page.pageIndex + 1}`}
                    width={page.cssWidth}
                    height={page.cssHeight}
                    className="block select-none"
                    draggable={false}
                  />
                  {pageItems.map((item) => {
                    const box = itemToCssBox(item, page);
                    const edited = edits[item.id];
                    const isEditing = editingId === item.id;
                    const current = edited ?? item.str;

                    if (isEditing) {
                      return (
                        <EditField
                          key={item.id}
                          box={box}
                          initial={current}
                          onCommit={(v) => commitEdit(item.id, v)}
                          onCancel={() => setEditingId(null)}
                        />
                      );
                    }

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setEditingId(item.id)}
                        title="Click to edit"
                        className={cn(
                          "group absolute flex items-center overflow-hidden rounded-[1px] border transition-colors",
                          edited
                            ? "border-transparent"
                            : "border-primary/50 bg-primary/10 hover:bg-primary/20",
                        )}
                        style={{
                          left: box.left,
                          top: box.top,
                          width: Math.max(box.width, 16),
                          height: box.height,
                          backgroundColor: edited ? rgbCss(item.bg) : undefined,
                        }}
                      >
                        {edited && (
                          <span
                            className="truncate leading-none"
                            style={{
                              color: rgbCss(item.color),
                              fontSize: Math.max(7, box.height * 0.82),
                              fontFamily: item.serif ? "Georgia, 'Times New Roman', serif" : "Arial, Helvetica, sans-serif",
                              fontWeight: item.bold ? 700 : 400,
                              fontStyle: item.italic ? "italic" : "normal",
                            }}
                          >
                            {edited}
                          </span>
                        )}
                        <Pencil className="absolute -right-1 -top-1 size-3 rounded-full bg-primary p-[1px] text-primary-foreground opacity-0 group-hover:opacity-100" />
                      </button>
                    );
                  })}
                </div>
              );
            })}
            <p className="pb-4 text-center text-xs text-muted-foreground">
              Highlighted fields are your detected personal info. Edits replace the text in the PDF you publish.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function EditField({
  box,
  initial,
  onCommit,
  onCancel,
}: {
  box: { left: number; top: number; width: number; height: number };
  initial: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="absolute z-10 flex items-center gap-1" style={{ left: box.left, top: box.top }}>
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit(value);
          if (e.key === "Escape") onCancel();
        }}
        onBlur={() => onCommit(value)}
        className="h-7 min-w-[160px] rounded-lg border border-primary !bg-white !text-black px-1.5 text-sm font-medium shadow-[var(--shadow-2xs)] focus-visible:ring-1"
        style={{ height: Math.max(box.height + 6, 24) }}
      />
      <span className="rounded-[1px] border border-border bg-card px-1 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
        Enter
      </span>
    </div>
  );
}
