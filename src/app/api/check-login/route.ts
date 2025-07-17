import { NextRequest, NextResponse } from 'next/server';
import { authLogger } from '@/utils/logger';
import { ErrorHandler, AuthenticationError, NetworkError } from '@/utils/errorHandling';
import { CommonValidators } from '@/utils/validation';

async function performLogin(username: string, password: string, baseUrl?: string): Promise<string | null> {
  const logger = authLogger.child('performLogin');
  const actualBaseUrl = baseUrl || 'https://dgb01p240102.japaneast.cloudapp.azure.com';
  
  try {
    logger.info('開始登入程序', { 
      username: username.substring(0, 3) + '***',
      baseUrl: actualBaseUrl.replace(/\/\/.*@/, '//***@')
    });
    
    const loginUrl = `${actualBaseUrl}/wise/wiseadm/s/subadmin/2595af81-c151-47eb-9f15-d17e0adbe3b4/login`;
    
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
      'Origin': actualBaseUrl,
      'Referer': loginUrl,
      'Upgrade-Insecure-Requests': '1',
    };
    
    if (initialCookies) {
      loginHeaders['Cookie'] = initialCookies.split(',')[0].split(';')[0];
    }
    
    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: loginHeaders,
      body: loginData.toString(),
      redirect: 'manual',
    });
    
    logger.debug('登入回應狀態', { status: loginResponse.status });
    
    if (loginResponse.status === 302) {
      const setCookieHeaders = loginResponse.headers.get('set-cookie');
      const location = loginResponse.headers.get('location');
      
      logger.debug('處理重定向', { 
        location, 
        hasCookies: !!setCookieHeaders 
      });
      
      if (location && location.includes('login')) {
        logger.warn('重定向到登入頁面，登入失敗');
        return null;
      }
      
      const allCookies = [];
      
      if (setCookieHeaders) {
        const cookies = setCookieHeaders.split(',');
        for (const cookie of cookies) {
          const cookiePart = cookie.split(';')[0].trim();
          if (cookiePart.includes('SESSION=')) {
            logger.debug('找到 SESSION cookie');
            allCookies.push(cookiePart);
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
        logger.info('登入成功，取得會話 cookie');
        return allCookies.join('; ');
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
          logger.info('200 回應登入成功，取得會話 cookie');
          return allCookies.join('; ');
        }
      } else {
        logger.warn('200 回應但無登入成功指標', { 
          hasLoginIndicator: isLoginSuccess,
          hasCookies: !!setCookieHeaders
        });
      }
    } else {
      logger.warn('登入失敗，狀態碼不符預期', { status: loginResponse.status });
    }
    
    return null;
    
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { username, password, baseUrl } = await req.json();
    
    if (!username || !password) {
      return NextResponse.json({ 
        isLoggedIn: false,
        status: 'failed',
        message: '請提供用戶名和密碼'
      }, { status: 400 });
    }

    if (baseUrl) {
      const testUrl = `${baseUrl}/wise/wiseadm/s/subadmin/2595af81-c151-47eb-9f15-d17e0adbe3b4/login`;
      try {
        const testResponse = await fetch(testUrl, { method: 'HEAD' });
        if (!testResponse.ok && testResponse.status !== 404) {
          return NextResponse.json({
            isLoggedIn: false,
            status: 'failed',
            message: '無法連接到指定的服務器'
          });
        }
      } catch {
        return NextResponse.json({
          isLoggedIn: false,
          status: 'failed',
          message: '無法連接到指定的服務器'
        });
      }
    }

    const sessionCookie = await performLogin(username, password, baseUrl);
    
    if (sessionCookie) {
      return NextResponse.json({
        isLoggedIn: true,
        status: 'success',
        message: '登入成功'
      });
    } else {
      return NextResponse.json({
        isLoggedIn: false,
        status: 'failed',
        message: '登入失敗，請檢查用戶名和密碼'
      });
    }
    
  } catch (error) {
    return NextResponse.json({
      isLoggedIn: false,
      status: 'failed',
      message: '檢查登入狀態時發生錯誤'
    }, { status: 500 });
  }
}