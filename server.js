const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database('./data/quiz.db', (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS responses (
        id TEXT PRIMARY KEY,
        participantId TEXT NOT NULL,
        questionId INTEGER NOT NULL,
        selectedAnswer TEXT NOT NULL,
        isCorrect INTEGER NOT NULL,
        submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (participantId) REFERENCES participants(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY,
        participantId TEXT NOT NULL,
        score INTEGER NOT NULL,
        totalQuestions INTEGER NOT NULL,
        percentage REAL NOT NULL,
        completedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (participantId) REFERENCES participants(id)
    )`);
}

// Load questions from JSON
let questions = [];
function loadQuestions() {
    const questionsPath = path.join(__dirname, 'data', 'questions.json');
    try {
        if (fs.existsSync(questionsPath)) {
            const data = fs.readFileSync(questionsPath, 'utf8');
            questions = JSON.parse(data);
        }
    } catch (err) {
        console.error('Error loading questions:', err);
        questions = [];
    }
}

loadQuestions();

// Routes

// Get all questions
app.get('/api/questions', (req, res) => {
    const questionsWithoutAnswers = questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        category: q.category
    }));
    res.json(questionsWithoutAnswers);
});

// Register participant
app.post('/api/register', (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email required' });
    }

    const participantId = uuidv4();

    db.run(
        'INSERT INTO participants (id, name, email) VALUES (?, ?, ?)',
        [participantId, name, email],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Email already registered' });
                }
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ participantId, message: 'Registration successful' });
        }
    );
});

// Submit quiz responses
app.post('/api/submit-quiz', (req, res) => {
    const { participantId, answers } = req.body;

    if (!participantId || !answers || typeof answers !== 'object') {
        return res.status(400).json({ error: 'Invalid request' });
    }

    let score = 0;
    let answered = 0;
    const responses = [];

    for (const [questionId, selectedAnswer] of Object.entries(answers)) {
        const qId = parseInt(questionId);
        const question = questions.find(q => q.id === qId);

        if (!question) continue;

        const isCorrect = question.correctAnswer === selectedAnswer ? 1 : 0;
        if (isCorrect) score++;
        answered++;

        responses.push({
            id: uuidv4(),
            questionId: qId,
            selectedAnswer,
            isCorrect
        });
    }

    if (answered === 0) {
        return res.status(400).json({ error: 'No answers submitted' });
    }

    const quizId = uuidv4();
    const percentage = (score / answered * 100).toFixed(2);

    // Save responses
    const insertResponse = 'INSERT INTO responses (id, participantId, questionId, selectedAnswer, isCorrect) VALUES (?, ?, ?, ?, ?)';

    db.serialize(() => {
        responses.forEach(resp => {
            db.run(insertResponse, [resp.id, participantId, resp.questionId, resp.selectedAnswer, resp.isCorrect]);
        });

        // Save quiz summary
        db.run(
            'INSERT INTO quizzes (id, participantId, score, totalQuestions, percentage) VALUES (?, ?, ?, ?, ?)',
            [quizId, participantId, score, answered, percentage],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to save quiz' });
                }
                res.json({
                    quizId,
                    score,
                    total: answered,
                    percentage,
                    message: 'Quiz submitted successfully'
                });
            }
        );
    });
});

// Get leaderboard (admin only)
app.get('/api/leaderboard', (req, res) => {
    const { pin } = req.query;

    if (!pin || pin !== ADMIN_PIN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.all(`
        SELECT
            p.id,
            p.name,
            p.email,
            q.score,
            q.totalQuestions,
            q.percentage,
            q.completedAt,
            RANK() OVER (ORDER BY q.percentage DESC, q.completedAt ASC) as rank
        FROM quizzes q
        JOIN participants p ON q.participantId = p.id
        ORDER BY q.percentage DESC, q.completedAt ASC
    `, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows || []);
    });
});

// Get leaderboard summary
app.get('/api/leaderboard-summary', (req, res) => {
    const { pin } = req.query;

    if (!pin || pin !== ADMIN_PIN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.all(`
        SELECT
            COUNT(DISTINCT p.id) as totalParticipants,
            COUNT(DISTINCT q.id) as totalCompleted,
            ROUND(AVG(q.percentage), 2) as avgScore,
            MAX(q.percentage) as highestScore,
            MIN(q.percentage) as lowestScore
        FROM participants p
        LEFT JOIN quizzes q ON p.id = q.participantId
    `, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows[0] || {});
    });
});

// Get participant details (admin only)
app.get('/api/participant/:id', (req, res) => {
    const { pin } = req.query;
    const { id } = req.params;

    if (!pin || pin !== ADMIN_PIN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.get('SELECT * FROM participants WHERE id = ?', [id], (err, participant) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!participant) {
            return res.status(404).json({ error: 'Participant not found' });
        }

        db.all(
            `SELECT r.questionId, r.selectedAnswer, r.isCorrect, q.question, q.correctAnswer, q.options
             FROM responses r
             JOIN (SELECT id, question, correctAnswer, options FROM (
                SELECT * FROM json_each((SELECT json_array_agg(json_object('id', id, 'question', question, 'correctAnswer', correctAnswer, 'options', options)) FROM ?)))
             ) q ON r.questionId = q.id
             WHERE r.participantId = ?`,
            [participant.id],
            (err, responses) => {
                res.json({
                    participant,
                    responses: responses || []
                });
            }
        );
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Quiz server running on http://localhost:${PORT}`);
    console.log(`Admin PIN: ${ADMIN_PIN}`);
});
