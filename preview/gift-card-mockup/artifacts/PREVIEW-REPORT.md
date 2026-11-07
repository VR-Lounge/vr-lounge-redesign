# VR Lounge — gift card preview (v2 correction)

Изолированный mockup: `preview/gift-card-mockup/`. Production не затрагивается.

## Что исправлено относительно v1

| Дефект | Причина | Исправление |
|--------|---------|-------------|
| Чужой hero / «Звёзды, VR…» | Отдельный `preview.css` | Hero и тексты из prod `index.html` + `css/style.css` |
| `03-mobile-sheet-open.png` без sheet | `autogift=1` ждал `DOMContentLoaded` + `is-open` не успевал в headless | `openGiftSheet(true)` синхронно; съёмка только по HTTP |
| Битая картинка в скринах | `file://` и неверные `../../img` | `python3 -m http.server` + пути как на сайте |
| David справа, QR, overlap footer | Старый макет карты | David слева, без QR на лицевой; serial внизу колонки текста |
| Прямоугольник вокруг bust | Плоский фон webp | `mix-blend-mode: screen`, mask-gradient, фон `#06030c` |

## Ограничения (честно)

- На **export PNG** у `hero-david.webp` по краям всё ещё может читаться лёгкий контур файла (источник — квадратный webp с чёрным полем); в **sheet-превью** на телефоне blend мягче.
- Headless Chrome в CI/VM: порт 9222 иногда занят; для полного прогона нужен один HTTP-сервер и последовательные кадры (~6–8 мин).
- Автотестов a11y/Playwright нет — проверка amount/phone вручную через UI + логика в `preview.js`.

## Приёмка (самопроверка)

- Hero mobile 390×844: оригинальный h1, collage David, CTA: Поиграть full width + ДР/Подарить.
- Gift sheet: handle, close, градиент, форма 1000–20000 шаг 1000, демо-маркер.
- Карта stress: 20 000 ₽ + длинное имя без overlap serial.
- Заявка не уходит в сеть (preventDefault + демо success).

## Файлы артефактов (repo)

См. каталог `preview/gift-card-mockup/artifacts/` и `screenshots/`.
