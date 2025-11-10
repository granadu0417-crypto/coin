// 이벤트 기록 및 패턴 분석 시스템

// 로컬 스토리지 키
const EVENTS_STORAGE_KEY = 'crypto_events';
const PATTERNS_STORAGE_KEY = 'crypto_patterns';

// 이벤트 저장
function saveEvent(eventData) {
    const events = getEvents();
    events.push(eventData);
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
    console.log('이벤트 저장:', eventData);
}

// 이벤트 가져오기
function getEvents() {
    const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

// 특정 타입 이벤트 가져오기
function getEventsByType(type) {
    return getEvents().filter(e => e.type === type);
}

// 현재 진행 중인 이벤트 (아직 완료 안 됨)
function getActiveEvents() {
    const now = Date.now();
    return getEvents().filter(e => {
        const eventTime = e.timestamp * 1000;
        const hoursSince = (now - eventTime) / (1000 * 60 * 60);
        return hoursSince < 168; // 7일 이내
    });
}

// 공포-탐욕 지수 이벤트 생성
function createFearGreedEvent(value, classification, currentPrice) {
    return {
        id: `fear_greed_${value}_${Date.now()}`,
        type: 'fear_greed',
        title: `공포-탐욕 지수 ${value}`,
        description: classification,
        value: parseInt(value),
        classification: classification,
        timestamp: Math.floor(Date.now() / 1000),
        price_at_event: currentPrice,
        timeline: [],
        status: 'active'
    };
}

// 뉴스 이벤트 생성
function createNewsEvent(newsTitle, sentiment, currentPrice) {
    return {
        id: `news_${Date.now()}`,
        type: 'news',
        title: newsTitle.substring(0, 50) + '...',
        description: newsTitle,
        sentiment: sentiment, // positive, negative, neutral
        timestamp: Math.floor(Date.now() / 1000),
        price_at_event: currentPrice,
        timeline: [],
        status: 'active'
    };
}

// 타임라인 체크포인트 추가
function updateEventTimeline(eventId, checkpointType, currentPrice) {
    const events = getEvents();
    const event = events.find(e => e.id === eventId);

    if (!event) return;

    const priceChange = ((currentPrice - event.price_at_event) / event.price_at_event) * 100;
    const success = priceChange > 0;

    const checkpoint = {
        type: checkpointType, // '1h', '24h', '7d'
        timestamp: Math.floor(Date.now() / 1000),
        price: currentPrice,
        change_percent: priceChange,
        change_amount: currentPrice - event.price_at_event,
        success: success
    };

    // 중복 체크포인트 방지
    if (!event.timeline.find(t => t.type === checkpointType)) {
        event.timeline.push(checkpoint);
    }

    // 모든 체크포인트 완료 시 상태 변경
    if (event.timeline.length >= 3) {
        event.status = 'completed';
    }

    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
    console.log('타임라인 업데이트:', eventId, checkpointType);
}

// 패턴 분석 - 특정 타입 이벤트의 성공률 계산
function analyzePattern(eventType, eventValue = null) {
    let events = getEventsByType(eventType);

    // 특정 값 필터링 (공포지수 22 등)
    if (eventValue !== null) {
        events = events.filter(e => {
            if (eventType === 'fear_greed') {
                // 공포지수는 ±5 범위로 그룹화
                return Math.abs(e.value - eventValue) <= 5;
            }
            return e.value === eventValue;
        });
    }

    // 완료된 이벤트만
    const completedEvents = events.filter(e => e.status === 'completed');

    if (completedEvents.length === 0) {
        return {
            total_cases: 0,
            success_1h: 0,
            success_24h: 0,
            success_7d: 0,
            avg_change_24h: 0,
            reliability: 0,
            cases: []
        };
    }

    // 통계 계산
    const stats = {
        total_cases: completedEvents.length,
        success_1h: 0,
        success_24h: 0,
        success_7d: 0,
        changes_24h: [],
        cases: []
    };

    completedEvents.forEach(event => {
        const timeline1h = event.timeline.find(t => t.type === '1h');
        const timeline24h = event.timeline.find(t => t.type === '24h');
        const timeline7d = event.timeline.find(t => t.type === '7d');

        if (timeline1h?.success) stats.success_1h++;
        if (timeline24h?.success) stats.success_24h++;
        if (timeline7d?.success) stats.success_7d++;

        if (timeline24h) {
            stats.changes_24h.push(timeline24h.change_percent);
        }

        // 케이스 정보 저장
        stats.cases.push({
            date: new Date(event.timestamp * 1000),
            timeline: event.timeline,
            final_change: timeline7d?.change_percent || timeline24h?.change_percent || 0
        });
    });

    // 평균 계산
    stats.avg_change_24h = stats.changes_24h.length > 0
        ? stats.changes_24h.reduce((a, b) => a + b, 0) / stats.changes_24h.length
        : 0;

    // 신뢰도 계산 (24시간 성공률 기준)
    stats.reliability = Math.round((stats.success_24h / stats.total_cases) * 100);

    // 최신 5개 케이스만 저장
    stats.cases = stats.cases.slice(-5).reverse();

    return stats;
}

// 이벤트 모니터링 시작
function startEventMonitoring() {
    console.log('📊 이벤트 모니터링 시작');

    // 1시간마다 체크
    setInterval(() => {
        checkEventTimelines();
    }, 3600000); // 1시간

    // 페이지 로드 시 즉시 체크
    checkEventTimelines();
}

// 타임라인 체크
async function checkEventTimelines() {
    const activeEvents = getActiveEvents();
    const currentPrice = await getCurrentBTCPrice();

    if (!currentPrice) return;

    const now = Date.now();

    activeEvents.forEach(event => {
        const eventTime = event.timestamp * 1000;
        const hoursSince = (now - eventTime) / (1000 * 60 * 60);

        // 1시간 체크포인트
        if (hoursSince >= 1 && !event.timeline.find(t => t.type === '1h')) {
            updateEventTimeline(event.id, '1h', currentPrice);
        }

        // 24시간 체크포인트
        if (hoursSince >= 24 && !event.timeline.find(t => t.type === '24h')) {
            updateEventTimeline(event.id, '24h', currentPrice);
        }

        // 7일 체크포인트
        if (hoursSince >= 168 && !event.timeline.find(t => t.type === '7d')) {
            updateEventTimeline(event.id, '7d', currentPrice);
        }
    });
}

// 현재 BTC 가격 가져오기
async function getCurrentBTCPrice() {
    try {
        const response = await fetch('https://api.upbit.com/v1/ticker?markets=KRW-BTC');
        const data = await response.json();
        return data[0].trade_price;
    } catch (error) {
        console.error('가격 가져오기 실패:', error);
        return null;
    }
}

// 공포-탐욕 지수 변화 감지 및 이벤트 생성
let lastFearGreedValue = null;

function checkFearGreedChange(currentValue, classification, currentPrice) {
    // 값이 크게 변했을 때만 이벤트 생성 (±10 이상)
    if (lastFearGreedValue === null || Math.abs(currentValue - lastFearGreedValue) >= 10) {
        // 극단적인 값일 때 이벤트 생성
        if (currentValue < 25 || currentValue > 75) {
            const event = createFearGreedEvent(currentValue, classification, currentPrice);
            saveEvent(event);
            console.log('🚨 새 이벤트 생성:', event);
        }
        lastFearGreedValue = currentValue;
    }
}

// 타임라인 UI 렌더링
function renderEventTimeline(eventId) {
    const events = getEvents();
    const event = events.find(e => e.id === eventId);

    if (!event) return '';

    const timeline = event.timeline;
    const pattern = analyzePattern(event.type, event.value);

    // 타임라인 설명
    const timelineDescription = `
        <div class="timeline-description">
            <p><strong>💡 이벤트 추적 설명:</strong> 이 이벤트가 발생한 후, 가격이 어떻게 변했는지 1시간, 24시간, 7일 단위로 추적합니다.</p>
            <p>✅ = 가격 상승 (성공) | ❌ = 가격 하락 (실패) | ⏳ = 아직 시간이 안 됨</p>
        </div>
    `;

    // 타임라인 포인트 생성
    const checkpoints = [
        { key: '발생', label: '이벤트 발생' },
        { key: '1h', label: '1시간 후' },
        { key: '24h', label: '24시간 후' },
        { key: '7d', label: '7일 후' }
    ];

    const timelineHtml = checkpoints.map((checkpoint, index) => {
        if (checkpoint.key === '발생') {
            return `
                <div class="timeline-point active">
                    <div class="timeline-marker start">🔴</div>
                    <div class="timeline-label">${checkpoint.label}</div>
                    <div class="timeline-price">₩${event.price_at_event.toLocaleString()}</div>
                </div>
            `;
        }

        const data = timeline.find(t => t.type === checkpoint.key);
        const isActive = data !== undefined;
        const isSuccess = data?.success;

        return `
            <div class="timeline-connector ${isActive ? 'active' : ''}"></div>
            <div class="timeline-point ${isActive ? 'active' : 'pending'}">
                <div class="timeline-marker ${isSuccess ? 'success' : isActive ? 'fail' : 'pending'}">
                    ${isActive ? (isSuccess ? '✅' : '❌') : '⏳'}
                </div>
                <div class="timeline-label">${checkpoint.label}</div>
                ${data ? `
                    <div class="timeline-change ${isSuccess ? 'positive' : 'negative'}">
                        ${data.change_percent > 0 ? '+' : ''}${data.change_percent.toFixed(1)}%
                    </div>
                    <div class="timeline-price">₩${data.price.toLocaleString()}</div>
                ` : '<div class="timeline-pending">대기 중</div>'}
            </div>
        `;
    }).join('');

    // 과거 패턴 케이스
    const casesHtml = pattern.cases.map(c => {
        const dateStr = `${c.date.getMonth() + 1}/${c.date.getDate()}`;
        const timeline1h = c.timeline.find(t => t.type === '1h');
        const timeline24h = c.timeline.find(t => t.type === '24h');
        const timeline7d = c.timeline.find(t => t.type === '7d');

        return `
            <div class="pattern-case">
                <span class="case-date">${dateStr}</span>
                <span class="case-checkpoint ${timeline1h?.success ? 'success' : 'fail'}">${timeline1h?.success ? '✅' : '❌'}</span>
                <span class="case-checkpoint ${timeline24h?.success ? 'success' : 'fail'}">${timeline24h?.success ? '✅' : '❌'}</span>
                <span class="case-checkpoint ${timeline7d?.success ? 'success' : 'fail'}">${timeline7d?.success ? '✅' : '❌'}</span>
                <span class="case-result ${c.final_change > 0 ? 'positive' : 'negative'}">
                    ${c.final_change > 0 ? '+' : ''}${c.final_change.toFixed(1)}%
                </span>
            </div>
        `;
    }).join('');

    return `
        <div class="event-timeline-container">
            ${timelineDescription}

            <div class="timeline-track">
                ${timelineHtml}
            </div>

            ${pattern.total_cases > 0 ? `
                <div class="pattern-analysis">
                    <h4>📊 과거 패턴 분석 (최근 ${pattern.total_cases}건)</h4>
                    <p class="pattern-explanation">
                        <strong>💡 이 분석이 뭔가요?</strong>
                        과거에 비슷한 이벤트가 발생했을 때, 가격이 상승한 확률을 보여줍니다.
                        예: "1시간 100%"는 과거 비슷한 상황에서 1시간 후 가격이 100% 상승했다는 뜻입니다.
                    </p>
                    <div class="pattern-stats">
                        <div class="stat-item">
                            <span class="stat-label">1시간</span>
                            <span class="stat-value">${Math.round(pattern.success_1h / pattern.total_cases * 100)}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">24시간</span>
                            <span class="stat-value">${Math.round(pattern.success_24h / pattern.total_cases * 100)}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">7일</span>
                            <span class="stat-value">${Math.round(pattern.success_7d / pattern.total_cases * 100)}%</span>
                        </div>
                        <div class="stat-item highlight">
                            <span class="stat-label">평균 변화</span>
                            <span class="stat-value ${pattern.avg_change_24h > 0 ? 'positive' : 'negative'}">
                                ${pattern.avg_change_24h > 0 ? '+' : ''}${pattern.avg_change_24h.toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    <div class="pattern-cases">
                        <p class="cases-explanation">
                            <strong>📋 과거 사례 목록:</strong>
                            과거에 비슷한 이벤트가 발생했을 때의 실제 결과입니다.
                            ✅ = 그 시점에서 가격이 상승했음 | ❌ = 가격이 하락했음
                        </p>
                        <div class="pattern-case header">
                            <span>날짜</span>
                            <span>1시간</span>
                            <span>24시간</span>
                            <span>7일</span>
                            <span>최종 변화</span>
                        </div>
                        ${casesHtml}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

console.log('📊 이벤트 시스템 로드 완료');
