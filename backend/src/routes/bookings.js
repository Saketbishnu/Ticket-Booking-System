const express = require('express');
const router = express.Router();
const { getPool } = require('../lib/db');

router.post('/', async (req, res) => {
  const { show_id, user_name, seat_numbers } = req.body;
  if (!show_id || !seat_numbers || !Array.isArray(seat_numbers) || seat_numbers.length === 0) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const params = [show_id];
    const placeholders = seat_numbers.map((s) => {
      params.push(s);
      return `$${params.length}`;
    }).join(',');

    const seatRowsRes = await client.query(
      `SELECT id, seat_number FROM seats WHERE show_id = $1 AND seat_number IN (${placeholders}) FOR UPDATE`,
      params
    );

    if (seatRowsRes.rows.length !== seat_numbers.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'One or more seat numbers invalid' });
    }

    const seatIds = seatRowsRes.rows.map(r => r.id);

    const { rows: taken } = await client.query(
      `SELECT bs.seat_id, b.status FROM booking_seats bs
       JOIN bookings b ON b.id = bs.booking_id
       WHERE bs.seat_id = ANY($1::int[]) AND b.status IN ('PENDING','CONFIRMED')`,
      [seatIds]
    );
    if (taken.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'One or more seats already taken', details: taken });
    }

    const bookingRes = await client.query(
      `INSERT INTO bookings (show_id, user_name, status) VALUES ($1,$2,'PENDING') RETURNING id, created_at`,
      [show_id, user_name || 'anonymous']
    );
    const bookingId = bookingRes.rows[0].id;

    const insertValues = seatIds.map(id => `(${bookingId}, ${id})`);
    await client.query(`INSERT INTO booking_seats (booking_id, seat_id) VALUES ${insertValues.join(',')}`);

    // Confirm immediately for demo; you may keep PENDING and confirm later after payment
    await client.query(`UPDATE bookings SET status='CONFIRMED', updated_at=now() WHERE id=$1`, [bookingId]);

    await client.query('COMMIT');
    res.status(201).json({ booking_id: bookingId, status: 'CONFIRMED' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Booking failed', err);
    if (err.code === '23505') return res.status(409).json({ error: 'Seat already booked (unique constraint)'});
    res.status(500).json({ error: 'Booking failed', details: err.message });
  } finally {
    client.release();
  }
});

router.get('/:id', async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM bookings WHERE id=$1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
  res.json(rows[0]);
});

module.exports = router;
