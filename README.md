# Prometne nesreče v Sloveniji

Spletna stran za prikaz prometnih nesreč v realnem času, ki pridobiva podatke iz sistema [SPIN 112](https://spin3.sos112.si/).

## 🌐 Dostop

Po združitvi PR v `main` se stran samodejno objavi prek GitHub Pages:

> **https://krivec209.github.io/spletna/**

## 🗺️ Viri podatkov

| Vir | URL |
|-----|-----|
| API (RSS/XML) | `https://spin3.sos112.si/javno/ODApi/379` |
| Interaktivni zemljevid | `https://spin3.sos112.si/javno/zemljevid` |

## 🚀 Lokalni zagon

Ker gre za statično HTML stran, jo odprete preprosto z brskalnikom:

```bash
# Python
python3 -m http.server 8080
# ali Node.js
npx serve .
```

Nato obiščite `http://localhost:8080`.
