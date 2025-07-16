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
        
        <div className="flex space-x-1">
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
            <p className="text-sm">尚無對話紀錄</p>
            <p className="text-xs mt-1">點擊上方按鈕開始新對話</p>
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
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate text-sm">
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
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(session);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="重新命名"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('確定要刪除這個對話嗎？')) {
                            onDeleteSession(session.id);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="刪除"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
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