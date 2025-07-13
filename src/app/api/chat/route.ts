import { NextRequest, NextResponse } from 'next/server';

// Rate limiting storage
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Security configuration
const SECURITY_CONFIG = {
  MAX_MESSAGE_LENGTH: 10000,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 50,
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 100,
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 10,
  ALLOWED_FILE_TYPES: ['text/plain', 'text/csv', 'application/pdf']
};

// Security validation functions
function validateInput(username: string, password: string, message?: string): void {
  // Username validation
  if (!username || username.length < SECURITY_CONFIG.MIN_USERNAME_LENGTH || username.length > SECURITY_CONFIG.MAX_USERNAME_LENGTH) {
    throw new Error('用戶名長度必須在 3-50 字符之間');
  }
  
  // Password validation
  if (!password || password.length < SECURITY_CONFIG.MIN_PASSWORD_LENGTH || password.length > SECURITY_CONFIG.MAX_PASSWORD_LENGTH) {
    throw new Error('密碼長度必須在 6-100 字符之間');
  }
  
  // Message length validation
  if (message && message.length > SECURITY_CONFIG.MAX_MESSAGE_LENGTH) {
    throw new Error('訊息長度不能超過 10000 字符');
  }
  
  // Check for malicious content
  if (message) {
    const maliciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i
    ];
    if (maliciousPatterns.some(pattern => pattern.test(message))) {
      throw new Error('訊息包含不允許的內容');
    }
  }
}

function validateFileUpload(file: { data?: string; content?: string }): string | null {
  if (!file || !file.data) return null;
  
  // Validate data URI format
  const dataUriPattern = /^data:([a-zA-Z0-9][a-zA-Z0-9\/\+\-]*);base64,([A-Za-z0-9+\/]+=*)$/;
  if (!dataUriPattern.test(file.data)) {
    throw new Error('無效的檔案格式');
  }
  
  // Check allowed file types
  const [, mimeType] = file.data.match(/^data:([^;]+);base64,/) || [];
  if (!SECURITY_CONFIG.ALLOWED_FILE_TYPES.includes(mimeType)) {
    throw new Error(`不支援的檔案類型。允許的類型: ${SECURITY_CONFIG.ALLOWED_FILE_TYPES.join(', ')}`);
  }
  
  // File size validation
  const base64Data = file.data.split(',')[1];
  const fileSize = (base64Data.length * 3) / 4;
  if (fileSize > SECURITY_CONFIG.MAX_FILE_SIZE) {
    throw new Error('檔案大小不能超過 5MB');
  }
  
  return file.data;
}

function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const clientData = requestCounts.get(clientIP) || { 
    count: 0, 
    resetTime: now + SECURITY_CONFIG.RATE_LIMIT_WINDOW 
  };
  
  if (now > clientData.resetTime) {
    clientData.count = 1;
    clientData.resetTime = now + SECURITY_CONFIG.RATE_LIMIT_WINDOW;
  } else {
    clientData.count++;
  }
  
  requestCounts.set(clientIP, clientData);
  return clientData.count <= SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS;
}

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

