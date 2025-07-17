import { NextRequest, NextResponse } from 'next/server';
import { authLogger } from '@/utils/logger';
import { ErrorHandler, AuthenticationError, NetworkError, ValidationError } from '@/utils/errorHandling';

async function performLogin(username: string, password: string, baseUrl: string): Promise<string | null> {
  const logger = authLogger.child('performLogin');
  
  try {
    logger.info('開始登入程序', { 
      username: username.substring(0, 3) + '***', 
      baseUrl: baseUrl.replace(/\/\/.*@/, '//***@') 
    });
    const loginUrl = `${baseUrl}/wise/wiseadm/s/subadmin/2595af81-c151-47eb-9f15-d17e0adbe3b4/login`;
    
    logger.debug('發送登入頁面請求', { loginUrl });
    
    const loginPageResponse = await ErrorHandler.withTimeout(
      () => fetch(loginUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      }),
      15000,
      '登入頁面請求超時'
    );
    
    if (!loginPageResponse.ok) {
      logger.warn('登入頁面請求失敗', { 
        status: loginPageResponse.status, 
        statusText: loginPageResponse.statusText 
      });
      throw new NetworkError(`無法存取登入頁面: ${loginPageResponse.status}`);
    }
    
    const initialCookies = loginPageResponse.headers.get('set-cookie');
    logger.debug('取得初始 cookies', { hasCookies: !!initialCookies });
    
    const loginData = new URLSearchParams();
    loginData.append('loginName', username);
    loginData.append('intumitPswd', password);
    loginData.append('selectedLocale', 'zh_TW');
    loginData.append('keepUser', 'false');
    
    const loginHeaders: HeadersInit = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      'Origin': baseUrl,
      'Referer': loginUrl,
      'Upgrade-Insecure-Requests': '1',
    };
    
    if (initialCookies) {
      loginHeaders['Cookie'] = initialCookies.split(',')[0].split(';')[0];
    }

    logger.debug('發送登入請求');
    
    const loginResponse = await ErrorHandler.withTimeout(
      () => fetch(loginUrl, {
        method: 'POST',
        headers: loginHeaders,
        body: loginData.toString(),
        redirect: 'manual',
      }),
      15000,
      '登入請求超時'
    );
    
    logger.debug('登入回應狀態', { status: loginResponse.status });
    
    if (loginResponse.status === 302) {
      const setCookieHeaders = loginResponse.headers.get('set-cookie');
      const location = loginResponse.headers.get('location');
      
      logger.debug('處理重定向', { location, hasCookies: !!setCookieHeaders });
      
      if (location && location.includes('login')) {
        logger.warn('重定向回登入頁面，認證失敗');
        throw new AuthenticationError('登入失敗，用戶名或密碼錯誤');
      }
      
      const allCookies = [];
      
      if (setCookieHeaders) {
        const cookies = setCookieHeaders.split(',');
        for (const cookie of cookies) {
          const cookiePart = cookie.split(';')[0].trim();
          if (cookiePart.includes('SESSION=')) {
            allCookies.push(cookiePart);
            logger.debug('找到 SESSION cookie');
          }
        }
      }
      
      if (initialCookies) {
        const cookies = initialCookies.split(',');
        for (const cookie of cookies) {
          const cookiePart = cookie.split(';')[0].trim();
          if (cookiePart.includes('SmartRobot.') || cookiePart.includes('hazelcast.')) {
            allCookies.push(cookiePart);
          }
        }
      }
      
      allCookies.push('SmartRobot.lastTenantUuid=2595af81-c151-47eb-9f15-d17e0adbe3b4');
      
      if (allCookies.length > 0) {
        const sessionCookie = allCookies.join('; ');
        logger.info('登入成功，取得會話 cookie');
        return sessionCookie;
      }
    } else if (loginResponse.status === 200) {
      // 檢查 200 回應是否包含成功登入的指標
      logger.debug('收到 200 回應，檢查內容');
      
      const setCookieHeaders = loginResponse.headers.get('set-cookie');
      const responseText = await loginResponse.text();
      
      // 檢查回應是否包含成功登入的指標
      const isLoginSuccess = responseText.includes('dashboard') || 
                           responseText.includes('portal') ||
                           responseText.includes('SmartRobot') ||
                           (setCookieHeaders && setCookieHeaders.includes('SESSION='));
      
      if (isLoginSuccess && setCookieHeaders) {
        logger.debug('200 回應包含登入成功指標');
        
        const allCookies = [];
        
        const cookies = setCookieHeaders.split(',');
        for (const cookie of cookies) {
          const cookiePart = cookie.split(';')[0].trim();
          if (cookiePart.includes('SESSION=')) {
            logger.debug('在 200 回應中找到 SESSION cookie');
            allCookies.push(cookiePart);
          }
        }
        
        if (initialCookies) {
          const cookies = initialCookies.split(',');
          for (const cookie of cookies) {
            const cookiePart = cookie.split(';')[0].trim();
            if (cookiePart.includes('SmartRobot.') || cookiePart.includes('hazelcast.')) {
              allCookies.push(cookiePart);
            }
          }
        }
        
        allCookies.push('SmartRobot.lastTenantUuid=2595af81-c151-47eb-9f15-d17e0adbe3b4');
        
        if (allCookies.length > 0) {
          const sessionCookie = allCookies.join('; ');
          logger.info('200 回應登入成功，取得會話 cookie');
          return sessionCookie;
        }
      } else {
        logger.warn('200 回應但無登入成功指標', { 
          hasLoginIndicator: isLoginSuccess,
          hasCookies: !!setCookieHeaders
        });
        throw new AuthenticationError('登入失敗，用戶名或密碼錯誤');
      }
    }

    logger.warn('登入失敗，狀態碼不符預期', { status: loginResponse.status });
    throw new AuthenticationError('登入失敗，伺服器回應異常');
    
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof NetworkError) {
      throw error;
    }
    
    logger.error('登入過程發生錯誤', error);
    throw new AuthenticationError('登入過程中發生錯誤，請稍後再試');
  }
}

