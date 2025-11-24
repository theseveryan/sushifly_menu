const tg = window.Telegram.WebApp;
tg.expand();

// Элементы
const contentDiv = document.getElementById('content');
const pageTitle = document.getElementById('page-title');
const backBtn = document.getElementById('back-btn');
const searchBtn = document.getElementById('search-btn');
const headerSpacer = document.getElementById('header-spacer');
// Элемент логотипа
const headerLogo = document.getElementById('header-logo');

// Элементы поиска
const searchContainer = document.getElementById('search-container');
const searchInput = document.getElementById('search-input');
const searchClose = document.getElementById('search-close');

let menuData = [];
let historyStack = [];
let isSearchActive = false; // Флаг, активен ли поиск

// --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ЖИРНОГО ТЕКСТА ---
function formatText(text) {
    if (!text) return '';
    // 1. Меняем переносы строк на <br>
    let formatted = text.replace(/\n/g, '<br>');
    // 2. Меняем *текст* на жирный <b>текст</b>
    formatted = formatted.replace(/\*(.*?)\*/g, '<b>$1</b>');
    return formatted;
}

// --- ЗАГРУЗКА ---
function loadMenu() {
    if (typeof CATEGORIES_CONFIG === 'undefined') {
        contentDiv.innerHTML = '<div style="color:red; text-align:center;">Ошибка: config.js не найден.</div>';
        return;
    }

    // 1. Рисуем начальное состояние загрузки
    contentDiv.innerHTML = '<div id="loading-text" style="text-align:center; padding:20px; color:#999; font-weight:500; font-size:16px;">Загрузка меню 0%</div>';
    
    const loadingText = document.getElementById('loading-text');
    let loadedCount = 0;
    const totalCount = CATEGORIES_CONFIG.length;

    // Функция, которая обновляет проценты на экране
    const updateProgress = () => {
        loadedCount++;
        // Считаем процент (округляем до целого)
        let percent = Math.floor((loadedCount / totalCount) * 100);
        // На всякий случай ограничиваем 100%, чтобы не было 101%
        if (percent > 100) percent = 100;
        
        if (loadingText) {
            loadingText.innerText = `Загрузка меню ${percent}%`;
        }
    };
    
    const promises = CATEGORIES_CONFIG.map(cat => {
        return new Promise((resolve) => {
            // Если URL пустой или заглушка
            if (!cat.url || cat.url.includes("ВСТАВЬТЕ")) {
                // Все равно считаем прогресс, хоть файл и пустой
                updateProgress();
                resolve({ ...cat, items: [] }); 
                return;
            }

            Papa.parse(cat.url, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    // Парсинг успешен
                    const validItems = results.data.filter(item => item.name && item.name.trim() !== '').map(item => ({
                        ...item,
                        searchName: item.name.toLowerCase() 
                    }));
                    
                    // ОБНОВЛЯЕМ ПРОЦЕНТЫ
                    updateProgress();
                    resolve({ id: cat.id, title: cat.title, items: validItems });
                },
                error: function() {
                    // Если ошибка загрузки — тоже обновляем прогресс (чтобы не зависло)
                    updateProgress();
                    resolve({ ...cat, items: [] });
                }
            });
        });
    });

    Promise.all(promises).then(loadedCategories => {
        menuData = loadedCategories;
        
        // Делаем маленькую паузу (200мс), чтобы пользователь успел увидеть "100%"
        setTimeout(() => {
            renderCategories();
        }, 200);
    });
}

// --- ПОИСК ---

// Открыть поиск
searchBtn.addEventListener('click', () => {
    searchContainer.style.display = 'flex';
    searchInput.focus();
    isSearchActive = true;
});

// Закрыть поиск
searchClose.addEventListener('click', closeSearch);

function closeSearch() {
    searchContainer.style.display = 'none';
    searchInput.value = '';
    isSearchActive = false;
    if (historyStack.length === 0) renderCategories();
    else {
        renderCategories(); 
    }
}

// Ввод текста
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (query.length === 0) {
        contentDiv.innerHTML = '<div style="text-align:center; color:#999;">Введите название блюда...</div>';
        return;
    }
    performSearch(query);
});