// Function to get API key from the admin system
async function getApiKey(sessionCookie: string): Promise<string | null> {
  try {
    console.log('正在嘗試獲取 API Key...');
    
    const baseUrl = 'https://dgb01p240102.japaneast.cloudapp.azure.com';
    
    // 可能的 API Key 獲取端點
    const apiKeyEndpoints = [
      `${baseUrl}/wise/wiseadm/s/subadmin/2595af81-c151-47eb-9f15-d17e0adbe3b4/api/key`,
      `${baseUrl}/wise/wiseadm/s/promptportal/portal/apikey`,
      `${baseUrl}/wise/wiseadm/s/api/config`,
      `${baseUrl}/wise/wiseadm/s/settings/apikey`,
      `${baseUrl}/wise/wiseadm/s/account/apikey`
    ];

    const headers: HeadersInit = {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      'X-KL-kis-Ajax-Request': 'Ajax_Request',
      'X-Requested-With': 'XMLHttpRequest',
      'Cookie': sessionCookie,
    };

    for (const endpoint of apiKeyEndpoints) {
      try {
        console.log('嘗試從端點獲取 API Key');
        const response = await fetch(endpoint, {
          method: 'GET',
          headers
        });

        if (response.ok) {
          const data = await response.json();
          console.log('API Key 端點回應成功');
          
          // 嘗試從不同的欄位中提取 API Key
          if (data.apiKey) return data.apiKey;
          if (data.api_key) return data.api_key;
          if (data.key) return data.key;
          if (data.token) return data.token;
          if (data.accessToken) return data.accessToken;
          if (typeof data === 'string' && data.length > 10) return data;
        }
      } catch {
        console.log('API Key 端點請求失敗');
      }
    }

    // 如果無法從 API 獲取，嘗試從頁面配置中解析
    try {
      console.log('嘗試從管理頁面獲取 API Key...');
      const configUrl = `${baseUrl}/wise/wiseadm/s/promptportal/portal`;
      const configResponse = await fetch(configUrl, {
        method: 'GET',
        headers: {
          ...headers,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
        }
      });

      if (configResponse.ok) {
        const html = await configResponse.text();
        
        // 嘗試從 HTML 中提取 API Key
        const apiKeyPatterns = [
          /apikey["\s]*[:=]["\s]*([a-f0-9]{20,})/i,
          /api[_-]?key["\s]*[:=]["\s]*["']([a-f0-9]{20,})["']/i,
          /token["\s]*[:=]["\s]*["']([a-f0-9]{20,})["']/i,
          /key["\s]*[:=]["\s]*["']([a-f0-9]{20,})["']/i
        ];

        for (const pattern of apiKeyPatterns) {
          const match = html.match(pattern);
          if (match && match[1]) {
            console.log('從頁面配置中找到 API Key');
            return match[1];
          }
        }
      }
    } catch {
      console.log('從頁面獲取 API Key 失敗');
    }

    console.log('無法獲取動態 API Key');
    return null;
    
  } catch {
    console.error('獲取 API Key 過程中發生錯誤');
    return null;
  }
}

// Function to verify portal access
async function verifyPortalAccess(sessionCookie: string): Promise<boolean> {
  try {
    const portalUrl = 'https://dgb01p240102.japaneast.cloudapp.azure.com/wise/wiseadm/s/promptportal/portal';
    
    const response = await fetch(portalUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Cookie': sessionCookie,
        'Upgrade-Insecure-Requests': '1'
      }
    });

    console.log('Portal 存取測試回應狀態:', response.status);
    
    if (response.status === 200) {
      const html = await response.text();
      
      // 檢查是否包含 portal 的關鍵內容，而不是被重定向到登入頁面
      const hasPortalContent = html.includes('promptportal') || html.includes('portal') || html.includes('prompt');
      const isLoginPage = html.includes('login') && html.includes('loginName');
      
      console.log('Portal 內容檢查:', { hasPortalContent, isLoginPage });
      
      // 如果包含 portal 內容且不是登入頁面，表示存取成功
      return hasPortalContent && !isLoginPage;
    }
    
    return false;
  } catch {
    console.error('Portal 存取驗證失敗');
    return false;
  }
}

// Function to perform fresh login for each request
async function performFreshLogin(username: string, password: string): Promise<string | null> {
  try {
    console.log('開始進行新的登入...');
    
    const baseUrl = 'https://dgb01p240102.japaneast.cloudapp.azure.com';
    const loginUrl = `${baseUrl}/wise/wiseadm/s/subadmin/2595af81-c151-47eb-9f15-d17e0adbe3b4/login`;
    
    // Step 1: 取得登入頁面
    console.log('正在取得登入頁面...');
    const loginPageResponse = await fetch(loginUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    
    if (!loginPageResponse.ok) {
      console.error('無法取得登入頁面:', loginPageResponse.status);
      return null;
    }
    
    // 提取初始 cookies
    const initialCookies = loginPageResponse.headers.get('set-cookie');
    console.log('取得初始 cookies:', initialCookies ? '成功' : '無');
    
    // Step 2: 提交登入表單（使用正確的欄位名稱）
    const loginData = new URLSearchParams();
    loginData.append('loginName', username);
    loginData.append('intumitPswd', password);
    loginData.append('selectedLocale', 'zh_TW');  // 設定語言
    loginData.append('keepUser', 'false');  // 不保持登入狀態
    
    const loginHeaders: HeadersInit = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      'Origin': baseUrl,
      'Referer': loginUrl,
      'Upgrade-Insecure-Requests': '1',
    };
    
    // 加入初始 cookies
    if (initialCookies) {
      loginHeaders['Cookie'] = initialCookies.split(',')[0].split(';')[0];
    }
    
    console.log('正在提交登入資料...');
    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: loginHeaders,
      body: loginData.toString(),
      redirect: 'manual', // 手動處理重定向
    });
    
    console.log('登入回應狀態:', loginResponse.status);
    
    // 處理登入回應
    if (loginResponse.status === 302) {
      const setCookieHeaders = loginResponse.headers.get('set-cookie');
      const location = loginResponse.headers.get('location');
      
      console.log('收到重定向回應');
      console.log('會話 cookies:', setCookieHeaders ? '已取得' : '無');
      
      // 檢查重定向是否指向成功頁面而非登入頁面
      if (location && location.includes('login')) {
        console.log('重定向回登入頁面，表示登入失敗');
        return null;
      }
      
      // 組合所有 cookies，優先使用最新的 SESSION cookie
      const allCookies = [];
      
      // 首先從登入回應中提取 SESSION cookie
      if (setCookieHeaders) {
        const cookies = setCookieHeaders.split(',');
        for (const cookie of cookies) {
          const cookiePart = cookie.split(';')[0].trim();
          if (cookiePart.includes('SESSION=')) {
            allCookies.push(cookiePart);
            console.log('找到新的 SESSION cookie');
          }
        }
      }
      
      // 然後添加其他必要的 cookies
      if (initialCookies) {
        const cookies = initialCookies.split(',');
        for (const cookie of cookies) {
          const cookiePart = cookie.split(';')[0].trim();
          if (cookiePart.includes('SmartRobot.') || cookiePart.includes('hazelcast.')) {
            allCookies.push(cookiePart);
          }
        }
      }
      
      // 添加固定的 tenant UUID cookie
      allCookies.push('SmartRobot.lastTenantUuid=2595af81-c151-47eb-9f15-d17e0adbe3b4');
      
      if (allCookies.length > 0) {
        const sessionCookie = allCookies.join('; ');
        console.log('組合的會話 cookie 成功');
        return sessionCookie;
      }
    }
    
    console.error('登入失敗，狀態碼:', loginResponse.status);
    return null;
    
  } catch {
    console.error('登入過程中發生錯誤');
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting check
    const clientIP = getClientIP(req);
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json({ 
        error: '請求過於頻繁，請稍後再試。每分鐘最多允許 10 次請求。' 
      }, { status: 429 });
    }

    // 檢查請求體是否存在
    const contentLength = req.headers.get('content-length');
    const contentType = req.headers.get('content-type');
    
    console.log('收到請求 - Content-Length:', contentLength, 'Content-Type:', contentType);
    
    if (!contentLength || contentLength === '0') {
      return NextResponse.json({ 
        error: '請求體為空。請提供 JSON 格式的請求體，包含 message 欄位。' 
      }, { status: 400 });
    }
    
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json({ 
        error: '請求格式錯誤。請使用 application/json Content-Type。' 
      }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      console.error('JSON 解析錯誤');
      return NextResponse.json({ 
        error: 'JSON 格式錯誤。請檢查請求體格式。' 
      }, { status: 400 });
    }

    const { message, id, file, username, password } = body;

    if (!message && !file) {
      return NextResponse.json({ 
        error: '缺少必要參數。請提供 message 或 file 欄位。' 
      }, { status: 400 });
    }

    if (!username || !password) {
      return NextResponse.json({ 
        error: '缺少登入認證資訊。請提供 username 和 password 欄位。' 
      }, { status: 400 });
    }

    // Validate input
    try {
      validateInput(username, password, message);
    } catch (validationError) {
      return NextResponse.json({ 
        error: validationError instanceof Error ? validationError.message : '輸入驗證失敗' 
      }, { status: 400 });
    }

    console.log('收到聊天請求:', { messageLength: message?.length, id, hasFile: !!file, hasCredentials: !!(username && password) });

    // 準備檔案和訊息內容
    let fileContent = null;
    if (file) {
      try {
        if (file.content) {
          // 將文件內容轉為 base64
          const contentBase64 = Buffer.from(file.content, 'utf-8').toString('base64');
          fileContent = `data:text/plain;base64,${contentBase64}`;
          console.log('使用文件內容轉換為 base64');
        } else {
          fileContent = validateFileUpload(file);
          if (fileContent) {
            console.log('使用提供的文件 data URI');
          }
        }
      } catch (fileError) {
        return NextResponse.json({ 
          error: fileError instanceof Error ? fileError.message : '檔案驗證失敗' 
        }, { status: 400 });
      }
    }

    // 每次請求都進行新的登入
    console.log('正在進行新的登入程序...');
    const sessionCookie = await performFreshLogin(username, password);
    
    if (!sessionCookie) {
      return NextResponse.json({ 
        error: '登入失敗，無法取得有效的會話。請檢查您的帳號密碼是否正確。',
        details: '無法登入到 AI 系統，請確認：\n1. 帳號密碼正確\n2. 您有該系統的存取權限\n3. 網路連接正常'
      }, { status: 401 });
    }

    console.log('登入成功，取得會話 cookie');

    // 驗證是否能存取 portal 頁面
    console.log('正在驗證 portal 存取權限...');
    const portalAccessValid = await verifyPortalAccess(sessionCookie);
    
    if (!portalAccessValid) {
      return NextResponse.json({ 
        error: '登入成功，但無法存取 AI Portal。請確認您的帳號有使用 AI 模組的權限。',
        details: '您的帳號可能沒有 Prompt Portal 的存取權限，請聯絡系統管理員。'
      }, { status: 403 });
    }

    console.log('Portal 存取權限驗證通過');

    // 獲取動態 API Key
    console.log('正在獲取動態 API Key...');
    const dynamicApiKey = await getApiKey(sessionCookie);
    console.log('獲取到的 API Key:', dynamicApiKey ? '成功' : '無');

    // 首先訪問 form 頁面建立正確的會話狀態並提取可能的 CSRF token
    const baseUrl = 'https://dgb01p240102.japaneast.cloudapp.azure.com';
    const formId = id || '13';
    const formPageUrl = `${baseUrl}/wise/wiseadm/s/promptportal/portal/form?id=${formId}`;
    
    console.log('正在訪問 form 頁面建立會話狀態...');
    let csrfToken = null;
    let formSessionCookie = sessionCookie;
    
    try {
      const formResponse = await fetch(formPageUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
          'Cookie': sessionCookie,
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      if (formResponse.ok) {
        const html = await formResponse.text();
        console.log('Form 頁面訪問成功，正在分析...');
        
        // 嘗試提取 CSRF token
        const csrfPatterns = [
          /name="_token"\s+value="([^"]+)"/i,
          /name="csrf_token"\s+value="([^"]+)"/i,
          /name="authenticity_token"\s+value="([^"]+)"/i,
          /<meta\s+name="csrf-token"\s+content="([^"]+)"/i,
          /csrfToken["\s]*[:=]["\s]*["']([^"']+)["']/i
        ];
        
        for (const pattern of csrfPatterns) {
          const match = html.match(pattern);
          if (match && match[1]) {
            csrfToken = match[1];
            console.log('找到 CSRF token');
            break;
          }
        }
        
        // 檢查是否有新的 cookies
        const newCookies = formResponse.headers.get('set-cookie');
        if (newCookies) {
          console.log('從 form 頁面取得新的 cookies');
          const cookieParts = newCookies.split(',').map(c => c.split(';')[0].trim());
          formSessionCookie = [sessionCookie, ...cookieParts].join('; ');
        }
        
        console.log('Form 頁面會話狀態已建立');
      } else {
        console.log('Form 頁面訪問失敗:', formResponse.status);
      }
    } catch (error) {
      console.log('訪問 form 頁面時發生錯誤:', error);
    }
    
    // 端點選項（優化後的版本）
    const apiEndpoints = [
      // 選項1: 🎯 真正的AI完成端點 (基於HAR分析的正確格式)
      {
        url: `${baseUrl}/wise/wiseadm/s/promptportal/portal/completion?id=${formId}&action=completion`,
        payload: (() => {
          const params = new URLSearchParams();
          
          // 添加檔案內容（如果有的話）
          if (fileContent) {
            params.append('USERUPLOADFILE', fileContent);
            console.log('添加檔案內容到 USERUPLOADFILE');
          } else {
            // 如果沒有檔案，使用訊息內容作為假檔案
            const contentBase64 = Buffer.from(message, 'utf-8').toString('base64');
            const dataUri = `data:text/plain;base64,${contentBase64}`;
            params.append('USERUPLOADFILE', dataUri);
            console.log('使用訊息內容作為檔案');
          }
          
          // 添加用戶輸入訊息
          params.append('USERPROMPT', message);
          
          if (csrfToken) {
            params.append('_token', csrfToken);
            params.append('csrf_token', csrfToken);
          }
          return params;
        })(),
        method: 'POST',
        description: '真正的AI完成端點 (HAR分析正確格式)'
      },
      // 選項2: 嘗試帶API Key的版本 (使用正確的 ag 參數)
      {
        url: `${baseUrl}/wise/wiseadm/s/promptportal/portal/completion?id=${formId}&action=completion&apikey=${dynamicApiKey}`,
        payload: (() => {
          let dataUri;
          
          if (file && file.data && file.data.startsWith('data:')) {
            dataUri = file.data;
          } else {
            const contentBase64 = Buffer.from(message, 'utf-8').toString('base64');
            dataUri = `data:text/plain;base64,${contentBase64}`;
          }
          
          const params = new URLSearchParams([
            ['AG1', dataUri],  // 使用正確的參數名
            ['TEXT1', 'text input']
          ]);
          if (csrfToken) {
            params.append('_token', csrfToken);
          }
          return params;
        })(),
        method: 'POST',
        description: 'AI完成端點 (ag參數+API Key+文件支援)'
      },
      // 選項3: 嘗試簡化的正確格式
      {
        url: `${baseUrl}/wise/wiseadm/s/promptportal/portal/completion?id=${formId}&action=completion`,
        payload: (() => {
          const params = new URLSearchParams();
          
          if (fileContent) {
            params.append('USERUPLOADFILE', fileContent);
          } else {
            const contentBase64 = Buffer.from(message, 'utf-8').toString('base64');
            const dataUri = `data:text/plain;base64,${contentBase64}`;
            params.append('USERUPLOADFILE', dataUri);
          }
          
          params.append('USERPROMPT', message);
          return params;
        })(),
        method: 'POST',
        description: 'AI完成端點 (簡化ag參數+文件支援)'
      },
      // 選項3: 嘗試portal form submit
      {
        url: `${baseUrl}/wise/wiseadm/s/promptportal/portal/form/submit?id=${id || '13'}&apikey=${dynamicApiKey}`,
        payload: JSON.stringify({
          INPUT: message
        }),
        method: 'POST',
        contentType: 'application/json',
        description: 'Portal Form Submit端點'
      },
      // 選項3: 嘗試prompt執行端點
      {
        url: `${baseUrl}/wise/api/prompt/execute?apikey=${dynamicApiKey}`,
        payload: JSON.stringify({
          INPUT: message,
          id: id || '13'
        }),
        method: 'POST',
        contentType: 'application/json',
        description: 'Prompt Execute API端點'
      },
      // 選項4: 嘗試portal執行端點
      {
        url: `${baseUrl}/wise/wiseadm/s/promptportal/portal/execute?apikey=${dynamicApiKey}`,
        payload: JSON.stringify({
          INPUT: message,
          id: id || '13'
        }),
        method: 'POST',
        contentType: 'application/json',
        description: 'Portal Execute端點'
      },
      // 選項6: 嘗試chat端點
      {
        url: `${baseUrl}/wise/api/chat?apikey=${dynamicApiKey}`,
        payload: JSON.stringify({
          INPUT: message,
          input: message,
          id: id || '13'
        }),
        method: 'POST',
        contentType: 'application/json',
        description: 'AI Chat API端點'
      },
      // 選項7: 嘗試不同格式的執行端點
      {
        url: `${baseUrl}/wise/wiseadm/s/promptportal/portal/run?id=${id || '13'}&apikey=${dynamicApiKey}`,
        payload: new URLSearchParams([
          ['INPUT', message],
          ['input', message]
        ]),
        method: 'POST',
        description: 'Portal Run端點 (form data)'
      }
    ];

    console.log('嘗試多個 API 端點...');

    for (const endpoint of apiEndpoints) {
      console.log(`正在嘗試: ${endpoint.description}`);

      const headers: HeadersInit = {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'X-KL-kis-Ajax-Request': 'Ajax_Request',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://dgb01p240102.japaneast.cloudapp.azure.com',
        'Referer': formPageUrl,
        'Cookie': formSessionCookie,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };

      // 設置 Content-Type 基於 endpoint 配置
      if (endpoint.payload) {
        if (endpoint.contentType) {
          headers['Content-Type'] = endpoint.contentType;
        } else {
          headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
        }
      }

      // 所有端點都使用相同的基本headers，不需要特殊處理

      try {
        const fetchOptions: RequestInit = {
          method: endpoint.method || 'POST',
          headers,
        };

        // 只有在有 payload 的情況下才添加 body
        if (endpoint.payload) {
          fetchOptions.body = typeof endpoint.payload === 'string' ? endpoint.payload : endpoint.payload.toString();
        }

        const aiResponse = await fetch(endpoint.url, fetchOptions);

        console.log(`${endpoint.description} - 狀態: ${aiResponse.status}, Content-Type: ${aiResponse.headers.get('content-type')}`);

        // 如果這個端點成功返回 JSON，就使用它
        const responseContentType = aiResponse.headers.get('content-type');
        if (aiResponse.ok && responseContentType && responseContentType.includes('application/json')) {
          console.log('找到有效的端點！正在解析回應...');
          const aiData = await aiResponse.json();
          console.log('AI 回應資料接收成功');

          // 提取回應訊息
          let completion;
          if (aiData.completion) {
            completion = aiData.completion;
          } else if (aiData.result) {
            completion = aiData.result;
          } else if (aiData.response) {
            completion = aiData.response;
          } else if (aiData.reply) {
            completion = aiData.reply;
          } else if (aiData.answer) {
            completion = aiData.answer;
          } else if (aiData.message) {
            completion = aiData.message;
          } else if (aiData.output) {
            completion = aiData.output;
          } else if (aiData.text) {
            completion = aiData.text;
          } else if (aiData.content) {
            completion = aiData.content;
          } else if (typeof aiData === 'string') {
            completion = aiData;
          } else {
            completion = JSON.stringify(aiData);
          }

          console.log('AI 回應完成');
          return NextResponse.json({ reply: completion });
        } else {
          // 記錄失敗的回應以便調試
          console.log(`${endpoint.description} - 失敗回應:`, {
            status: aiResponse.status,
            statusText: aiResponse.statusText,
            contentType: aiResponse.headers.get('content-type')
          });
        }

      } catch {
        console.log(`${endpoint.description} - 請求錯誤`);
      }
    }

    // 如果所有端點都失敗，返回失敗訊息
    console.log('所有 AI 端點都失敗。');
    
    const testResponse = {
      error: "所有 AI API 端點都無法正常回應，服務暫時無法使用。",
      status: "failed",
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(testResponse);
    
  } catch (error: unknown) {
    console.error('處理聊天請求時發生錯誤');
    const errorMessage = error instanceof Error ? error.message : '發生未知錯誤';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}