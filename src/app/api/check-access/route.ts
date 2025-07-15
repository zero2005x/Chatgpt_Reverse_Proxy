import { NextRequest, NextResponse } from 'next/server';

async function performLogin(username: string, password: string, baseUrl: string): Promise<string | null> {
  try {
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

async function checkPortalAccess(sessionCookie: string, baseUrl: string): Promise<{ hasAccess: boolean; data?: any[]; message?: string }> {
  try {
    const portalUrl = `${baseUrl}/wise/wiseadm/s/promptportal/portal`;
    
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

    if (response.status === 200) {
      const html = await response.text();
      
      const hasPortalContent = html.includes('promptportal') || html.includes('portal') || html.includes('prompt');
      const isLoginPage = html.includes('login') && html.includes('loginName');
      
      if (hasPortalContent && !isLoginPage) {
        const data: any[] = [];
        
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
        
        return { 
          hasAccess: true, 
          data: data.length > 0 ? data : ['Portal 頁面載入成功'],
          message: '成功存取 Portal 頁面' 
        };
      } else {
        return { 
          hasAccess: false, 
          message: '被重定向到登入頁面，可能權限不足' 
        };
      }
    }
    
    return { 
      hasAccess: false, 
      message: `HTTP 錯誤: ${response.status}` 
    };
  } catch (error) {
    return { 
      hasAccess: false, 
      message: '連接失敗' 
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { username, password, baseUrl } = await req.json();
    
    if (!username || !password || !baseUrl) {
      return NextResponse.json({ 
        hasAccess: false,
        status: 'failed',
        message: '請提供用戶名、密碼和服務器 URL'
      }, { status: 400 });
    }

    try {
      const testUrl = `${baseUrl}/wise/wiseadm/s/promptportal/portal`;
      const testResponse = await fetch(testUrl, { 
        method: 'HEAD'
      });
    } catch {
      return NextResponse.json({
        hasAccess: false,
        status: 'failed',
        message: '無法連接到指定的服務器'
      });
    }

    const sessionCookie = await performLogin(username, password, baseUrl);
    
    if (!sessionCookie) {
      return NextResponse.json({
        hasAccess: false,
        status: 'failed',
        message: '登入失敗，請檢查用戶名和密碼'
      });
    }

    const accessResult = await checkPortalAccess(sessionCookie, baseUrl);
    
    return NextResponse.json({
      hasAccess: accessResult.hasAccess,
      status: accessResult.hasAccess ? 'success' : 'failed',
      data: accessResult.data,
      message: accessResult.message
    });
    
  } catch (error) {
    return NextResponse.json({
      hasAccess: false,
      status: 'failed',
      message: '檢查存取權限時發生錯誤'
    }, { status: 500 });
  }
}