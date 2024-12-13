import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface CodeBlockProps {
  code: string;
  isUserMessage: boolean;
}

export function CodeBlock({ code, isUserMessage }: CodeBlockProps) {
  const [showCopied, setShowCopied] = useState(false);

  const handleCopy = () => {
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = code;
    textarea.style.position = 'fixed'; // Prevent scrolling to bottom
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);

    try {
      // Select and copy the text
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);

      // Show success state
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
      
      toast.success('代码已复制到剪贴板', {
        style: {
          background: '#10B981',
          color: '#fff',
        },
        duration: 2000,
        icon: '📋',
      });
    } catch (err) {
      console.error('Copy failed:', err);
      toast.error('复制失败，请手动复制', {
        style: {
          background: '#EF4444',
          color: '#fff',
        },
        duration: 3000,
      });
    } finally {
      // Clean up
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="relative my-2 group">
      <div
        className={`p-3 rounded-lg font-mono text-sm overflow-x-auto ${
          isUserMessage ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <div className="absolute right-2 top-2">
          <button
            onClick={handleCopy}
            className={`
              flex items-center gap-1 px-2 py-1 rounded
              transition-all duration-200 ease-in-out
              ${isUserMessage 
                ? 'hover:bg-blue-700 bg-blue-700/50 text-white'
                : 'hover:bg-gray-300 bg-gray-300/50 text-gray-600'
              }
              opacity-0 group-hover:opacity-100
              transform group-hover:translate-y-0 translate-y-1
            `}
            title="复制代码"
          >
            {showCopied ? (
              <>
                <Check className="w-4 h-4" />
                <span className="text-sm">已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="text-sm">复制</span>
              </>
            )}
          </button>
        </div>
        <pre className="whitespace-pre-wrap break-words">
          {code}
        </pre>
      </div>
    </div>
  );
}
