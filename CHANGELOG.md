# Changelog

[Русский](#русский) · [English](#english)

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/),
проект следует [Semantic Versioning](https://semver.org/lang/ru/).

---

<a name="русский"></a>

## 🇷🇺 Русский

← [README](README.md#русский) · [Руководство разработчика](docs/DEVELOPMENT.ru.md)

> Ведение: добавляйте записи в **[Unreleased]** по мере работы, группируя по
> Added / Changed / Fixed / Security. На релизе переименуйте секцию в версию с
> датой и заведите новую **[Unreleased]**.

### [1.1.0] — готовится к выпуску

#### Added (Добавлено)
- Нативный релиз: GitHub Actions при мерже PR в main авто-тегирует версию из
  `package.json` и собирает полный релиз — Windows `.exe`/`.msi` (Tauri +
  FastAPI sidecar) и образы GHCR (backend/frontend) на этом теге
  (экспериментально).
- Иконки приложения (панель задач и окно).
- Готовность стартапа нативного приложения: фронт дожидается готовности
  локального сервиса (`/health`) перед первым запросом и показывает
  переведённый блокирующий экран ошибки с повтором вместо молча нерабочего UI.
- Многостраничная подпись: подписи хранятся по страницам, при экспорте
  впечатывается каждая подписанная страница; кнопка «на все страницы».
- Уникализация подписи (jitter): опциональная детерминированная вариация
  (поворот, масштаб, прозрачность, смещение), чтобы повторные наложения одной
  подписи не были пиксельно идентичны. Слайдер 0–100 %.
- Удаление страниц: обратимая пометка листа на исключение из итогового PDF.
- Интернационализация: лёгкий слой RU/EN с переключателем языка, сохранением
  выбора и локализованными сообщениями об ошибках.

#### Changed (Изменено)
- API возвращает стабильные коды ошибок (`{code, message}`) вместо смешанного
  RU/EN текста — локализует клиент.
- Холст использует реальные размеры страницы вместо фиксированного A4.
- Image-экспорт сохраняет формат источника (PNG/JPEG/TIFF/WEBP).
- Харденинг Docker: бэкенд без host-порта (только через nginx), non-root
  контейнеры, named volume для `/data`, security-заголовки nginx
  (X-Content-Type-Options/X-Frame-Options/Referrer-Policy); CSP в Tauri без
  `unsafe-inline` в script-src.
- CORS ограничен известными origin (вместо `*`).
- Имена выходных файлов с uuid-суффиксом (нет коллизий при экспорте в одну секунду).

#### Fixed (Исправлено)
- Экспорт PDF проверял координаты против неверной единицы (`page.rect*2`);
  теперь — против stage-пространства (ложные отклонения/пропуски устранены).
- Поворот подписи вращался вокруг центра и смещал подпись на ~14–22px от места
  размещения; теперь — вокруг верхнего-левого угла, как на холсте.
- Не-A4 документы искажались (stage был жёстко A4) — подпись больше не
  растягивается неравномерно.
- Удаление фона молча сохраняло прозрачный PNG, если чернил нет; теперь ошибка,
  кадрирование по альфа-каналу.
- Битые PDF/изображения возвращали 500; теперь 422.
- Кривой payload экспорта (нечисловые stage-размеры, неположительные размеры
  подписи) возвращал 500; теперь 422.

#### Security (Безопасность)
- Закрыт path traversal: id подписи от клиента валидируется как UUID до
  построения пути к файлу.
- Лимиты анти-DoS: размер файла, число страниц, площадь pixmap, защита от
  decompression-bomb (Pillow).

### [1.0.0]

#### Added (Добавлено)
- Первый релиз: офлайн-подписание PDF/изображений — библиотека подписей с
  автоудалением фона (по яркости), интерактивный Konva-холст
  (drag/resize/rotate/opacity), undo/redo, навигация по страницам, экспорт в
  PDF/JPEG. Бэкенд FastAPI, фронтенд React + Vite, деплой Docker Compose и
  заготовка десктоп-обёртки Tauri.

---

<a name="english"></a>

## 🇬🇧 English

← [README](README.md#english) · [Developer guide](docs/DEVELOPMENT.en.md)

> Maintenance: add entries under **[Unreleased]** as work lands, grouped into
> Added / Changed / Fixed / Security. On release, rename the section to the new
> version with a date and start a fresh **[Unreleased]**.

### [1.1.0] — unreleased

#### Added
- Native release: on a PR merge to main, GitHub Actions auto-tags the version
  from `package.json` and builds a full release — Windows `.exe`/`.msi` (Tauri +
  FastAPI sidecar) and GHCR images (backend/frontend) on that tag (experimental).
- Application icons (taskbar and window).
- Native-app startup readiness: the frontend waits for the local service
  (`/health`) before the first request and shows a translated blocking error
  screen with retry instead of a silently broken UI.
- Multi-page signing: signatures are tracked per page and every signed page is
  burned in on export, with an "all pages" action.
- Signature uniquification ("jitter"): optional deterministic per-placement
  variation (rotation, scale, opacity, offset) via a 0–100 % slider.
- Page deletion: reversible per-page toggle excluding a page from the export.
- Internationalization: lightweight RU/EN layer with a language switcher,
  persisted choice, and localized error messages.

#### Changed
- The API returns stable error codes (`{code, message}`) instead of mixed
  Russian/English text; the client localizes them.
- The editor canvas uses each document's real dimensions instead of a fixed A4.
- Image export preserves the source format (PNG/JPEG/TIFF/WEBP).
- Docker deployment hardened: no backend host port (nginx proxy only), non-root
  containers, named `/data` volume, nginx security headers
  (X-Content-Type-Options/X-Frame-Options/Referrer-Policy); the Tauri CSP drops
  `unsafe-inline` from script-src.
- CORS restricted to known origins (instead of `*`).
- Output filenames get a uuid suffix (no same-second collisions).

#### Fixed
- PDF export validated coordinates against the wrong unit (`page.rect*2`); now
  against the stage space (no more false rejections/passes).
- Signature rotation pivoted about the centre and shifted the signature ~14–22px
  from where it was placed; it now rotates about the top-left corner, matching
  the canvas.
- Non-A4 documents were distorted (the stage was hardcoded to A4); signatures
  are no longer non-uniformly stretched.
- Background removal silently saved a transparent PNG when no ink was detected;
  it now errors and crops by the alpha channel.
- Corrupt PDFs/images returned 500; they now return 422.
- Malformed export payloads (non-numeric stage dimensions, non-positive
  signature size) returned 500; they now return 422.

#### Security
- Closed a path-traversal vector: client signature ids are validated as UUIDs
  before building a filesystem path.
- Added anti-DoS limits: file size, page count, pixmap area, and a Pillow
  decompression-bomb guard.

### [1.0.0]

#### Added
- Initial release: offline PDF/image signing — signature library with automatic
  (luminance-based) background removal, interactive Konva canvas
  (drag/resize/rotate/opacity), undo/redo, multi-page navigation, export to
  PDF/JPEG. FastAPI backend, React + Vite frontend, Docker Compose deployment,
  and a scaffolded Tauri desktop wrapper.
