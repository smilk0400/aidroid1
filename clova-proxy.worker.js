/* Cloudflare Worker — CLOVA OCR 프록시
 *
 * 역할: 브라우저(이 앱)와 네이버 CLOVA OCR 사이의 중계.
 *  - CORS를 열어 앱에서 호출 가능하게 함
 *  - CLOVA 시크릿을 서버(워커) 측에만 보관 → 클라이언트/저장소에 노출 안 됨
 *
 * 배포:
 *  1) Cloudflare 가입 → Workers & Pages → Create Worker
 *  2) 이 파일 내용을 붙여넣고 Deploy
 *  3) Settings → Variables 에 아래 두 개를 Secret 으로 추가:
 *       CLOVA_INVOKE_URL  = CLOVA OCR 도메인의 APIGW Invoke URL (.../general)
 *       CLOVA_SECRET      = 해당 도메인의 Secret Key
 *  4) 배포된 워커 주소(https://xxx.workers.dev)를 앱 설정의 "CLOVA OCR 프록시 URL"에 입력
 *
 * 앱과의 약속:
 *  요청  POST { "image": "<base64(접두사 제외)>", "format": "jpg" }
 *  응답  { "text": "<인식된 전체 텍스트>", "raw": <CLOVA 원본 응답> }
 */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') {
      return json({ error: 'POST만 허용됩니다' }, 405, cors);
    }
    try {
      const { image, format } = await request.json();
      if (!image) return json({ error: 'image(base64)가 필요합니다' }, 400, cors);

      const payload = {
        version: 'V2',
        requestId: crypto.randomUUID(),
        timestamp: Date.now(),
        lang: 'ko',
        images: [{ format: format || 'jpg', name: 'label', data: image }],
      };

      const r = await fetch(env.CLOVA_INVOKE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OCR-SECRET': env.CLOVA_SECRET,
        },
        body: JSON.stringify(payload),
      });

      const data = await r.json();
      let text = '';
      try {
        text = (data.images[0].fields || []).map((f) => f.inferText).join(' ');
      } catch (_) { /* 형식이 다르면 raw로 전달 */ }

      return json({ text, raw: data }, r.ok ? 200 : 502, cors);
    } catch (e) {
      return json({ error: String(e) }, 500, cors);
    }
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
