"use client";

import { useRef, useCallback } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePinnedMedia } from "@/lib/usePinnedMedia";

/* ===== Tipler ===== */
export interface MediaFile {
  file?: File;
  preview: string;       // normal dosyalarda
  url?: string;          // pinned dosyalarda
  id: string;
  type: "image" | "video";
}

interface Props {
  productImages: MediaFile[];
  setProductImages: React.Dispatch<React.SetStateAction<MediaFile[]>>;
  videoFile: MediaFile | null;
  setVideoFile: React.Dispatch<React.SetStateAction<MediaFile | null>>;
  disabled: boolean;
}

export function ProductMediaSection({
  productImages, setProductImages,
  videoFile, setVideoFile,
  disabled,
}: Props) {

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { pinned, pin, unpin, isPinned } = usePinnedMedia();

  /* ---------- Dosya seç / sürükle ---------- */
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const imgs  = Array.from(files).filter(f => f.type.startsWith("image/"));
    const vids  = Array.from(files).filter(f => f.type.startsWith("video/"));

    if (productImages.length + imgs.length > 10)
      return toast({ variant:"destructive", description:"En fazla 10 resim yükleyebilirsiniz." });

    const newImgs = imgs.map<MediaFile>(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      id: crypto.randomUUID(),
      type: "image",
    }));
    setProductImages(p => [...p, ...newImgs]);

    if (vids.length) {
      if (vids[0].size > 100*1024*1024)
        return toast({ variant:"destructive", description:"Video 100 MB'ı geçemez." });
      if (videoFile) URL.revokeObjectURL(videoFile.preview);
      setVideoFile({
        file: vids[0],
        preview: URL.createObjectURL(vids[0]),
        id: crypto.randomUUID(),
        type: "video",
      });
    }
  }, [productImages.length, setProductImages, videoFile, setVideoFile, toast]);

  /* ---------- Sil ---------- */
  const removeImage = (idx: number) =>
    setProductImages(p => { URL.revokeObjectURL(p[idx].preview); return p.filter((_,i)=>i!==idx); });

  /* ---------- Listeyi oluştur (dupe'siz) ---------- */
  const normal = [...productImages, ...(videoFile ? [videoFile] : [])]
                 .filter(m => !isPinned(m.id));
  const full   = [...normal, ...pinned.map(p => ({ ...p, preview: p.preview ?? p.url! }))];

  /* ---------- Pin toggle ---------- */
  const togglePin = (m: MediaFile) =>
    isPinned(m.id)
      ? unpin(m.id)
      : pin({ id:m.id, url:m.preview, preview:m.preview, type:m.type });

  /* ---------- UI ---------- */
  return (
    <div className="space-y-4">

      <input
        ref={fileInputRef} type="file" accept="image/*,video/*" multiple
        className="hidden" disabled={disabled}
        onChange={e => handleFiles(e.target.files)}
      />

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Medya</h3>
        <span className="text-sm text-gray-500">
          {productImages.length}/10 resim, {videoFile ? 1 : 0}/1 video
        </span>
      </div>

      <div
        className="border-2 border-dashed rounded-lg p-6 text-center"
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        onDragOver={e => e.preventDefault()}
      >
        {full.length === 0 ? (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-gray-400" />
            <p>Dosyaları sürükleyin veya</p>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={disabled}>
              Bilgisayardan Seçin
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {full.map((m, i) => {
              const src = m.preview ?? m.url!;
              return (
                <div key={m.id} className="relative group">
                  {m.type === "video"
                    ? <video src={src} controls className="w-full aspect-square object-cover rounded-md" />
                    : <img   src={src}        className="w-full aspect-square object-cover rounded-md" />}
                  
                  {/* 📌 */}
                  <button
                    onClick={() => togglePin(m)}
                    className={`absolute top-1 left-1 p-1 rounded-full border-4 shadow
                               ${isPinned(m.id) ? "border-orange-600 bg-white" : "border-gray-300 bg-white"}`}
                    style={{fontSize:22,lineHeight:1}}
                    aria-label="Pinle"
                  >📌</button>

                  {/* ❌ sadece normal medyada */}
                  {!isPinned(m.id) && (
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100"
                    ><X className="w-3 h-3"/></button>
                  )}
                </div>
              );
            })}

            {/* + yeni medya */}
            {productImages.length < 10 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center aspect-square border-2 border-dashed rounded-lg"
              >
                <Upload className="h-8 w-8 text-gray-400" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 