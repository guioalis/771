import { Cat, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Message } from '../types/chat';
import { useState, useRef, useEffect } from 'react';
import { CodeBlock } from './CodeBlock';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLongMessage, setIsLongMessage] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const COLLAPSE_THRESHOLD = 300; // Height in pixels before showing collapse option

  useEffect(() => {
    if (contentRef.current) {
      setIsLongMessage(contentRef.current.scrollHeight > COLLAPSE_THRESHOLD);
    }
  }, [message.content]);

  // Function to parse code blocks from content
  const parseContent = (content: string) => {
    const parts = [];
    let currentIndex = 0;
    const codeBlockRegex = /```([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > currentIndex) {
        parts.push({
          type: 'text',
          content: content.slice(currentIndex, match.index)
        });
      }

      // Add code block
      parts.push({
        type: 'code',
        content: match[1].trim()
      });

      currentIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (currentIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(currentIndex)
      });
    }

    return parts.length > 0 ? parts : [{ type: 'text', content }];
  };

  return (
    <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
              <Cat className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
        <div
          className={`rounded-2xl px-4 py-2.5 relative ${
            isUser
              ? 'bg-blue-500 text-white rounded-tr-none'
              : 'bg-gray-100 text-gray-800 rounded-tl-none'
          }`}
        >
          {message.image && (
            <div className="mb-2">
              <img
                src={message.image}
                alt="Uploaded content"
                className="max-w-full rounded-lg"
                style={{ maxHeight: '200px' }}
              />
            </div>
          )}
          <div 
            ref={contentRef}
            className={`whitespace-pre-wrap break-words leading-relaxed text-[15px] relative ${
              isCollapsed ? 'max-h-[300px] overflow-hidden' : ''
            }`}
          >
            {parseContent(message.content).map((part, index) => {
              if (part.type === 'code') {
                return (
                  <CodeBlock
                    key={index}
                    code={part.content}
                    isUserMessage={isUser}
                  />
                );
              }
              return <span key={index}>{part.content}</span>;
            })}
          </div>

          {/* Collapse/Expand button */}
          {isLongMessage && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`mt-2 flex items-center gap-1 text-sm ${
                isUser ? 'text-blue-100' : 'text-gray-500'
              } hover:underline`}
            >
              {isCollapsed ? (
                <>
                  展开全部
                  <ChevronDown className="w-4 h-4" />
                </>
              ) : (
                <>
                  收起内容
                  <ChevronUp className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
