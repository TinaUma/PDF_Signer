# PDF Signer — Руководство разработчика (RU)

English version: [DEVELOPMENT.en.md](DEVELOPMENT.en.md)

## Обзор

PDF Signer — офлайн-инструмент для наложения рукописной подписи на PDF и
изображения. Работает полностью локально: фронтенд на React + Konva общается с
бэкендом FastAPI, который растрирует страницы, удаляет фон подписи и впечатывает
подписи в итоговый файл. Оригинал документа не изменяется.

## Архитектура

```
┌─────────────── Фронтенд (React 19 + Vite + Konva) ───────────────┐
│ useDocument   – открытие файла; pdfjs-dist рендерит PDF в браузере │
│                 в data URL канваса; отдаёт реальные пиксельные     │
│                 размеры страниц (pageDims) и счётчик loadId        │
│ useSignatures – CRUD библиотеки подписей через /api/signatures     │
│ useCanvas     – слои подписей по странице (+ undo/redo useHistory) │
│ CanvasEditor  – Konva-stage; drag / resize / rotate / opacity      │
│ App           – оркестрация; сборка payload экспорта               │
│ i18n          – каталоги RU/EN, t(), переключатель языка           │
└────────────────────────────────────────────────────────────────────┘
                 │  HTTP (same-origin через nginx-proxy, или :8000 в dev)
┌─────────────── Бэкенд (FastAPI · Python 3.11) ───────────────────┐
│ api/document   – /render: растр страниц (PyMuPDF) → base64 PNG     │
│ api/signatures – загрузка (удаление фона), список, image, delete   │
│ api/export     – впечатывание подписей в PDF (PyMuPDF) или image   │
│ services/      – pdf_service, pdf_writer, composer,                │
│                  signature_service                                 │
│ errors.py      – ApiError {code,message} + DomainError             │
└────────────────────────────────────────────────────────────────────┘
```

### Поток данных (экспорт)

1. Фронт рендерит каждую страницу в реальном пиксельном размере и размещает слои
   подписей в этом пространстве (Konva-stage = размер страницы, пропорции
   сохраняются).
2. При экспорте шлёт `pages` (подписи по страницам + `stage_w/stage_h` +
   опц. `jitter`) и `delete_pages`.
3. Бэкенд перерисовывает каждую подписанную PDF-страницу в 200 DPI, масштабирует
   координаты подписи на `pix / stage` (равномерно — пропорции совпадают),
   накладывает подписи (Pillow) и пересобирает документ.

## Справочник API

База: `/api`. Ошибки в формате `{ "detail": { "code": "<код>", "message": "<english>" } }`.
Фронт мапит `code` на локализованное сообщение.

### `POST /api/document/render`
Form: `file`. Возвращает `{ "page_count": n, "pages": ["<base64 png>", ...] }`.
Ошибки: `unsupported_file_type` (422), `file_too_large` (413), `too_many_pages`,
`page_too_large`, `image_too_large` (422).

### `POST /api/signatures?remove_bg=true|false`
Form: `file` (изображение). Возвращает `{ "id": "<uuid>", "filename", "size" }`.
Ошибки: `file_too_large` (413), `unsupported_signature_format`, `image_too_large`,
`signature_not_detected` (422 — фон не отделился от чернил).

### `GET /api/signatures`
Возвращает `[{ "id", "filename", "size" }, ...]`.

### `GET /api/signatures/{id}/image`
Возвращает PNG. `signature_not_found` (404) для неизвестного или не-UUID id.

### `DELETE /api/signatures/{id}`
Возвращает `{ "deleted": "<id>" }`. `signature_not_found` (404).

### `POST /api/export`
Form: `file`; `pages` (JSON); `delete_pages` (JSON-список индексов, опц.).
`pages` — список `{ page_idx, stage_w, stage_h, jitter, signatures: [{ id, x, y, w, h, angle, opacity }] }`.
Возвращает подписанный PDF или изображение (формат источника сохраняется).
Ошибки: `invalid_pages_payload`, `file_too_large` (413), `corrupt_pdf`,
`corrupt_image`, `page_index_out_of_range`, `stage_aspect_mismatch`,
`invalid_dimensions`, `stage_dims_required`, `invalid_signature_id`,
`coords_out_of_bounds`, `unsupported_file_type`, `too_many_pages`,
`page_too_large`, `image_too_large` (все 422).

### `GET /health`
Возвращает `{ "status": "ok", "service": "pdf-signer-api" }`.

## Ключевое поведение

- **Удаление фона** (`signature_service._remove_bg_adaptive`): порог по яркости
  относительно бумаги (оценка по угловым пикселям); кадрирование по bbox
  альфа-канала (чернила); `signature_not_detected`, если ничего не осталось.
- **Джиттер подписи**: детерминированная вариация по инстанции с seed
  `(sig_id, page, index)`; интенсивность 0..1 со слайдера; 0 = выкл.
- **Многостраничность**: слои хранятся по индексу страницы; экспорт впечатывает
  каждую подписанную страницу.
- **Удаление страниц**: помеченные страницы исключаются из экспорта (обратимый
  переключатель, не деструктивная правка оригинала).
- **Лимиты** (анти-DoS): `MAX_FILE_SIZE` 50 МБ, `MAX_PAGES` 500,
  `MAX_PIXMAP_PIXELS` ~64 Мп, защита от decompression-bomb в Pillow.

## Разработка

```bash
# Бэкенд
cd backend
pip install -r requirements.txt
uvicorn main:app --reload          # http://localhost:8000

# Фронтенд
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

`DATA_DIR` (по умолчанию `./data`) содержит `signatures/` и `output/`.

## Тестирование

```bash
pip install -r backend/requirements.txt pytest httpx
python -m pytest                   # бэкенд (pytest.ini задаёт pythonpath=backend)

cd frontend && npm run lint        # ESLint flat config
cd frontend && npm run build       # прод-сборка
```

CI (`.github/workflows/ci.yml`) гоняет backend pytest и frontend lint/build на
push в main и на pull request.

## Деплой

- **Docker** (рекомендуется): `docker compose up` → http://localhost:8080.
  Бэкенд доступен только через nginx-proxy (без host-порта); контейнеры под
  non-root; `/data` — named volume.
- **Нативный (.exe, экспериментально)**: `.github/workflows/release-exe.yml`
  собирает FastAPI-sidecar (PyInstaller из `backend/api_server.spec`), генерирует
  иконки, запускает `tauri build` на Windows и публикует prerelease на каждый
  push в main. End-to-end ещё не проверялся.

## Интернационализация

Ответы API локаль-агностичны (код ошибки + английское `message`). Фронт
(`src/i18n/`) держит каталоги RU/EN, хелпер `t(key, vars)`, переключатель языка и
`resolveApiError(detail, t)`, мапящий коды ошибок на локализованный текст.
