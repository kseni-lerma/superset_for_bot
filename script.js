// Глобальные переменные
let menuStructure = null;
let currentData = null;
let historicalData = null;
let currentSection = "Ипотека";
let currentGroup = "Масштаб рынка";

// Детализация
let currentChart = null, premiumChart = null;
let currentHistorical = null, currentUnit = '', isQuarterlyData = false, currentIndicatorName = '';
let minDate = null, maxDate = null;
let updateTimeout = null;

// DOM
const sidebarMenu = document.querySelector('.sidebar-menu');
const dashboardContainer = document.getElementById('dashboard-container');
const sectionHeader = document.getElementById('current-section');
const detailView = document.getElementById('detail-view');
const backBtn = document.getElementById('back-btn');
const detailTitle = document.getElementById('detail-title');
const detailComment = document.getElementById('detail-comment');
const dateRangeText = document.getElementById('date-range-text');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const detailChartCtx = document.getElementById('detail-chart').getContext('2d');
const premiumChartCtx = document.getElementById('premium-chart').getContext('2d');
const premiumChartContainer = document.getElementById('premium-chart-container');
const pre2025TableContainer = document.getElementById('pre-2025-table-container');
const post2025TableContainer = document.getElementById('post-2025-table-container');

// ---------- Загрузка данных ----------
async function loadData() {
    try {
        const [menuRes, dataRes, histRes] = await Promise.all([
            fetch('menu.json'),
            fetch('data.json'),
            fetch('historical.json')
        ]);
        menuStructure = await menuRes.json();
        currentData = await dataRes.json();
        historicalData = await histRes.json();
        initApp();
    } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        dashboardContainer.innerHTML = '<div class="empty-section">Ошибка загрузки данных</div>';
    }
}

// ---------- Инициализация ----------
function initApp() {
    buildSidebar();
    renderContent(currentSection, currentGroup);
    attachEventListeners();
    restoreActiveMenu();
    attachDetailButtons();
}

// ---------- Построение бокового меню ----------
function buildSidebar() {
    sidebarMenu.innerHTML = '';
    const menuIcons = {
        "Ипотека": "fas fa-home",
        "Кредитование ЮЛ": "fas fa-building",
        "Кредитование ФЛ": "fas fa-user"
    };
    for (const [section, groups] of Object.entries(menuStructure)) {
        const li = document.createElement('li');
        li.className = 'menu-item has-submenu';
        li.setAttribute('data-section', section);
        const mainDiv = document.createElement('div');
        mainDiv.className = 'menu-main-item';
        mainDiv.innerHTML = `<i class="${menuIcons[section] || 'fas fa-folder'}"></i><span>${section}</span><i class="fas fa-chevron-down submenu-toggle"></i>`;
        li.appendChild(mainDiv);
        const subUl = document.createElement('ul');
        subUl.className = 'submenu';
        for (const groupName of Object.keys(groups)) {
            const subLi = document.createElement('li');
            subLi.className = 'submenu-item';
            subLi.setAttribute('data-section', section);
            subLi.setAttribute('data-group', groupName);
            subLi.innerHTML = `<span>${groupName}</span>`;
            subUl.appendChild(subLi);
        }
        li.appendChild(subUl);
        sidebarMenu.appendChild(li);
    }
}

// ---------- Рендер контента (KPI-карточки) ----------
function renderContent(section, group) {
    const groups = menuStructure[section];
    if (!groups || !groups[group]) {
        dashboardContainer.innerHTML = '<div class="empty-section">Раздел в разработке</div>';
        sectionHeader.textContent = `${section} > ${group}`;
        return;
    }
    const categories = groups[group];
    let html = '<div class="dashboard">';
    for (const category of categories) {
        const items = currentData.filter(item => item.category === category);
        if (items.length === 0) continue;
        html += `<div class="kpi-group"><h3 class="category-title">${category}</h3><div class="kpi-cards">`;
        for (const item of items) {
            const trendClass = item.trend === '▲' ? 'trend-up' : 'trend-down';
            const changeUnit = item.unit === '%' ? 'п.п.' : '%';
            const changeSign = parseFloat(item.change) > 0 ? '+' : '';
            html += `
                <div class="kpi-card">
                    <div class="kpi-header">
                        <div class="kpi-subcategory">${escapeHtml(item.subcategory)}</div>
                        <div class="kpi-period">${escapeHtml(item.period)}</div>
                    </div>
                    <div class="kpi-main">
                        <div class="kpi-value">${escapeHtml(item.value)} ${escapeHtml(item.unit)}</div>
                        <div class="kpi-change-container">
                            <span class="${trendClass}">${escapeHtml(item.trend)}</span>
                            <span>${changeSign}${escapeHtml(item.change)} ${changeUnit}</span>
                        </div>
                    </div>
                    <button class="detail-btn" data-key="${escapeHtml(item.key)}" data-category="${escapeHtml(item.category)}" data-subcategory="${escapeHtml(item.subcategory)}">
                        <i class="fas fa-chart-bar"></i><span class="btn-text">Детализация</span>
                    </button>
                </div>`;
        }
        html += `</div></div>`;
    }
    html += '</div>';
    dashboardContainer.innerHTML = html;
    sectionHeader.textContent = `${section} > ${group}`;
    attachDetailButtons();
}

