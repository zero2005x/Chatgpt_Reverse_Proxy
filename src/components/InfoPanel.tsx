export default function InfoPanel() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">安全提醒</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• API Key 儲存在瀏覽器的 Local Storage 中</li>
          <li>• 請勿在共用電腦上儲存敏感的 API Key</li>
          <li>• 所有 API 請求都通過後端處理，確保 Key 不會洩漏</li>
          <li>• 建議定期更換 API Key</li>
        </ul>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-medium text-green-900 mb-2">支援的服務</h3>
        <div className="text-sm text-green-800 space-y-2">
          <div><strong>國際:</strong> OpenAI, Google, Azure, Cohere 等</div>
          <div><strong>歐洲:</strong> Mistral AI</div>
          <div><strong>俄羅斯:</strong> YandexGPT</div>
          <div><strong>中國:</strong> Doubao, Qwen, Ernie 等</div>
        </div>
      </div>
    </div>
  );
}