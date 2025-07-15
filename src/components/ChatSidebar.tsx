import { ChatSession } from '@/types/message';
import { useState } from 'react';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  onImportSessions: (file: File) => void;
  onExportSessions: () => void;
}

export default function ChatSidebar({ 
  sessions, 
  currentSessionId, 
  onSessionSelect, 
  onNewSession,
  onDeleteSession,
  onRenameSession,
  onImportSessions,
  onExportSessions
}: ChatSidebarProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleStartEdit = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditingName(session.name);
  };

  const handleFinishEdit = (sessionId: string) => {
    if (editingName.trim()) {
      onRenameSession(sessionId, editingName.trim());
    }
    setEditingSessionId(null);
    setEditingName('');
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportSessions(file);
    }
    e.target.value = '';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-64 lg:w-72 xl:w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* 頂部按鈕 */}
      <div className="p-3 border-b border-gray-200">
        <button
          onClick={onNewSession}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-2 text-sm"
        >
          新增對話
        </button>
        
        <div className="flex space-x-1">{/* 縮小按鈕間距 */}
          <label className="flex-1 px-2 py-1.5 bg-green-600 text-white rounded text-xs text-center cursor-pointer hover:bg-green-700 transition-colors">
            匯入
            <input
              type="file"
              accept=".json,.csv,.xlsx"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
          <button
            onClick={onExportSessions}
            className="flex-1 px-2 py-1.5 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colors"
          >
            匯出
          </button>
        </div>
      </div>

      {/* 對話列表 */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>尚無對話紀錄</p>
            <p className="text-sm mt-1">點擊上方按鈕開始新對話</p>
          </div>
        ) : (
          <div className="p-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                  currentSessionId === session.id
                    ? 'bg-blue-100 border-l-4 border-blue-600'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => onSessionSelect(session.id)}
              >
                <div className="flex items-center justify-between">
                  {editingSessionId === session.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleFinishEdit(session.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleFinishEdit(session.id);
                        } else if (e.key === 'Escape') {
                          setEditingSessionId(null);
                          setEditingName('');
                        }
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {session.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(session.lastModified)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {session.messages.length} 則訊息
                      </p>
                    </div>
                  )}
                  
                  {editingSessionId !== session.id && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(session);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="重新命名"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('確定要刪除這個對話嗎？')) {
                            onDeleteSession(session.id);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors ml-1"
                        title="刪除"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}