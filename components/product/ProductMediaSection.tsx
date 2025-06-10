import { useState, useRef } from 'react';
import { Upload, X, Loader2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';

export interface MediaFile {
  file: File;
  preview: string;
  uploading: boolean;
  error?: string;
  uploaded?: boolean;
}

interface ProductMediaSectionProps {
  productImages: MediaFile[];
  setProductImages: (images: MediaFile[]) => void;
  videoFile: MediaFile | null;
  setVideoFile: (file: MediaFile | null) => void;
}

export function ProductMediaSection({
  productImages,
  setProductImages,
  videoFile,
  setVideoFile
}: ProductMediaSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resim yükleme işlemi
  const handleImageUpload = async (files: FileList | File[]) => {
    const newImages = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false
    }));

    if (productImages.length + newImages.length > 10) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Maksimum 10 resim yükleyebilirsiniz."
      });
      return;
    }

    setProductImages([...productImages, ...newImages]);
  };

  // Video yükleme işlemi
  const handleVideoUpload = async (file: File) => {
    if (videoFile) {
      URL.revokeObjectURL(videoFile.preview);
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Video boyutu 100MB'dan küçük olmalıdır."
      });
      return;
    }

    setVideoFile({
      file,
      preview: URL.createObjectURL(file),
      uploading: false
    });
  };

  // Sürükle-bırak işlemleri
  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    const videoFiles = Array.from(files).filter(file => file.type.startsWith('video/'));

    if (imageFiles.length > 0) {
      handleImageUpload(imageFiles as unknown as FileList);
    }

    if (videoFiles.length > 0) {
      handleVideoUpload(videoFiles[0]);
    }
  };

  // Resim silme
  const handleRemoveImage = (index: number) => {
    const newImages = [...productImages];
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    setProductImages(newImages);
  };

  // Resim sırasını değiştirme
  const moveImage = (dragIndex: number, hoverIndex: number) => {
    const newImages = [...productImages];
    const draggedImage = newImages[dragIndex];
    newImages.splice(dragIndex, 1);
    newImages.splice(hoverIndex, 0, draggedImage);
    setProductImages(newImages);
  };

  return (
    <div className="space-y-4">
      {/* BAŞLIK VE RESİM/VIDEO SAYACI */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Medya</h3>
        <div className="text-sm text-gray-500">
          {productImages.length}/10 resim, {videoFile ? 1 : 0}/1 video
        </div>
      </div>

      {/* VİDEO ÖNİZLEME KARTI */}
      {videoFile && (
        <div className="mt-4 space-y-2">
          <h4 className="text-md font-medium text-gray-700">Video</h4>
          <div className="relative group rounded-lg overflow-hidden border p-2 bg-slate-50">
            <video
              src={videoFile.preview}
              controls={!videoFile.uploading}
              className="w-full rounded-md max-h-64 aspect-video object-cover"
            />
            {videoFile.uploading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="mt-2 text-sm">Video Etsy'e yükleniyor...</p>
              </div>
            )}
            {videoFile.error && (
              <div className="absolute bottom-2 left-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded text-center">
                {videoFile.error}
              </div>
            )}
            {!videoFile.uploading && (
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(videoFile.preview);
                  setVideoFile(null);
                }}
                className="absolute top-2 right-2 z-10 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* SÜRÜKLE-BIRAK ALANI VE RESİM LİSTESİ */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary/50"
        }`}
        onDrop={handleImageDrop}
        onDragOver={e => e.preventDefault()}
        onDragEnter={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={e => {
          e.preventDefault();
          setIsDragging(false);
        }}
      >
        {productImages.length === 0 && !videoFile ? (
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium mb-1">Medya dosyalarını buraya sürükleyin</p>
            <p className="text-sm text-gray-500 mb-4">veya</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Bilgisayardan Seçin
            </Button>
            <p className="text-xs text-gray-500 mt-4">
              PNG, JPG, GIF veya MP4/QuickTime video • Resim başına max. 20MB
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {productImages.map((image, index) => (
              <div
                key={`${index}-${image.preview}`}
                className="relative group aspect-square rounded-lg overflow-hidden border"
              >
                <img
                  src={image.preview}
                  alt={`Ürün resmi ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {image.uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                )}
                {image.error && (
                  <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs p-1 text-center">
                    {image.error}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-2 right-2 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                >
                  <X className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            ))}
            {productImages.length < 10 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <Upload className="w-6 h-6 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Medya Ekle</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Gizli dosya input'u */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            const imageFiles = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
            const videoFiles = Array.from(e.target.files).filter(file => file.type.startsWith('video/'));
            
            if (imageFiles.length > 0) {
              handleImageUpload(imageFiles as unknown as FileList);
            }
            
            if (videoFiles.length > 0) {
              handleVideoUpload(videoFiles[0]);
            }
          }
        }}
      />
    </div>
  );
} 