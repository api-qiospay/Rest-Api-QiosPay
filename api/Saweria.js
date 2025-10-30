// api/saweria.js
// Requires: npm install saweria-createqr
const { SumshiiySawer } = require('saweria-createqr');

/**
 * Helpers
 */
function safeString(v) {
  return v === undefined || v === null ? '' : String(v);
}

function mapCreateResponse(raw) {
  // Try to map common fields to match example response structure.
  // Raw library return may vary; we map cautiously.
  const data = raw || {};
  return {
    author: safeString(data.author || data.saweria_username || data.username || ''),
    trx_id: safeString(data.trx_id || data.trxId || data.id || data.invoice_id || ''),
    status: safeString(data.status || 'Pending'),
    status_simbolic:
      (data.status === 'Paid' && '✅ Paid') ||
      (data.status === 'Expired' && '⛔ Expired') ||
      '⏳ Pending',
    message: safeString(data.message || data.note || ''),
    amount: Number.isFinite(Number(data.amount)) ? Number(data.amount) : (Number.isFinite(Number(data.nominal)) ? Number(data.nominal) : null),
    qr_string: safeString(data.qr_string || data.qr || data.qrText || ''),
    created_at: safeString(data.created_at || data.createdAt || data.date || ''),
    invoice_url: safeString(data.invoice_url || data.invoiceUrl || data.url || ''),
    total_dibayar: Number.isFinite(Number(data.total_dibayar)) ? Number(data.total_dibayar) : (Number.isFinite(Number(data.total_paid)) ? Number(data.total_paid) : null),
    saweria_username: safeString(data.saweria_username || data.username || ''),
    saweria_apikey: safeString(data.saweria_apikey || data.api_key || ''),
    qr_image: safeString(data.qr_image || data.image || data.qr_image_url || ''),
    expired_in: data.expired_in || data.expiredAt || data.expires_at || null,
    raw: data // keep raw for debugging
  };
}

function mapStatusResponse(raw) {
  const data = raw || {};
  const status = safeString(data.status || data.state || 'Pending');
  return {
    author: safeString(data.author || data.username || ''),
    code: data.code || (data.statusCode || 200),
    trx_id: safeString(data.trx_id || data.trxId || data.id || ''),
    username: safeString(data.username || data.saweria_username || ''),
    status,
    status_simbolic: (status === 'Paid' && '✅ Paid') || (status === 'Expired' && '⛔ Expired') || '⏳ Pending',
    amount: Number.isFinite(Number(data.amount)) ? Number(data.amount) : null,
    invoice_url: safeString(data.invoice_url || data.invoiceUrl || data.url || ''),
    total_dibayar: Number.isFinite(Number(data.total_dibayar)) ? Number(data.total_dibayar) : null,
    created_at: safeString(data.created_at || data.createdAt || ''),
    expired_in: data.expired_in || data.expiredAt || data.expires_at || null,
    raw: data
  };
}

/**
 * initSawer: instantiate and login, with explicit logging.
 */
async function initSawer(username, email, password) {
  const sawer = new SumshiiySawer({ username, email, password });
  console.log('[Saweria] Attempting login for', username);
  await sawer.login();
  console.log('[Saweria] Login OK for', username);
  return sawer;
}

/**
 * Export two routes: create & status (manual)
 */
