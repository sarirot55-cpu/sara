const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // מאפשר חיבור מכל כתובת
});

const PORT = process.env.PORT || 3000;

// הגשת קובץ ה-HTML של המשחק (שנינו את שמו ל-index.html לצורך הנוחות)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * שלוחת ה-API שמקבלת את הפניות מימות המשיח
 * כתובת ה-API שלכם תהיה: https://the-domain.com/ivr-api
 */
app.get('/ivr-api', (req, res) => {
    // ימות המשיח שולחת פרטים ב-Query String
    const phone = req.query.ApiPhone || 'חסוי';
    const digits = req.query.ApiDigits; // המקש שהמשתמש לחץ (1, 2, 3, 4)
    const enterId = req.query.ApiEnterID; // מזהה שיחה ייחודי

    console.log(`שיחה נכנסת מבליין: ${phone}, לחיצה: ${digits}`);

    if (!digits) {
        // פעם ראשונה שהמשתמש נכנס לשלוחה - הוא עדיין לא לחץ כלום
        // נשדר לדף המשחק שהטלפון הזה התחבר (לשלב הרישום)
        io.emit('player-connected', { phone: phone });

        // נחזיר פקודה לימות המשיח להשמיע הודעה ולחכות ללחיצה בודדת (כגון 1-4)
        // read=t-[טקסט] אומר למערכת להקריא את המילים הללו
        res.send(`read=t-ברוכים הבאים למשחק קוממיות. אנא הקש את תשובתך כעת.&=all&max=1&time=15`);
    } else {
        // המשתמש כבר שמע את ההוראה ולחץ על מקש!
        // נשדר את התשובה האמיתית שלו בזמן אמת לדף המשחק
        io.emit('player-answered', { phone: phone, answer: digits });

        // נחזיר תשובה לימות המשיח שהתשובה התקבלה ונשמיע צליל או ננתק/נעביר לשלוחה הבאה
        res.send(`id_list_message=t-תשובתך התקבלה בהצלחה.&hangup=yes`);
    }
});

// חיבור ה-WebSockets מדף ה-HTML
io.on('connection', (socket) => {
    console.log('דף תצוגת המשחק התחבר לשרת בהצלחה');
});

server.listen(PORT, () => {
    console.log(`השרת פועל בהצלחה על פורט ${PORT}`);
});