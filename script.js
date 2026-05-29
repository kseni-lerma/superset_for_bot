
// Переключение бокового меню
const sidebarToggle = document.querySelector('.sidebar-toggle');
const body = document.body;

sidebarToggle.addEventListener('click', () => {
    body.classList.toggle('sidebar-open');

    // Обновляем иконку
    const icon = sidebarToggle.querySelector('i');
    if (body.classList.contains('sidebar-open')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
});

// Закрытие меню при клике вне области
document.addEventListener('click', function(event) {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');

    // Если клик был не по боковому меню и не по кнопке переключения меню, и меню открыто
    if (!sidebar.contains(event.target) &&
        event.target !== sidebarToggle &&
        !sidebarToggle.contains(event.target) &&
        body.classList.contains('sidebar-open')) {

        body.classList.remove('sidebar-open');
        // Возвращаем иконку кнопки в исходное состояние
        const icon = sidebarToggle.querySelector('i');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
});

// Обработчики для подменю
document.querySelectorAll('.submenu-toggle').forEach(toggle => {
    toggle.addEventListener('click', function(e) {
        e.stopPropagation();
        const menuItem = this.closest('.menu-item');
        menuItem.classList.toggle('active');
    });
});

// Переключение разделов
const menuItems = document.querySelectorAll('.menu-item:not(.has-submenu)');
const submenuItems = document.querySelectorAll('.submenu-item');
const contents = document.querySelectorAll('.content');
const sectionHeader = document.getElementById('current-section');

// Функция для активации раздела
function activateSection(sectionId) {
    // Скрываем все контенты
    contents.forEach(c => c.classList.remove('active'));

    // Показываем выбранный контент
    const contentElement = document.getElementById(`content-${sectionId}`);
    if (contentElement) {
        contentElement.classList.add('active');
    }

    // Сохраняем активный раздел
    localStorage.setItem('activeSection', sectionId);
}

// Функция для активации группы
function activateGroup(section, group) {
    const sectionId = `${section}-${group}`;
    activateSection(sectionId);

    // Обновляем заголовок раздела
    sectionHeader.textContent = `${section} > ${group}`;

    // Обновляем активные элементы меню
    activateMenuItems(section, group);

    // Сохраняем активную группу
    localStorage.setItem('activeSection', section);
    localStorage.setItem('activeGroup', group);
}

// Обработчики для пунктов меню
menuItems.forEach(item => {
    item.addEventListener('click', function() {
        const section = this.getAttribute('data-section');
        activateSection(section);
        sectionHeader.textContent = section;

        // На мобильных устройствах закрываем меню после выбора
        if (window.innerWidth <= 768) {
            body.classList.remove('sidebar-open');
            sidebarToggle.querySelector('i').classList.remove('fa-times');
            sidebarToggle.querySelector('i').classList.add('fa-bars');
        }
    });
});

// Обработчики для пунктов подменю
submenuItems.forEach(item => {
    item.addEventListener('click', function() {
        const section = this.getAttribute('data-section');
        const group = this.getAttribute('data-group');
        activateGroup(section, group);

        // На мобильных устройствах закрываем меню после выбора
        if (window.innerWidth <= 768) {
            body.classList.remove('sidebar-open');
            sidebarToggle.querySelector('i').classList.remove('fa-times');
            sidebarToggle.querySelector('i').classList.add('fa-bars');
        }

        // Убираем классы активности со всех пунктов
        document.querySelectorAll('.menu-item, .submenu-item').forEach(el => {
            el.classList.remove('active');
        });

        // Активируем текущие пункты
        activateMenuItems(section, group);
    });
});

// Восстановление активного раздела при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Всегда активируем раздел "Ипотека" и группу "Масштаб рынка" при загрузке
    activateGroup("Ипотека", "Масштаб рынка");

    // Инициализация обработчиков для кнопок детализации
    document.querySelectorAll('.detail-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const key = this.getAttribute('data-key');
            const category = this.getAttribute('data-category');
            const subcategory = this.getAttribute('data-subcategory');

            // Сохраняем название показателя
            currentIndicatorName = `${category} - ${subcategory}`;

            // Показываем экран детализации
            showDetailView(key, category, subcategory);

            // Разворачиваем на весь экран
            body.classList.add('detail-view-active');
        });
    });
});

// Функция для активации соответствующих пунктов меню
function activateMenuItems(section, group) {
    // Находим основной пункт меню
    const mainMenuItem = document.querySelector(`.menu-item[data-section="${section}"]`);
    if (mainMenuItem) {
        mainMenuItem.classList.add('active');

        // Раскрываем подменю если нужно
        const submenuToggle = mainMenuItem.querySelector('.submenu-toggle');
        if (submenuToggle) {
            mainMenuItem.classList.add('active');
        }
    }

    // Находим пункт подменю
    const submenuItem = document.querySelector(`.submenu-item[data-section="${section}"][data-group="${group}"]`);
    if (submenuItem) {
        submenuItem.classList.add('active');
    }
}

