'use client';

import { useState, useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  X, 
  GripVertical,
  FolderOpen 
} from 'lucide-react';

export interface MediaFile {
  file: File;
  preview: string;
  id: string;
}

interface ProductMediaManagerProps {
  productImages: MediaFile[];
  videoFile: MediaFile | null;
  onImagesChange: (images: MediaFile[]) => void;
  onVideoChange: (video: MediaFile | null) => void;
  isSubmitting?: boolean;
}

// Draggable Image Component
interface DraggableImageProps {
  mediaFile: MediaFile;
  index: number;
  moveImage: (dragIndex: number, hoverIndex: number) => void;
  removeImage: (index: number) => void;
  isSubmitting?: boolean;
}

const DraggableImage = ({ mediaFile, index, moveImage, removeImage, isSubmitting }: DraggableImageProps) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'image',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'image',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveImage(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`relative group border-2 border-dashed border-gray-300 rounded-lg p-2 hover:border-blue-400 transition-colors ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="relative">
        <img
          src={mediaFile.preview}
          alt={`Görsel ${index + 1}`}
          className="w-full h-24 object-cover rounded"
        />
        <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
          {index + 1}
        </div>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => removeImage(index)}
          disabled={isSubmitting}
        >
          <X className="h-3 w-3" />
        </Button>
        <div className="absolute bottom-1 right-1 cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-white drop-shadow-md" />
        </div>
      </div>
    </div>
  );
};

export default function ProductMediaManager({
  productImages,
  videoFile,
  onImagesChange,
  onVideoChange,
  isSubmitting = false
}: ProductMediaManagerProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleImageUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newImages: MediaFile[] = [];
    
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        newImages.push({
          file,
          preview,
          id: Math.random().toString(36).substr(2, 9)
        });
      }
    });

    onImagesChange([...productImages, ...newImages]);
  }, [productImages, onImagesChange]);

  const handleVideoUpload = useCallback((file: File) => {
    if (file.type.startsWith('video/')) {
      const preview = URL.createObjectURL(file);
      onVideoChange({
        file,
        preview,
        id: Math.random().toString(36).substr(2, 9)
      });
    }
  }, [onVideoChange]);

  const handleFolderUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleImageUpload(files);
    }
  }, [handleImageUpload]);

  const moveImage = useCallback((dragIndex: number, hoverIndex: number) => {
    const newImages = [...productImages];
    const draggedImage = newImages[dragIndex];
    newImages.splice(dragIndex, 1);
    newImages.splice(hoverIndex, 0, draggedImage);
    onImagesChange(newImages);
  }, [productImages, onImagesChange]);

  const removeImage = useCallback((index: number) => {
    const newImages = productImages.filter((_, i) => i !== index);
    onImagesChange(newImages);
  }, [productImages, onImagesChange]);

  const removeVideo = useCallback(() => {
    if (videoFile) {
      URL.revokeObjectURL(videoFile.preview);
      onVideoChange(null);
    }
  }, [videoFile, onVideoChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    handleImageUpload(files);
  }, [handleImageUpload]);

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 flex items-center justify-center bg-gray-100 rounded-full">
            <Upload className="w-6 h-6 text-gray-600" />
          </div>
          
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Resimleri sürükle bırak veya seç
            </p>
            
            <div className="flex gap-2 justify-center">
              <label htmlFor="image-upload">
                <Button type="button" variant="outline" size="sm" disabled={isSubmitting} asChild>
                  <span>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Resim Seç
                  </span>
                </Button>
              </label>
              
              <label htmlFor="folder-upload">
                <Button type="button" variant="outline" size="sm" disabled={isSubmitting} asChild>
                  <span>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Klasör Seç
                  </span>
                </Button>
              </label>
              
              <label htmlFor="video-upload">
                <Button type="button" variant="outline" size="sm" disabled={isSubmitting} asChild>
                  <span>
                    <Video className="w-4 h-4 mr-2" />
                    Video Seç
                  </span>
                </Button>
              </label>
            </div>
          </div>
          
          <Input
            id="image-upload"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageUpload(e.target.files)}
            disabled={isSubmitting}
          />
          
          <Input
            id="folder-upload"
            type="file"
            multiple
            accept="image/*"
            webkitdirectory=""
            className="hidden"
            onChange={handleFolderUpload}
            disabled={isSubmitting}
          />
          
          <Input
            id="video-upload"
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleVideoUpload(file);
            }}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Images Grid */}
      {productImages.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Ürün Görselleri ({productImages.length})
            </Label>
            <Badge variant="outline" className="text-xs">
              Sıralamak için sürükle
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {productImages.map((mediaFile, index) => (
              <DraggableImage
                key={mediaFile.id}
                mediaFile={mediaFile}
                index={index}
                moveImage={moveImage}
                removeImage={removeImage}
                isSubmitting={isSubmitting}
              />
            ))}
          </div>
        </div>
      )}

      {/* Video Preview */}
      {videoFile && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Ürün Videosu</Label>
          <div className="relative group border-2 border-dashed border-gray-300 rounded-lg p-2">
            <video
              src={videoFile.preview}
              className="w-full h-32 object-cover rounded"
              controls
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={removeVideo}
              disabled={isSubmitting}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}