# NEXT BOTTLENECK SCANNER

[공개 앱 열기](https://next-bottleneck-research.junnjuly.chatgpt.site)

GitHub에는 실행 코드와 문서만 포함합니다. 개인 `.env`, 로컬 DB·캐시와 생성된 데이터 스냅샷은 제외했습니다. 아래 설정 후 `node --env-file=.env src/cli.mjs update`로 데이터를 수집하거나 `node src/cli.mjs export`로 초기 화면용 스냅샷을 생성하세요.

흰색 배경의 미국 중형주 리서치 터미널입니다. **시장 구조 → 병목 가설 → 기업 변화 → 밸류에이션 → 가격 → 촉매**를 연결합니다. 거래 추천이나 자동 매매 기능은 없습니다.

## 설치 / 실행

Node.js **22.13 이상**을 설치합니다. 권장: Node 24 LTS. 외부 npm 패키지 설치가 필요 없습니다.

```powershell
cd next-bottleneck-scanner
Copy-Item .env.example .env
# .env의 SEC_USER_AGENT에 "프로그램명 실제연락이메일"을 입력
node --env-file=.env src/server.mjs
```

브라우저에서 http://127.0.0.1:4317/ 을 엽니다. `npm start`도 동일합니다. 개인 작업 폴더와 달리 GitHub 복제본에는 SEC 연락 정보가 설정되어 있지 않습니다. **배포 저장소와 배포 ZIP에는 .env가 포함되지 않습니다.** ZIP으로 새로 설치하면 위 설정을 다시 합니다.

```powershell
# SEC·가격 업데이트 + 스냅샷 + 일일 리포트
node --env-file=.env src/cli.mjs update
# 미국 거래소 전체 목록으로 조사 우주 확장, 실행당 제한된 개수 수집
node --env-file=.env src/cli.mjs update --universe
# 저장된 증거로 화면과 일일 리포트 내보내기
node src/cli.mjs export
node src/cli.mjs report
# 매일 설정된 UTC 시각에 수집하는 상주 프로세스
node --env-file=.env src/cli.mjs schedule
# 계산·안전 게이트 테스트
node --test tests/*.test.mjs
```

`npm run update`, `npm run report`, `npm run export`, `npm run schedule`, `npm test`도 지원합니다. 스케줄러는 **실행 상태를 유지해야** 합니다. OS 부팅 자동 실행은 설치하지 않았습니다. 매일 22:00 UTC는 한국 시간 다음 날 07:00입니다. 데이터 수집 프로세스를 동시에 여러 개 실행하지 마세요.

## 프로젝트 구조

| 경로 | 역할 |
|---|---|
| ARCHITECTURE.md | 구현 전 설계, 데이터 계약과 원칙 |
| src/providers.mjs | SEC / Yahoo / Alpha Vantage, 캐시·재시도 |
| src/engine.mjs | 회계 기간 정규화, 기술지표, 점수·게이트 |
| src/signals.mjs | 신규 성장사업, 수주 변화, 미등록 테마 신호 |
| src/documents.mjs | 공식 공시 원문 수집·키워드 문맥 추출 |
| src/store.mjs | SQLite 저장 계층 |
| src/pipeline.mjs | 수집 실행, 이력, 분석, 일일 리포트 |
| src/server.mjs | 로컬 HTTP API / 정적 화면 |
| data/themes.json | 5개 노드·4개 연결의 병목 가설 6개 |
| data/trends.json | 확장 가능한 메가트렌드 사전 |
| data/universe.json | 초기 조사 대상 10개, 검증 후보 아님 |
| dist/ | 브라우저 UI 및 마지막 데이터 스냅샷 |
| tests/ | 금융 계산과 데이터 오분류 방지 테스트 |

SQLite는 첫 실행 시 `data/research.sqlite`에 생성됩니다. 원본은 `data/cache`, 리포트는 `data/reports/YYYY-MM-DD.md`에 저장됩니다. DB에는 회사, 증거, 문서, 실행 이력, 분석 스냅샷, 설정을 보존합니다.

## 환경변수 / API 키

| 변수 | 설명 |
|---|---|
| SEC_USER_AGENT | `NextBottleneckScanner you@example.com` 형태. SEC 공정 접근용 실제 연락 정보 |
| ALPHA_VANTAGE_API_KEY | 선택. 회사 개요·forward P/E 등과 대체 일봉 수집 |
| PORT | 4317 기본, 127.0.0.1에만 바인딩 |
| MAX_COMPANIES_PER_RUN | 기본 20. 전체 우주는 마지막 시도 시점 순서로 순환 |
| COLLECT_FILINGS | 기본 1. 0이면 공시 원문 수집 생략 |
| UPDATE_HOUR_UTC | 기본 22. 스케줄러가 작동할 시간 |

API 키는 웹 폼에 입력하지 않습니다. `.env`에서만 설정합니다. 제공된 키가 없으면 해당 수치는 DATA UNAVAILABLE입니다. Alpha Vantage의 무료 호출량·데이터 범위는 요금제에 따라 달라지며 10개 기업을 매일 모두 커버한다고 보장하지 않습니다.

## 데이터 소스 / 대체 경로

1. **SEC EDGAR**: Company Facts의 GAAP 재무정보, Submissions의 10-K·10-Q·8-K 링크, 최근 정기공시 원문.
   - [공식 API 문서](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)
   - [접근 정책](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data)
2. **기업 공식 IR / 실적 콜**: Data & evidence에서 원문·출처·회계 기간을 입력합니다. 신규 사업, backlog, bookings, 고객과 중국 노출은 이 경로로 검증합니다.
3. **Yahoo chart**: 가격·거래량. 비공식 엔드포인트로 지속성을 보장하지 않습니다. 수정주가 존재 여부를 기록합니다.
4. **Alpha Vantage**: Yahoo 실패 시 대체 일봉. OVERVIEW에서 시가총액·밸류에이션. [공식 문서](https://www.alphavantage.co/documentation/).
5. **출처가 있는 수동 OHLCV**: `/api/bars`로 입력. 모든 자동 제공자 실패 시 사용합니다.

SEC 호출은 순차적이며 요청 사이에 최소 250ms를 둡니다. 구조화 응답은 TTL 캐시와 최대 3회 재시도, 공시 원문은 영구 URL 캐시를 사용합니다. 원문 실패는 수치 수집과 분리해 기록합니다. 현재 공시 원문 파서는 HTML 텍스트 추출 방식이므로 표·각주의 의미 해석은 사람이 확인해야 합니다. 다운로드한 문서와 입력한 실적 콜은 종류별로 분리 비교합니다.

## 스크리닝 로직

- 미국 거래소 확인, 핵심 시가총액 $3–15B / 보조 $2–20B.
- NVDA, MSFT, GOOGL/GOOG, AMZN, META, AVGO 명시적 제외.
- 시가총액이 없거나 7일보다 오래되면 검증 대기. 최근 발행주식 수와 원시 종가로 계산할 때는 Calculated로 표시하며 주식 수는 120일 이내만 사용합니다. ADR 비율·복수 주식 종류 등은 추가 검토 대상입니다.
- China HIGH는 핵심 후보 제외. LOW/MEDIUM도 180일 이내 출처가 있는 검토만 인정. **검토 없음은 LOW가 아니며 핵심 후보 제외**입니다.
- 중국 매출·생산·허가·정책·핵심 공급망의 중대한 의존성을 하나의 검토 기록으로 판단합니다. 일정 매출 비중만으로 자동 HIGH를 정하지 않습니다. 공시의 China 문맥은 검토용으로 추출하며 자동 위험 판정을 하지 않습니다.
- 초기 매핑은 연구 가설입니다. 명시된 기업들이 현재 중형주라는 주장을 하지 않습니다.

## 점수 계산

| 구성 | 최대 |
|---|---:|
| structure: 병목 구조적 중요성 | 20 |
| exposure: 관련 사업 노출도 | 15 |
| growth: 실제 성장 증거 | 15 |
| orders: 수주·backlog | 10 |
| underfollowed: 낮은 시장 인지도 | 10 |
| valuation: 동종업계 대비 가치 | 10 |
| moat: 경쟁우위 | 10 |
| technical: 차트 구조 | 10 |

총점 = 관측된 구성 점수 합 − 패널티 합, 0–100 범위. 결측 항목은 점수에 기여하지 않고 데이터 충족률을 낮춥니다. **결측값을 제외한 비례 환산으로 100점을 만들지 않습니다.** 충족률 60% 미만이면 최종 점수를 숨깁니다.

자동 계산:
- growth = 최대(전체·AI·데이터센터·신제품 매출 성장률) / 3, 0–15점. 180일 이내 지표만 사용.
- exposure = 검증된 성장사업 매출 비중 / 4, 최대 15점.
- orders = (backlog YoY + bookings YoY) / 8, 0–10점. 두 값 모두 필요.
- technical = 종가 > SMA200 4점 + SMA50 > SMA200 3점 + 상대거래량 > 1 3점. 수정주가와 최근 데이터가 필요.
- 그 외 항목은 출처·검토·설명이 있는 분석자 판단. 최신 검토 기록이 자동 산식보다 우선.

패널티 상한: hype 15, china 20, dilution 10, concentration 10, cyclical 10, valuation 15. China MEDIUM 8점/HIGH 20점. 수정주가 기준 52주 상승률 ≥200%는 hype 15점. 다른 패널티는 검토한 증거로 입력하며 0은 자동으로 안전하다는 뜻이 아닙니다. `Fully Priced`는 hype 15 또는 valuation penalty ≥12일 때 사용하며 실제 가치가 완벽히 반영됐다는 확정이 아닙니다.

Research Priority는 자격 통과 + 충족률 ≥75% + 점수 ≥65 + 구조·노출·성장 증거를 모두 요구합니다. 불완전 자료로 점수가 높아도 매수/매도 지시를 만들지 않습니다. 차트만으로 판단하지 않습니다.

## 변화 탐지 / 회계 주의

- 전년 동기 분기 비교, QoQ, 성장률 가속(pp), 마진 변화(pp).
- YTD를 분기로 오인하지 않으며 같은 회계연도 시작일의 누적 기간 차이로 Q2/Q3/Q4를 계산합니다. EPS는 가중평균 주식 수 문제 때문에 누적 차감하지 않습니다.
- 최근 보고 기간의 표준 태그를 선택합니다. 기업별 확장 태그와 정교한 연결 범위 조정은 자동 지원하지 않습니다.
- Backlog·bookings·성장사업 지표는 증거 기록의 기간별 시계열에서 계산. Book-to-bill과 사업 비중은 동일 기간일 때만 계산.
- 신규 사업 성장 ≥40%, 전체 성장보다 ≥25pp 빠르면 Old Company / New Growth Engine 신호.
- 2개 이상 성장 지표가 5pp 이상 개선/악화하면 논리 강화/약화. 점수 변화 ±5도 추적. 이전 저장 스냅샷과 비교합니다. 데이터 보정과 경제적 변화를 구분해 최종 검토해야 합니다.
- 문서 길이 1만 단어당 빈도로 정규화. 동일 종류/기간 문서는 중복 제거. 언급 5회 이상 및 정규화 빈도 2배면 Narrative Shift.
- 사전에 없던 반복 구절은 별도의 검토 큐에 제안. **새 산업 인과관계를 자동으로 사실로 확정하지 않습니다.** 검토 후 `data/themes.json`에 인과관계·반론·반증 조건을 추가하고 서버를 재시작합니다.

## UI 사용법

1. Discovery terminal: 검색, 정렬, 병목 필터, 6개 상태 탭, CSV.
2. 병목 카드: 5단계 인과 흐름, 공급자, 가설 근거·반론·반증.
3. 기업 클릭: 재무/성장사업/수주/점수/중국 위험/차트/키워드/촉매/세 가지 재평가 질문.
4. Data & evidence: 공식 자료를 입력하고 검토 완료를 체크해야 점수에 반영.
5. Catalyst calendar: 공식 출처가 있고 확인된 향후 30일 이벤트만 표시.
6. Daily intelligence: 10개 섹션, 검증된 후보 최대 7개. 후보가 3개 미만이어도 억지로 채우지 않습니다.

증거 입력 key 예시:
- metric: backlog, bookings, dataCenterRevenue, aiRevenue, newProductRevenue, growthSegmentShare, forwardPE, customerConcentration
- score: structure, exposure, growth, orders, underfollowed, valuation, moat, technical
- penalty: hype, dilution, concentration, cyclical, valuation
- note: why, customers, competition, bear, invalidation, marketPerception

원금액은 USD 단위로 입력합니다. 45억 달러는 4500000000입니다. 성장률 80%는 80이며 0.8이 아닙니다. 성장 계산을 위해 같은 key의 전년 동기 자료도 입력합니다. backlog와 remaining performance obligations는 의미가 다르므로 자동으로 동일시하지 않습니다.

## 로컬 API

GET `/api/snapshot`, GET `/api/report`.
POST `/api/update` (`{}` 또는 `{expand:true}`), `/api/evidence` (`{ticker,evidence}`), `/api/document` (`{ticker,document:{text,source,period,kind}}`), `/api/watchlist` (`{tickers:[]}`), `/api/company` (`{ticker,cik,name}`), `/api/bars` (`{ticker,bars:[{date,open,high,low,close,volume}],source,adjusted}`).

모든 변경 요청은 JSON과 동일 출처 Origin 헤더가 필요합니다. 임의 외부 URL을 서버가 가져오는 공개 API는 없습니다. 로컬 파일 업로드 형식은 API 계약에 맞추면 되며 raw OHLCV는 자동으로 split-adjusted라고 간주하지 않습니다.

## 배포 화면과 운영 범위

공개 Sites 페이지는 **마지막 내보낸 스냅샷 뷰어**입니다. 로컬 서버의 SQLite나 API 키에 연결하지 않습니다. 배포 화면에서 읽기·검색·필터·상세·CSV·일일 리포트·기기별 Watchlist를 사용할 수 있습니다. 데이터 수정·수집은 로컬 엔진에서 하며, 갱신한 스냅샷을 사이트에 재배포해야 원격 화면에도 반영됩니다. 원격 24시간 수집 서버나 유료 데이터 계약은 포함하지 않습니다.

## 제한사항

- China 노출·경쟁우위·밸류에이션 맥락·신규 사업 데이터의 사람 검토가 필요합니다. 정보 부족을 낙관적 신호로 바꾸지 않습니다.
- Forward estimates, short interest, 기관 보유, 뉴스 검색량, 옵션 과열 등은 데이터 제공자가 없으면 결측. 뉴스/옵션 라이선스를 우회하지 않습니다.
- 표준 SEC 필드만으로 사업부 매출·백로그를 완전히 자동 추출할 수 없습니다. 추출 문맥은 검토용이며 검증된 사실로 자동 승격하지 않습니다.
- 금리·지수·AI Capex·뉴스 종합은 별도 검증 데이터가 없으면 결측. 실제 수집 없이 '오늘 시장' 해설을 생성하지 않습니다.
- 조정주가 지원 여부를 표시합니다. Alpha Vantage 일반 일봉은 비조정이므로 기술 점수·괴리 판단에 사용하지 않습니다. 상대강도 vs S&P/섹터 ETF는 이 버전에 구현되지 않았습니다.
- 워치리스트는 로컬 엔진에서는 DB, 원격 뷰어에서는 해당 브라우저에 저장됩니다.
- 전 종목 확장은 수천 회사 API 호출이 필요하므로 무료 제공자 한도 안에서 분할 실행해야 합니다.
- 수집 원문과 스냅샷은 백업이 필요합니다. 파산/상장폐지 포함 생존편향 없는 과거 백테스트 시스템은 아닙니다.

설계와 구현 우선순위는 데이터 정합성과 추적 가능한 가설입니다. 데이터가 없는 상태를 완성된 투자 판단으로 포장하지 않습니다.
