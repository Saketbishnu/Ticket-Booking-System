require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { initDb } = require('./lib/db');
const showsRouter = require('./routes/shows');
const bookingsRouter = require('./routes/bookings');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/shows', showsRouter);
app.use('/api/bookings', bookingsRouter);

const PORT = process.env.PORT || 8000;

initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});
