import { Message } from '@/types/message';
import { useState } from 'react';

interface ChatMessageProps {
  message: Message;
  isLast?: boolean;
}

export default function ChatMessage({ message, isLast = false }: ChatMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isUser = message.role === 'user';
  const timestamp = new Date(message.timestamp).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const shouldTruncate = message.content.length > 300;
  const displayContent = shouldTruncate && !isExpanded 
    ? message.content.substring(0, 300) + '...'
    : message.content;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div className={`
          rounded-lg px-4 py-3
          ${isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-100 text-gray-800 border border-gray-200'
          }
        `}>
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {displayContent}
          </div>
          
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`text-sm mt-2 underline ${
                isUser ? 'text-blue-200 hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              {isExpanded ? '收起' : '展開'}
            </button>
          )}
        </div>
        
        <div className={`flex items-center mt-2 text-xs text-gray-500 ${
          isUser ? 'justify-end' : 'justify-start'
        }`}>
          <span>{timestamp}</span>
          {!isUser && message.model && (
            <span className="ml-2 px-2 py-1 bg-gray-200 rounded-full text-xs">
              {message.model}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}