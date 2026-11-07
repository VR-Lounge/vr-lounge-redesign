# VR Lounge — превью подарочной карты (mockup)

**Статус:** демонстрация для утверждения. Не подключено к продакшену, аналитике, CRM и оплатам.

## Как открыть

1. Локально: откройте `index.html` в браузере (двойной клик) или через preview-сервер:
   ```bash
   cd preview/gift-card-mockup && python3 -m http.server 8765
   ```
   Затем: http://localhost:8765/

2. Админ-демо: http://localhost:8765/admin-preview.html

3. Standalone ZIP (все assets внутри): соберите `./scripts/build-standalone.sh` → `artifacts/vr-lounge-gift-preview-standalone.zip`

## Что внутри

| Файл | Назначение |
|------|------------|
| `index.html` | Hero с Давидом, три CTA, bottom sheet «Подарить» |
| `admin-preview.html` | Демо-кабинет «Сертификаты» |
| `gift-card-artwork.html` | Макет карты для экспорта PNG/PDF |
| `artifacts/` | PNG, PDF, скриншоты |

## Ограничения демо

- Заявки **не отправляются** (нет `fetch`, `localStorage` с ПДн, аналитики).
- Телефоны в примерах — вымышленные.
- Номер `VR-000123` и метка **ДЕМО / ОБРАЗЕЦ**.

## Не изменено в репозитории

Корневые `index.html`, `css/`, `js/` — без правок.
