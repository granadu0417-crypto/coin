/**
 * 원화 포맷팅 함수
 * @param amount 금액 (원 단위)
 * @param showSign 부호 표시 여부 (기본: true)
 */
export const formatKRW = (amount: number, showSign: boolean = true): string => {
  const absAmount = Math.abs(amount);
  const sign = showSign ? (amount >= 0 ? '+' : '-') : (amount < 0 ? '-' : '');

  if (absAmount >= 100000000) {
    // 1억 이상: "억" 단위
    return `${sign}${(absAmount / 100000000).toFixed(2)}억원`;
  } else if (absAmount >= 10000) {
    // 1만 이상: "만" 단위
    return `${sign}${(absAmount / 10000).toFixed(1)}만원`;
  } else {
    // 1만 미만: 그대로 표시
    return `${sign}${absAmount.toLocaleString('ko-KR')}원`;
  }
};

/**
 * 원화를 간단하게 표시 (₩ 기호 포함)
 */
export const formatKRWSimple = (amount: number): string => {
  return `₩${Math.round(amount).toLocaleString('ko-KR')}`;
};

/**
 * UTC 시간을 한국 시간(KST)으로 변환
 */
export const formatToKST = (utcTimeStr: string, format: 'full' | 'short' = 'full'): string => {
  const date = new Date(utcTimeStr.endsWith('Z') ? utcTimeStr : `${utcTimeStr}Z`);

  if (format === 'short') {
    return date.toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'short',
      day: 'numeric',
      hour: '2-digit'
    });
  }

  return date.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * 상대 시간 표시 (예: "3분 전", "1시간 전")
 */
export const formatRelativeTime = (timeStr: string): string => {
  const time = new Date(timeStr.endsWith('Z') ? timeStr : `${timeStr}Z`);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - time.getTime()) / 60000);

  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
};

/**
 * ROI 퍼센트 계산 (초기 금액: 1,000만원 기준)
 */
export const calculateROI = (currentBalance: number, initialBalance: number = 10000000): number => {
  return ((currentBalance - initialBalance) / initialBalance) * 100;
};
