# INDIGO — Literary Publishing Platform

> *"Where words find a home."*

INDIGO is a full-stack literary publishing web application where writers can publish serialized novels, poetry collections, and short stories, while readers can discover, read, listen to, review, and discuss literary works.

---

## 🌟 Core Features & Architectural Highlights

### 1. Free Publishing & Complete Writer Ownership
- **100% Free**: No publication fees, no subscriptions, no paywalls.
- **Immediate Publication**: Any registered user can publish works immediately without restrictive approval queues.
- **Full Author Control**: Authors can edit, draft, unpublish, delete, and reorder chapters anytime.

### 2. Multiple Pen Names per Account
- A single user account can create and manage multiple author personas (e.g. `MidnightInk` for gothic fiction, `SilentWriter` for contemplative essays).
- Each pen name maintains its own public profile, avatar, biography, metrics, and catalog.
- Readers interact with the author's pen name, keeping private account details separate.
- **Ownership Handling**: Deleting a pen name safely allows authors to either transfer works to another pen name or delete them permanently.

### 3. Categories & Document Uploads
- Supports **Novels**, **Short Stories**, and **Poetry**.
- In-app document extraction engine for `.docx`, `.doc`, `.pdf`, and `.txt` files: manuscripts are parsed directly into the native writing editor for refinement.
- Rich formatting toolbar: headings, italics, blockquotes, dividers, and real-time word/character counts.

### 4. Bookstore Homepage & Dynamic Weekly Rankings
- Literary aesthetic featuring deep indigo (`#1E1B4B`), warm paper tones (`#FAF7F2`), and editorial typography.
- Discovery sections appear immediately upon landing:
  - **Trending Now**
  - **Most Read**
  - **Highest Rated**
  - **Most Discussed**
  - **Recently Published**
  - **Category & Genre Discovery**
- **Dynamic Weekly Rankings**: Filter rankings across **Today**, **This Week (Weekly)**, **This Month**, and **All Time** without altering historical lifetime reads.

### 5. Dedicated Reading Experience & Text-to-Speech (TTS)
- **Customizable Reader**:
  - 5 Typography themes: *Warm Paper*, *Sepia*, *Midnight Indigo*, *Pitch Dark*, *Crisp White*.
  - Font families: *Literary Serif*, *Modern Sans*, *Editorial Display*, *Typewriter Mono*.
  - Adjustable text size (14px–26px).
  - Dual modes: **Page-by-Page Flip** with page-turn buttons/arrows vs **Seamless Scroll**.
- **Automatic Reading Progress**:
  - Automatically saves the active book, chapter, and scroll/paragraph percentage.
  - "Continue Reading" shortcuts resume from the exact position.
- **Integrated Text-to-Speech**:
  - Visible **LISTEN** button and floating control dock.
  - Play, Pause, Resume, Stop, and paragraph skip forward/back.
  - Variable speed (0.75x to 2.0x) and browser voice picker.
  - **Reading & Listening Sync**: Highlights the active paragraph being spoken and auto-scrolls to keep it in view.
  - **Continuous Chapter Playback**: Automatically transitions to the next chapter upon speech completion.

### 6. Personal Library & Community
- **My Library**: 4 private shelves: *Currently Reading*, *Want to Read*, *Completed*, *Saved Books*.
- **Ratings & Reviews**: 1–5 star reviews with duplicate vote protection and rating breakdowns.
- **Chapter Comments & Spoiler Masking**: Click-to-reveal spoiler warnings and threaded replies.
- **Notifications**: Real-time alerts for new chapter releases from saved authors and comment replies.

### 7. Administrator Moderation Center
- Platform overview analytics (total users, published works, lifetime reads, comments, pending reports).
- User management: account review and suspension toggles.
- Content moderation: unpublish violating works with written notices sent to authors.
- Report management: triage user reports regarding plagiarism, copyright, or harassment.
- Appeals workflow: users can submit appeals for administrative review.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or newer recommended; v22 supported)
- npm

### 1. Installation
Clone or navigate to the project directory:
```bash
cd Indi-go
npm install
cd client && npm install && cd ..
```

### 2. Seed Database
Initialize the SQLite database with realistic literary works, chapters, pen names, ratings, and comments:
```bash
npm run seed
```

### 3. Run Development Servers
To run the server and client concurrently:

- **Terminal 1 (Backend API on http://localhost:5000)**:
  ```bash
  npm run dev:server
  ```
- **Terminal 2 (Vite Frontend on http://localhost:5173)**:
  ```bash
  npm run dev:client
  ```

Alternatively, build the client once and run the unified server:
```bash
npm run build
npm start
```
The full application will be accessible at: **http://localhost:5000**

---

## 🧪 Automated End-to-End Test Suite

Run the full user journeys test:
```bash
npm test
```

This validates all 14 end-to-end user journeys:
1. User registration
2. Multi-pen name creation and persona switching
3. Novel publication with chapters
4. Poetry collection publication
5. Sectional discovery confirmation
6. Reader discovery via search
7. Chapter retrieval
8. Reading progress auto-save
9. Real-time reads incrementation
10. Text-to-Speech payload segmentation
11. 5-Star rating & spoiler-tagged comments
12. Dynamic statistics recalculation
13. Author editing & serialized chapter addition
14. Reader reporting & administrator moderation triage

---

## 🔑 Default Seeded Accounts

| Persona | Email | Password | Pen Names Owned |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@indigo.lit` | `AdminPass123!` | IndigoEditorial (Platform Admin) |
| **Writer 1** | `eleanor@indigo.lit` | `Password123!` | `MidnightInk`, `SilentWriter` |
| **Writer 2** | `marcus@indigo.lit` | `Password123!` | `The Poet`, `C. R. Sterling` |
| **Reader** | `clara@indigo.lit` | `Password123!` | `Clara Reads` |

---

## 📁 Project Structure

```text
Indi-go/
├── client/                     # React + Vite Frontend
│   ├── src/
│   │   ├── components/         # Navbar, Footer, BookCard, AuthModal
│   │   ├── context/            # AuthContext (sessions, pen names, notifs)
│   │   ├── pages/              # HomePage, Discover, BookDetails, Reader,
│   │   │                       # WriterStudio, AuthorProfile, Library,
│   │   │                       # Community, PenNames, AdminDashboard, Settings
│   │   ├── utils/              # api fetch wrapper
│   │   ├── App.jsx             # Main router
│   │   └── index.css           # Tailwind CSS & editorial typography
│   └── vite.config.js          # Vite config with backend proxy
│
├── server/                     # Node.js + Express Backend
│   ├── db.js                   # SQLite database (sql.js / WAL mode)
│   ├── seed.js                 # Database seeder with literary prose
│   ├── index.js                # Express app entrypoint & static serving
│   ├── middleware/             # JWT auth & admin check
│   └── routes/                 # auth, penNames, works, chapters,
│                               # reading, interactions, upload,
│                               # notifications, admin
│
├── tests/
│   └── e2e.test.js             # Automated 14-step user journey suite
├── uploads/                    # User uploaded documents & cover images
├── package.json                # Project scripts and dependencies
└── README.md                   # System documentation
```