async function checkPortalAccess(sessionCookie: string, baseUrl: string): Promise<{ hasAccess: boolean; data?: any[]; message?: string }> {
  const logger = authLogger.child('checkPortalAccess');
  
  try {
    const portalUrl = `${baseUrl}/wise/wiseadm/s/promptportal/portal`;
    
    logger.debug('檢查 Portal 存取權限', { portalUrl });
    
    const response = await ErrorHandler.withTimeout(
      () => fetch(portalUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
          'Cookie': sessionCookie,
          'Upgrade-Insecure-Requests': '1'
        }
      }),
      15000,
      'Portal 存取檢查超時'
    );

    logger.debug('Portal 存取回應', { status: response.status });

    if (response.status === 200) {
      const html = await response.text();
      
      const hasPortalContent = html.includes('promptportal') || html.includes('portal') || html.includes('prompt');
      const isLoginPage = html.includes('login') && html.includes('loginName');
      
      logger.debug('Portal 內容分析', { hasPortalContent, isLoginPage });
      
      if (hasPortalContent && !isLoginPage) {
        const data: any[] = [];
        
        try {
          // Extract table data
          const tableMatches = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
          if (tableMatches) {
            for (const table of tableMatches) {
              const rowMatches = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
              if (rowMatches) {
                for (const row of rowMatches.slice(1)) {
                  const cellMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
                  if (cellMatches) {
                    const rowData = cellMatches.map(cell => 
                      cell.replace(/<[^>]*>/g, '').trim()
                    ).filter(text => text.length > 0);
                    if (rowData.length > 0) {
                      data.push(rowData);
                    }
                  }
                }
              }
            }
          }
          
          // Extract list data
          const listMatches = html.match(/<ul[^>]*>[\s\S]*?<\/ul>/gi) || html.match(/<ol[^>]*>[\s\S]*?<\/ol>/gi);
          if (listMatches) {
            for (const list of listMatches) {
              const itemMatches = list.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
              if (itemMatches) {
                const listData = itemMatches.map(item => 
                  item.replace(/<[^>]*>/g, '').trim()
                ).filter(text => text.length > 0);
                if (listData.length > 0) {
                  data.push(...listData);
                }
              }
            }
          }
        } catch (parseError) {
          logger.warn('解析 Portal 內容時發生錯誤', { error: String(parseError) });
        }
        
        logger.info('Portal 存取權限驗證成功', { dataCount: data.length });
        
        return { 
          hasAccess: true, 
          data: data.length > 0 ? data : ['Portal 頁面載入成功'],
          message: '成功存取 Portal 頁面' 
        };
      } else {
        logger.warn('被重定向到登入頁面或缺少 Portal 內容');
        return { 
          hasAccess: false, 
          message: '被重定向到登入頁面，可能權限不足' 
        };
      }
    }
    
    logger.warn('Portal 存取失敗', { status: response.status });
    return { 
      hasAccess: false, 
      message: `HTTP 錯誤: ${response.status}` 
    };
  } catch (error) {
    logger.error('檢查 Portal 存取權限時發生錯誤', error);
    return { 
      hasAccess: false, 
      message: '連接失敗' 
    };
  }
}

export async function POST(req: NextRequest) {
  const logger = authLogger.child('POST');
  
  try {
    logger.info('收到存取權限檢查請求');
    
    const { username, password, baseUrl } = await req.json();
    
    // Input validation
    if (!username || !password || !baseUrl) {
      logger.warn('缺少必要參數', { hasUsername: !!username, hasPassword: !!password, hasBaseUrl: !!baseUrl });
      throw new ValidationError('請提供用戶名、密碼和服務器 URL');
    }

    // Server connectivity test
    try {
      const testUrl = `${baseUrl}/wise/wiseadm/s/promptportal/portal`;
      logger.debug('測試伺服器連接', { testUrl });
      
      await ErrorHandler.withTimeout(
        () => fetch(testUrl, { method: 'HEAD' }),
        10000,
        '伺服器連接測試超時'
      );
    } catch (connectError) {
      logger.error('無法連接到指定的服務器', connectError);
      throw new NetworkError('無法連接到指定的服務器');
    }

    logger.info('開始執行登入和存取權限檢查');
    
    const sessionCookie = await performLogin(username, password, baseUrl);
    
    if (!sessionCookie) {
      logger.warn('登入失敗，無法取得會話 cookie');
      throw new AuthenticationError('登入失敗，請檢查用戶名和密碼');
    }

    const accessResult = await checkPortalAccess(sessionCookie, baseUrl);
    
    logger.info('存取權限檢查完成', { 
      hasAccess: accessResult.hasAccess,
      dataCount: accessResult.data?.length || 0
    });
    
    return NextResponse.json({
      hasAccess: accessResult.hasAccess,
      status: accessResult.hasAccess ? 'success' : 'failed',
      data: accessResult.data,
      message: accessResult.message
    });
    
  } catch (error) {
    const handledError = ErrorHandler.handleApiError(error, 'check-access');
    const clientError = ErrorHandler.getClientSafeError(handledError);
    
    logger.error('存取權限檢查失敗', handledError);
    
    return NextResponse.json({
      hasAccess: false,
      status: 'failed',
      message: clientError.message
    }, { status: clientError.statusCode });
  }
}