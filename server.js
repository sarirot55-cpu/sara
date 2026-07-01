const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// שלוחת ה-API של ימות המשיח
app.get('/ivr-api', (req, res) => {
    console.log(`שיחה נכנסת! מספר: ${req.query.ApiPhone}, מקש: ${req.query.ApiDigits}`);
    
    // שליחת פקודה פשוטה לימות המשיח - השמעת מספר 1 וניתוק קל כדי לבדוק שהקשר עובד
    res.send("read=t-1=no=1=1=yes=Numbers");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
