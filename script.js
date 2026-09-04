const API_URL = "https://dummyjson.com/recipes";

const recipesContainer = document.querySelector("#recipesContainer");
const mealPlanContainer = document.querySelector("#mealPlan");

const recipeSearch = document.querySelector("#recipeSearch");
const planSearch = document.querySelector("#planSearch");
const dayFilter = document.querySelector("#dayFilter");

const totalMeals = document.querySelector("#totalMeals");
const averageTime = document.querySelector("#averageTime");

let recipes = [];
let mealPlan = getPlanFromCookie();

const days = {
    monday: "Понеділок",
    tuesday: "Вівторок",
    wednesday: "Середа",
    thursday: "Четвер",
    friday: "Пʼятниця",
    saturday: "Субота",
    sunday: "Неділя"
};

const mealTypes = {
    breakfast: "Сніданок",
    lunch: "Обід",
    dinner: "Вечеря",
    snack: "Перекус"
};


//api
async function getRecipes() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) { throw new Error("Помилка отримання рецептів"); }
        const data = await response.json();
        recipes = data.recipes;
        renderRecipes(recipes);
    } catch (error) {
        console.error(error);
        recipesContainer.innerHTML = `<p>Не вдалося завантажити рецепти</p>`;
    }
}

function renderRecipes(list) {
    recipesContainer.innerHTML = "";
    if (list.length === 0) {
        recipesContainer.innerHTML = "<p>Рецептів не знайдено</p>";
        return;
    }
    list.forEach(recipe => {
        const time = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
        const card = document.createElement("article");
        card.classList.add("recipe-card");
        card.innerHTML = `
            <img src="${recipe.image}" alt="${recipe.name}" class="recipe-image">
            <div class="recipe-content">
                <h3>${recipe.name}</h3>
                <p class="recipe-description">${recipe.cuisine || "Рецепт"}</p>
                <div class="recipe-info"> ⏱ ${time} хв</div>
                <div class="recipe-selects">
                    <select class="day-select">
                        <option value="">День</option>
                        <option value="monday">Понеділок</option>
                        <option value="tuesday">Вівторок</option>
                        <option value="wednesday">Середа</option>
                        <option value="thursday">Четвер</option>
                        <option value="friday">Пʼятниця</option>
                        <option value="saturday">Субота</option>
                        <option value="sunday">Неділя</option>
                    </select>
                    <select class="meal-select">
                        <option value="">Прийом їжі</option>
                        <option value="breakfast">Сніданок</option>
                        <option value="lunch">Обід</option>
                        <option value="dinner">Вечеря</option>
                        <option value="snack">Перекус</option>
                    </select>
                </div>
                <button class="btn add-btn" data-id="${recipe.id}">Додати до плану</button>
            </div>
        `;
        recipesContainer.append(card);
    });
}

recipesContainer.addEventListener("click", event => {
    if (!event.target.classList.contains("add-btn")) {
        return;
    }
    const button = event.target;
    const recipeId = Number(button.dataset.id);
    const card = button.closest(".recipe-card");
    const day = card.querySelector(".day-select").value;
    const mealType = card.querySelector(".meal-select").value;

    if (!day || !mealType) {
        alert("Оберіть день та тип прийому їжі");
        return;
    }
    const recipe = recipes.find(recipe => recipe.id === recipeId);
    if (!recipe) return;
    const time = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
    const plannedMeal = {
        id: Date.now(),
        recipeId: recipe.id,
        name: recipe.name,
        image: recipe.image,
        time: time,
        day: day,
        mealType: mealType
    };
    mealPlan.push(plannedMeal);
    savePlanToCookie();
    renderPlan();
    card.querySelector(".day-select").value = "";
    card.querySelector(".meal-select").value = "";
});

function renderPlan() {
    const searchValue = planSearch.value.toLowerCase().trim();
    const selectedDay = dayFilter.value;
    let filteredPlan = [...mealPlan];
    if (searchValue) {
        filteredPlan = filteredPlan.filter(meal =>
            meal.name.toLowerCase().includes(searchValue)
        );
    }
    if (selectedDay !== "all") {
        filteredPlan = filteredPlan.filter(meal =>
            meal.day === selectedDay
        );
    }
    mealPlanContainer.innerHTML = "";
    if (filteredPlan.length === 0) {
        mealPlanContainer.innerHTML = `<p>Запланованих страв немає</p>`;
        updateStats();
        return;
    }
    filteredPlan.forEach(meal => {
        const card = document.createElement("div");
        card.classList.add("plan-card");
        card.innerHTML = `
            <div class="plan-info">
                <span class="day-badge">
                    ${days[meal.day]}
                </span>
                <span class="meal-badge">
                    ${mealTypes[meal.mealType]}
                </span>
                <h3>${meal.name}</h3>
                <p> Час приготування: ${meal.time} хв</p>
            </div>
            <button class="delete-btn" data-id="${meal.id}">Видалити</button>
        `;
        mealPlanContainer.append(card);
    });
    updateStats();
}

mealPlanContainer.addEventListener("click", event => {
    if (!event.target.classList.contains("delete-btn")) { return;}
    const id = Number(event.target.dataset.id);
    mealPlan = mealPlan.filter(meal => meal.id !== id);
    savePlanToCookie();
    renderPlan();
});

recipeSearch.addEventListener("input", () => {
    const value = recipeSearch.value.toLowerCase().trim();
    const filteredRecipes = recipes.filter(recipe =>
        recipe.name.toLowerCase().includes(value)
    );
    renderRecipes(filteredRecipes);
});

planSearch.addEventListener("input", () => { renderPlan();});

dayFilter.addEventListener("change", () => { renderPlan();});

function updateStats() {
    totalMeals.textContent = mealPlan.length;
    if (mealPlan.length === 0) {
        averageTime.textContent = 0;
        return;
    }
    const totalTime = mealPlan.reduce((sum, meal) => { return sum + meal.time;}, 0);
    const average = totalTime / mealPlan.length;
    averageTime.textContent = Math.round(average);
}

function savePlanToCookie() {
    const data = JSON.stringify(mealPlan);
    document.cookie = `mealPlan=${encodeURIComponent(data)}; max-age=${60 * 60 * 24 * 30}; path=/; SameSite=Lax`;
}

function getPlanFromCookie() {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split("=");
        if (name === "mealPlan") {
            try { 
                return JSON.parse(decodeURIComponent(value));
             } catch {
                return [];
            }
        }
    }
    return [];
}

getRecipes();
renderPlan();