const service = require('../services/service');
const { validateMealPayload } = require('../utils/validation');

const routes = [
  {
    method: 'GET',
    pattern: /^\/api\/recipes$/,
    handler: async (req, res, url, matches, { sendJSON }) => {
      try {
        const search = url.searchParams.get('search') || '';
        const result = await service.getRecipes(search);
        sendJSON(res, 200, result);
      } catch (err) {
        if (err.statusCode === 502) {
          sendJSON(res, 502, { error: err.message });
        } else {
          throw err;
        }
      }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/recipes\/import$/,
    handler: async (req, res, url, matches, { sendJSON }) => {
      try {
        const result = await service.importRecipes();
        sendJSON(res, 201, result);
      } catch (err) {
        if (err.statusCode === 502) {
          sendJSON(res, 502, { error: err.message });
        } else {
          throw err;
        }
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/plan$/,
    handler: async (req, res, url, matches, { sendJSON }) => {
      const day = url.searchParams.get('day') || '';
      const search = url.searchParams.get('search') || '';
      const list = await service.getMealPlan({ day, search });
      sendJSON(res, 200, list);
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/plan$/,
    handler: async (req, res, url, matches, { sendJSON, parseBody }) => {
      const parsed = await parseBody(req, res);
      if (!parsed) return;

      const { body } = parsed;
      const validationError = validateMealPayload(body, false);
      if (validationError) {
        sendJSON(res, 400, { error: validationError });
        return;
      }

      const meal = await service.createMeal(body);
      sendJSON(res, 201, meal);
    },
  },
  {
    method: 'PUT',
    pattern: /^\/api\/plan\/([^/]+)$/,
    handler: async (req, res, url, matches, { sendJSON, parseBody }) => {
      const id = matches[0];
      const parsed = await parseBody(req, res);
      if (!parsed) return;

      const { body } = parsed;
      const validationError = validateMealPayload(body, true);
      if (validationError) {
        sendJSON(res, 400, { error: validationError });
        return;
      }

      const updated = await service.updateMeal(id, body);
      if (!updated) {
        sendJSON(res, 404, {
          error: `Страву з ID '${id}' у плані не знайдено (404 Not Found)`,
        });
        return;
      }

      sendJSON(res, 200, updated);
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/plan\/([^/]+)$/,
    handler: async (req, res, url, matches, { sendJSON }) => {
      const id = matches[0];
      const deleted = await service.deleteMeal(id);

      if (!deleted) {
        sendJSON(res, 404, {
          error: `Страву з ID '${id}' у плані не знайдено (404 Not Found)`,
        });
        return;
      }

      sendJSON(res, 200, { success: true, deleted });
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/stats$/,
    handler: async (req, res, url, matches, { sendJSON }) => {
      const stats = await service.getStats();
      sendJSON(res, 200, stats);
    },
  },
];

module.exports = routes;
