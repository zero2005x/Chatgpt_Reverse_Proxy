interface ServiceStatusIndicatorProps {
  service: string;
  status: 'ready' | 'error' | 'loading' | 'not-configured';
  message?: string;
  className?: string;
}

export default function ServiceStatusIndicator({
  service,
  status,
  message,
  className = ''
}: ServiceStatusIndicatorProps) {
  const statusConfig = {
    ready: {
      color: 'bg-green-500',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: '✅',
      label: '已準備'
    },
    error: {
      color: 'bg-red-500',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: '❌',
      label: '錯誤'
    },
    loading: {
      color: 'bg-blue-500',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: '⏳',
      label: '載入中'
    },
    'not-configured': {
      color: 'bg-gray-500',
      textColor: 'text-gray-700',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      icon: '⚙️',
      label: '未設定'
    }
  };

  const config = statusConfig[status];

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}>
      {/* Status dot */}
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${config.color} ${status === 'loading' ? 'animate-pulse' : ''}`} />
        <span className="text-sm font-medium text-gray-900">{service}</span>
      </div>
      
      {/* Status text */}
      <span className={`text-xs font-medium ${config.textColor}`}>
        {config.label}
      </span>
      
      {/* Message tooltip */}
      {message && (
        <div className="group relative">
          <span className="text-xs text-gray-500 cursor-help">?</span>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {message}
          </div>
        </div>
      )}
    </div>
  );
}

// 服務狀態列表組件
export function ServiceStatusList({ 
  services, 
  className = '' 
}: { 
  services: Array<{
    name: string;
    status: 'ready' | 'error' | 'loading' | 'not-configured';
    message?: string;
  }>;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700 mb-2">服務狀態</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {services.map((service) => (
          <ServiceStatusIndicator
            key={service.name}
            service={service.name}
            status={service.status}
            message={service.message}
          />
        ))}
      </div>
    </div>
  );
}