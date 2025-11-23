const tg = window.Telegram.WebApp;
tg.expand();

// Элементы интерфейса
const contentDiv = document.getElementById('content');
const pageTitle = document.getElementById('page-title');
const backBtn = document.getElementById('back-btn');

let menuData = [];
let historyStack = [];

// Основная функция загрузки
function loadMenu() {
    // Проверка наличия конфига
    if (typeof CATEGORIES_CONFIG === 'undefined') {
        contentDiv.innerHTML = '<div style="color:red; text-align:center; padding:20px;">Ошибка: config.js не подключен!</div>';
        return;
    }

    contentDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">Загрузка меню...</div>';
    
    // Создаем массив запросов (Promise) для каждой категории
    const promises = CATEGORIES_CONFIG.map(cat => {
        return new Promise((resolve) => {
            // Если ссылка пустая или заглушка
            if (!cat.url || cat.url.includes("ВСТАВЬТЕ_ВАШУ_ССЫЛКУ")) {
                resolve({ ...cat, items: [] }); 
                return;
            }

            Papa.parse(cat.url, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    // Фильтруем пустые строки (где нет названия блюда)
                    const validItems = results.data.filter(item => item.name && item.name.trim() !== '');
                    resolve({
                        id: cat.id,
                        title: cat.title,
                        items: validItems
                    });
                },
                error: function() {
                    console.error("Ошибка загрузки категории: " + cat.title);
                    resolve({ ...cat, items: [] });
                }
            });
        });
    });

    // Когда все запросы завершены
    Promise.all(promises).then(loadedCategories => {
        menuData = loadedCategories;
        renderCategories();
    });
}

// Управление кнопкой "Назад"
function updateBackButton() {
    if (historyStack.length > 0) {
        backBtn.style.display = 'flex';
        tg.BackButton.show();
    } else {
        backBtn.style.display = 'none';
        tg.BackButton.hide();
    }
}

// 1. Отображение списка категорий
function renderCategories() {
    historyStack = [];
    updateBackButton();
    contentDiv.innerHTML = '';
    pageTitle.innerText = 'Меню';

    // Показываем только те категории, где есть блюда
    const activeCategories = menuData.filter(cat => cat.items.length > 0);

    if (activeCategories.length === 0) {
        contentDiv.innerHTML = '<div style="text-align:center; padding: 20px;">Меню пустое.<br>Проверьте ссылки в config.js</div>';
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

// 2. Отображение блюд внутри категории
function renderDishes(category) {
    historyStack.push(() => renderCategories());
    updateBackButton();
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

// 3. Детальный просмотр блюда
function renderDishDetail(dish, parentCategory) {
    historyStack.push(() => renderDishes(parentCategory));
    updateBackButton();
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

// Функция возврата назад
function goBack() {
    if (historyStack.length > 0) {
        const previousAction = historyStack.pop();
        previousAction();
    } else {
        renderCategories();
    }
    updateBackButton();
}

// Слушатели событий
backBtn.addEventListener('click', goBack);
tg.BackButton.onClick(goBack);

// Запуск
loadMenu();