// Детализация показателей
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

let currentChart = null;
let premiumChart = null;
let currentData = null;
let minDate = null;
let maxDate = null;
let currentUnit = '';
let updateTimeout = null;
let isQuarterlyData = false; // Флаг для квартальных данных
let currentIndicatorName = ''; // Название текущего показателя

// Обработчик для кнопки "Назад"
backBtn.addEventListener('click', function() {
    hideDetailView();

    // Возвращаемся к обычному виду
    body.classList.remove('detail-view-active');
});

// Автоматическое обновление при изменении дат
startDateInput.addEventListener('change', handleDateChange);
endDateInput.addEventListener('change', handleDateChange);

function handleDateChange() {
    // Защита от слишком частых обновлений
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }

    updateTimeout = setTimeout(() => {
        updateDetailView();
    }, 300);
}

// Показать экран детализации
function showDetailView(key, category, subcategory) {
    // Получаем данные для показателя
    const data = historicalData[key];
    if (!data || data.length === 0) return;

    // Сохраняем данные
    currentData = data;

    // Устанавливаем заголовок
    detailTitle.textContent = `${category} - ${subcategory}`;

    // Устанавливаем комментарий
    const comment = data.length > 0 ? data[0].comm_ : '';
    detailComment.textContent = comment;

    // Определяем, являются ли данные квартальными
    isQuarterlyData = comment.toLowerCase().includes('квартал') ||
        comment.toLowerCase().includes('квартала') ||
        comment.toLowerCase().includes('квартальные');

    // Определяем диапазон дат
    minDate = data[0].date;
    maxDate = data[0].date;

    data.forEach(item => {
        if (item.date < minDate) minDate = item.date;
        if (item.date > maxDate) maxDate = item.date;
    });

    // Устанавливаем текст с диапазоном дат
    dateRangeText.textContent = `Доступные данные: с ${formatDate(minDate)} по ${formatDate(maxDate)}`;

    // Устанавливаем фильтры дат
    startDateInput.value = minDate;
    endDateInput.value = maxDate;
    startDateInput.min = minDate;
    startDateInput.max = maxDate;
    endDateInput.min = minDate;
    endDateInput.max = maxDate;

    // Скрываем дополнительные контейнеры
    premiumChartContainer.classList.add('hidden');
    pre2025TableContainer.classList.add('hidden');
    post2025TableContainer.classList.add('hidden');

    // Обновляем представление
    updateDetailView();

    // Показываем экран детализации
    detailView.classList.remove('hidden');
}

// Скрыть экран детализации
function hideDetailView() {
    detailView.classList.add('hidden');

    // Уничтожаем предыдущий график
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }

    if (premiumChart) {
        premiumChart.destroy();
        premiumChart = null;
    }

    // Очищаем данные
    currentData = null;
    minDate = null;
    maxDate = null;
    currentUnit = '';
    isQuarterlyData = false;
    currentIndicatorName = '';
}

// Обновить представление детализации
function updateDetailView() {
    if (!currentData) return;

    // Получаем выбранные даты
    const startDate = startDateInput.value || minDate;
    const endDate = endDateInput.value || maxDate;

    // Фильтруем данные
    const filteredData = currentData.filter(item => {
        return item.date >= startDate && item.date <= endDate;
    });

    // Сортируем по дате
    filteredData.sort((a, b) => a.date.localeCompare(b.date));

    // Определяем, является ли текущий показатель льготной ипотекой
    const isPremiumMortgage = detailTitle.textContent.includes('Льготная ипотека') &&
        (detailTitle.textContent.includes('Объем выданных кредитов') ||
        detailTitle.textContent.includes('Количество выданных кредитов'));

    // Обновляем таблицы и графики
    updateChart(filteredData, isPremiumMortgage);
    updateTable(filteredData, isPremiumMortgage);
}