function performSearch(query) {
    contentDiv.innerHTML = '';
    let foundSomething = false;

    menuData.forEach(cat => {
        cat.items.forEach(dish => {
            if (dish.searchName.includes(query)) {
                foundSomething = true;
                const el = document.createElement('div');
                el.className = 'card';
                el.innerHTML = `
                    <div style="display:flex; flex-direction:column;">
                        <span class="card-title">${dish.name}</span>
                        <span style="font-size:12px; color:#999;">${cat.title}</span>
                    </div>
                    <span class="arrow">›</span>
                `;
                el.onclick = () => {
                    searchContainer.style.display = 'none';
                    isSearchActive = false;
                    renderDishDetail(dish, cat);
                };
                contentDiv.appendChild(el);
            }
        });
    });

    if (!foundSomething) {
        contentDiv.innerHTML = '<div style="text-align:center; padding:20px;">Ничего не найдено</div>';
    }
}

// --- НАВИГАЦИЯ ---

function updateHeaderUI() {
    const hasLogo = !!headerLogo;

    if (historyStack.length === 0) {
        // Главная
        backBtn.style.display = 'none';
        tg.BackButton.hide();
        
        if (hasLogo) headerLogo.style.display = 'block';

        searchBtn.style.display = 'flex';
        headerSpacer.style.display = 'none';
    } else {
        // Внутренняя
        backBtn.style.display = 'flex';
        tg.BackButton.show();
        
        if (hasLogo) headerLogo.style.display = 'none';
        
        searchBtn.style.display = 'none'; 
        headerSpacer.style.display = 'flex';
    }
}

function renderCategories() {
    historyStack = [];
    updateHeaderUI();
    contentDiv.innerHTML = '';
    pageTitle.innerText = 'Меню';

    const activeCategories = menuData.filter(cat => cat.items.length > 0);

    if (activeCategories.length === 0) {
        contentDiv.innerHTML = '<div style="text-align:center; padding: 20px;">Меню пустое.</div>';
        return;
    }

    activeCategories.forEach(cat => {
        const el = document.createElement('div');
        el.className = 'card';
        el.innerHTML = `<span class="card-title">${cat.title}</span><span class="arrow">›</span>`;
        el.onclick = () => renderDishes(cat);
        contentDiv.appendChild(el);
    });
}

function renderDishes(category) {
    historyStack.push(() => renderCategories());
    updateHeaderUI();
    contentDiv.innerHTML = '';
    pageTitle.innerText = category.title;

    category.items.forEach(dish => {
        const el = document.createElement('div');
        el.className = 'card';
        el.innerHTML = `<span class="card-title">${dish.name}</span><span class="arrow">›</span>`;
        el.onclick = () => renderDishDetail(dish, category);
        contentDiv.appendChild(el);
    });
}

function renderDishDetail(dish, parentCategory) {
    if (historyStack.length === 0) {
        historyStack.push(() => renderCategories());
    } else {
        if (parentCategory) {
             historyStack.push(() => renderDishes(parentCategory));
        }
    }
    
    updateHeaderUI();
    contentDiv.innerHTML = '';
    pageTitle.innerText = dish.name;
    
    const imgUrl = dish.image ? (IMAGE_PATH_PREFIX + dish.image) : null;
    const imgHTML = imgUrl ? `<img src="${imgUrl}" class="dish-image" alt="${dish.name}">` : '';

    const ingredients = formatText(dish.ingredients);
    const recipe = formatText(dish.recipe);

    const el = document.createElement('div');
    el.className = 'dish-detail';
    el.innerHTML = `
        ${imgHTML}
        <div class="dish-info">
            <div class="section-title">Граммовки / Состав</div>
            <div class="dish-text">${ingredients}</div>
            <div class="section-title">Технология</div>
            <div class="dish-text">${recipe}</div>
        </div>
    `;
    contentDiv.appendChild(el);
}

function goBack() {
    if (isSearchActive) {
        closeSearch();
        return;
    }
    if (historyStack.length > 0) {
        const previousAction = historyStack.pop();
        previousAction();
    } else {
        renderCategories();
    }
    updateHeaderUI();
}

backBtn.addEventListener('click', goBack);
tg.BackButton.onClick(goBack);

loadMenu();