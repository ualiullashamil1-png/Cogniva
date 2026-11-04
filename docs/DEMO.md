# Демо-сценарий Cogniva (5 минут)

Запуск: два терминала.
1. backend: `uvicorn app.main:app --reload --port 8000`
2. frontend: `npm run dev` -> http://localhost:5173
Вход: alex / demo12345.

Если ключ GEMINI_API_KEY не задан в backend/.env, приложение работает в ДЕМО-РЕЖИМЕ
(заготовленные ответы; это видно в жёлтой строке в уроке).

Шаги показа:
1. Дашборд: оценки, освоение, слабые подтемы, рекомендованный урок.
2. Профиль: график оценок, добавить оценку и подтему (оценка и освоение хранятся отдельно).
3. «Начать» на рекомендованной теме -> «Пройти диагностику» (8 вопросов, проверка кодом).
   Для наглядности ошибитесь в вопросах про ускорение.
4. Урок: подход выбран по слабой подтеме, справа 3D-сцена. Меняйте ползунки (мгновенно, без ИИ).
5. «Проще» / «Пример» в чате.
6. «Закончить урок» -> итоговый тест (5 вопросов), отвечайте верно -> экран «до и после».

Добавить своё:
- Объект:   backend/app/scenes/registry.py (OBJECTS) + рисунок в frontend/src/scene-lab/objects.tsx
- Шаблон:   backend/app/scenes/registry.py (TEMPLATES) + расчёт в scene_service.py и physics.ts
- Вопрос:   backend/app/diagnostics/question_bank.py (BANK)
- Сцена под подтему: backend/app/scenes/scene_planner.py (DEMO_SCENES)
- Ключ Gemini: backend/.env -> GEMINI_API_KEY=...