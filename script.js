
// Глобальные переменные
let menuStructure = null;
let currentData = null;
let historicalData = null;
let currentSection = "Ипотека";
let currentGroup = "Масштаб рынка";

// DOM элементы
const sidebarMenu = document.querySelector('.sidebar-menu');
const dashboardContainer = document.getElementById('dashboard-container');
const sectionHeader = document.getElementById('current-section');

// Загрузка данных
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

// Инициализация приложения
function initApp() {
    buildSidebar();
    renderContent(currentSection, currentGroup);
    attachEventListeners();
    restoreActiveMenu();
}

// Построение бокового меню
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

// Рендер контента для раздела и группы
function renderContent(section, group) {
    const groups = menuStructure[section];
    if (!groups || !groups[group]) {
        dashboardContainer.innerHTML = '<div class="empty-section">Раздел в разработке</div>';
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
                        <div class="kpi-subcategory">${item.subcategory}</div>
                        <div class="kpi-period">${item.period}</div>
                    </div>
                    <div class="kpi-main">
                        <div class="kpi-value">${item.value} ${item.unit}</div>
                        <div class="kpi-change-container">
                            <span class="${trendClass}">${item.trend}</span>
                            <span>${changeSign}${item.change} ${changeUnit}</span>
                        </div>
                    </div>
                    <button class="detail-btn" data-key="${item.key}" data-category="${item.category}" data-subcategory="${item.subcategory}">
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

// Обработчики меню и подменю
function attachEventListeners() {
    document.querySelectorAll('.submenu-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const menuItem = toggle.closest('.menu-item');
            menuItem.classList.toggle('active');
        });
    });
    document.querySelectorAll('.submenu-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            const group = item.getAttribute('data-group');
            currentSection = section;
            currentGroup = group;
            renderContent(section, group);
            // Закрыть меню на мобильных
            if (window.innerWidth <= 768) {
                document.body.classList.remove('sidebar-open');
                const toggleIcon = document.querySelector('.sidebar-toggle i');
                toggleIcon.classList.remove('fa-times');
                toggleIcon.classList.add('fa-bars');
            }
            saveActiveState(section, group);
            highlightActiveMenuItem(section, group);
        });
    });
    // Кнопка показа/скрытия боковой панели
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    sidebarToggle.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-open');
        const icon = sidebarToggle.querySelector('i');
        if (document.body.classList.contains('sidebar-open')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });
    // Закрытие при клике вне меню
    document.addEventListener('click', (event) => {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target) && document.body.classList.contains('sidebar-open')) {
            document.body.classList.remove('sidebar-open');
            const icon = sidebarToggle.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });
}

// Подсветка активного пункта меню
function highlightActiveMenuItem(section, group) {
    document.querySelectorAll('.menu-item, .submenu-item').forEach(el => el.classList.remove('active'));
    const parentItem = document.querySelector(`.menu-item[data-section="${section}"]`);
    if (parentItem) parentItem.classList.add('active');
    const subItem = document.querySelector(`.submenu-item[data-section="${section}"][data-group="${group}"]`);
    if (subItem) subItem.classList.add('active');
}

// Сохранение состояния в localStorage
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

// Привязка кнопок детализации
function attachDetailButtons() {
    document.querySelectorAll('.detail-btn').forEach(btn => {
        btn.removeEventListener('click', detailClickHandler);
        btn.addEventListener('click', detailClickHandler);
    });
}

let currentChart = null, premiumChart = null;
let currentHistorical = null, currentUnit = '', isQuarterlyData = false, currentIndicatorName = '';
let minDate, maxDate;

function detailClickHandler(e) {
    const key = this.getAttribute('data-key');
    const category = this.getAttribute('data-category');
    const subcategory = this.getAttribute('data-subcategory');
    currentIndicatorName = `${category} - ${subcategory}`;
    const hist = historicalData[key];
    if (!hist || hist.length === 0) return;
    currentHistorical = hist;
    isQuarterlyData = hist[0].comm_.toLowerCase().includes('квартал');
    // Определяем даты
    const dates = hist.map(h => h.date);
    minDate = dates.reduce((a,b) => a < b ? a : b);
    maxDate = dates.reduce((a,b) => a > b ? a : b);
    document.getElementById('detail-title').textContent = currentIndicatorName;
    document.getElementById('detail-comment').textContent = hist[0].comm_ || '';
    document.getElementById('date-range-text').textContent = `Доступные данные: с ${formatDate(minDate)} по ${formatDate(maxDate)}`;
    const startInput = document.getElementById('start-date');
    const endInput = document.getElementById('end-date');
    startInput.value = minDate;
    endInput.value = maxDate;
    startInput.min = minDate;
    startInput.max = maxDate;
    endInput.min = minDate;
    endInput.max = maxDate;
    document.getElementById('pre-2025-table-container').innerHTML = '';
    document.getElementById('post-2025-table-container').innerHTML = '';
    document.getElementById('premium-chart-container').classList.add('hidden');
    updateDetailView();
    document.getElementById('detail-view').classList.remove('hidden');
    document.body.classList.add('detail-view-active');
}

// Функции обновления графика и таблиц (аналогичны исходным, но работают с currentHistorical)
// Здесь приведены лишь основные вызовы, полную реализацию можно скопировать из исходного script.js
function updateDetailView() { /* ... */ }
function updateChart(data, isPremium) { /* ... */ }
function updateTable(data, isPremium) { /* ... */ }
function formatDate(dateStr) { /* ... */ }

// Обработчик кнопки "Назад"
document.getElementById('back-btn').addEventListener('click', () => {
    document.getElementById('detail-view').classList.add('hidden');
    document.body.classList.remove('detail-view-active');
    if (currentChart) currentChart.destroy();
    if (premiumChart) premiumChart.destroy();
});

// Инициализация
loadData();
