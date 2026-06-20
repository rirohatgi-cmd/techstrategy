# Multi-User Quiz Application

A full-stack quiz platform supporting 100+ concurrent practitioners with leaderboard tracking and admin dashboard.

## Features

✅ **Quiz Interface**
- Simple multiple-choice questions (MCQ)
- Register with name and email
- Progress tracking
- Skip and return to questions
- Instant score calculation

✅ **Leaderboard**
- Public rankings with top 3 highlighting
- Real-time score updates
- Search/filter by name or email

✅ **Admin Dashboard** (PIN Protected)
- Summary analytics (participants, completion rate, avg score)
- Detailed leaderboard with rankings
- View individual participant responses
- Exportable data

## Setup

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web server
- `sqlite3` - Database
- `cors` - Cross-origin requests
- `body-parser` - JSON parsing
- `uuid` - Unique IDs
- `nodemon` - Development auto-reload

### 2. Start the Server

```bash
npm start
```

The server will run on `http://localhost:3000`

For development with auto-reload:
```bash
npm run dev
```

## Accessing the Application

### Quiz Taker
- URL: `http://localhost:3000/quiz.html`
- Enter name and email
- Complete 10 MCQ questions
- Submit and view score
- See leaderboard

### View Leaderboard
- URL: `http://localhost:3000/leaderboard.html`
- Public view shows top rankings
- Click "Admin Access" to login with PIN

### Admin Access
- Default PIN: `1234`
- Change by setting environment variable: `ADMIN_PIN=your-pin`
- Access detailed analytics and participant data

## File Structure

```
.
├── server.js                 # Express backend
├── package.json             # Dependencies
├── public/
│   ├── quiz.html           # Quiz interface
│   ├── leaderboard.html    # Leaderboard & admin dashboard
│   └── styles.css          # Shared styling
└── data/
    └── questions.json      # Question bank
```

## Database

SQLite database automatically created at `./data/quiz.db`

**Tables:**
- `participants` - Registered users (id, name, email, createdAt)
- `responses` - Individual answers (id, participantId, questionId, selectedAnswer, isCorrect)
- `quizzes` - Quiz summaries (id, participantId, score, totalQuestions, percentage, completedAt)

## Configuration

### Environment Variables

```bash
# Server port
PORT=3000

# Admin PIN for leaderboard access
ADMIN_PIN=1234
```

### Adding Questions

Edit `data/questions.json` to add or modify questions:

```json
{
  "id": 1,
  "question": "Question text?",
  "options": {
    "A": "Option A",
    "B": "Option B",
    "C": "Option C",
    "D": "Option D"
  },
  "correctAnswer": "B",
  "category": "Category Name"
}
```

## API Endpoints

### Public

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/questions` | GET | Get all questions (without answers) |
| `/api/register` | POST | Register participant |
| `/api/submit-quiz` | POST | Submit quiz responses |

### Admin Only (requires PIN)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/leaderboard` | GET | Get leaderboard |
| `/api/leaderboard-summary` | GET | Get analytics summary |
| `/api/participant/:id` | GET | Get participant details |

## Deployment

### Local Network
```bash
npm start
# Access from other machines: http://<your-ip>:3000
```

### Production (Example: Heroku)

1. Create `Procfile`:
```
web: npm start
```

2. Deploy:
```bash
git push heroku main
```

3. Set admin PIN:
```bash
heroku config:set ADMIN_PIN=secure-pin
```

### Production (Example: Docker)

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD npm start
```

## Performance

- Supports 100+ concurrent users
- SQLite suitable for 10K+ quiz responses
- For larger deployments, upgrade to PostgreSQL:
  - Update `server.js` to use `pg` driver
  - Adjust table schemas

## Security Notes

⚠️ **Important for Production:**

1. Change default admin PIN
2. Use HTTPS (reverse proxy with SSL)
3. Add rate limiting to prevent abuse
4. Implement user authentication if needed
5. Add CSRF protection
6. Validate all inputs on server-side

## Troubleshooting

### Database locked
- Close other connections to database
- SQLite doesn't support concurrent writes well
- For production: migrate to PostgreSQL

### CORS errors
- Ensure API calls use correct protocol (http/https)
- Check server is running

### Questions not loading
- Verify `data/questions.json` exists and is valid JSON
- Check file permissions

## Future Enhancements

- [ ] Timer for quiz
- [ ] Question categories/difficulty levels
- [ ] Export leaderboard to CSV
- [ ] Email notifications
- [ ] Mobile app
- [ ] Analytics dashboard
- [ ] Question randomization
- [ ] Certificate generation
- [ ] Multiple quizzes support

## License

MIT
