const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

// מאגר נתונים זמני בזיכרון השרת לשמירת מצב המשחק והשחקנים
let gameStatus = 'lobby'; // מצבים: lobby, question, leaderboard, final
let players = {}; // מבנה: { "0501234567": { name: "שחקן 1", score: 0, lastAnswer: null } }
let currentQuestionIndex = 0;

// הגדרת השאלות של המשחק
const questions = [
    { q: "מהו הפרי הלאומי של ארץ ישראל שנקרא גם צבר?", a: ["בננה", "מנגו", "סברס", "תפוח"], correct: "3", time: 15 },
    { q: "כמה ימים יש בשנה פשוטה (לא מעוברת)?", a: ["354 ימים", "365 ימים", "385 ימים", "300 ימים"], correct: "2", time: 15 },
    { q: "מהי העיר העברית הראשונה שהוקמה בשנת תרס\"ט?", a: ["ירושלים", "חיפה", "תל אביב", "פתח תקווה"], correct: "3", time: 15 }
];

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. הצינור שמקבל את השיחות וההקשות מימות המשיח
app.get('/ivr-api', (req, res) => {
    const phone = req.query.ApiPhone;
    const valName = req.query.valName;
    const extension = req.query.ApiExtension;

    console.log(`פנייה מימות המשיח. טלפון: ${phone}, שלוחה: ${extension}, נתון: ${valName}`);

    // אם השחקן מחייג ומגיע בפעם הראשונה (בשלב הלובי)
    if (gameStatus === 'lobby') {
        if (!players[phone]) {
            // יצירת שחקן חדש עם שם זמני המבוסס על סוף מספר הטלפון שלו
            const shortName = "משתתף " + phone.slice(-4);
            players[phone] = { name: shortName, score: 0, lastAnswer: null };
        }
        
        // ימות המשיח תגיד לו שהוא מחובר ותשמיע מוזיקה בהמתנה
        return res.send(`id_list_message=t-ברוכים הבאים למשחק הקליקרים הגדול. אתם מחוברים למערכת ומופיעים על המסך. מיד מתחילים.&go_to_folder=/`);
    }

    // אם המשחק כבר רץ ויש שאלה פעילה באוויר והשחקן מקיש תשובה
    if (gameStatus === 'question' && valName) {
        if (players[phone]) {
            players[phone].lastAnswer = valName;
            
            // בדיקה אם התשובה שהקיש בטלפון (1-4) היא התשובה הנכונה
            const currentQuestion = questions[currentQuestionIndex];
            if (valName === currentQuestion.correct) {
                players[phone].score += 10; // הוספת 10 נקודות על תשובה נכונה
            }
        }
        return res.send(`id_list_message=t-נקלט בהצלחה. המתינו לתוצאות על המסך.&hangup=yes`);
    }

    // ברירת מחדל אם מגיעים בזמן לא מתאים
    return res.send(`id_list_message=t-נא להמתין לתחילת השאלה הבאה.&hangup=yes`);
});

// 2. נקודת קצה (API) שהדפדפן פונה אליה כדי לקבל את נתוני השחקנים והשאלות המעודכנים
app.get('/api/game-data', (req, res) => {
    res.json({
        gameStatus,
        currentQuestionIndex,
        questions,
        players: Object.values(players)
    });
});

// 3. נקודות קצה לשליטה במשחק מתוך מסך הניהול בדפדפן
app.post('/api/start-game', (req, res) => { gameStatus = 'question'; res.json({ success: true }); });
app.post('/api/next-question', (req, res) => {
    // איפוס תשובות קודמות ומעבר לשאלה הבאה
    Object.keys(players).forEach(p => players[p].lastAnswer = null);
    if (currentQuestionIndex + 1 < questions.length) {
        currentQuestionIndex++;
        gameStatus = 'question';
    } else {
        gameStatus = 'final';
    }
    res.json({ success: true });
});
app.post('/api/show-leaderboard', (req, res) => { gameStatus = 'leaderboard'; res.json({ success: true }); });
app.post('/api/reset-game', (req, res) => {
    gameStatus = 'lobby';
    players = {};
    currentQuestionIndex = 0;
    res.json({ success: true });
});

