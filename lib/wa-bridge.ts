/**
 * WhatsApp Bridge — singleton that lives in the Next.js server process.
 * Runs baileys inside the existing Render deployment (no separate server needed).
 * Session stored in /tmp/wa_auth — survives sleeps, cleared on restart (just re-scan).
 */

// ── Types ─────────────────────────────────────────────────────────────────────
export type WAStatus = 'disconnected' | 'scanning' | 'connected' | 'logged_out'

interface WAState {
  sock: any
  status: WAStatus
  qr: string | null
  phone: string | null
  reconnectTimer: any
}

// ── Singleton via global ──────────────────────────────────────────────────────
const g = global as any
if (!g.__waState) {
  g.__waState = { sock: null, status: 'disconnected', qr: null, phone: null, reconnectTimer: null } as WAState
}
const state: WAState = g.__waState

export function getWAStatus(): { status: WAStatus; qr: string | null; phone: string | null } {
  return { status: state.status, qr: state.qr, phone: state.phone }
}

export async function initWA(): Promise<{ status: WAStatus; qr: string | null; phone: string | null }> {
  if (state.status === 'connected') return getWAStatus()
  if (state.reconnectTimer) { clearTimeout(state.reconnectTimer); state.reconnectTimer = null }

  // Lazy imports (server-only, excluded from client bundle)
  const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } =
    await import('@whiskeysockets/baileys')
  const { useMultiFileAuthState } = await import('@whiskeysockets/baileys')
  const { Boom } = await import('@hapi/boom')
  const qrcode = await import('qrcode')
  const pino = (await import('pino')).default

  const logger = pino({ level: 'silent' })
  const { state: authState, saveCreds } = await useMultiFileAuthState('/tmp/wa_auth')
  const { version } = await fetchLatestBaileysVersion()

  state.sock = makeWASocket({
    version,
    auth: { creds: authState.creds, keys: makeCacheableSignalKeyStore(authState.keys, logger) },
    logger,
    printQRInTerminal: false,
    browser: ['Rabt HQ', 'Chrome', '120.0.0'],
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
  })

  state.sock.ev.on('creds.update', saveCreds)

  state.sock.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      state.status = 'scanning'
      state.qr = await qrcode.toDataURL(qr)
    }

    if (connection === 'open') {
      state.status = 'connected'
      state.phone = state.sock?.user?.id?.replace(/:.*@s\.whatsapp\.net/, '') || null
      state.qr = null
      console.log('[WA] Connected as', state.phone)
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (code === DisconnectReason.loggedOut) {
        state.status = 'logged_out'
        state.phone = null
        state.qr = null
        state.sock = null
        console.log('[WA] Logged out')
      } else {
        state.status = 'disconnected'
        state.sock = null
        console.log('[WA] Disconnected — retrying in 5s')
        state.reconnectTimer = setTimeout(() => initWA().catch(console.error), 5000)
      }
    }
  })

  return getWAStatus()
}

export async function sendWAMessage(phone: string, message: string): Promise<{ success: boolean; to: string }> {
  if (state.status !== 'connected' || !state.sock) {
    throw new Error('WhatsApp not connected. Status: ' + state.status)
  }
  const digits = phone.replace(/[^0-9]/g, '')
  const to = digits.length === 10 ? '91' + digits : digits
  await state.sock.sendMessage(to + '@s.whatsapp.net', { text: message })
  return { success: true, to }
}

export async function logoutWA(): Promise<void> {
  try {
    if (state.sock && state.status === 'connected') await state.sock.logout()
    else if (state.sock) await state.sock.end(undefined)
  } catch {}
  state.sock = null
  state.status = 'disconnected'
  state.phone = null
  state.qr = null
  // Clear session files
  const fs = await import('fs')
  if (fs.existsSync('/tmp/wa_auth')) fs.rmSync('/tmp/wa_auth', { recursive: true, force: true })
}
