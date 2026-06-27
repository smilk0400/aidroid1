# 🥫 유통기한 관리 (로컬 전용)

음식의 **유통기한 · 수량 · 구매일자 · 사진**을 이 기기에만 저장하는 테스트용 웹앱입니다.
서버가 없으며 모든 데이터는 브라우저의 **IndexedDB**에 로컬 저장됩니다. (외부 전송 없음)

## 기능

- **바코드 스캔** — 카메라로 바코드를 읽어 자동 입력 (`BarcodeDetector` API)
- **문자열 입력** — 바코드가 없거나 미지원 브라우저면 직접 입력
- 제품명, **유통기한**, **수량**, **구매일자** 저장
- **사진** 촬영/첨부 (이미지 Blob으로 로컬 저장)
- 유통기한 임박/만료 색상 표시, 검색·정렬
- 항목 수정/삭제
- **PWA** — 홈 화면 설치 및 오프라인 동작 지원

## 실행 방법

카메라(`getUserMedia`)와 서비스워커는 보안 컨텍스트가 필요하므로
`file://`가 아니라 로컬 서버로 띄워야 합니다.

```bash
# 저장소 폴더에서
python3 -m http.server 8000
# 또는
npx serve .
```

브라우저에서 `http://localhost:8000` 접속.
휴대폰 카메라 테스트는 `https`(또는 localhost 포워딩)에서만 동작합니다.

## 브라우저 지원

- **바코드 자동 인식**: `BarcodeDetector`를 지원하는 브라우저(Android Chrome 등).
  미지원 시 자동 인식 대신 바코드 번호를 수동 입력하면 됩니다.
- 사진/저장 기능은 최신 브라우저 전반에서 동작합니다.

## 라벨 OCR (제품명·유통기한 글자 인식)

- 기본은 **기기 내 로컬 OCR**(Tesseract.js, 한국어). 키·서버 불필요.
- 더 높은 정확도를 원하면 **네이버 CLOVA OCR**로 업그레이드할 수 있습니다.

### CLOVA OCR 연동 (선택)

CLOVA OCR은 브라우저에서 직접 호출이 불가(CORS)하고, 시크릿 키를 클라이언트에
두면 안 되므로 **본인 소유의 Cloudflare Worker 프록시**를 둡니다.

1. **CLOVA OCR 도메인 생성** — 네이버 클라우드 플랫폼 콘솔 → CLOVA OCR →
   Domain 생성 후 **APIGW Invoke URL**(`.../general`)과 **Secret Key** 확보
2. **Cloudflare Worker 배포**
   - Cloudflare → Workers & Pages → Create Worker
   - 저장소의 [`clova-proxy.worker.js`](./clova-proxy.worker.js) 내용을 붙여넣고 Deploy
   - Worker Settings → Variables(Secret)에 추가:
     - `CLOVA_INVOKE_URL` = APIGW Invoke URL
     - `CLOVA_SECRET` = Secret Key
3. **앱 설정**(⚙️) → "CLOVA OCR 프록시 URL"에 배포된 워커 주소 입력 → 저장

설정하면 라벨 OCR이 CLOVA로 동작하고, 실패 시 자동으로 로컬 OCR로 폴백합니다.
시크릿 키는 워커(서버)에만 있고 앱/저장소에는 저장되지 않습니다.

## 데이터 저장 위치

- 항목/사진: 브라우저 **IndexedDB** (`food-expiry-db`)
- 브라우저 데이터(사이트 데이터)를 지우면 함께 삭제됩니다.

## 파일 구성

| 파일 | 설명 |
|------|------|
| `index.html` | 화면 구조 |
| `styles.css` | 스타일 |
| `app.js` | 저장(IndexedDB)·바코드 스캔·사진·목록 로직 |
| `sw.js` | 오프라인 캐시(서비스워커) |
| `manifest.webmanifest` | PWA 설정 |
| `icons/` | 앱 아이콘 |
