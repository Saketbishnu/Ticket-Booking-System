-- shows
CREATE TABLE IF NOT EXISTS shows (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  total_seats INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- seats (one row per seat)
CREATE TABLE IF NOT EXISTS seats (
  id SERIAL PRIMARY KEY,
  show_id INT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  seat_number INT NOT NULL,
  UNIQUE (show_id, seat_number)
);

-- booking status type
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE booking_status AS ENUM ('PENDING','CONFIRMED','FAILED');
  END IF;
END $$;

-- bookings
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  show_id INT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  user_name TEXT,
  status booking_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- booking_seats mapping
CREATE TABLE IF NOT EXISTS booking_seats (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  seat_id INT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  UNIQUE (seat_id)
);

CREATE INDEX IF NOT EXISTS idx_shows_start_time ON shows(start_time);
CREATE INDEX IF NOT EXISTS idx_booking_status ON bookings(status);
