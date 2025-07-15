import { NextRequest, NextResponse } from 'next/server';

async function performLogin(username: string, password: string): Promise<string | null> {
  try {
    const baseUrl = 'https://dgb01p240102.japaneast.cloudapp.azure.com';
    const loginUrl = `${baseUrl}/wise/wiseadm/s/subadmin/2595af81-c151-47eb-9f15-d17e0adbe3b4/login`;
    
    const loginPageResponse = await fetch(loginUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    
    if (!loginPageResponse.ok) {
      return null;
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
      'Origin': baseUrl,
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
    
    if (loginResponse.status === 302) {
      const setCookieHeaders = loginResponse.headers.get('set-cookie');
      const location = loginResponse.headers.get('location');
      
      if (location && location.includes('login')) {
        return null;
      }
      
      const allCookies = [];
      
      if (setCookieHeaders) {
        const cookies = setCookieHeaders.split(',');
        for (const cookie of cookies) {
          const cookiePart = cookie.split(';')[0].trim();
          if (cookiePart.includes('SESSION=')) {
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
        return allCookies.join('; ');
      }
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

    const sessionCookie = await performLogin(username, password);
    
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