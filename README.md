# Mitgliederinformationssystem – Backend

> **Node.js/Express Backend für das Interne Tool der Jungen Liberalen Schleswig-Holstein e. V.**

---

## 🚀 Tech-Stack

- **Node.js** (>=18.x empfohlen)
- **Express** (REST API)
- **Sequelize** (ORM für MariaDB/MySQL)
- **MariaDB** oder **MySQL** (Datenbank)
- **JWT** (Authentifizierung)
- **Nodemailer** (E-Mail Versand)
- **Winston** (Logging)
- **dotenv** (Umgebungsvariablen)
- **ESLint** (Code-Qualität)

---

## 📦 Projektstruktur

- `src/` – Quellcode (Routes, Models, Services, Middleware)
- `migrations/` – DB-Migrationen (Sequelize)
- `seeders/` – Seed-Daten für die DB
- `uploads/` – Datei-Uploads (z. B. Anhänge)
- `config/` – DB- und Service-Konfiguration

---

## 🛠️ Lokale Entwicklung

### Voraussetzungen

- **Node.js** >= 18.x
- **npm** >= 9.x
- **MariaDB** oder **MySQL** (lokal oder remote)

### Setup

```bash
cd backend
npm install
```

### Umgebungsvariablen

Lege eine `.env.development` (für Entwicklung) und/oder `.env.production` (für Produktion) im `backend/`-Verzeichnis an:

```
PORT=4000
DB_NAME=deinedb
DB_USER=deinuser
DB_PASS=deinpasswort
DB_HOST=localhost
JWT_SECRET=geheimesjwt
CORS_ORIGIN=http://localhost:3000
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=mail@example.com
EMAIL_PASS=deinmailpasswort
```

> Siehe auch `config/config.example.json` für DB- und APN-Konfiguration.

---

## 📜 Nützliche Skripte

| Befehl            | Zweck                                    |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Start im Entwicklungsmodus (mit Nodemon) |
| `npm start`       | Start im Produktionsmodus                |
| `npm run lint`    | Linting mit ESLint                       |
| `db:migrate`      | Migrationen ausführen (Sequelize)        |
| `db:migrate:undo` | Letzte Migration rückgängig machen       |
| `db:seed`         | Seed-Daten einspielen                    |

---

## 🗄️ Datenbankmigrationen & Seeds

- Migrationen: `npm run db:migrate`
- Seeds: `npm run db:seed`
- Konfiguration: `config/config.json` bzw. `.env.*`

---

## 🔒 Sicherheit & Auth

- Authentifizierung via JWT (Token im Header)
- Rate Limiting & Helmet für Security
- CORS konfigurierbar via Umgebungsvariable
- Passwort-Hashing mit bcryptjs

---

## 🐳 Deployment

- Empfohlen: Deployment via Docker oder auf eigenem Server
- Statische Dateien/Uploads im `uploads/`-Ordner
- Port & DB-Zugang via Umgebungsvariablen

---

## 🧑‍💻 Entwickler:innen

- Siehe [GitHub Repo](https://github.com/Julis-SH/)
- Kontakt: [luca.kohls@julis-sh.de](mailto:luca.kohls@julis-sh.de)

---

**Mitmachen?** PRs & Issues willkommen! ✨
