'use client';

import { useApiKeys } from '@/hooks/useApiKeys';
import ApiKeyForm from '@/components/ApiKeyForm';
import ApiKeyList from '@/components/ApiKeyList';
import InfoPanel from '@/components/InfoPanel';
import ApiKeyImportExport from '@/components/ApiKeyImportExport';
import NavigationHeader from '@/components/NavigationHeader';
import Notification, { useNotification } from '@/components/Notification';

export default function SettingsPage() {
  const { apiKeys, status, addApiKey, updateApiKey, removeApiKey } = useApiKeys();
  const { notifications, showSuccess, showError, removeNotification } = useNotification();

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader title="API Key 設定" />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <ApiKeyForm
              onAddApiKey={addApiKey}
              isLoading={status === 'saving'}
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <ApiKeyList
              apiKeys={apiKeys}
              onUpdate={updateApiKey}
              onRemove={removeApiKey}
              saveStatus={status}
            />
          </div>

          <ApiKeyImportExport />

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <InfoPanel />
          </div>
        </div>
      </div>

      {/* 通知容器 */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            type={notification.type}
            title={notification.title}
            message={notification.message}
            duration={notification.duration}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </div>
  );
}