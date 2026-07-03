// aicrea — 매출채널별 손익(P&L) 데이터 (가상 / mock)
// 단위: 억원 (KRW 100M).  회계연도 FY2025 기준 가정치.
//
// 각 채널: 매출(revenue), 매출원가(cogs), 마케팅비(marketing),
//          판매관리비(sga) → 영업이익(op) = revenue - cogs - marketing - sga
// 색상은 채널 아이덴티티 컬러. 손익 부호에 따라 이익 막대 색이 달라짐.

const raw = [
  {
    id: 'd2c',
    name: '자사몰 D2C',
    short: '자사몰',
    color: '#5b8cff',
    revenue: 320, cogs: 128, marketing: 58, sga: 42,
    note: '고마진 직접판매 채널. 브랜드 로열티 고객 중심.',
  },
  {
    id: 'naver',
    name: '네이버 스마트스토어',
    short: '네이버',
    color: '#2ecc71',
    revenue: 210, cogs: 96, marketing: 34, sga: 26,
    note: '검색 유입 기반. 수수료 낮고 안정적 성장.',
  },
  {
    id: 'coupang',
    name: '쿠팡',
    short: '쿠팡',
    color: '#ff5a5f',
    revenue: 385, cogs: 235, marketing: 28, sga: 62,
    note: '최대 매출채널. 물류·수수료로 마진 압박.',
  },
  {
    id: 'offline',
    name: '오프라인 리테일',
    short: '오프라인',
    color: '#f6b93b',
    revenue: 175, cogs: 84, marketing: 12, sga: 66,
    note: '임대료·인건비 부담. 저마진 브랜드 경험 채널.',
  },
  {
    id: 'global',
    name: '글로벌 (해외)',
    short: '글로벌',
    color: '#a55eea',
    revenue: 140, cogs: 70, marketing: 44, sga: 30,
    note: '투자 확대기. 시장 개척 단계로 영업손실.',
  },
  {
    id: 'b2b',
    name: 'B2B 도매',
    short: 'B2B',
    color: '#26c6da',
    revenue: 260, cogs: 205, marketing: 6, sga: 20,
    note: '대량 저마진. 캐시플로우 안정에 기여.',
  },
];

// 12개월 시즌성 계수 (연매출을 월별로 배분). 합≈12.
const seasonality = [0.82, 0.78, 0.95, 1.02, 1.05, 0.98, 0.9, 0.88, 1.06, 1.12, 1.28, 1.16];
const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

// 채널별 파생 지표 계산
export const channels = raw.map((c, ci) => {
  const op = c.revenue - c.cogs - c.marketing - c.sga;
  const margin = op / c.revenue; // 영업이익률
  // 월별 매출: 시즌성 + 채널별 위상차로 살짝 변주 (결정적, 랜덤 없음)
  const monthly = seasonality.map((s, mi) => {
    const wobble = 1 + 0.06 * Math.sin((mi + ci * 2) * 0.9);
    return +(c.revenue / 12 * s * wobble).toFixed(1);
  });
  return { ...c, op, margin, monthly };
});

export const meta = {
  company: 'aicrea',
  fyLabel: 'FY2025',
  unit: '억원',
  months,
};

// 전사 합계 KPI
export const totals = channels.reduce(
  (a, c) => ({
    revenue: a.revenue + c.revenue,
    cogs: a.cogs + c.cogs,
    marketing: a.marketing + c.marketing,
    sga: a.sga + c.sga,
    op: a.op + c.op,
  }),
  { revenue: 0, cogs: 0, marketing: 0, sga: 0, op: 0 }
);
totals.margin = totals.op / totals.revenue;

export const maxRevenue = Math.max(...channels.map((c) => c.revenue));
export const maxAbsOp = Math.max(...channels.map((c) => Math.abs(c.op)));
