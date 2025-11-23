const tg = window.Telegram.WebApp;
tg.expand();

// Элементы
const contentDiv = document.getElementById('content');
const pageTitle = document.getElementById('page-title');
const backBtn = document.getElementById('back-btn');
const searchBtn = document.getElementById('search-btn');
const headerSpacer = document.getElementById('header-spacer');

// Элементы поиска
const searchContainer = document.getElementById('search-container');
const searchInput = document.getElementById('search-input');
const searchClose = document.getElementById('search-close');

let menuData = [];
let historyStack = [];
let isSearchActive = false; // Флаг, активен ли поиск

// --- ЗАГРУЗКА ---
function loadMenu() {
    if (typeof CATEGORIES_CONFIG === 'undefined') {
        contentDiv.innerHTML = '<div style="color:red; text-align:center;">Ошибка: config.js не найден.</div>';
        return;
    }
    contentDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">Загрузка меню...</div>';
    
    const promises = CATEGORIES_CONFIG.map(cat => {
        return new Promise((resolve) => {
            if (!cat.url || cat.url.includes("ВСТАВЬТЕ")) {
                resolve({ ...cat, items: [] }); 
                return;
            }
            Papa.parse(cat.url, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    // Чистим данные и приводим название к нижнему регистру для поиска
                    const validItems = results.data.filter(item => item.name && item.name.trim() !== '').map(item => ({
                        ...item,
                        searchName: item.name.toLowerCase() // для быстрого поиска
                    }));
                    resolve({ id: cat.id, title: cat.title, items: validItems });
                },
                error: function() {
                    resolve({ ...cat, items: [] });
                }
            });
        });
    });

    Promise.all(promises).then(loadedCategories => {
        menuData = loadedCategories;
        renderCategories();
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
    // Если мы были на главной, обновляем главную. Если внутри блюда - остаемся.
    // Для простоты возвращаемся на экран, который был
    if (historyStack.length === 0) renderCategories();
    else {
        // Повторно вызываем последнюю функцию отрисовки, чтобы убрать результаты поиска
        const lastAction = historyStack[historyStack.length - 1];
        // Но это сложно, проще просто вернуться назад к категориям, если поиск закрыли
        // Или просто перерисовать текущий вид?
        // Сделаем так: при закрытии поиска, если мы ничего не выбирали, просто рендерим то что было.
        // Но логичнее при поиске просто показывать список.
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
                // Добавляем название категории серым цветом
                el.innerHTML = `
                    <div style="display:flex; flex-direction:column;">
                        <span class="card-title">${dish.name}</span>
                        <span style="font-size:12px; color:#999;">${cat.title}</span>
                    </div>
                    <span class="arrow">›</span>
                `;
                // При клике из поиска открываем блюдо.
                // Важно: кнопка назад должна вести обратно в поиск или на главную?
                // Сделаем, чтобы вела на главную для простоты.
                el.onclick = () => {
                    searchContainer.style.display = 'none'; // Скрываем строку поиска
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
    // Если мы на главной (стек пуст)
    if (historyStack.length === 0) {
        backBtn.style.display = 'none';
        tg.BackButton.hide();
        
        searchBtn.style.display = 'flex'; // Показываем лупу
        headerSpacer.style.display = 'none';
    } else {
        backBtn.style.display = 'flex';
        tg.BackButton.show();
        
        searchBtn.style.display = 'none'; // Скрываем лупу внутри категорий/блюд
        headerSpacer.style.display = 'flex'; // Чтобы заголовок не прыгал
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
    // Если пришли из поиска, кнопка назад должна вести в категории
    if (historyStack.length === 0) {
        historyStack.push(() => renderCategories());
    } else {
        // Если пришли из категории, то как обычно
        // Проверяем, не дублируем ли мы возврат к блюдам
        const last = historyStack[historyStack.length - 1];
        // Логика упрощена: всегда возвращаем в список блюд, если мы там были
        if (parentCategory) {
             // Удаляем текущий обработчик возврата если надо, но проще просто запушить
             // Важный момент: если мы пришли из ПОИСКА, у нас parentCategory есть, но в стеке пусто.
             // Мы уже обработали это выше (if stack empty)
             // Если стек не пуст, значит мы шли по пути Главная -> Категория.
             historyStack.push(() => renderDishes(parentCategory));
        }
    }
    
    updateHeaderUI();
    contentDiv.innerHTML = '';
    pageTitle.innerText = dish.name;
    
    const imgUrl = dish.image ? (IMAGE_PATH_PREFIX + dish.image) : null;
    const imgHTML = imgUrl ? `<img src="${imgUrl}" class="dish-image" alt="${dish.name}">` : '';
    const ingredients = dish.ingredients ? dish.ingredients.replace(/\n/g, '<br>') : '';
    const recipe = dish.recipe ? dish.recipe.replace(/\n/g, '<br>') : '';

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