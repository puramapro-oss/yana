#!/usr/bin/env node
/**
 * Générateur de 2 fichiers audio procéduraux pour SpiritualLayer.
 *
 * Sorties :
 *  - public/sounds/432hz-pentatonic.wav (30s loop, 3 sinus harmoniques pentatoniques)
 *  - public/sounds/tibetan-bowl.wav     (3.5s, 4 harmoniques + decay exponentiel)
 *
 * 100% procédural (sinus + enveloppes) = aucun droit d'auteur, licence "domaine public".
 * Mono 16-bit 22050Hz. Fade in/out pour loop sans click.
 *
 * Usage : `node scripts/gen-sounds.mjs`
 */
import { writeFileSync, mkdirSync } from 'node:fs'

const SAMPLE_RATE = 22050

function writeWav(path, samples) {
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = SAMPLE_RATE * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = samples.length * 2

  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.floor(clamped * 32767), 44 + i * 2)
  }
  writeFileSync(path, buffer)
}

// Pentatonique en Do autour de 432Hz (Do Ré Sol ~ 432, 486, 648 Hz).
// Durée 30s, fade-in/out 1.5s pour boucle fluide.
function gen432Pentatonic(durationSec) {
  const total = Math.floor(durationSec * SAMPLE_RATE)
  const samples = new Float32Array(total)
  const freqs = [432, 486, 648]
  const amps = [0.38, 0.22, 0.16]
  const fade = 1.5
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE
    let s = 0
    for (let j = 0; j < freqs.length; j++) {
      s += amps[j] * Math.sin(2 * Math.PI * freqs[j] * t)
    }
    let gain = 1
    if (t < fade) gain = t / fade
    else if (t > durationSec - fade) gain = (durationSec - t) / fade
    samples[i] = s * gain * 0.45
  }
  return samples
}

// Bol tibétain : 4 harmoniques avec decay exponentiel.
function genTibetanBowl(durationSec) {
  const total = Math.floor(durationSec * SAMPLE_RATE)
  const samples = new Float32Array(total)
  const freqs = [432, 648, 864, 1296]
  const amps = [0.55, 0.25, 0.18, 0.1]
  const attack = 0.04
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE
    let s = 0
    for (let j = 0; j < freqs.length; j++) {
      s += amps[j] * Math.sin(2 * Math.PI * freqs[j] * t)
    }
    let env
    if (t < attack) env = t / attack
    else env = Math.exp(-(t - attack) * 1.1)
    samples[i] = s * env * 0.75
  }
  return samples
}

mkdirSync('public/sounds', { recursive: true })
writeWav('public/sounds/432hz-pentatonic.wav', gen432Pentatonic(30))
writeWav('public/sounds/tibetan-bowl.wav', genTibetanBowl(3.5))
console.log('✓ public/sounds/432hz-pentatonic.wav (30s loop)')
console.log('✓ public/sounds/tibetan-bowl.wav (3.5s decay)')
