import { useCallback, useEffect, useRef, useState } from 'react';
import { Message, AVAILABLE_MODELS, ChatContext } from '../types/chat';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { Cat, Settings } from 'lucide-react';
import { SettingsModal } from '../components/SettingsModal';
import { ChatContexts } from '../components/ChatContexts';
import { HfInference } from '@huggingface/inference';

const DEFAULT_API_KEY = 'xai-PDby5aZny9HP02180FkgVPqMMSRVfIABmelIC8qj4Sx6krKynxEX0DYLEaXV6l5URSEZgmfd3fNfjrwU';
const DEFAULT_GEMINI_KEY = 'AIzaSyAT1bpBjZvUzH1TU2hlylZnBYLN-9cMoig';

const STORAGE_KEYS = {
  CONTEXTS: 'chat_contexts',
  API_KEY: 'xai_api_key',
  GEMINI_KEY: 'gemini_api_key',
  CURRENT_CONTEXT: 'current_chat_context'
};

const hf = new HfInference("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");

async function queryFluxApi(messages: Message[]) {
  // 构建提示词，包含历史对话
  let prompt = messages.map(msg => {
    if (msg.role === 'user') {
      return `User: ${msg.content}`;
    } else if (msg.role === 'assistant') {
      return `Assistant: Generated an image based on: ${msg.content}`;
    }
    return '';
  }).join('\n');
  
  // 添加最后的图像生成请求
  prompt += '\nGenerate an image based on the conversation context.';

  const response = await fetch(
    "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev",
    {
      headers: {
        Authorization: "Bearer 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",
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ inputs: prompt }),
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to generate image');
  }

  const blob = await response.blob();
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

export function ChatPage() {
  const [contexts, setContexts] = useState<ChatContext[]>(() => {
    const savedContexts = localStorage.getItem(STORAGE_KEYS.CONTEXTS);
    if (savedContexts) {
      return JSON.parse(savedContexts);
    }
    // Create initial context
    const initialContext: ChatContext = {
      id: 'default',
      name: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    return [initialContext];
  });

  const [currentContextId, setCurrentContextId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_CONTEXT) || 'default';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEYS.API_KEY) || DEFAULT_API_KEY);
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || DEFAULT_GEMINI_KEY);
  const [selectedModel, setSelectedModel] = useState('grok-beta');
  const [streamingResponse, setStreamingResponse] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentContext = contexts.find(c => c.id === currentContextId) || contexts[0];
  const messages = currentContext.messages;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONTEXTS, JSON.stringify(contexts));
  }, [contexts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_CONTEXT, currentContextId);
  }, [currentContextId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingResponse]);

  const handleSaveSettings = (newApiKey: string, newModel: string, newGeminiKey: string) => {
    setApiKey(newApiKey);
    setGeminiKey(newGeminiKey);
    setSelectedModel(newModel);
    localStorage.setItem(STORAGE_KEYS.API_KEY, newApiKey);
    localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, newGeminiKey);
  };

  const createNewContext = () => {
    const newContext: ChatContext = {
      id: Date.now().toString(),
      name: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setContexts(prev => [...prev, newContext]);
    setCurrentContextId(newContext.id);
  };

  const deleteContext = (contextId: string) => {
    setContexts(prev => prev.filter(c => c.id !== contextId));
    if (currentContextId === contextId) {
      setCurrentContextId(contexts[0].id);
    }
  };

  const renameContext = (contextId: string, newName: string) => {
    setContexts(prev => prev.map(c => 
      c.id === contextId ? { ...c, name: newName } : c
    ));
  };

  const updateContextMessages = (contextId: string, messages: Message[]) => {
    setContexts(prev => prev.map(c => 
      c.id === contextId 
        ? { 
            ...c, 
            messages, 
            updatedAt: Date.now() 
          } 
        : c
    ));
  };

  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel);

  const sendMessage = useCallback(async (content: string, image?: string) => {
    const userMessage: Message = { 
      role: 'user', 
      content,
      image
    };
    const newMessages = [...messages, userMessage];
    updateContextMessages(currentContextId, newMessages);
    setIsLoading(true);
    setStreamingResponse('');

    try {
      if (selectedModel === 'flux-1') {
        // 将完整的对话历史传递给 FLUX API
        const generatedImageBase64 = await queryFluxApi(newMessages);
        const assistantMessage: Message = {
          role: 'assistant',
          content: '已基于对话上下文生成图片',
          image: generatedImageBase64
        };
        updateContextMessages(currentContextId, [...newMessages, assistantMessage]);
      } else if (selectedModel === 'gemini-flash') {
        if (!geminiKey) {
          throw new Error('请先在设置中配置Gemini API密钥');
        }

        // 构建对话历史
        const history = newMessages.map(msg => ({
          role: msg.role === 'user' ? "user" : "model",
          parts: [
            { text: msg.content },
            ...(msg.image ? [{
              inlineData: {
                mimeType: "image/jpeg",
                data: msg.image.split(',')[1] || msg.image
              }
            }] : [])
          ]
        }));

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: history,
            generationConfig: {
              temperature: 1,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
              responseMimeType: "text/plain"
            }
          })
        });

        if (!response.ok) {
          throw new Error('API请求失败，请检查你的Gemini API密钥是否正确');
        }

        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;
        
        const assistantMessage: Message = {
          role: 'assistant',
          content: generatedText
        };
        
        updateContextMessages(currentContextId, [...newMessages, assistantMessage]);
      } else {
        if (!apiKey) {
          throw new Error('请先在设置中配置你的 x.ai API密钥才能开始对话哦！');
        }

        // 构建完整的对话历史
        const fullMessages = [
          { 
            role: 'system', 
            content: 'You are a friendly cat-themed AI assistant named MeowGPT. Respond in Chinese in a helpful and playful manner.'
          },
          ...messages,
          userMessage
        ];

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            messages: fullMessages,
            model: selectedModel,
            stream: false,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          throw new Error('API请求失败，请检查你的API密钥是否正确');
        }

        const data = await response.json();
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.choices[0].message.content
        };
        
        updateContextMessages(currentContextId, [...newMessages, assistantMessage]);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : '服务器响应出错，请稍后再试';
      updateContextMessages(currentContextId, [
        ...newMessages,
        {
          role: 'assistant',
          content: `喵呜... ${errorMessage}`
        }
      ]);
    } finally {
      setIsLoading(false);
      setStreamingResponse('');
    }
  }, [messages, apiKey, geminiKey, selectedModel, currentContextId]);

  return (
    <main className="flex-1 flex">
      <ChatContexts
        contexts={contexts}
        currentContextId={currentContextId}
        onSelect={setCurrentContextId}
        onNew={createNewContext}
        onDelete={deleteContext}
        onRename={renameContext}
      />

      <div className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm">设置</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col h-[600px]">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.length === 0 && (
              <div className="text-center py-4">
                <h2 className="text-xl font-medium text-gray-700 mb-2">
                  哈喽，很高兴认识你！
                </h2>
                <p className="text-gray-600">
                  我叫喵哥，一个集成了多个AI模型的智能助手，快来和我聊天吧！
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  当前使用模型: {currentModel?.name}
                  {currentModel?.isImageGenerator && ' (图像生成)'}
                  {currentModel?.supportsImages && ' (支持视觉识别)'}
                </p>
              </div>
            )}
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            {isLoading && (
              <div className="space-y-4">
                {streamingResponse && (
                  <ChatMessage 
                    message={{
                      role: 'assistant',
                      content: streamingResponse
                    }}
                  />
                )}
                <div className="flex gap-2 items-center text-gray-500">
                  <Cat className="w-5 h-5 animate-bounce" />
                  <span>
                    {currentModel?.isImageGenerator ? '生成图片中...' : '思考中...'}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput 
            onSend={sendMessage} 
            disabled={isLoading}
            modelSupportsImages={currentModel?.supportsImages || false}
          />
        </div>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveSettings}
          currentApiKey={apiKey}
          currentSambanovaKey={geminiKey}
          currentModel={selectedModel}
        />
      </div>
    </main>
  );
}
