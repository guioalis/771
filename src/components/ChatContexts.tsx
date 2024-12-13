import { MessageSquarePlus, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { ChatContext } from '../types/chat';
import { useState } from 'react';

interface ChatContextsProps {
  contexts: ChatContext[];
  currentContextId: string | null;
  onSelect: (contextId: string) => void;
  onNew: () => void;
  onDelete: (contextId: string) => void;
  onRename: (contextId: string, newName: string) => void;
}

export function ChatContexts({
  contexts,
  currentContextId,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: ChatContextsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const handleStartEdit = (context: ChatContext) => {
    setEditingId(context.id);
    // If it's a new chat with default name, suggest a preview of the first message
    const defaultName = context.name === '新对话' && context.messages.length > 0
      ? getMessagePreview(context.messages[0].content)
      : context.name;
    setEditingName(defaultName);
    setMenuOpenId(null);
  };

  const handleFinishEdit = () => {
    if (editingId && editingName.trim()) {
      onRename(editingId, editingName.trim());
    }
    setEditingId(null);
  };

  const getMessagePreview = (content: string): string => {
    // Remove code blocks and markdown
    const cleanContent = content.replace(/```[\s\S]*?```/g, '')
      .replace(/`.*?`/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '');
    // Get first line or first 20 characters
    const preview = cleanContent.split('\n')[0].trim();
    return preview.length > 20 ? preview.substring(0, 20) + '...' : preview;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  };

  const getContextPreview = (context: ChatContext): string => {
    if (context.messages.length === 0) {
      return '空对话';
    }
    const lastMessage = context.messages[context.messages.length - 1];
    return getMessagePreview(lastMessage.content);
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          <MessageSquarePlus className="w-5 h-5" />
          <span>新对话</span>
        </button>
      </div>

      <div className="space-y-1">
        {contexts.map((context) => (
          <div
            key={context.id}
            className={`relative group px-4 py-3 cursor-pointer hover:bg-gray-100 ${
              currentContextId === context.id ? 'bg-gray-100' : ''
            }`}
            onClick={() => onSelect(context.id)}
          >
            {editingId === context.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleFinishEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFinishEdit();
                    }
                  }}
                  className="flex-1 px-2 py-1 border rounded"
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {context.name}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    {getContextPreview(context)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(context.updatedAt)}
                  </p>
                </div>

                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === context.id ? null : context.id);
                    }}
                    className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>

                  {menuOpenId === context.id && (
                    <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(context);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Pencil className="w-4 h-4" />
                        重命名
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('确定要删除这个对话吗？')) {
                            onDelete(context.id);
                          }
                          setMenuOpenId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        删除对话
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