// Обновить таблицы
function updateTable(data, isPremiumMortgage) {
    // Очищаем контейнеры
    pre2025TableContainer.innerHTML = '';
    post2025TableContainer.innerHTML = '';

    // Проверяем, является ли текущий показатель льготной ипотекой
    if (isPremiumMortgage) {
        // Разделяем данные на периоды
        const pre2025Data = data.filter(item => item.date < '2025-01-01');
        const post2025Data = data.filter(item => item.date >= '2025-01-01');

        // Создаем таблицу для данных до 2025 года
        if (pre2025Data.length > 0) {
            createTable(pre2025Data, pre2025TableContainer, 'Данные до 2025 года', false, isPremiumMortgage);
            pre2025TableContainer.classList.remove('hidden');
        }

        // Создаем таблицу для данных с 2025 года
        if (post2025Data.length > 0) {
            createTable(post2025Data, post2025TableContainer, 'Данные с 2025 года', true, isPremiumMortgage);
            post2025TableContainer.classList.remove('hidden');
        }
    } else {
        // Для других показателей используем одну таблицу
        createTable(data, pre2025TableContainer, '', false, isPremiumMortgage);
        pre2025TableContainer.classList.remove('hidden');
    }
}

// Функция для определения квартала по дате
function getQuarterFromDate(dateString) {
    const date = new Date(dateString);
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `${quarter} кв ${date.getFullYear()}`;
}

