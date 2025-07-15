'use client';

import { useApiKeys } from '@/hooks/useApiKeys';
import ApiKeyForm from '@/components/ApiKeyForm';
import ApiKeyList from '@/components/ApiKeyList';
import InfoPanel from '@/components/InfoPanel';
import ApiKeyImportExport from '@/components/ApiKeyImportExport';
import Link from 'next/link';

export default function SettingsPage() {
  const { apiKeys, status, addApiKey, updateApiKey, removeApiKey } = useApiKeys();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 導航 */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← 返回首頁
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">API Key 設定</h1>
          <div className="flex space-x-3">
            <Link
              href="/docs"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              格式說明
            </Link>
            <Link
              href="/chat"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              開始聊天
            </Link>
          </div>
        </div>
        
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
    </div>
  );
}