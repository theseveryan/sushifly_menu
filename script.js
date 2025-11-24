const tg = window.Telegram.WebApp;
tg.expand();

// Элементы
const contentDiv = document.getElementById('content');
const pageTitle = document.getElementById('page-title');
const backBtn = document.getElementById('back-btn');
const searchBtn = document.getElementById('search-btn');
const headerSpacer = document.getElementById('header-spacer');
// ВАЖНО: Убедись, что ID совпадает с HTML (если переименовал файл - тут менять не надо, тут ищется ID тега)
const headerLogo = document.getElementById('header-logo');

// Элементы поиска
const searchContainer = document.getElementById('search-container');
const searchInput = document.getElementById('search-input');
const searchClose = document.getElementById('search-close');

// Элементы модального окна
const imageModal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-img');
const modalCloseBtn = document.getElementById('modal-close');

let menuData = [];
let historyStack = [];
let isSearchActive = false; 
let isModalOpen = false;

// ПЕРЕМЕННЫЕ ДЛЯ ЗУМА
let currentScale = 1;
let currentX = 0;
let currentY = 0;
let startDist = 0;
let startX = 0; // Точка нажатия пальцем (X)
let startY = 0; // Точка нажатия пальцем (Y)
let initialX = 0; // Позиция картинки в момент начала жеста
let initialY = 0; // Позиция картинки в момент начала жеста

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function formatText(text) {
    if (!text) return '';
    let formatted = text.replace(/\n/g, '<br>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<b>$1</b>');
    return formatted;
}

// --- ЛОГИКА ЗУМА И ГРАНИЦ ---

function resetZoom() {
    currentScale = 1;
    currentX = 0;
    currentY = 0;
    initialX = 0;
    initialY = 0;
    updateTransform();
}

function updateTransform() {
    modalImg.style.transform = `translate(${currentX}px, ${currentY}px) scale(${currentScale})`;
}

function openModal(src) {
    modalImg.src = src;
    imageModal.style.display = 'flex';
    isModalOpen = true;
    document.body.classList.add('no-scroll');
    resetZoom();
    tg.BackButton.show();
}

function closeModal() {
    imageModal.style.display = 'none';
    modalImg.src = '';
    isModalOpen = false;
    document.body.classList.remove('no-scroll');
    updateHeaderUI();
}

// Обработка жестов
imageModal.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        // Начало зума (два пальца)
        startDist = getDistance(e.touches);
    } else if (e.touches.length === 1) {
        // Начало движения (один палец)
        // Запоминаем, где стояла картинка (initial) и где нажали (start)
        initialX = currentX;
        initialY = currentY;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }
});

imageModal.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Блокируем скролл браузера
    
    if (e.touches.length === 2) {
        // --- ЗУМ (2 пальца) ---
        const newDist = getDistance(e.touches);
        const scaleChange = newDist / startDist;
        
        let newScale = currentScale * scaleChange;
        
        // Ограничения зума: минимум 1x, максимум 4x
        if (newScale < 1) newScale = 1;
        if (newScale > 4) newScale = 4;

        currentScale = newScale;
        startDist = newDist; // Обновляем дистанцию для плавности
        
        // Если мы уменьшили до 1x, сбрасываем позицию в центр
        if (currentScale === 1) {
            currentX = 0;
            currentY = 0;
        }
        
        updateTransform();
        
    } else if (e.touches.length === 1 && currentScale > 1) {
        // --- ПЕРЕМЕЩЕНИЕ (1 палец) - Только если есть зум! ---
        
        // Насколько сдвинулся палец
        const deltaX = e.touches[0].clientX - startX;
        const deltaY = e.touches[0].clientY - startY;

        // Новая потенциальная позиция
        let nextX = initialX + deltaX;
        let nextY = initialY + deltaY;

        // --- МАТЕМАТИКА ГРАНИЦ ---
        // Картинка растет от центра. Значит, слева и справа появляется "лишнее" место.
        // Размер "лишнего" места с одной стороны = (ШиринаЭкрана * Масштаб - ШиринаЭкрана) / 2
        
        const boundsX = (window.innerWidth * currentScale - window.innerWidth) / 2;
        const boundsY = (window.innerHeight * currentScale - window.innerHeight) / 2;

        // Запрещаем выходить за эти границы (функция clamp)
        // Math.max(-bounds, ...) не дает уйти слишком влево
        // Math.min(bounds, ...) не дает уйти слишком вправо
        
        currentX = Math.min(boundsX, Math.max(-boundsX, nextX));
        currentY = Math.min(boundsY, Math.max(-boundsY, nextY));

        updateTransform();
    }
});

