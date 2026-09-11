const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'data.json');
const EXTERNAL_API = 'https://dummyjson.com/recipes?limit=50';

// Забезпечення існування файлу data.json
if (!fsSync.existsSync(DATA_FILE)) {
  fsSync.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fsSync.writeFileSync(
    DATA_FILE,
    JSON.stringify({ recipes: [], mealPlan: [] }, null, 2)
  );
}

async function readData() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.recipes)) data.recipes = [];
    if (!Array.isArray(data.mealPlan)) data.mealPlan = [];
    return data;
  } catch {
    return { recipes: [], mealPlan: [] };
  }
}

function writeData(data) {
  return fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

/**
 * Отримання рецептів з можливістю пошуку та автоматичного первинного завантаження
 */
async function getRecipes(search = '') {
  const data = await readData();

  if (data.recipes.length === 0) {
    let apiResponse;
    try {
      apiResponse = await fetch(EXTERNAL_API);
    } catch {
      const err = new Error('Не вдалося звернутися до зовнішнього API рецептів (502 Bad Gateway)');
      err.statusCode = 502;
      throw err;
    }

    if (!apiResponse.ok) {
      const err = new Error('Зовнішнє API рецептів повернуло помилку (502 Bad Gateway)');
      err.statusCode = 502;
      throw err;
    }

    const raw = await apiResponse.json();
    data.recipes = raw.recipes || [];
    await writeData(data);
  }

  let list = data.recipes;
  if (search) {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (item) =>
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.cuisine && item.cuisine.toLowerCase().includes(q))
    );
  }

  return { recipes: list, total: list.length };
}

/**
 * Примусовий імпорт рецептів із зовнішнього API
 */
async function importRecipes() {
  let apiResponse;
  try {
    apiResponse = await fetch(EXTERNAL_API);
  } catch {
    const err = new Error('Не вдалося звернутися до зовнішнього API (502 Bad Gateway)');
    err.statusCode = 502;
    throw err;
  }

  if (!apiResponse.ok) {
    const err = new Error('Зовнішнє API повернуло помилку (502 Bad Gateway)');
    err.statusCode = 502;
    throw err;
  }

  const raw = await apiResponse.json();
  const recipes = raw.recipes || [];
  const data = await readData();
  data.recipes = recipes;
  await writeData(data);

  return {
    message: 'Рецепти успішно імпортовано',
    imported: recipes.length,
    recipes,
  };
}

/**
 * Отримання списку страв у плані з фільтрацією за днем та пошуком
 */
async function getMealPlan({ day = '', search = '' } = {}) {
  const data = await readData();
  let list = data.mealPlan;

  if (day && day !== 'all') {
    list = list.filter((item) => item.day === day);
  }

  if (search) {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (item) => item.name && item.name.toLowerCase().includes(q)
    );
  }

  return list;
}

/**
 * Додавання нової страви до плану
 */
async function createMeal(payload) {
  const data = await readData();
  const meal = {
    id: Date.now(),
    recipeId: payload.recipeId || null,
    name: payload.name.trim(),
    image: payload.image || '',
    time: Number(payload.time) || 0,
    day: payload.day,
    mealType: payload.mealType,
    createdAt: new Date().toISOString(),
  };

  data.mealPlan.push(meal);
  await writeData(data);
  return meal;
}

/**
 * Редагування страви в плані за ID
 */
async function updateMeal(id, payload) {
  const data = await readData();
  const meal = data.mealPlan.find((m) => String(m.id) === String(id));

  if (!meal) {
    return null;
  }

  if (payload.day) meal.day = payload.day;
  if (payload.mealType) meal.mealType = payload.mealType;
  if (payload.name && typeof payload.name === 'string') meal.name = payload.name.trim();
  if (payload.time !== undefined) meal.time = Number(payload.time) || 0;
  meal.updatedAt = new Date().toISOString();

  await writeData(data);
  return meal;
}

/**
 * Видалення страви з плану за ID
 */
async function deleteMeal(id) {
  const data = await readData();
  const index = data.mealPlan.findIndex((m) => String(m.id) === String(id));

  if (index === -1) {
    return null;
  }

  const [deleted] = data.mealPlan.splice(index, 1);
  await writeData(data);
  return deleted;
}

/**
 * Отримання статистики за планом
 */
async function getStats() {
  const data = await readData();
  const totalMeals = data.mealPlan.length;
  const totalTime = data.mealPlan.reduce(
    (sum, item) => sum + (Number(item.time) || 0),
    0
  );
  const averageTime = totalMeals > 0 ? Math.round(totalTime / totalMeals) : 0;

  return {
    totalMeals,
    averageTime,
  };
}

module.exports = {
  readData,
  writeData,
  getRecipes,
  importRecipes,
  getMealPlan,
  createMeal,
  updateMeal,
  deleteMeal,
  getStats,
};
