const API_URL = "/api/recipes";
const PLAN_API_URL = "/api/plan";

const recipesContainer = document.querySelector("#recipesContainer");
const mealPlanContainer = document.querySelector("#mealPlan");

const recipeSearch = document.querySelector("#recipeSearch");
const planSearch = document.querySelector("#planSearch");
const dayFilter = document.querySelector("#dayFilter");

const totalMeals = document.querySelector("#totalMeals");
const averageTime = document.querySelector("#averageTime");
const toastContainer = document.querySelector("#toastContainer");

let recipes = [];
let mealPlan = [];
let editingMealId = null;

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

// Система сповіщень (Toast notifications)
function showToast(message, type = "info") {
    if (!toastContainer) return;

    const icons = {
        success: "✓",
        error: "✕",
        info: "ℹ"
    };

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span style="font-weight: bold; font-size: 16px;">${icons[type] || ""}</span>
        <span>${message}</span>
    `;

    toastContainer.append(toast);

    setTimeout(() => {
        toast.classList.add("fade-out");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Модальне вікно підтвердження видалення
function confirmDeleteModal(message) {
    return new Promise(resolve => {
        const modal = document.querySelector("#confirmModal");
        const modalText = document.querySelector("#confirmModalText");
        const cancelBtn = document.querySelector("#modalCancelBtn");
        const confirmBtn = document.querySelector("#modalConfirmBtn");

        if (!modal || !modalText || !cancelBtn || !confirmBtn) {
            resolve(window.confirm(message));
            return;
        }

        modalText.textContent = message;
        modal.classList.remove("hidden");

        const cleanup = () => {
            modal.classList.add("hidden");
            cancelBtn.removeEventListener("click", onCancel);
            confirmBtn.removeEventListener("click", onConfirm);
            modal.removeEventListener("click", onOverlay);
            document.removeEventListener("keydown", onKeyDown);
        };

        const onCancel = () => {
            cleanup();
            resolve(false);
        };

        const onConfirm = () => {
            cleanup();
            resolve(true);
        };

        const onOverlay = event => {
            if (event.target === modal) {
                cleanup();
                resolve(false);
            }
        };

        const onKeyDown = event => {
            if (event.key === "Escape") {
                cleanup();
                resolve(false);
            }
        };

        cancelBtn.addEventListener("click", onCancel);
        confirmBtn.addEventListener("click", onConfirm);
        modal.addEventListener("click", onOverlay);
        document.addEventListener("keydown", onKeyDown);
    });
}

// Отримання рецептів із сервера з відображенням Loading...
async function getRecipes() {
    recipesContainer.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading...</p>
        </div>
    `;

    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Помилка сервера (${response.status})`);
        }
        const data = await response.json();
        recipes = data.recipes || data;
        renderRecipes(recipes);
    } catch (error) {
        console.error(error);
        recipesContainer.innerHTML = `
            <div class="empty-state">
                <p>Не вдалося завантажити рецепти</p>
                <span class="empty-hint">${error.message}</span>
            </div>
        `;
        showToast(error.message, "error");
    }
}

// Отримання збереженого плану страв із сервера з відображенням Loading...
async function getMealPlan() {
    mealPlanContainer.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading...</p>
        </div>
    `;

    try {
        const response = await fetch(PLAN_API_URL);
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Помилка сервера (${response.status})`);
        }
        mealPlan = await response.json();
        renderPlan();
    } catch (error) {
        console.error(error);
        mealPlanContainer.innerHTML = `
            <div class="empty-state">
                <p>Не вдалося завантажити план страв</p>
                <span class="empty-hint">${error.message}</span>
            </div>
        `;
        showToast(error.message, "error");
    }
}

function renderRecipes(list) {
    recipesContainer.innerHTML = "";
    if (list.length === 0) {
        recipesContainer.innerHTML = `
            <div class="empty-state">
                <p>Рецептів не знайдено</p>
                <span class="empty-hint">Спробуйте змінити пошуковий запит</span>
            </div>
        `;
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

// Додавання страви до плану (з блокуванням кнопки та показом Loading...)
recipesContainer.addEventListener("click", async event => {
    if (!event.target.classList.contains("add-btn")) {
        return;
    }
    const button = event.target;
    const recipeId = Number(button.dataset.id);
    const card = button.closest(".recipe-card");
    const daySelect = card.querySelector(".day-select");
    const mealSelect = card.querySelector(".meal-select");
    const day = daySelect.value;
    const mealType = mealSelect.value;

    // Валідація на frontend для зручності користувача
    if (!day) {
        showToast("Будь ласка, оберіть день тижня для страви", "error");
        daySelect.focus();
        return;
    }
    if (!mealType) {
        showToast("Будь ласка, оберіть прийом їжі (сніданок, обід тощо)", "error");
        mealSelect.focus();
        return;
    }

    const recipe = recipes.find(item => item.id === recipeId);
    if (!recipe) {
        showToast("Помилка: рецепт не знайдено", "error");
        return;
    }

    // Перевірка на дублікат у цей же день і прийом їжі
    const isDuplicate = mealPlan.some(
        item => item.day === day && item.mealType === mealType && item.name.toLowerCase() === recipe.name.toLowerCase()
    );
    if (isDuplicate) {
        showToast(`Страва "${recipe.name}" вже запланована на ${days[day]} (${mealTypes[mealType]})`, "error");
        return;
    }

    const time = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
    const plannedMeal = {
        recipeId: recipe.id,
        name: recipe.name,
        image: recipe.image,
        time: time,
        day: day,
        mealType: mealType
    };

    // Блокування кнопки для запобігання дублюванню
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = "Loading...";

    try {
        const response = await fetch(PLAN_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(plannedMeal)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || "Не вдалося зберегти страву на сервері");
        }

        const savedMeal = await response.json();
        mealPlan.push(savedMeal);
        renderPlan();

        daySelect.value = "";
        mealSelect.value = "";

        showToast(`Страву "${savedMeal.name}" додано до плану!`, "success");
    } catch (error) {
        console.error(error);
        showToast(error.message, "error");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
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
        mealPlanContainer.innerHTML = `
            <div class="empty-state">
                <p>Запланованих страв немає</p>
                <span class="empty-hint">Оберіть рецепт вище та додайте його до свого плану</span>
            </div>
        `;
        updateStats();
        return;
    }

    filteredPlan.forEach(meal => {
        const isEditing = String(meal.id) === String(editingMealId);
        const card = document.createElement("div");
        card.classList.add("plan-card");

        let contentHTML = `
            <div class="plan-info" style="flex: 1;">
                <span class="day-badge">
                    ${days[meal.day] || meal.day}
                </span>
                <span class="meal-badge">
                    ${mealTypes[meal.mealType] || meal.mealType}
                </span>
                <h3>${meal.name}</h3>
                <p>Час приготування: ${meal.time} хв</p>
            </div>
        `;

        if (isEditing) {
            contentHTML += `
                <div class="edit-box" data-id="${meal.id}">
                    <label style="font-size: 13px; color: #555;">Змінити день:
                        <select class="edit-day-select">
                            <option value="monday" ${meal.day === "monday" ? "selected" : ""}>Понеділок</option>
                            <option value="tuesday" ${meal.day === "tuesday" ? "selected" : ""}>Вівторок</option>
                            <option value="wednesday" ${meal.day === "wednesday" ? "selected" : ""}>Середа</option>
                            <option value="thursday" ${meal.day === "thursday" ? "selected" : ""}>Четвер</option>
                            <option value="friday" ${meal.day === "friday" ? "selected" : ""}>Пʼятниця</option>
                            <option value="saturday" ${meal.day === "saturday" ? "selected" : ""}>Субота</option>
                            <option value="sunday" ${meal.day === "sunday" ? "selected" : ""}>Неділя</option>
                        </select>
                    </label>

                    <label style="font-size: 13px; color: #555;">Прийом їжі:
                        <select class="edit-meal-select">
                            <option value="breakfast" ${meal.mealType === "breakfast" ? "selected" : ""}>Сніданок</option>
                            <option value="lunch" ${meal.mealType === "lunch" ? "selected" : ""}>Обід</option>
                            <option value="dinner" ${meal.mealType === "dinner" ? "selected" : ""}>Вечеря</option>
                            <option value="snack" ${meal.mealType === "snack" ? "selected" : ""}>Перекус</option>
                        </select>
                    </label>

                    <button class="save-edit-btn" data-id="${meal.id}">Зберегти</button>
                    <button class="cancel-edit-btn" data-id="${meal.id}">Скасувати</button>
                </div>
            `;
        } else {
            contentHTML += `
                <div class="plan-actions">
                    <button class="edit-btn" data-id="${meal.id}">Редагувати</button>
                    <button class="delete-btn" data-id="${meal.id}">Видалити</button>
                </div>
            `;
        }

        card.innerHTML = contentHTML;
        mealPlanContainer.append(card);
    });

    updateStats();
}

// Обробник дій у плані: Редагування, Скасування, Збереження (PUT) та Видалення (DELETE)
mealPlanContainer.addEventListener("click", async event => {
    const target = event.target;
    const id = target.dataset.id;
    if (!id) return;

    // 1. Клік на кнопку "Редагувати"
    if (target.classList.contains("edit-btn")) {
        editingMealId = id;
        renderPlan();
        return;
    }

    // 2. Клік на кнопку "Скасувати" редагування
    if (target.classList.contains("cancel-edit-btn")) {
        editingMealId = null;
        renderPlan();
        return;
    }

    // 3. Клік на кнопку "Зберегти" відредаговану страву (PUT /api/plan/:id)
    if (target.classList.contains("save-edit-btn")) {
        const box = target.closest(".edit-box");
        const newDay = box.querySelector(".edit-day-select").value;
        const newMealType = box.querySelector(".edit-meal-select").value;

        // Валідація на frontend для зручності користувача
        if (!newDay || !days[newDay]) {
            showToast("Будь ласка, оберіть коректний день тижня", "error");
            return;
        }
        if (!newMealType || !mealTypes[newMealType]) {
            showToast("Будь ласка, оберіть коректний прийом їжі", "error");
            return;
        }

        const currentMeal = mealPlan.find(m => String(m.id) === String(id));
        if (currentMeal && currentMeal.day === newDay && currentMeal.mealType === newMealType) {
            showToast("Дані не змінилися", "info");
            editingMealId = null;
            renderPlan();
            return;
        }

        target.disabled = true;
        const originalText = target.textContent;
        target.textContent = "Loading...";

        try {
            const response = await fetch(`${PLAN_API_URL}/${encodeURIComponent(id)}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    day: newDay,
                    mealType: newMealType
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || "Не вдалося оновити страву");
            }

            const updatedMeal = await response.json();
            const index = mealPlan.findIndex(m => String(m.id) === String(id));
            if (index !== -1) {
                mealPlan[index] = updatedMeal;
            }

            editingMealId = null;
            renderPlan();
            showToast("Страву успішно оновлено!", "success");
        } catch (error) {
            console.error(error);
            showToast(error.message, "error");
            target.disabled = false;
            target.textContent = originalText;
        }
        return;
    }

    // 4. Клік на кнопку "Видалити" (DELETE /api/plan/:id)
    if (target.classList.contains("delete-btn")) {
        const mealToDelete = mealPlan.find(m => String(m.id) === String(id));
        const mealName = mealToDelete ? `«${mealToDelete.name}»` : "цю страву";
        const confirmed = await confirmDeleteModal(`Ви впевнені, що бажаєте видалити ${mealName} з плану?`);
        if (!confirmed) {
            return;
        }

        target.disabled = true;
        const originalText = target.textContent;
        target.textContent = "Loading...";

        try {
            const response = await fetch(`${PLAN_API_URL}/${encodeURIComponent(id)}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || "Не вдалося видалити страву");
            }

            mealPlan = mealPlan.filter(meal => String(meal.id) !== String(id));
            if (String(editingMealId) === String(id)) {
                editingMealId = null;
            }
            renderPlan();
            showToast("Страву видалено з плану!", "success");
        } catch (error) {
            console.error(error);
            showToast(error.message, "error");
            target.disabled = false;
            target.textContent = originalText;
        }
    }
});

recipeSearch.addEventListener("input", () => {
    const value = recipeSearch.value.toLowerCase().trim();
    const filteredRecipes = recipes.filter(recipe =>
        recipe.name.toLowerCase().includes(value)
    );
    renderRecipes(filteredRecipes);
});

planSearch.addEventListener("input", () => {
    renderPlan();
});

dayFilter.addEventListener("change", () => {
    renderPlan();
});

function updateStats() {
    totalMeals.textContent = mealPlan.length;
    if (mealPlan.length === 0) {
        averageTime.textContent = 0;
        return;
    }
    const totalTime = mealPlan.reduce((sum, meal) => sum + (Number(meal.time) || 0), 0);
    const average = totalTime / mealPlan.length;
    averageTime.textContent = Math.round(average);
}

// Стартова ініціалізація
getRecipes();
getMealPlan();