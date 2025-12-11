const fetch = require('node-fetch');

async function run() {
  const payload = { show_id: 1, user_name: 'test', seat_numbers: [1] };
  const promises = [];
  for (let i = 0; i < 6; i++) {
    promises.push(fetch('http://localhost:8000/api/bookings', {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify(payload)
    }).then(r => r.json().then(j => ({ status: r.status, body: j }))));
  }
  const results = await Promise.all(promises);
  console.log(results);
}

run();
