# Cogniva — адаптивная ИИ-платформа обучения (MVP)

Статус: **Фазы 2–4 готовы** (каркас, база данных, вход, профиль ученика, оценки, подтемы).

## Что нужно установить (один раз)
- Python 3.11+  (https://www.python.org/downloads/ — при установке на Windows поставьте галочку "Add Python to PATH")
- Node.js 20+   (https://nodejs.org/)

## Запуск backend (сервер, Python/FastAPI)
Откройте терминал в папке `backend`.

Windows (PowerShell):
    python -m venv .venv
    .venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    python -m pytest -q
    uvicorn app.main:app --reload --port 8000

macOS / Linux:
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    python -m pytest -q
    uvicorn app.main:app --reload --port 8000

Проверка: откройте http://localhost:8000/api/health — должно быть {"status":"ok"}.
Документация API: http://localhost:8000/docs

## Запуск frontend (сайт, React)
Во втором терминале, в папке `frontend`:
    npm install
    npm run dev
Откройте http://localhost:5173 — должна быть надпись "Cogniva — сервер: ok".

## Настройка ИИ
Скопируйте `.env.example` в `backend/.env` и впишите ANTHROPIC_API_KEY.
Без ключа приложение будет работать в демо-режиме (появится в Фазе 6).

## Демо-данные (Фаза 4)
В папке `backend` (с активированным .venv):
    python -m app.seed
Создаст ученика: логин `alex`, пароль `demo12345` (Физика/Кинематика, оценки, освоение подтем).
Проверить API: http://localhost:8000/docs → POST /api/auth/login → скопировать access_token →
кнопка «Authorize» → вставить токен → пробовать GET /api/profile/overview.
