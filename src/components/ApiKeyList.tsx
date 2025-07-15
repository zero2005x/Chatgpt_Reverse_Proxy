import { ApiKey } from '@/types/message';
import ApiKeyListItem from './ApiKeyListItem';

interface ApiKeyListProps {
  apiKeys: ApiKey[];
  onUpdate: (index: number, field: keyof ApiKey, value: string) => void;
  onRemove: (index: number) => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

export default function ApiKeyList({ apiKeys, onUpdate, onRemove, saveStatus }: ApiKeyListProps) {
  if (apiKeys.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">已儲存的 API Keys</h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>尚未設定任何 API Key</p>
          <p className="text-sm mt-1">請在上方新增您的第一個 API Key</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">已儲存的 API Keys</h2>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-blue-600 text-sm">💾 儲存中...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-green-600 text-sm">✓ 已儲存</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-600 text-sm">✗ 儲存失敗</span>
          )}
        </div>
      </div>
      
      <div className="space-y-3">
        {apiKeys.map((apiKey, index) => (
          <ApiKeyListItem
            key={`${apiKey.service}-${index}`}
            apiKey={apiKey}
            index={index}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}