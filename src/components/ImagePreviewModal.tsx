import { X } from 'lucide-react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
}

export function ImagePreviewModal({ isOpen, onClose, imageUrl }: ImagePreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 z-10"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
        <div className="p-4">
          <img
            src={imageUrl}
            alt="Preview"
            className="w-full h-auto rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
