const express = require('express');
const router = express.Router();
const { getPool } = require('../lib/db');

// create show and seats
router.post('/', async (req, res) => {
  const { name, start_time, total_seats } = req.body;
  if (!name || !start_time || !total_seats) return res.status(400).json({ error: 'Missing fields' });

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const showRes = await client.query(
      'INSERT INTO shows (name, start_time, total_seats) VALUES ($1, $2, $3) RETURNING id',
      [name, start_time, total_seats]
    );
    const showId = showRes.rows[0].id;
    const seatValues = [];
    for (let i=1; i<=total_seats; i++) seatValues.push(`(${showId}, ${i})`);
    const sql = `INSERT INTO seats (show_id, seat_number) VALUES ${seatValues.join(',')}`;
    await client.query(sql);
    await client.query('COMMIT');
    res.status(201).json({ id: showId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not create show' });
  } finally {
    client.release();
  }
});

// list shows with available seats
router.get('/', async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT s.*, 
      (s.total_seats - COALESCE((
        SELECT COUNT(*) FROM booking_seats bs
        JOIN bookings b ON b.id = bs.booking_id
        WHERE b.show_id = s.id AND b.status = 'CONFIRMED'
      ),0)
    ) AS available_seats
    FROM shows s
    ORDER BY s.start_time ASC
  `);
  res.json(rows);
});

// seat layout
router.get('/:id/seats', async (req, res) => {
  const showId = req.params.id;
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT st.id as seat_id, st.seat_number,
      b.id AS booking_id, b.status
    FROM seats st
    LEFT JOIN booking_seats bs ON bs.seat_id = st.id
    LEFT JOIN bookings b ON b.id = bs.booking_id
    WHERE st.show_id = $1
    ORDER BY st.seat_number
  `, [showId]);

  const seats = rows.map(r => ({
    seat_id: r.seat_id,
    seat_number: r.seat_number,
    status: r.status || 'AVAILABLE',
    booking_id: r.booking_id || null
  }));
  res.json(seats);
});

module.exports = router;
