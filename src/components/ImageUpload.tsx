import { Image as ImageIcon, X, Loader2, Maximize2 } from 'lucide-react';
import { useRef, useState, DragEvent, useEffect } from 'react';
import { ImagePreviewModal } from './ImagePreviewModal';

interface ImageUploadProps {
  onImageSelect: (base64Image: string) => void;
  onClear: () => void;
  selectedImage?: string;
}

export function ImageUpload({ onImageSelect, onClear, selectedImage }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            await processFile(file);
            break;
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return '请选择图片文件 (JPG, PNG, GIF等)';
    }

    if (file.size > 5 * 1024 * 1024) {
      return '图片大小不能超过5MB';
    }

    return null;
  };

  const processFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Compress image if it's too large
      const compressedFile = await compressImage(file);
      const base64 = await convertToBase64(compressedFile);
      onImageSelect(base64);
    } catch (err) {
      setError('图片处理失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Max dimension
        const MAX_DIMENSION = 1920;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          0.9
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;
    await processFile(file);
  };

  const convertToBase64 = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">处理图片中...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />
      
      {selectedImage ? (
        <div className="relative inline-block group">
          <img
            src={selectedImage}
            alt="Selected"
            className="h-6 w-6 rounded object-cover cursor-pointer"
            onClick={() => setIsPreviewOpen(true)}
          />
          <button
            onClick={(e) => {
              e.preventDefault();
              onClear();
            }}
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="absolute -top-1 -left-1 bg-gray-800 text-white rounded-full p-0.5 hover:bg-gray-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div
          ref={dropZoneRef}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 cursor-pointer
            ${isDragging ? 'text-amber-500' : ''}
            relative
          `}
          title="点击上传图片，或将图片拖拽到此处（支持粘贴）"
        >
          <ImageIcon className="w-5 h-5" />
          {isDragging && (
            <div className="absolute inset-0 -m-2 border-2 border-amber-500 border-dashed rounded-lg bg-amber-50 bg-opacity-50" />
          )}
        </div>
      )}

      {error && (
        <div className="absolute bottom-full left-0 mb-2 w-48">
          <div className="bg-red-50 text-red-500 text-sm py-1 px-2 rounded-lg border border-red-200">
            {error}
          </div>
        </div>
      )}

      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={selectedImage || ''}
      />
    </div>
  );
}