// 4. הדף הויזואלי הראשי שיוצג על המסך לכולם
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>משחק קליקרים טלפוני חי פרימיום</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: radial-gradient(circle at center, #1e1b4b 0%, #090d16 100%); color: #f3f4f6; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; min-height: 100vh; box-sizing: border-box; }
            .container { width: 100%; max-width: 900px; background: rgba(17, 24, 39, 0.85); backdrop-filter: blur(10px); padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; }
            .btn { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; border: none; padding: 14px 28px; font-size: 1.1rem; border-radius: 12px; cursor: pointer; font-weight: bold; margin-top: 15px; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin: 25px 0; }
            .card { background: #1e293b; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); font-weight: bold; }
            .leaderboard-row { display: flex; justify-content: space-between; padding: 12px; background: #1e293b; margin-bottom: 8px; border-radius: 8px; }
            .options { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
            .option { background: #1f2937; padding: 15px; border-radius: 10px; font-size: 1.2rem; border-left: 5px solid #3b82f6; }
        </style>
    </head>
    <body>
        <div class="container" id="game-box">טוען את המשחק...</div>

        <script>
            async function updateScreen() {
                const res = await fetch('/api/game-data');
                const data = await res.json();
                const box = document.getElementById('game-box');

                if (data.gameStatus === 'lobby') {
                    box.innerHTML = \`
                        <h1 style="color:#8b5cf6;">לובי המשחק הטלפוני</h1>
                        <p style="font-size:1.3rem;">חייגו למערכת שלכם בימות המשיח כדי להיכנס למסך!</p>
                        <h3>שחקנים מחוברים: \${data.players.length}</h3>
                        <div class="grid">\${data.players.map(p => \`<div class="card">\${p.name} 📞</div>\`).join('')}</div>
                        <button class="btn" onclick="fetch('/api/start-game', {method:'POST'})">התחל משחק</button>
                    \`;
                } 
                else if (data.gameStatus === 'question') {
                    const q = data.questions[data.currentQuestionIndex];
                    box.innerHTML = \`
                        <h2 style="color:#f59e0b;">שאלה \${data.currentQuestionIndex + 1}</h2>
                        <h1 style="font-size:2.2rem;">\${q.q}</h1>
                        <div class="options">
                            <div class="option" style="border-color:#ef4444;">1. \${q.a[0]}</div>
                            <div class="option" style="border-color:#3b82f6;">2. \${q.a[1]}</div>
                            <div class="option" style="border-color:#10b981;">3. \${q.a[2]}</div>
                            <div class="option" style="border-color:#f59e0b;">4. \${q.a[3]}</div>
                        </div>
                        <p style="margin-top:20px; color:#94a3b8;">הקישו את הספרה הנכונה בטלפון שלכם!</p>
                        <button class="btn" onclick="fetch('/api/show-leaderboard', {method:'POST'})">עצור וראה תוצאות</button>
                    \`;
                } 
                else if (data.gameStatus === 'leaderboard') {
                    const sorted = [...data.players].sort((a,b) => b.score - a.score);
                    box.innerHTML = \`
                        <h1>טבלת מובילים זמנית</h1>
                        <div style="margin:20px 0;">
                            \${sorted.map((p, i) => \`
                                <div class="leaderboard-row">
                                    <span>#\${i+1} \${p.name}</span>
                                    <span style="color:#10b981;">\${p.score} נקודות</span>
                                </div>
                            \`).join('')}
                        </div>
                        <button class="btn" onclick="fetch('/api/next-question', {method:'POST'})">לשאלה הבאה</button>
                    \`;
                }
                else if (data.gameStatus === 'final') {
                    const winner = [...data.players].sort((a,b) => b.score - a.score)[0];
                    box.innerHTML = \`
                        <h1 style="font-size:3rem; color:#10b981;">🎉 המשחק הסתיים! 🎉</h1>
                        <h2>המנצח הגדול הוא:</h2>
                        <div class="card" style="font-size:2rem; display:inline-block; padding:20px 40px; margin:20px; border-color:#f59e0b;">
                            \${winner ? winner.name : 'אין משתתפים'}
                        </div>
                        <br>
                        <button class="btn" onclick="fetch('/api/reset-game', {method:'POST'})">אפס והתחל מחדש</button>
                    \`;
                }
            }

            // עדכון אוטומטי של המסך בכל שנייה כדי לשקף חיוגים חדשים
            setInterval(updateScreen, 1000);
            updateScreen();
        </script>
    </body>
    </html>
    `);
});

app.listen(PORT, () => {
    console.log(`השרת פועל בהצלחה על פורט ${PORT}`);
});
