# CVS Garage — Forum and Discussions Service

**Theme:** Orange (`#EA580C` primary, `#F97316` vibrant accent)  
**Typography:** Google Sans (with Plus Jakarta Sans fallback)  
**Status:** Implemented & Integration-Ready  
**Directory:** `services/forum` (Frontend App) & `backend/src/modules/forum` (Central Backend Module)

---

## 1. Overview & Ecosystem Architecture

The Forum is the central communication and knowledge-sharing layer of the CVS Garage college innovation platform. It provides high-speed Q&A, problem debugging, and project collaboration, with first-class integrations to:

* **Member Management:** Common identity, roles (`Student`, `Mentor`, `Community Moderator`, `Admin`), and mentor discovery.
* **Project Management:** Discussions connected bidirectionally to campus projects (e.g. *Smart Campus Navigation #PRJ-101*).
* **Event Management:** HackSprint and tech fest specific community threads (e.g. *HackSprint 2026 #EVT-2026-01*).
* **Idea Centre:** **"Export to Idea Centre"** workflow allowing valuable community ideas to be promoted to official ideas with atomic duplicate prevention.
* **Ranking & Leaderboard:** Normalized contribution events (`post`, `reply`, `accepted_answer`, `upvote_received`) sent idempotently without double-counting.

---

## 2. Directory Structure

```text
cvs-garage/
├── backend/
│   ├── database/
│   │   ├── schema/forum.sql             # Full SQL schema DDL with indexes & unique constraints
│   │   └── seeds/forum_seed.sql         # Realistic college discussions, projects & mentors
│   ├── src/
│   │   ├── modules/forum/               # Central backend forum module
│   │   │   ├── forum.controller.js      # REST API handlers & RBAC
│   │   │   ├── forum.service.js         # Core business logic & score calculations
│   │   │   ├── forum.store.js           # Seeded persistent store
│   │   │   └── forum.routes.js          # Express route definitions
│   │   ├── integrations/                # Decoupled external service adapters
│   │   │   ├── member.service.js        # Member management & identity
│   │   │   ├── project.service.js       # Project management
│   │   │   ├── event.service.js         # Event management
│   │   │   ├── idea-centre.service.js   # Idea Centre export adapter
│   │   │   └── leaderboard.service.js   # Leaderboard telemetry adapter
│   │   └── server.js                    # Express central backend (port 4000)
│   └── tests/
│       └── forum.test.js                # 8 automated unit & integration tests
├── packages/contracts/src/forum/
│   └── index.ts                         # Shared TypeScript DTOs & API models
└── services/forum/                      # Forum frontend service
    ├── index.html                       # Semantic HTML5 app shell
    ├── dev-server.js                    # Zero-dependency local dev server (port 3000)
    ├── package.json
    └── src/
        ├── styles/
        │   ├── theme.css                # Orange theme tokens & Google Sans typography
        │   └── forum.css                # Feed, cards, modals, and responsive layout
        ├── api.js                       # API client with fallback
        └── app.js                       # Client controller, routing & modals
```

---

## 3. Running the Service Locally

### Step 1: Start Central Backend
```bash
cd backend
npm install
npm start
# Central Backend will run on http://localhost:4000
# Run tests: npm test
```

### Step 2: Start Forum Frontend
```bash
cd services/forum
npm run dev
# Forum App will open at http://localhost:3000
```

---

## 4. Key Interactive Features

1. **Ask → Discuss → Solve:**
   - Mark helpful answers as **Accepted Solution** (restricted to post author and moderators).
   - Solved questions display a distinct green badge and pinned accepted answer banner.
2. **Normalized Voting:**
   - Real-time upvoting and downvoting with atomic score calculation and toggle-off support.
3. **Export to Idea Centre:**
   - Modal pre-fills structured problem statement and proposed solution.
   - Prevents duplicate exports using database constraints and service tracking.
4. **Mentor Discovery:**
   - Explore verified faculty and peer mentors by department and technical expertise.
   - Click "Ask Question" to initiate a targeted inquiry.
5. **Project & Event Linking:**
   - Filter and label posts linked to campus innovation initiatives.
6. **Role Switcher:**
   - Header dropdown allows instant testing as Student (Rahul), Student (Ananya), Mentor (Dr. Priya), Mentor (Dr. Arvind), or Admin (Vikramaditya).
