const tg = window.Telegram.WebApp;
tg.expand();

// Элементы
const contentDiv = document.getElementById('content');
const pageTitle = document.getElementById('page-title');
const backBtn = document.getElementById('back-btn');
const searchBtn = document.getElementById('search-btn');
const headerSpacer = document.getElementById('header-spacer');
const headerLogo = document.getElementById('header-logo');

const searchContainer = document.getElementById('search-container');
const searchInput = document.getElementById('search-input');
const searchClose = document.getElementById('search-close');

const imageModal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-img');
const modalCloseBtn = document.getElementById('modal-close');

let menuData = [];
let historyStack = [];
let isSearchActive = false; 
let isModalOpen = false;

// --- ПЕРЕМЕННЫЕ ДЛЯ ПРОДВИНУТОГО ЗУМА ---
let state = {
    scale: 1,
    pX: 0, // position X
    pY: 0, // position Y
    startX: 0,
    startY: 0,
    startScale: 1
};

// Для отслеживания жестов
let startTouches = [];

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function formatText(text) {
    if (!text) return '';
    let formatted = text.replace(/\n/g, '<br>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<b>$1</b>');
    return formatted;
}

// --- ЛОГИКА ЗУМА И ПАН (Physics & Math) ---

function updateTransform(animate = false) {
    if (animate) {
        modalImg.classList.add('animating');
    } else {
        modalImg.classList.remove('animating');
    }
    // Используем translate3d для аппаратного ускорения (плавнее)
    modalImg.style.transform = `translate3d(${state.pX}px, ${state.pY}px, 0) scale(${state.scale})`;
}

function openModal(src) {
    modalImg.src = src;
    imageModal.style.display = 'flex';
    isModalOpen = true;
    document.body.classList.add('no-scroll');
    
    // Сброс состояния
    state = { scale: 1, pX: 0, pY: 0 };
    updateTransform(false);
    
    tg.BackButton.show();
}

function closeModal() {
    imageModal.style.display = 'none';
    modalImg.src = '';
    isModalOpen = false;
    document.body.classList.remove('no-scroll');
    updateHeaderUI();
}

// Получить расстояние между пальцами
function getDistance(touches) {
    return Math.hypot(
        touches[0].pageX - touches[1].pageX,
        touches[0].pageY - touches[1].pageY
    );
}

// Получить центр между пальцами (или одного пальца)
function getCenter(touches) {
    if (touches.length === 2) {
        return {
            x: (touches[0].pageX + touches[1].pageX) / 2,
            y: (touches[0].pageY + touches[1].pageY) / 2
        };
    } else {
        return {
            x: touches[0].pageX,
            y: touches[0].pageY
        };
    }
}

// Ограничитель (Clamping) с эффектом резинки
// val - текущая позиция, min/max - границы
function rubberBand(val, min, max) {
    if (val < min) {
        // Мы тянем влево за границу -> создаем сопротивление
        return min - (Math.pow(min - val, 0.8)); 
    }
    if (val > max) {
        // Мы тянем вправо за границу
        return max + (Math.pow(val - max, 0.8));
    }
    return val;
}

// --- ОБРАБОТЧИКИ СОБЫТИЙ ---

imageModal.addEventListener('touchstart', (e) => {
    if (e.touches.length > 2) return;

    // Останавливаем анимацию, если пользователь схватил картинку пока она летела
    modalImg.classList.remove('animating');

    startTouches = [...e.touches];
    const center = getCenter(startTouches);
    
    state.startX = center.x - state.pX;
    state.startY = center.y - state.pY;
    state.startScale = state.scale;
    
    // Для зума запоминаем начальную дистанцию
    if (e.touches.length === 2) {
        state.startDist = getDistance(e.touches);
    }
}, { passive: false });

imageModal.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Блокируем скролл и зум браузера
    if (e.touches.length > 2) return;

    const center = getCenter(e.touches);
    const touches = e.touches;

    if (touches.length === 2) {
        // --- ЗУМ + СДВИГ (Pinch) ---
        const dist = getDistance(touches);
        const scaleChange = dist / state.startDist;
        
        // Новая позиция = (ЦентрПальцев - (ЦентрПальцев - СтараяПозиция) * КоэффМасштаба)
        // Это формула, которая заставляет картинку зумиться в точку между пальцами
        const newScale = state.startScale * scaleChange;
        
        const x = center.x - (center.x - state.startX) * scaleChange;
        const y = center.y - (center.y - state.startY) * scaleChange;

        state.pX = x;
        state.pY = y;
        state.scale = newScale;

        // Пока зумим пальцами - резинку не применяем, просто обновляем
        updateTransform(false);

    } else if (touches.length === 1 && state.scale > 1) {
        // --- ПЕРЕТАСКИВАНИЕ (Pan) ---
        // Тут применяем "резинку"
        
        let newX = center.x - state.startX;
        let newY = center.y - state.startY;

        const bounds = getBounds();
        
        // Применяем сопротивление, если выходим за границы
        newX = rubberBand(newX, bounds.minX, bounds.maxX);
        newY = rubberBand(newY, bounds.minY, bounds.maxY);

        state.pX = newX;
        state.pY = newY;
        updateTransform(false);
    }
}, { passive: false });

