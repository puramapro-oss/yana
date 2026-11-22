// Stamp transport reused from JurisPurama's qualified ots-core.ts and
// request-deadline.ts. Parsing, nonces/Merkle operations and serialization use
// the official OpenTimestamps primitives; no custom proof format is introduced.
import { cancelResponseQuietly, createRequestDeadline } from './request-deadline.ts'

interface OtsAttestation { uri?: string; height?: number }
interface OtsTimestamp {
  msg: number[]
  ops: Map<unknown, OtsTimestamp>
  attestations: OtsAttestation[]
  add(operation: unknown): OtsTimestamp
  merge(other: OtsTimestamp): void
  serialize(context: unknown): void
}
interface OtsDetached { timestamp: OtsTimestamp; serializeToBytes(): number[] }
export interface OtsLibrary {
  DetachedTimestampFile: { fromHash(op: unknown, hash: number[]): OtsDetached }
  Ops: { OpSHA256: new () => unknown; OpAppend: new (bytes: number[]) => unknown }
  Context: {
    StreamDeserialization: new (bytes: Uint8Array) => { assertEof(): void }
    StreamSerialization: new () => { getOutput(): number[] }
  }
  Timestamp: { deserialize(context: unknown, digest: number[]): OtsTimestamp }
  Notary: {
    PendingAttestation: new (uri: string) => OtsAttestation & { uri: string }
    BitcoinBlockHeaderAttestation: new (height: number) => OtsAttestation & { height: number }
  }
}

const AGGREGATORS = [
  'https://a.pool.opentimestamps.org', 'https://b.pool.opentimestamps.org',
  'https://a.pool.eternitywall.com', 'https://ots.btc.catallaxy.com',
]
const CALENDAR_SUFFIXES = ['.calendar.opentimestamps.org', '.calendar.eternitywall.com', '.calendar.catallaxy.com']
const MAX_RESPONSE_BYTES = 10_000
const MAX_PROOF_BYTES = 64_000

function admissibleCalendar(value: string): boolean {
  try {
    if (value.includes('\\')) return false
    const url = new URL(value)
    return url.protocol === 'https:' && !url.port && !url.username && !url.password
      && !url.hash && !url.search && url.pathname === '/'
      && (AGGREGATORS.includes(url.origin) || CALENDAR_SUFFIXES.some(suffix => url.hostname.endsWith(suffix)))
  } catch { return false }
}

/** Only the four fixed HTTPS aggregators are contacted; returned URIs are never fetched. */
async function submitDigest(origin: string, digest: number[]): Promise<Uint8Array> {
  if (!AGGREGATORS.includes(origin)) throw new Error('OTS_INVALID_AGGREGATOR')
  const deadline = createRequestDeadline(10_000)
  try {
    const response = await deadline.fetch(new URL('/digest', origin), {
      method: 'POST', body: new Uint8Array(digest), redirect: 'error', credentials: 'omit',
      headers: { Accept: 'application/vnd.opentimestamps.v1', 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    if (response.redirected || response.status !== 200) {
      cancelResponseQuietly(response.body)
      throw new Error('OTS_HTTP_REJECTED')
    }
    const declared = response.headers.get('content-length')
    if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_RESPONSE_BYTES)) {
      cancelResponseQuietly(response.body)
      throw new Error('OTS_RESPONSE_TOO_LARGE')
    }
    const reader = response.body?.getReader()
    if (!reader) throw new Error('OTS_EMPTY_RESPONSE')
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      for (;;) {
        const { value, done } = await deadline.wait(() => reader.read())
        if (done) break
        size += value.length
        if (size > MAX_RESPONSE_BYTES) throw new Error('OTS_RESPONSE_TOO_LARGE')
        if (value.length) chunks.push(value)
      }
    } catch (error) { cancelResponseQuietly(reader); throw error }
    finally { try { reader.releaseLock() } catch { /* A stalled read may still own its lock. */ } }
    if (declared && !response.headers.get('content-encoding') && size !== Number(declared)) {
      throw new Error('OTS_INVALID_RESPONSE')
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
    deadline.check()
    return bytes
  } finally { deadline.close() }
}

function nodes(root: OtsTimestamp): OtsTimestamp[] {
  const result: OtsTimestamp[] = []
  const pending = [{ node: root, depth: 0 }]
  const seen = new Set<OtsTimestamp>()
  let attestations = 0
  while (pending.length) {
    const { node, depth } = pending.pop()!
    if (seen.has(node)) continue
    seen.add(node); result.push(node); attestations += node.attestations.length
    if (result.length > 256 || depth > 64 || attestations > 64 || node.msg.length > 4096) {
      throw new Error('OTS_PROOF_TOO_COMPLEX')
    }
    for (const child of node.ops.values()) pending.push({ node: child, depth: depth + 1 })
  }
  return result
}

export function createOtsStamper(library: OtsLibrary) {
  function usable(attestation: OtsAttestation): boolean {
    if (attestation instanceof library.Notary.BitcoinBlockHeaderAttestation) {
      return Number.isSafeInteger(attestation.height) && (attestation.height as number) >= 0
    }
    return attestation instanceof library.Notary.PendingAttestation
      && typeof attestation.uri === 'string' && admissibleCalendar(attestation.uri)
  }
  async function stampDigest(hash: Uint8Array): Promise<string> {
    if (hash.length !== 32) throw new Error('OTS_INVALID_HASH')
    const detached = library.DetachedTimestampFile.fromHash(new library.Ops.OpSHA256(), Array.from(hash))
    // Upstream's one-file nonce/Merkle construction preserves the raw digest.
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    const tip = detached.timestamp.add(new library.Ops.OpAppend(nonce)).add(new library.Ops.OpSHA256())
    const replies = await Promise.all(AGGREGATORS.map(async origin => {
      try {
        const bytes = await submitDigest(origin, tip.msg)
        const context = new library.Context.StreamDeserialization(bytes)
        const timestamp = library.Timestamp.deserialize(context, tip.msg)
        context.assertEof()
        const tree = nodes(timestamp)
        // The upstream reader can overrun declared lengths or ignore bytes inside
        // nested attestations. EOF alone does not prove every byte was consumed.
        const serialized = new library.Context.StreamSerialization()
        timestamp.serialize(serialized)
        const canonical = serialized.getOutput()
        if (canonical.length !== bytes.length || canonical.some((byte, index) => byte !== bytes[index])) return null
        if (!tree.some(node => node.attestations.some(usable))) return null
        return timestamp
      } catch { return null }
    }))
    const accepted = replies.filter((reply): reply is OtsTimestamp => reply !== null)
    // Upstream documents a two-calendar minimum for its four defaults.
    // Resolving after swallowed failures must never produce a bare receipt.
    if (accepted.length < 2) throw new Error('OTS_CALENDAR_UNAVAILABLE')
    for (const reply of accepted) tip.merge(reply)
    nodes(detached.timestamp)
    const proof = detached.serializeToBytes()
    if (!proof.length || proof.length > MAX_PROOF_BYTES) throw new Error('OTS_INVALID_PROOF')
    return Buffer.from(proof).toString('base64')
  }
  return { stampDigest }
}