// ---------- Обработчики меню ----------
function attachEventListeners() {
    // Переключение подменю
    document.querySelectorAll('.submenu-toggle').forEach(toggle => {
        toggle.removeEventListener('click', submenuToggleHandler);
        toggle.addEventListener('click', submenuToggleHandler);
    });
    // Клики по элементам подменю
    document.querySelectorAll('.submenu-item').forEach(item => {
        item.removeEventListener('click', submenuItemHandler);
        item.addEventListener('click', submenuItemHandler);
    });
    // Кнопка показа/скрытия сайдбара
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    sidebarToggle.removeEventListener('click', sidebarToggleHandler);
    sidebarToggle.addEventListener('click', sidebarToggleHandler);
    // Закрытие при клике вне меню
    document.removeEventListener('click', outsideClickHandler);
    document.addEventListener('click', outsideClickHandler);
}

function submenuToggleHandler(e) {
    e.stopPropagation();
    const menuItem = this.closest('.menu-item');
    menuItem.classList.toggle('active');
}
function submenuItemHandler(e) {
    const section = this.getAttribute('data-section');
    const group = this.getAttribute('data-group');
    currentSection = section;
    currentGroup = group;
    renderContent(section, group);
    if (window.innerWidth <= 768) {
        document.body.classList.remove('sidebar-open');
        const toggleIcon = document.querySelector('.sidebar-toggle i');
        toggleIcon.classList.remove('fa-times');
        toggleIcon.classList.add('fa-bars');
    }
    saveActiveState(section, group);
    highlightActiveMenuItem(section, group);
}
function sidebarToggleHandler() {
    document.body.classList.toggle('sidebar-open');
    const icon = this.querySelector('i');
    if (document.body.classList.contains('sidebar-open')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
}
function outsideClickHandler(event) {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (!sidebar.contains(event.target) && event.target !== sidebarToggle && !sidebarToggle.contains(event.target) && document.body.classList.contains('sidebar-open')) {
        document.body.classList.remove('sidebar-open');
        const icon = sidebarToggle.querySelector('i');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
}

// ---------- Сохранение/восстановление активного раздела ----------
function saveActiveState(section, group) {
    localStorage.setItem('activeSection', section);
    localStorage.setItem('activeGroup', group);
}
function restoreActiveMenu() {
    const savedSection = localStorage.getItem('activeSection');
    const savedGroup = localStorage.getItem('activeGroup');
    if (savedSection && savedGroup && menuStructure[savedSection] && menuStructure[savedSection][savedGroup]) {
        currentSection = savedSection;
        currentGroup = savedGroup;
        renderContent(savedSection, savedGroup);
        highlightActiveMenuItem(savedSection, savedGroup);
    } else {
        renderContent("Ипотека", "Масштаб рынка");
        highlightActiveMenuItem("Ипотека", "Масштаб рынка");
    }
}
function highlightActiveMenuItem(section, group) {
    document.querySelectorAll('.menu-item, .submenu-item').forEach(el => el.classList.remove('active'));
    const parentItem = document.querySelector(`.menu-item[data-section="${section}"]`);
    if (parentItem) parentItem.classList.add('active');
    const subItem = document.querySelector(`.submenu-item[data-section="${section}"][data-group="${group}"]`);
    if (subItem) subItem.classList.add('active');
}

// ---------- Кнопки детализации ----------
function attachDetailButtons() {
    document.querySelectorAll('.detail-btn').forEach(btn => {
        btn.removeEventListener('click', detailClickHandler);
        btn.addEventListener('click', detailClickHandler);
    });
}
function detailClickHandler(e) {
    const key = this.getAttribute('data-key');
    const category = this.getAttribute('data-category');
    const subcategory = this.getAttribute('data-subcategory');
    currentIndicatorName = `${category} - ${subcategory}`;
    const hist = historicalData[key];
    if (!hist || hist.length === 0) return;
    currentHistorical = hist;
    currentUnit = hist[0].unit || '';
    isQuarterlyData = hist[0].comm_.toLowerCase().includes('квартал');
    // Определяем min/max даты
    const dates = hist.map(h => h.date);
    minDate = dates.reduce((a,b) => a < b ? a : b);
    maxDate = dates.reduce((a,b) => a > b ? a : b);
    detailTitle.textContent = currentIndicatorName;
    detailComment.textContent = hist[0].comm_ || '';
    dateRangeText.textContent = `Доступные данные: с ${formatDate(minDate)} по ${formatDate(maxDate)}`;
    startDateInput.value = minDate;
    endDateInput.value = maxDate;
    startDateInput.min = minDate;
    startDateInput.max = maxDate;
    endDateInput.min = minDate;
    endDateInput.max = maxDate;
    // Очищаем старые графики
    if (currentChart) { currentChart.destroy(); currentChart = null; }
    if (premiumChart) { premiumChart.destroy(); premiumChart = null; }
    premiumChartContainer.classList.add('hidden');
    pre2025TableContainer.innerHTML = '';
    post2025TableContainer.innerHTML = '';
    pre2025TableContainer.classList.add('hidden');
    post2025TableContainer.classList.add('hidden');
    updateDetailView();
    detailView.classList.remove('hidden');
    document.body.classList.add('detail-view-active');
}
function hideDetailView() {
    detailView.classList.add('hidden');
    document.body.classList.remove('detail-view-active');
    if (currentChart) { currentChart.destroy(); currentChart = null; }
    if (premiumChart) { premiumChart.destroy(); premiumChart = null; }
    currentHistorical = null;
}
backBtn.addEventListener('click', hideDetailView);

// ---------- Обновление графика и таблиц ----------
function updateDetailView() {
    if (!currentHistorical) return;
    const startDate = startDateInput.value || minDate;
    const endDate = endDateInput.value || maxDate;
    let filtered = currentHistorical.filter(item => item.date >= startDate && item.date <= endDate);
    filtered.sort((a,b) => a.date.localeCompare(b.date));
    const isPremium = currentIndicatorName.includes('Льготная ипотека') &&
        (currentIndicatorName.includes('Объем выданных кредитов') || currentIndicatorName.includes('Количество выданных кредитов'));
    updateChart(filtered, isPremium);
    updateTable(filtered, isPremium);
}
function updateChart(data, isPremium) {
    if (data.length === 0) return;
    if (isPremium) {
        renderPremiumMortgageChart(data);
    } else {
        renderStandardChart(data);
    }
}
function renderStandardChart(data) {
    const labels = data.map(item => formatDateBasedOnIndicator(item.date));
    const values = data.map(item => parseFloat(item.value));
    if (currentChart) currentChart.destroy();
    currentChart = new Chart(detailChartCtx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Значение', data: values, borderColor: '#5a7ae9', borderWidth: 3, fill: true, backgroundColor: 'rgba(90,122,233,0.1)', pointRadius: 0, tension: 0.2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `Значение: ${formatValue(ctx.parsed.y)} ${currentUnit}` } } }, scales: { x: { ticks: { maxRotation: 45, minRotation: 45 } }, y: { beginAtZero: true } } }
    });
}
function renderPremiumMortgageChart(data) {
    const pre2025 = data.filter(d => d.date < '2025-01-01');
    const post2025 = data.filter(d => d.date >= '2025-01-01');
    if (pre2025.length) {
        const labels = pre2025.map(d => formatDateBasedOnIndicator(d.date));
        const values = pre2025.map(d => parseFloat(d.value));
        if (currentChart) currentChart.destroy();
        currentChart = new Chart(detailChartCtx, {
            type: 'line', data: { labels, datasets: [{ label: 'Значение (до 2025)', data: values, borderColor: '#5a7ae9', borderWidth: 3, fill: true, backgroundColor: 'rgba(90,122,233,0.1)', pointRadius: 0, tension: 0.2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: (ctx) => `Значение: ${formatValue(ctx.parsed.y)} ${currentUnit}` } } }, scales: { x: { ticks: { maxRotation: 45 } }, y: { beginAtZero: true } } }
        });
    }
    if (post2025.length) {
        const labels = post2025.map(d => formatDateAsPeriod(d.date));
        const values = post2025.map(d => parseFloat(d.value));
        premiumChartContainer.classList.remove('hidden');
        if (premiumChart) premiumChart.destroy();
        premiumChart = new Chart(premiumChartCtx, {
            type: 'bar', data: { labels, datasets: [{ label: 'Накопленный объем (2025)', data: values, backgroundColor: '#6d5acf', borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: (ctx) => `Значение: ${formatValue(ctx.parsed.y)} ${currentUnit}` } } }, scales: { y: { beginAtZero: true } } }
        });
    } else {
        premiumChartContainer.classList.add('hidden');
    }
}
function updateTable(data, isPremium) {
    if (isPremium) {
        const pre2025 = data.filter(d => d.date < '2025-01-01');
        const post2025 = data.filter(d => d.date >= '2025-01-01');
        if (pre2025.length) { createTable(pre2025, pre2025TableContainer, 'Данные до 2025 года', false); pre2025TableContainer.classList.remove('hidden'); }
        if (post2025.length) { createTable(post2025, post2025TableContainer, 'Данные с 2025 года', true); post2025TableContainer.classList.remove('hidden'); }
    } else {
        createTable(data, pre2025TableContainer, '', false);
        pre2025TableContainer.classList.remove('hidden');
    }
}
function createTable(data, container, sectionTitle, formatAsPeriod) {
    container.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'detail-table';
    table.innerHTML = `<thead><tr><th>Дата</th><th>Значение</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    if (sectionTitle) {
        const tr = document.createElement('tr');
        tr.className = 'section-header';
        tr.innerHTML = `<td colspan="2">${sectionTitle}</td>`;
        tbody.appendChild(tr);
    }
    for (const item of data) {
        const tr = document.createElement('tr');
        let dateStr;
        if (isQuarterlyData) dateStr = getQuarterFromDate(item.date);
        else if (formatAsPeriod) dateStr = formatDateAsPeriod(item.date);
        else dateStr = formatDateBasedOnIndicator(item.date);
        tr.innerHTML = `<td>${dateStr}</td><td>${formatValue(parseFloat(item.value))} ${item.unit}</td>`;
        tbody.appendChild(tr);
    }
    container.appendChild(table);
}
// Вспомогательные функции форматирования
function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU');
}
function formatDateBasedOnIndicator(dateStr) {
    const d = new Date(dateStr);
    if (isQuarterlyData) return getQuarterFromDate(dateStr);
    if (currentIndicatorName.includes('Льготная ипотека')) {
        if (currentIndicatorName.includes('Объем выданных кредитов') && dateStr < '2025-01-01') return d.getFullYear().toString();
        if (currentIndicatorName.includes('Количество выданных кредитов') && dateStr < '2025-01-01') return d.getFullYear().toString();
    }
    return d.toLocaleDateString('ru-RU', { year:'numeric', month:'2-digit', day:'2-digit' });
}
function formatDateAsPeriod(dateStr) {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthNames = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
    if (month === 0) return `янв ${year}`;
    if (month === 1) return `янв-фев ${year}`;
    if (month === 2) return `янв-мар ${year}`;
    if (month === 3) return `янв-апр ${year}`;
    if (month === 4) return `янв-май ${year}`;
    if (month === 5) return `янв-июн ${year}`;
    if (month === 6) return `янв-июл ${year}`;
    if (month === 7) return `янв-авг ${year}`;
    if (month === 8) return `янв-сен ${year}`;
    if (month === 9) return `янв-окт ${year}`;
    if (month === 10) return `янв-ноя ${year}`;
    return `янв-дек ${year}`;
}
function getQuarterFromDate(dateStr) {
    const d = new Date(dateStr);
    const q = Math.floor(d.getMonth()/3)+1;
    return `${q} кв ${d.getFullYear()}`;
}
function formatValue(val) {
    if (currentUnit === 'ед.' || currentUnit === 'млн ед.') return Math.round(val).toLocaleString('ru-RU');
    return val.toLocaleString('ru-RU', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
// Автообновление при смене дат
startDateInput.addEventListener('change', () => { if (updateTimeout) clearTimeout(updateTimeout); updateTimeout = setTimeout(updateDetailView, 300); });
endDateInput.addEventListener('change', () => { if (updateTimeout) clearTimeout(updateTimeout); updateTimeout = setTimeout(updateDetailView, 300); });

// Запуск
loadData();
