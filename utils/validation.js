const VALID_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

/**
 * Валідація вхідних даних для додавання або редагування страви в плані
 * @param {object} body - Тіло запиту
 * @param {boolean} isUpdate - Чи є операція оновленням (PUT)
 * @returns {string|null} - Текст помилки або null, якщо дані коректні
 */
function validateMealPayload(body, isUpdate = false) {
  if (typeof body !== 'object' || body === null) {
    return "Тіло запиту повинно бути валідним JSON-об'єктом";
  }

  if (!isUpdate || body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length < 2) {
      return "Поле 'name' обов'язкове та повинно містити щонайменше 2 символи";
    }
  }

  if (!isUpdate || body.day !== undefined) {
    if (!body.day || !VALID_DAYS.includes(body.day)) {
      return `Некоректне значення поля 'day'. Допустимі значення: ${VALID_DAYS.join(', ')}`;
    }
  }

  if (!isUpdate || body.mealType !== undefined) {
    if (!body.mealType || !VALID_MEAL_TYPES.includes(body.mealType)) {
      return `Некоректне значення поля 'mealType'. Допустимі значення: ${VALID_MEAL_TYPES.join(', ')}`;
    }
  }

  if (body.time !== undefined) {
    const numTime = Number(body.time);
    if (isNaN(numTime) || numTime < 0) {
      return "Поле 'time' повинно бути додатним числом хвилин";
    }
  }

  if (isUpdate) {
    if (
      body.day === undefined &&
      body.mealType === undefined &&
      body.name === undefined &&
      body.time === undefined
    ) {
      return 'Не передано жодного поля для оновлення';
    }
  }

  return null;
}

module.exports = {
  VALID_DAYS,
  VALID_MEAL_TYPES,
  validateMealPayload,
};