// Форматирование даты в зависимости от типа показателя
function formatDateBasedOnIndicator(dateString) {
    const date = new Date(dateString);

    // Если данные квартальные, выводим квартал
    if (isQuarterlyData) {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `${quarter} кв ${date.getFullYear()}`;
    }

    // Специальная обработка для льготной ипотеки
    if (currentIndicatorName.includes('Льготная ипотека')) {
        // Для объема выданных кредитов до 2024 года - только год
        if (currentIndicatorName.includes('Объем выданных кредитов') && dateString < '2025-01-01') {
            return date.getFullYear().toString();
        }
        // Для количества выданных кредитов до 2025 года - только год
        if (currentIndicatorName.includes('Количество выданных кредитов') && dateString < '2025-01-01') {
            return date.getFullYear().toString();
        }
    }

    // Для всех остальных случаев выводим полную дату
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Создать таблицу
function createTable(data, container, sectionTitle, formatAsPeriod, isPremiumMortgage) {
    const table = document.createElement('table');
    table.className = 'detail-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Дата</th>
            <th>Значение</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    if (sectionTitle) {
        const sectionHeader = document.createElement('tr');
        sectionHeader.classList.add('section-header');
        sectionHeader.innerHTML = `<td colspan="2">${sectionTitle}</td>`;
        tbody.appendChild(sectionHeader);
    }

    data.forEach(item => {
        const row = document.createElement('tr');

        const dateCell = document.createElement('td');
        // Для квартальных данных используем кварталы
        if (isQuarterlyData) {
            dateCell.textContent = getQuarterFromDate(item.date);
        } else if (formatAsPeriod) {
            dateCell.textContent = formatDateAsPeriod(item.date);
        } else {
            // Используем универсальное форматирование
            dateCell.textContent = formatDateBasedOnIndicator(item.date);
        }

        const valueCell = document.createElement('td');
        // Форматируем число в зависимости от единиц измерения
        let displayValue;

        // Специальная обработка для льготной ипотеки - количество выданных кредитов
        if (detailTitle.textContent.includes('Льготная ипотека') &&
            detailTitle.textContent.includes('Количество выданных кредитов')) {
            // Всегда 2 знака после запятой
            displayValue = parseFloat(item.value).toLocaleString('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        } else if (item.unit === 'ед.' || item.unit === 'млн ед.') {
            displayValue = parseInt(item.value).toLocaleString('ru-RU');
        } else {
            const numValue = parseFloat(item.value);
            displayValue = numValue.toLocaleString('ru-RU', {
                maximumFractionDigits: 2,
                minimumFractionDigits: 0
            });
        }
        valueCell.textContent = `${displayValue} ${item.unit}`;

        row.appendChild(dateCell);
        row.appendChild(valueCell);
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}

// Обновить график - с оптимизацией для устранения пустого пространства
function updateChart(data, isPremiumMortgage) {
    // Уничтожаем предыдущий график
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }

    if (premiumChart) {
        premiumChart.destroy();
        premiumChart = null;
    }

    // Скрываем дополнительный график
    premiumChartContainer.classList.add('hidden');

    if (data.length === 0) return;

    // Проверяем, является ли текущий показатель льготной ипотекой
    if (isPremiumMortgage) {
        renderPremiumMortgageChart(data);
    } else {
        renderStandardChart(data, isPremiumMortgage);
    }
}

// Рендеринг стандартного графика - с оптимизацией для устранения пустого пространства
function renderStandardChart(data, isPremiumMortgage) {
    // Подготавливаем данные для графика
    // Для квартальных данных используем кварталы в качестве меток
    const labels = data.map(item => formatDateBasedOnIndicator(item.date));
    const values = data.map(item => parseFloat(item.value));
    currentUnit = data.length > 0 ? data[0].unit : '';

    // Создаем новый график
    currentChart = new Chart(detailChartCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Значение',
                data: values,
                backgroundColor: 'rgba(90, 122, 233, 0.1)',
                borderColor: 'rgba(90, 122, 233, 1)',
                borderWidth: 3,
                pointRadius: 0, // Убираем точки
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 14
                    },
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            let value = context.parsed.y;
                            // Форматируем число для tooltip
                            let displayValue;

                            // Специальная обработка для льготной ипотеки - количество выданных кредитов
                            if (detailTitle.textContent.includes('Льготная ипотека') &&
                                detailTitle.textContent.includes('Количество выданных кредитов')) {
                                displayValue = value.toLocaleString('ru-RU', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                });
                            } else if (currentUnit === 'ед.' || currentUnit === 'млн ед.') {
                                displayValue = parseInt(value).toLocaleString('ru-RU');
                            } else {
                                displayValue = value.toLocaleString('ru-RU', {
                                    maximumFractionDigits: 2,
                                    minimumFractionDigits: 0
                                });
                            }
                            return `Значение: ${displayValue} ${currentUnit}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        padding: 5 // Уменьшаем отступ
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(226, 232, 240, 0.5)'
                    },
                    ticks: {
                        padding: 5 // Уменьшаем отступ
                    },
                    // Убираем заголовок с единицами измерения
                    title: {
                        display: false
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            hover: {
                mode: 'index',
                intersect: false
            }
        }
    });
}

// Форматирование даты как периода
function formatDateAsPeriod(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0 - январь, 1 - февраль, и т.д.
    const monthNames = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

    // Создаем подписи по месяцам
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
    if (month === 11) return `янв-дек ${year}`;
    return `${monthNames[0]}-${monthNames[month]} ${year}`;
}

// Рендеринг графика для льготной ипотеки - с оптимизацией для устранения пустого пространства
function renderPremiumMortgageChart(data) {
    // Разделяем данные на периоды: до 2025 и после
    const pre2025Data = data.filter(item => item.date < '2025-01-01');
    const post2025Data = data.filter(item => item.date >= '2025-01-01');
    currentUnit = data.length > 0 ? data[0].unit : '';

    // Рендерим основной график (до 2025)
    if (pre2025Data.length > 0) {
        const labels = pre2025Data.map(item => formatDateBasedOnIndicator(item.date));
        const values = pre2025Data.map(item => parseFloat(item.value));

        currentChart = new Chart(detailChartCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Значение (до 2025)',
                    data: values,
                    backgroundColor: 'rgba(90, 122, 233, 0.1)',
                    borderColor: 'rgba(90, 122, 233, 1)',
                    borderWidth: 3,
                    pointRadius: 0,
                    tension: 0.2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.9)',
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 14
                        },
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                let value = context.parsed.y;
                                let displayValue;
                                // Специальная обработка для льготной ипотеки - количество выданных кредитов
                                if (detailTitle.textContent.includes('Льготная ипотека') &&
                                    detailTitle.textContent.includes('Количество выданных кредитов')) {
                                    displayValue = value.toLocaleString('ru-RU', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    });
                                } else {
                                    displayValue = value.toLocaleString('ru-RU', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    });
                                }
                                return `Значение: ${displayValue} ${currentUnit}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            padding: 5
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(226, 232, 240, 0.5)'
                        },
                        ticks: {
                            padding: 5
                        },
                        // Убираем заголовок с единицами измерения
                        title: {
                            display: false
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                hover: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
    }

    // Рендерим дополнительный график (с 2025)
    if (post2025Data.length > 0) {
        const labels = post2025Data.map(item => formatDateAsPeriod(item.date));
        const values = post2025Data.map(item => parseFloat(item.value));

        premiumChartContainer.classList.remove('hidden');
        premiumChart = new Chart(premiumChartCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Накопленный объем (2025)',
                    data: values,
                    backgroundColor: 'rgba(109, 90, 207, 0.7)',
                    borderColor: 'rgba(109, 90, 207, 1)',
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.9)',
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 14
                        },
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                let value = context.parsed.y;
                                let displayValue;
                                // Специальная обработка для льготной ипотеки - количество выданных кредитов
                                if (detailTitle.textContent.includes('Льготная ипотека') &&
                                    detailTitle.textContent.includes('Количество выданных кредитов')) {
                                    displayValue = value.toLocaleString('ru-RU', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    });
                                } else {
                                    displayValue = value.toLocaleString('ru-RU', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    });
                                }
                                return `Значение: ${displayValue} ${currentUnit}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            padding: 5
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(226, 232, 240, 0.5)'
                        },
                        ticks: {
                            padding: 5
                        },
                        // Убираем заголовок с единицами измерения
                        title: {
                            display: false
                        }
                    }
                }
            }
        });
    }
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}
