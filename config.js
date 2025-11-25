const IMAGE_PATH_PREFIX = "img/";

const CATEGORIES_CONFIG = [
	{ 
        id: 'wok', 
        title: 'WOK', 
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYDhiayFH1EMnQmU1IwcU6VMMf8oZwdm5BN_gfBBUOvjzmIoQ32wdwrhuL4q_vzFg3cT5l1gH7BKrb/pub?gid=886705133&single=true&output=csv" 
    },
	{ 
        id: 'combo', 
        title: 'Комбо', 
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYDhiayFH1EMnQmU1IwcU6VMMf8oZwdm5BN_gfBBUOvjzmIoQ32wdwrhuL4q_vzFg3cT5l1gH7BKrb/pub?gid=391305321&single=true&output=csv" 
    },
	{ 
        id: 'sets', 
        title: 'Сеты', 
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYDhiayFH1EMnQmU1IwcU6VMMf8oZwdm5BN_gfBBUOvjzmIoQ32wdwrhuL4q_vzFg3cT5l1gH7BKrb/pub?gid=1120750076&single=true&output=csv" 
    },
	{ 
        id: 'cold_rolls', 
        title: 'Холодные роллы', 
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYDhiayFH1EMnQmU1IwcU6VMMf8oZwdm5BN_gfBBUOvjzmIoQ32wdwrhuL4q_vzFg3cT5l1gH7BKrb/pub?gid=0&single=true&output=csv" 
    },
    { 
        id: 'hot_rolls', 
        title: 'Горячие роллы', 
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYDhiayFH1EMnQmU1IwcU6VMMf8oZwdm5BN_gfBBUOvjzmIoQ32wdwrhuL4q_vzFg3cT5l1gH7BKrb/pub?gid=1136918048&single=true&output=csv" 
    },
	{ 
        id: 'sushi-gunkan', 
        title: 'Суши и Гунканы', 
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYDhiayFH1EMnQmU1IwcU6VMMf8oZwdm5BN_gfBBUOvjzmIoQ32wdwrhuL4q_vzFg3cT5l1gH7BKrb/pub?gid=1274693568&single=true&output=csv" 
    },
    { 
        id: 'maki', 
        title: 'Маки', 
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYDhiayFH1EMnQmU1IwcU6VMMf8oZwdm5BN_gfBBUOvjzmIoQ32wdwrhuL4q_vzFg3cT5l1gH7BKrb/pub?gid=1722220340&single=true&output=csv" 
    },
	{ 
        id: 'onigiri', 
        title: 'Онигири', 
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYDhiayFH1EMnQmU1IwcU6VMMf8oZwdm5BN_gfBBUOvjzmIoQ32wdwrhuL4q_vzFg3cT5l1gH7BKrb/pub?gid=1819106683&single=true&output=csv" 
    },
	{ 
        id: 'soup', 
        title: 'Супы', 
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYDhiayFH1EMnQmU1IwcU6VMMf8oZwdm5BN_gfBBUOvjzmIoQ32wdwrhuL4q_vzFg3cT5l1gH7BKrb/pub?gid=2129850367&single=true&output=csv" 
    },
	{ 
        id: 'soup', 
        title: 'Супы', 
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYDhiayFH1EMnQmU1IwcU6VMMf8oZwdm5BN_gfBBUOvjzmIoQ32wdwrhuL4q_vzFg3cT5l1gH7BKrb/pub?gid=2129850367&single=true&output=csv" 
    },
    { 
        id: 'salad', 
        title: 'Салаты и Поке', 
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYDhiayFH1EMnQmU1IwcU6VMMf8oZwdm5BN_gfBBUOvjzmIoQ32wdwrhuL4q_vzFg3cT5l1gH7BKrb/pub?gid=1774700423&single=true&output=csv" 
    },
	{ 
        id: 'desserts', 
        title: 'Десерты', 
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYDhiayFH1EMnQmU1IwcU6VMMf8oZwdm5BN_gfBBUOvjzmIoQ32wdwrhuL4q_vzFg3cT5l1gH7BKrb/pub?gid=1290067053&single=true&output=csv" 
    }

];
