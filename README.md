<div align="center">

# SignDrop

**Инструмент для наложения рукописной подписи на документы**

[![Status](https://img.shields.io/badge/version-1.1.1-brightgreen)](https://github.com/TinaUma/signdrop/releases)
[![Windows](https://img.shields.io/badge/Windows-.exe%20%2F%20.msi-0078D4?logo=windows&logoColor=white)](https://github.com/TinaUma/signdrop/releases)
[![Python](https://img.shields.io/badge/python-3.11-blue?logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Docker](https://img.shields.io/badge/docker-compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)
[![Landing](https://img.shields.io/badge/website-signdrop.site-0a1ab5)](https://signdrop.site)

[English version →](README.en.md)

</div>

---

## Что это

SignDrop — инструмент для наложения рукописной подписи (скан или фото) на документы PDF, JPEG, PNG. Работает **полностью локально** — никакие данные не покидают устройство. Без облаков, без регистрации.

> Запустил → открыл файл → перетащил подпись → сохранил.

## Скриншоты

<div align="center">

![Интерфейс — пошаговые подсказки и подпись на документе](screenshots/01-interface.png)

*Пошаговые подсказки в сайдбаре, канвас сразу готов к работе, кнопка экспорта активируется когда подпись размещена*

![Результат — подписанный документ](screenshots/02-signed-document.png)

*Документ подписан — подпись точно в нужном месте*

![Поворот подписи](screenshots/03-rotate-signature.png)

*Поворот, масштаб, прозрачность — полный контроль*

</div>

## Возможности

### Документы и форматы
- 📄 **PDF (многостраничный)** и изображения — JPG, PNG, TIFF, WEBP до 50 МБ
- 💾 **Экспорт в PDF и JPEG** — оригинал не изменяется
- 📁 **Умное именование файлов** — сохранённый файл называется `договор_signed.pdf`, а не просто `signed.pdf`
- 🗑️ **Удаление страниц из PDF** — исключи ненужные страницы из итогового файла

### Подписи
- ✍️ **Библиотека подписей** — загрузи один раз, используй всегда
- 🪄 **Автоматическое удаление фона** — адаптивный алгоритм на основе яркости, работает офлайн
- ✏️ **Переименование подписей** — двойной клик по имени в библиотеке
- ☑️ **Мультиселект и массовое удаление** подписей в библиотеке

### Работа на канвасе
- 🖱️ **Интерактивный холст** — drag & drop, resize, поворот, прозрачность
- ↩️ **Undo / Redo** — в тулбаре и через Ctrl+Z / Ctrl+Y
- 🗂️ **Многостраничная подпись** — свои подписи на каждой странице + кнопка «на все страницы»
- 🎲 **Уникализация подписи с живым превью** — каждое наложение деформируется (наклон, пропорции, смещение); видишь результат на канвасе до экспорта — подписи не идентичны

### Текстовые аннотации
- 🔤 **Текстовые поля** — добавь текст прямо на документ
- 🖋️ **Выбор шрифта** — без засечек / с засечками / рукописный (Caveat)
- 🎨 **Стилизация** — размер, жирность, курсив, цвет, выравнивание
- 👁️ **WYSIWYG** — на канвасе точно так же, как в итоговом файле

### История и управление
- 🕐 **История подписаний** — каждый экспорт сохраняется; можно открыть повторно, скачать результат или удалить
- ❓ **Диалог «О программе»** — версия приложения + ссылка на GitHub

### Интерфейс
- 🌐 **Языки RU / EN** — переключение интерфейса
- 🧭 **Пошаговые подсказки** — сайдбар ведёт по шагам, активный шаг подсвечен
- ⚡ **Без переключения режимов** — канвас готов сразу после загрузки документа

### Приватность и деплой
- 🔒 **Всё локально** — никаких облаков, никакой регистрации
- 🌍 **Демо-режим (stateless)** — для публичного хостинга: ничего не сохраняется на сервере, все данные только в браузере (IndexedDB)
- 💾 **Нативный диалог сохранения** в Windows .exe — стандартное окно «Сохранить как»

## Быстрый старт

**Требования:** Docker Desktop

```bash
git clone https://github.com/TinaUma/signdrop.git
cd signdrop
docker compose up
```

Открыть в браузере: **http://localhost:8080**

> 🌐 **Живое демо:** [https://tinacodes.space](https://tinacodes.space)  
> 🏠 **Сайт проекта:** [https://signdrop.site](https://signdrop.site)

Подписи сохраняются в `./data/signatures/` и не пропадают между перезапусками.

### Публичное демо (ничего не хранится на сервере)

```bash
docker compose -f docker-compose.yml -f docker-compose.demo.yml up
```

Каждый посетитель полностью изолирован, чужие файлы на сервере не накапливаются. В интерфейсе показывается баннер демо-режима.

Полное руководство (HTTPS/reverse-proxy, проверка, обновление, диагностика): [docs/DEMO.ru.md](docs/DEMO.ru.md).

> 🖥️ Нативная сборка (Tauri) для Windows — `scripts/build-exe.sh`  
> 📄 Техническое задание: [docs/SignDrop_TZ_v1.0.pdf](docs/SignDrop_TZ_v1.0.pdf)  
> 🛠 Руководство разработчика: [docs/DEVELOPMENT.ru.md](docs/DEVELOPMENT.ru.md)  
> 📜 История изменений: [CHANGELOG.md](CHANGELOG.md)

## Как пользоваться

1. **Загрузи подпись** — левая панель → «+ Загрузить подпись» (JPG, PNG, TIFF, WEBP)  
   Фон удалится автоматически, можно отключить тумблером
2. **Открой документ** — кнопка «Открыть документ» или перетащи файл
3. **Перетащи** подпись из библиотеки на документ
4. **Настрой** — двигай, масштабируй, крути, меняй прозрачность; для многостраничных — «на все страницы»
5. **Добавь текст** (опционально) — кнопка «Текст» в тулбаре, выбери шрифт и стиль
6. **Сохрани** — «Вставить и сохранить» → скачается готовый файл

## Стек технологий

| Слой | Технология |
|---|---|
| Frontend | React 19 · Vite · Tailwind CSS · **Konva.js** |
| Backend | **FastAPI** · Python 3.11 · Uvicorn |
| PDF (рендер) | **pdfjs-dist** (Mozilla, в браузере) |
| PDF (запись) | **PyMuPDF** (burn-in подписи и текста) |
| Удаление фона | Алгоритм на основе яркости пикселей · NumPy · Pillow |
| Упаковка | **Docker Compose** · nginx · (Tauri — Windows) |

## Шрифты

Текстовые поля используют встроенные шрифты: **DejaVu Sans / Serif** (свободная лицензия) и **Caveat** (рукописный, [OFL](https://openfontlicense.org)). Тексты лицензий — в `backend/fonts/` и `frontend/public/fonts/`.

## Автор

Разработано [TinaUma](https://github.com/TinaUma) · портфолио-проект  
AI-ассистент: [Claude Code](https://claude.ai/code) by Anthropic  
Процесс разработки под управлением [TAUSIK](https://github.com/Kibertum/tausik-core) — AI-agent governance ([SENAR v1.3](https://senar.tech))

---

<div align="center">

*Built with ❤️ and [Claude Code](https://claude.ai/code)*

</div>
