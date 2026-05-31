/**
 * Solapi (구 Coolsms) SMS 게이트웨이 클라이언트.
 *
 * HMAC-SHA256 서명 기반 인증이라 IP 화이트리스트 불필요 — Vercel 서버리스에서 동작.
 *
 * 환경변수:
 *   SOLAPI_API_KEY    — Solapi 콘솔 → 개발자센터 → API Key 에서 발급
 *   SOLAPI_API_SECRET — 위 키 발급 시 1회 표시되는 시크릿
 *   SOLAPI_SENDER     — 사전등록한 발신번호 (숫자만, 예: 01012345678)
 *   SOLAPI_TEST_MODE  — 'Y' 면 시뮬레이션 엔드포인트로 호출(실 발송 X, 과금 X)
 */
import { createHmac, randomBytes } from 'node:crypto';

const SEND_URL = 'https://api.solapi.com/messages/v4/send';

export interface SmsSendResult {
  ok: boolean;
  /** Solapi statusCode (2000번대 = 성공) */
  resultCode: string;
  message: string;
  msgId?: string;
}

function makeAuthHeader(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString();
  const salt = randomBytes(32).toString('hex');
  const signature = createHmac('sha256', apiSecret).update(date + salt).digest('hex');
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export async function sendSms({
  to,
  message,
}: {
  to: string;
  message: string;
}): Promise<SmsSendResult> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const sender = process.env.SOLAPI_SENDER;

  if (!apiKey || !apiSecret || !sender) {
    return {
      ok: false,
      resultCode: '0',
      message: 'SOLAPI 환경변수가 설정되지 않았습니다.',
    };
  }

  const toDigits = to.replace(/\D/g, '');
  const fromDigits = sender.replace(/\D/g, '');

  // 테스트 모드: 실제 API 호출 없이 성공 응답만 반환 (UI 흐름 검증용).
  // Solapi는 별도 시뮬레이션 엔드포인트를 제공하지 않아 우리 쪽에서 short-circuit한다.
  if (process.env.SOLAPI_TEST_MODE === 'Y') {
    console.log(`[SOLAPI TEST MODE] would send SMS to=${toDigits} from=${fromDigits} message="${message}"`);
    return {
      ok: true,
      resultCode: '2000',
      message: '[TEST MODE] simulated send — 실제 발송되지 않음',
    };
  }

  try {
    const res = await fetch(SEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: makeAuthHeader(apiKey, apiSecret),
      },
      body: JSON.stringify({
        message: {
          to: toDigits,
          from: fromDigits,
          text: message,
          // 90바이트 이하면 SMS, 초과면 LMS. 한국어는 보통 2바이트라 약 45자 기준.
          type: Buffer.byteLength(message, 'utf8') > 90 ? 'LMS' : 'SMS',
        },
      }),
      cache: 'no-store',
    });

    const data = (await res.json()) as {
      statusCode?: string;
      statusMessage?: string;
      messageId?: string;
      errorCode?: string;
      errorMessage?: string;
    };

    const code = data.statusCode ?? data.errorCode ?? String(res.status);
    const isSuccess = res.ok && /^2\d{3}$/.test(code);

    return {
      ok: isSuccess,
      resultCode: code,
      message: data.statusMessage ?? data.errorMessage ?? (isSuccess ? 'success' : 'failed'),
      msgId: data.messageId,
    };
  } catch (e) {
    return {
      ok: false,
      resultCode: '-1',
      message: e instanceof Error ? e.message : '알 수 없는 SMS 발송 오류',
    };
  }
}