imageModal.addEventListener('touchend', (e) => {
    // Когда отпустили пальцы - проверяем границы и "пружиним" обратно
    
    let finalScale = state.scale;
    let finalX = state.pX;
    let finalY = state.pY;

    // 1. Если зум слишком маленький (<1), возвращаем 1
    if (finalScale < 1) {
        finalScale = 1;
        finalX = 0;
        finalY = 0;
    } 
    // 2. Если зум слишком большой (>4), возвращаем 4 (опционально, можно оставить)
    else if (finalScale > 4) {
        // Можно тут добавить логику возврата к 4x, но пока оставим как есть или
        // finalScale = 4; (и нужно пересчитать координаты, это сложно)
    }

    // 3. Если зум нормальный (>1), проверяем, не улетела ли картинка
    if (finalScale >= 1) {
        const bounds = getBounds(finalScale); // Считаем границы для итогового зума
        
        // Если вылезли за левый/правый край
        if (finalX > bounds.maxX) finalX = bounds.maxX;
        if (finalX < bounds.minX) finalX = bounds.minX;
        
        // Если вылезли за верх/низ
        if (finalY > bounds.maxY) finalY = bounds.maxY;
        if (finalY < bounds.minY) finalY = bounds.minY;
    }

    // Применяем "чистые" значения с анимацией
    state.scale = finalScale;
    state.pX = finalX;
    state.pY = finalY;

    // Если данные изменились (сработала пружина) - запускаем анимацию
    updateTransform(true);

    startTouches = [];
});

// Рассчет границ, куда можно двигать картинку
function getBounds(scale = state.scale) {
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    
    // Реальный размер картинки сейчас
    const imgW = modalImg.offsetWidth * scale;
    const imgH = modalImg.offsetHeight * scale;

    // Если картинка меньше экрана, границы = 0 (центр)
    // Если больше, границы = половина разницы размеров
    // Но так как у нас transform-origin = 0 0 (левый верхний угол экрана в CSS мы не ставили, но
    // наша математика (pX, pY) работает как offset от центра экрана при старте... 
    // Стоп. Чтобы упростить: 
    // Мы центрируем картинку с помощью Flexbox в CSS.
    // Наши pX/pY - это смещение от этого центра.
    
    let rangeX = 0;
    let rangeY = 0;

    if (imgW > viewportW) {
        rangeX = (imgW - viewportW) / 2;
    }
    if (imgH > viewportH) {
        rangeY = (imgH - viewportH) / 2;
    }

    return {
        minX: -rangeX,
        maxX: rangeX,
        minY: -rangeY,
        maxY: rangeY
    };
}

// Двойной тап
let lastTap = 0;
imageModal.addEventListener('click', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
        // Double Tap
        if (state.scale > 1) {
            // Возврат в центр
            state.scale = 1;
            state.pX = 0;
            state.pY = 0;
        } else {
            // Зум в 2.5 раза
            state.scale = 2.5;
            state.pX = 0;
            state.pY = 0;
        }
        updateTransform(true);
        e.preventDefault();
    }
    lastTap = currentTime;
});

modalCloseBtn.onclick = closeModal;

// --- ЗАГРУЗКА И ОСТАЛЬНОЙ КОД ---
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
        setTimeout(() => { renderCategories(); }, 200);
    });
}

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
    if (historyStack.length === 0) renderCategories(); else renderCategories(); 
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
                el.innerHTML = `<div style="display:flex; flex-direction:column;"><span class="card-title">${dish.name}</span><span style="font-size:12px; color:#999;">${cat.title}</span></div><span class="arrow">›</span>`;
                el.onclick = () => {
                    searchContainer.style.display = 'none';
                    isSearchActive = false;
                    renderDishDetail(dish, cat);
                };
                contentDiv.appendChild(el);
            }
        });
    });
    if (!foundSomething) contentDiv.innerHTML = '<div style="text-align:center; padding:20px;">Ничего не найдено</div>';
}

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
    if (activeCategories.length === 0) { contentDiv.innerHTML = '<div style="text-align:center; padding: 20px;">Меню пустое.</div>'; return; }
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
    if (historyStack.length === 0) historyStack.push(() => renderCategories());
    else if (parentCategory) historyStack.push(() => renderDishes(parentCategory));
    
    updateHeaderUI();
    contentDiv.innerHTML = '';
    pageTitle.innerText = dish.name;
    const imgUrl = dish.image ? (IMAGE_PATH_PREFIX + dish.image) : null;
    const imgHTML = imgUrl ? `<img src="${imgUrl}" class="dish-image" alt="${dish.name}">` : '';
    const ingredients = formatText(dish.ingredients);
    const recipe = formatText(dish.recipe);
    const el = document.createElement('div');
    el.className = 'dish-detail';
    el.innerHTML = `<div class="image-container">${imgHTML}</div><div class="dish-info"><div class="section-title">Граммовки / Состав</div><div class="dish-text">${ingredients}</div><div class="section-title">Технология</div><div class="dish-text">${recipe}</div></div>`;
    const imgElement = el.querySelector('.dish-image');
    if (imgElement && imgUrl) imgElement.onclick = () => openModal(imgUrl);
    contentDiv.appendChild(el);
}
function goBack() {
    if (isModalOpen) { closeModal(); return; }
    if (isSearchActive) { closeSearch(); return; }
    if (historyStack.length > 0) { const previousAction = historyStack.pop(); previousAction(); }
    else { renderCategories(); }
    updateHeaderUI();
}
backBtn.addEventListener('click', goBack);
tg.BackButton.onClick(goBack);
loadMenu();