module.exports = [
  // CREATE PAYMENT (10 minutes fixed)
  {
    name: "Saweria Create Payment",
    desc: "Buat kode QRIS Saweria (durasi fixed 10 menit)",
    category: "Saweria",
    path: "/saweria/create?username=&email=&password=&amount=",

    async run(req, res) {
      try {
        const { username, email, password, amount } = req.query;

        // Validate inputs
        if (!username || !email || !password || (amount === undefined || amount === null || amount === '')) {
          return res.json({
            status: false,
            error: "Parameter 'username', 'email', 'password', dan 'amount' wajib diisi!"
          });
        }

        const nominal = parseInt(amount, 10);
        if (!Number.isFinite(nominal) || nominal <= 0) {
          return res.json({ status: false, error: "Parameter 'amount' harus angka > 0" });
        }

        // login + create
        let sawer;
        try {
          sawer = await initSawer(username, email, password);
        } catch (loginErr) {
          console.error('[Saweria][Create] Login failed:', loginErr && loginErr.message ? loginErr.message : loginErr);
          return res.status(500).json({ status: false, error: "Gagal login ke Saweria", detail: loginErr && loginErr.message ? loginErr.message : String(loginErr) });
        }

        // create QR with fixed 10 minutes
        try {
          const DURATION_MINUTES = 10;
          console.log(`[Saweria][Create] Creating payment for ${username} amount=${nominal} duration=${DURATION_MINUTES}m`);
          const rawPayment = await sawer.createPaymentQr(nominal, DURATION_MINUTES);
          console.log('[Saweria][Create] Raw payment response:', rawPayment && (rawPayment.trx_id || rawPayment.id || rawPayment));
          const mapped = mapCreateResponse(rawPayment);
          return res.json({ status: true, data: mapped });
        } catch (createErr) {
          console.error('[Saweria][Create] createPaymentQr error:', createErr && createErr.message ? createErr.message : createErr);
          return res.status(500).json({ status: false, error: "Gagal membuat payment QR", detail: createErr && createErr.message ? createErr.message : String(createErr) });
        }

      } catch (err) {
        console.error('[Saweria][Create] Unexpected error:', err);
        return res.status(500).json({ status: false, error: 'Internal server error', detail: err && err.message ? err.message : String(err) });
      }
    }
  },

  // CHECK STATUS (manual)
  {
    name: "Saweria Check Payment Status",
    desc: "Cek status transaksi Saweria berdasarkan trx_id (manual)",
    category: "Saweria",
    path: "/saweria/status?username=&email=&password=&trxid=",

    async run(req, res) {
      try {
        const { username, email, password, trxid } = req.query;

        if (!username || !email || !password || !trxid) {
          return res.json({ status: false, error: "Parameter 'username', 'email', 'password', dan 'trxid' wajib diisi!" });
        }

        let sawer;
        try {
          sawer = await initSawer(username, email, password);
        } catch (loginErr) {
          console.error('[Saweria][Status] Login failed:', loginErr && loginErr.message ? loginErr.message : loginErr);
          return res.status(500).json({ status: false, error: "Gagal login ke Saweria", detail: loginErr && loginErr.message ? loginErr.message : String(loginErr) });
        }

        // try several method names that library might expose
        let rawStatus;
        try {
          if (typeof sawer.cekPaymentV1 === 'function') {
            rawStatus = await sawer.cekPaymentV1(trxid);
          } else if (typeof sawer.cekpayment === 'function') {
            rawStatus = await sawer.cekpayment(trxid);
          } else if (typeof sawer.cekPayment === 'function') {
            rawStatus = await sawer.cekPayment(trxid);
          } else {
            // last-resort: if library exposes generic 'cek' style
            const candidate = Object.keys(sawer).find(k => /cek/i.test(k));
            if (candidate) {
              rawStatus = await sawer[candidate](trxid);
            } else {
              throw new Error('Library Saweria tidak menyediakan method cekPayment(cekpayment/cekPaymentV1) pada versi ini');
            }
          }
        } catch (cekErr) {
          console.error('[Saweria][Status] cekPayment error:', cekErr && cekErr.message ? cekErr.message : cekErr);
          return res.status(500).json({ status: false, error: "Gagal memeriksa status transaksi", detail: cekErr && cekErr.message ? cekErr.message : String(cekErr) });
        }

        const mapped = mapStatusResponse(rawStatus);
        return res.json({ status: true, data: mapped });

      } catch (err) {
        console.error('[Saweria][Status] Unexpected error:', err);
        return res.status(500).json({ status: false, error: 'Internal server error', detail: err && err.message ? err.message : String(err) });
      }
    }
  }
];