// Если палец отпустили, и масштаб стал меньше 1 (из-за инерции), возвращаем 1
imageModal.addEventListener('touchend', (e) => {
    if (currentScale < 1.1) {
        // Если масштаб почти 1, принудительно центрируем
        resetZoom();
    }
});

// Двойной клик
imageModal.addEventListener('dblclick', () => {
    if (currentScale === 1) {
        currentScale = 2; // Увеличиваем в 2 раза
    } else {
        resetZoom(); // Возвращаем назад
    }
    updateTransform();
});

function getDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

modalCloseBtn.onclick = closeModal;

// --- ЗАГРУЗКА И ОСТАЛЬНОЙ КОД БЕЗ ИЗМЕНЕНИЙ ---
function loadMenu() {
    if (typeof CATEGORIES_CONFIG === 'undefined') {
        contentDiv.innerHTML = '<div style="color:red; text-align:center;">Ошибка: config.js не найден.</div>';
        return;
    }

    contentDiv.innerHTML = '<div id="loading-text" style="text-align:center; padding:20px; color:#999; font-weight:500; font-size:16px;">Загрузка меню 0%</div>';
    
    const loadingText = document.getElementById('loading-text');
    let loadedCount = 0;
    const totalCount = CATEGORIES_CONFIG.length;

    const updateProgress = () => {
        loadedCount++;
        let percent = Math.floor((loadedCount / totalCount) * 100);
        if (percent > 100) percent = 100;
        if (loadingText) loadingText.innerText = `Загрузка меню ${percent}%`;
    };
    
    const promises = CATEGORIES_CONFIG.map(cat => {
        return new Promise((resolve) => {
            if (!cat.url || cat.url.includes("ВСТАВЬТЕ")) {
                updateProgress();
                resolve({ ...cat, items: [] }); 
                return;
            }
            Papa.parse(cat.url, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    const validItems = results.data.filter(item => item.name && item.name.trim() !== '').map(item => ({
                        ...item,
                        searchName: item.name.toLowerCase() 
                    }));
                    updateProgress();
                    resolve({ id: cat.id, title: cat.title, items: validItems });
                },
                error: function() {
                    updateProgress();
                    resolve({ ...cat, items: [] });
                }
            });
        });
    });

    Promise.all(promises).then(loadedCategories => {
        menuData = loadedCategories;
        setTimeout(() => {
            renderCategories();
        }, 200);
    });
}

// --- ПОИСК ---
searchBtn.addEventListener('click', () => {
    searchContainer.style.display = 'flex';
    searchInput.focus();
    isSearchActive = true;
});

searchClose.addEventListener('click', closeSearch);

function closeSearch() {
    searchContainer.style.display = 'none';
    searchInput.value = '';
    isSearchActive = false;
    if (historyStack.length === 0) renderCategories();
    else renderCategories(); 
}

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

    if (isModalOpen) {
        backBtn.style.display = 'flex';
        tg.BackButton.show();
        searchBtn.style.display = 'none';
        if (hasLogo) headerLogo.style.display = 'none';
        return; 
    }

    if (historyStack.length === 0) {
        backBtn.style.display = 'none';
        tg.BackButton.hide();
        if (hasLogo) headerLogo.style.display = 'block';
        searchBtn.style.display = 'flex';
        headerSpacer.style.display = 'none';
    } else {
        backBtn.style.display = 'flex';
        tg.BackButton.show();
        if (hasLogo) headerLogo.style.display = 'none';
        searchBtn.style.display = 'none'; 
        headerSpacer.style.display = 'flex';
    }
}

function renderCategories() {
    historyStack = [];
    isModalOpen = false;
    document.body.classList.remove('no-scroll');
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
        <div class="image-container">${imgHTML}</div>
        <div class="dish-info">
            <div class="section-title">Граммовки / Состав</div>
            <div class="dish-text">${ingredients}</div>
            <div class="section-title">Технология</div>
            <div class="dish-text">${recipe}</div>
        </div>
    `;
    
    const imgElement = el.querySelector('.dish-image');
    if (imgElement && imgUrl) {
        imgElement.onclick = () => openModal(imgUrl);
    }

    contentDiv.appendChild(el);
}

function goBack() {
    if (isModalOpen) {
        closeModal();
        return;
    }
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
