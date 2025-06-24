"use client";

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export interface MediaFile {
  file: File;
  preview: string;
}

interface ProductMediaSectionProps {
  productImages: MediaFile[];
  setProductImages: React.Dispatch<React.SetStateAction<MediaFile[]>>;
  videoFile: MediaFile | null;
  setVideoFile: React.Dispatch<React.SetStateAction<MediaFile | null>>;
  disabled: boolean;
  onImageUpload?: (file: File) => Promise<void>;
  isGenerating?: boolean;
}

export function ProductMediaSection({ 
  productImages, 
  setProductImages, 
  videoFile, 
  setVideoFile, 
  disabled,
  onImageUpload,
  isGenerating = false
}: ProductMediaSectionProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const videoFiles = Array.from(files).filter(f => f.type.startsWith('video/'));

    if ((productImages || []).length + imageFiles.length > 10) {
      return toast({ variant: "destructive", description: "En fazla 10 resim yükleyebilirsiniz." });
    }
    
    const newImages: MediaFile[] = imageFiles.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setProductImages(prev => [...(prev || []), ...newImages]);

    // İlk resim yüklendiğinde otomatik içerik üretme
    if (imageFiles.length > 0 && (productImages || []).length === 0) {
      try {
        setIsProcessing(true);
        const firstImage = imageFiles[0];
        const reader = new FileReader();
        
        reader.onload = async (e) => {
          if (!e.target?.result) {
            setIsProcessing(false);
            return;
          }
          
          // Base64 formatına dönüştür
          const base64String = e.target.result.toString().split(',')[1];
          const imageType = firstImage.type.split('/')[1];
          
          try {
            // Tüm içeriği tek seferde oluştur
            const response = await fetch('/api/ai/generate-all', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageBase64: base64String,
                imageType
              })
            });
            
            if (!response.ok) {
              throw new Error("İçerik oluşturulamadı");
            }
            
            if (onImageUpload) {
              await onImageUpload(firstImage);
            }
          } catch (error) {
            console.error("İçerik üretme hatası:", error);
          } finally {
            setIsProcessing(false);
          }
        };
        
        reader.onerror = () => {
          console.error("Resim okunamadı");
          setIsProcessing(false);
        };
        
        reader.readAsDataURL(firstImage);
      } catch (error) {
        console.error("İçerik üretme hatası:", error);
        setIsProcessing(false);
      }
    }

    if (videoFiles.length > 0) {
      if (videoFiles[0].size > 100 * 1024 * 1024) {
        return toast({ variant: "destructive", description: "Video boyutu 100MB'ı geçemez."});
      }
      if (videoFile) URL.revokeObjectURL(videoFile.preview);
      setVideoFile({ file: videoFiles[0], preview: URL.createObjectURL(videoFiles[0]) });
    }
  }, [(productImages || []).length, setProductImages, videoFile, setVideoFile, toast, onImageUpload]);

  const handleRemoveImage = useCallback((index: number) => {
    setProductImages(prev => {
      const updatedImages = [...prev];
      URL.revokeObjectURL(updatedImages[index].preview);
      updatedImages.splice(index, 1);
      return updatedImages;
    });
  }, [setProductImages]);

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} disabled={disabled || isProcessing} />
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Medya</h3>
        <span className="text-sm text-gray-500">{(productImages || []).length}/10 resim, {videoFile ? 1 : 0}/1 video</span>
      </div>
      <div className="border-2 border-dashed rounded-lg p-6 text-center" onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }} onDragOver={(e) => e.preventDefault()} data-testid="media-upload-area">
        {(productImages || []).length === 0 && !videoFile ? (
          <div className="flex flex-col items-center gap-2">
            {isProcessing ? (
              <>
                <Loader2 className="h-10 w-10 text-gray-400 animate-spin" />
                <p>İçerik üretiliyor...</p>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-gray-400" />
                <p>Dosyaları sürükleyin veya</p>
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={disabled || isProcessing}>Bilgisayardan Seçin</Button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {productImages.map((img, idx) => (
              <div key={idx} className="relative group">
                <img src={img.preview} alt="" className="w-full aspect-square object-cover rounded-md" />
                <button 
                  type="button" 
                  onClick={() => handleRemoveImage(idx)} 
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100"
                  disabled={isProcessing}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {(productImages || []).length < 10 && (
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="flex items-center justify-center aspect-square border-2 border-dashed rounded-lg"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                ) : (
                  <Upload className="h-8 w-8 text-gray-400" />
                )}
              </button>
            )}
          </div>
        )}
      </div>
      {videoFile && (
        <div className="relative group">
          <video src={videoFile.preview} controls className="w-full rounded-lg" />
          <button 
            type="button" 
            onClick={() => { if(videoFile) URL.revokeObjectURL(videoFile.preview); setVideoFile(null); }} 
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100"
            disabled={isProcessing}
          >
            <X className="w-4 h-4"/>
          </button>
        </div>
      )}
    </div>
  );
} 