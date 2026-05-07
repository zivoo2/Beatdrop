import MusicTempo from 'music-tempo'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
const TEMPERLEY_MAJOR_PROFILE = [5.0, 2.0, 3.5, 2.0, 4.5, 4.0, 2.0, 4.5, 2.0, 3.5, 1.5, 4.0]
const TEMPERLEY_MINOR_PROFILE = [5.0, 2.0, 3.5, 4.5, 2.0, 4.0, 2.0, 4.5, 3.5, 2.0, 1.5, 4.0]

const AUDIO_CACHE = new WeakMap()
const BPM_SAMPLE_RATE = 11025
const KEY_SAMPLE_RATE = 22050
const MIN_BPM = 70
const MAX_BPM = 180

function createAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) {
    throw new Error('Web Audio is not available in this browser.')
  }

  return new AudioContextClass()
}

function normalizeSamples(samples) {
  const normalized = new Float32Array(samples.length)
  let sum = 0
  for (let i = 0; i < samples.length; i += 1) {
    sum += samples[i]
  }

  const mean = samples.length ? sum / samples.length : 0
  let peak = 0
  for (let i = 0; i < samples.length; i += 1) {
    const centered = samples[i] - mean
    normalized[i] = centered
    peak = Math.max(peak, Math.abs(centered))
  }

  if (!peak) return normalized

  for (let i = 0; i < normalized.length; i += 1) {
    normalized[i] /= peak
  }

  return normalized
}

function mixToMono(audioBuffer) {
  const { numberOfChannels, length } = audioBuffer
  const mono = new Float32Array(length)

  for (let channelIndex = 0; channelIndex < numberOfChannels; channelIndex += 1) {
    const channelData = audioBuffer.getChannelData(channelIndex)
    for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
      mono[sampleIndex] += channelData[sampleIndex]
    }
  }

  const channelScale = numberOfChannels > 0 ? 1 / numberOfChannels : 1
  for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
    mono[sampleIndex] *= channelScale
  }

  return normalizeSamples(mono)
}

async function decodeAudioFile(audioFile) {
  if (AUDIO_CACHE.has(audioFile)) {
    return AUDIO_CACHE.get(audioFile)
  }

  const pendingAnalysis = (async () => {
    const arrayBuffer = await audioFile.arrayBuffer()
    const audioContext = createAudioContext()

    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
      return {
        mono: mixToMono(audioBuffer),
        sampleRate: audioBuffer.sampleRate,
      }
    } finally {
      await audioContext.close().catch(() => {})
    }
  })()

  AUDIO_CACHE.set(audioFile, pendingAnalysis)

  try {
    return await pendingAnalysis
  } catch (error) {
    AUDIO_CACHE.delete(audioFile)
    throw error
  }
}

function resampleLinear(samples, fromRate, toRate) {
  if (!samples.length || fromRate === toRate) {
    return samples.slice()
  }

  const nextLength = Math.max(1, Math.round((samples.length * toRate) / fromRate))
  const resampled = new Float32Array(nextLength)
  const ratio = fromRate / toRate

  for (let i = 0; i < nextLength; i += 1) {
    const sourceIndex = i * ratio
    const leftIndex = Math.floor(sourceIndex)
    const rightIndex = Math.min(leftIndex + 1, samples.length - 1)
    const mix = sourceIndex - leftIndex
    resampled[i] = samples[leftIndex] * (1 - mix) + samples[rightIndex] * mix
  }

  return resampled
}

function computeRms(samples, start = 0, end = samples.length, step = 1) {
  let sumSquares = 0
  let count = 0

  for (let i = start; i < end; i += step) {
    const value = samples[i]
    sumSquares += value * value
    count += 1
  }

  return count ? Math.sqrt(sumSquares / count) : 0
}

function selectAnalysisSegments(samples, sampleRate, { segmentSeconds, maxSegments }) {
  const segmentLength = Math.min(samples.length, Math.max(1, Math.round(segmentSeconds * sampleRate)))
  if (segmentLength >= samples.length) {
    return [samples.slice()]
  }

  const margin = Math.round(samples.length * 0.05)
  const minStart = Math.max(0, margin)
  const maxStart = Math.max(minStart, samples.length - segmentLength - margin)
  const candidateCount = Math.max(maxSegments * 3, 9)
  const candidates = []

  for (let i = 0; i < candidateCount; i += 1) {
    const progress = candidateCount === 1 ? 0 : i / (candidateCount - 1)
    const start = Math.round(minStart + (maxStart - minStart) * progress)
    const end = Math.min(start + segmentLength, samples.length)
    const rms = computeRms(samples, start, end, 128)
    candidates.push({ start, end, rms })
  }

  candidates.sort((a, b) => b.rms - a.rms)

  const selected = []
  const minimumGap = Math.floor(segmentLength * 0.65)

  for (const candidate of candidates) {
    const overlapsExisting = selected.some((segment) => Math.abs(segment.start - candidate.start) < minimumGap)
    if (overlapsExisting) continue
    if (candidate.rms < 0.015 && selected.length > 0) continue

    selected.push(candidate)
    if (selected.length >= maxSegments) break
  }

  if (!selected.length) {
    const fallbackStart = Math.max(0, Math.floor((samples.length - segmentLength) / 2))
    return [samples.slice(fallbackStart, fallbackStart + segmentLength)]
  }

  return selected
    .sort((a, b) => a.start - b.start)
    .map((segment) => samples.slice(segment.start, segment.end))
}

function applyPreEmphasis(samples, coefficient = 0.97) {
  const emphasized = new Float32Array(samples.length)
  if (!samples.length) return emphasized

  emphasized[0] = samples[0]
  for (let i = 1; i < samples.length; i += 1) {
    emphasized[i] = samples[i] - coefficient * samples[i - 1]
  }

  return emphasized
}

function normalizeTempo(tempo) {
  if (!Number.isFinite(tempo) || tempo <= 0) return null

  let normalized = tempo
  while (normalized < MIN_BPM) normalized *= 2
  while (normalized > MAX_BPM) normalized /= 2
  return normalized
}

function clusterTempoCandidates(candidates) {
  if (!candidates.length) return null

  const clusters = []
  const sortedCandidates = [...candidates].sort((a, b) => b.weight - a.weight)

  for (const candidate of sortedCandidates) {
    let bestCluster = null
    let bestDistance = Infinity

    for (const cluster of clusters) {
      const distance = Math.abs(candidate.tempo - cluster.center)
      if (distance <= 2.5 && distance < bestDistance) {
        bestCluster = cluster
        bestDistance = distance
      }
    }

    if (!bestCluster) {
      bestCluster = { weightedTempo: 0, weight: 0, center: candidate.tempo }
      clusters.push(bestCluster)
    }

    bestCluster.weightedTempo += candidate.tempo * candidate.weight
    bestCluster.weight += candidate.weight
    bestCluster.center = bestCluster.weightedTempo / bestCluster.weight
  }

  clusters.sort((a, b) => b.weight - a.weight)
  return clusters[0]?.center ?? null
}

function createHannWindow(size) {
  const window = new Float32Array(size)
  for (let i = 0; i < size; i += 1) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)))
  }
  return window
}

function wrapSemitoneOffset(value) {
  let wrapped = value
  while (wrapped <= -0.5) wrapped += 1
  while (wrapped > 0.5) wrapped -= 1
  return wrapped
}

function fftInPlace(real, imag) {
  const size = real.length
  let j = 0

  for (let i = 1; i < size; i += 1) {
    let bit = size >> 1
    while (j & bit) {
      j ^= bit
      bit >>= 1
    }
    j ^= bit

    if (i < j) {
      const realValue = real[i]
      real[i] = real[j]
      real[j] = realValue

      const imagValue = imag[i]
      imag[i] = imag[j]
      imag[j] = imagValue
    }
  }

  for (let blockSize = 2; blockSize <= size; blockSize <<= 1) {
    const halfSize = blockSize >> 1
    const phaseStep = (-2 * Math.PI) / blockSize

    for (let blockStart = 0; blockStart < size; blockStart += blockSize) {
      for (let k = 0; k < halfSize; k += 1) {
        const angle = phaseStep * k
        const twiddleReal = Math.cos(angle)
        const twiddleImag = Math.sin(angle)
        const evenIndex = blockStart + k
        const oddIndex = evenIndex + halfSize

        const oddReal = twiddleReal * real[oddIndex] - twiddleImag * imag[oddIndex]
        const oddImag = twiddleReal * imag[oddIndex] + twiddleImag * real[oddIndex]

        real[oddIndex] = real[evenIndex] - oddReal
        imag[oddIndex] = imag[evenIndex] - oddImag
        real[evenIndex] += oddReal
        imag[evenIndex] += oddImag
      }
    }
  }
}

function estimateTuningOffset(samples, sampleRate, frameSize) {
  const halfSize = frameSize >> 1
  const window = createHannWindow(frameSize)
  const real = new Float32Array(frameSize)
  const imag = new Float32Array(frameSize)
  const histogramBinCount = 72
  const histogram = Array(histogramBinCount).fill(0)
  const step = Math.max(frameSize, Math.floor((samples.length - frameSize) / 24))

  if (samples.length < frameSize) return 0

  for (let start = 0; start + frameSize <= samples.length; start += step) {
    const frameRms = computeRms(samples, start, start + frameSize, 64)
    if (frameRms < 0.012) continue

    for (let i = 0; i < frameSize; i += 1) {
      real[i] = samples[start + i] * window[i]
      imag[i] = 0
    }

    fftInPlace(real, imag)

    const magnitudes = new Float32Array(halfSize)
    let meanMagnitude = 0
    for (let bin = 1; bin < halfSize; bin += 1) {
      const magnitude = Math.hypot(real[bin], imag[bin])
      magnitudes[bin] = magnitude
      meanMagnitude += magnitude
    }
    meanMagnitude /= Math.max(1, halfSize - 1)

    for (let bin = 2; bin < halfSize - 2; bin += 1) {
      const frequency = (bin * sampleRate) / frameSize
      if (frequency < 60 || frequency > 5000) continue

      const magnitude = magnitudes[bin]
      if (magnitude < meanMagnitude * 2.2) continue
      if (magnitude < magnitudes[bin - 1] || magnitude < magnitudes[bin + 1]) continue

      const midi = 69 + 12 * Math.log2(frequency / 440)
      const nearestMidi = Math.round(midi)
      const detune = wrapSemitoneOffset(midi - nearestMidi)
      const histogramIndex = Math.max(
        0,
        Math.min(histogramBinCount - 1, Math.floor((detune + 0.5) * histogramBinCount)),
      )

      histogram[histogramIndex] += Math.log1p(magnitude)
    }
  }

  let bestIndex = -1
  let bestValue = -Infinity
  for (let i = 0; i < histogram.length; i += 1) {
    if (histogram[i] > bestValue) {
      bestValue = histogram[i]
      bestIndex = i
    }
  }

  if (bestIndex < 0 || bestValue <= 0) return 0

  const binWidth = 1 / histogramBinCount
  return -0.5 + binWidth * (bestIndex + 0.5)
}

function createChromaBinMap(sampleRate, frameSize, tuningOffset = 0) {
  const halfSize = frameSize >> 1
  const binMap = Array(halfSize).fill(null)

  for (let bin = 1; bin < halfSize; bin += 1) {
    const frequency = (bin * sampleRate) / frameSize
    if (frequency < 55 || frequency > 5000) continue

    const midi = 69 + 12 * Math.log2(frequency / 440) - tuningOffset
    let primaryPitchClass = null
    let secondaryPitchClass = null
    let primaryWeight = 0
    let secondaryWeight = 0

    for (const offset of [Math.floor(midi), Math.ceil(midi)]) {
      const distance = Math.abs(midi - offset)
      if (distance > 0.65) continue

      let weight = Math.exp(-8 * distance * distance)
      if (frequency < 90) weight *= 0.65
      if (frequency > 2200) weight *= 0.75

      const pitchClass = ((offset % 12) + 12) % 12
      if (primaryPitchClass === null) {
        primaryPitchClass = pitchClass
        primaryWeight = weight
      } else if (pitchClass !== primaryPitchClass) {
        secondaryPitchClass = pitchClass
        secondaryWeight = weight
      } else {
        primaryWeight += weight
      }
    }

    if (primaryPitchClass === null || primaryWeight <= 0) continue

    binMap[bin] = {
      primaryPitchClass,
      secondaryPitchClass,
      primaryWeight,
      secondaryWeight,
    }
  }

  return binMap
}

function normalizeVector(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const centered = values.map((value) => value - mean)
  const magnitude = Math.sqrt(centered.reduce((sum, value) => sum + value * value, 0))

  if (!magnitude) return centered
  return centered.map((value) => value / magnitude)
}

function rotate(values, shift) {
  return values.map((_, index) => values[(index - shift + values.length) % values.length])
}

function dotProduct(a, b) {
  let sum = 0
  for (let i = 0; i < a.length; i += 1) {
    sum += a[i] * b[i]
  }
  return sum
}

function l1Normalize(values) {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0)
  if (!total) return values.slice()
  return values.map((value) => Math.max(0, value) / total)
}

function getScaleDegreeIndex(root, semitones) {
  return (root + semitones) % 12
}

function getChordSupportScore(chroma, root, mode) {
  const third = mode === 'major' ? 4 : 3
  const opposingThird = mode === 'major' ? 3 : 4
  const tonic = chroma[root]
  const mediant = chroma[getScaleDegreeIndex(root, third)]
  const dominant = chroma[getScaleDegreeIndex(root, 7)]
  const leadingTone = chroma[getScaleDegreeIndex(root, mode === 'major' ? 11 : 10)]
  const subdominant = chroma[getScaleDegreeIndex(root, 5)]
  const penalty = chroma[getScaleDegreeIndex(root, opposingThird)] * 0.85

  return tonic * 1.8 + mediant * 1.35 + dominant * 1.2 + leadingTone * 0.6 + subdominant * 0.4 - penalty
}

function buildTrackChroma(samples, sampleRate, tuningOffset = 0) {
  const frameSize = 16384
  const hopSize = 4096

  if (samples.length < frameSize) return null

  const window = createHannWindow(frameSize)
  const binMap = createChromaBinMap(sampleRate, frameSize, tuningOffset)
  const combinedChroma = Array(12).fill(0)
  const real = new Float32Array(frameSize)
  const imag = new Float32Array(frameSize)
  let totalWeight = 0

  for (let start = 0; start + frameSize <= samples.length; start += hopSize) {
    const frameRms = computeRms(samples, start, start + frameSize, 32)
    if (frameRms < 0.01) continue

    for (let i = 0; i < frameSize; i += 1) {
      real[i] = samples[start + i] * window[i]
      imag[i] = 0
    }

    fftInPlace(real, imag)

    const frameChroma = Array(12).fill(0)
    let frameEnergy = 0
    let magnitudeMean = 0

    for (let bin = 1; bin < binMap.length; bin += 1) {
      magnitudeMean += Math.hypot(real[bin], imag[bin])
    }
    magnitudeMean /= Math.max(1, binMap.length - 1)

    for (let bin = 2; bin < binMap.length - 2; bin += 1) {
      const mapping = binMap[bin]
      if (!mapping) continue

      const magnitude = Math.hypot(real[bin], imag[bin])
      if (!Number.isFinite(magnitude) || magnitude <= 0) continue
      if (magnitude < magnitudeMean * 1.45) continue
      if (magnitude < Math.hypot(real[bin - 1], imag[bin - 1]) || magnitude < Math.hypot(real[bin + 1], imag[bin + 1])) {
        continue
      }

      const weightedEnergy = Math.pow(Math.log1p(magnitude), 1.15)
      const primaryContribution = weightedEnergy * mapping.primaryWeight
      frameChroma[mapping.primaryPitchClass] += primaryContribution
      frameEnergy += primaryContribution

      if (mapping.secondaryPitchClass !== null && mapping.secondaryWeight > 0) {
        const secondaryContribution = weightedEnergy * mapping.secondaryWeight * 0.75
        frameChroma[mapping.secondaryPitchClass] += secondaryContribution
        frameEnergy += secondaryContribution
      }
    }

    if (!frameEnergy) continue

    for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
      combinedChroma[pitchClass] += (frameChroma[pitchClass] / frameEnergy) * frameRms
    }
    totalWeight += frameRms
  }

  if (!totalWeight) return null

  return combinedChroma.map((value) => value / totalWeight)
}

export async function analyzeTempo(audioFile) {
  if (!audioFile) return ''

  const { mono, sampleRate } = await decodeAudioFile(audioFile)
  const analysisSignal = resampleLinear(mono, sampleRate, BPM_SAMPLE_RATE)
  const segments = selectAnalysisSegments(analysisSignal, BPM_SAMPLE_RATE, {
    segmentSeconds: 24,
    maxSegments: 5,
  })

  const candidates = []

  for (const segment of segments) {
    const emphasizedSegment = applyPreEmphasis(segment)
    if (computeRms(emphasizedSegment, 0, emphasizedSegment.length, 128) < 0.01) continue

    try {
      const hopSize = 128
      const tempoAnalyzer = new MusicTempo(emphasizedSegment, {
        bufferSize: 2048,
        hopSize,
        timeStep: hopSize / BPM_SAMPLE_RATE,
        peakThreshold: 0.22,
        maxTempos: 10,
        minBeatInterval: 60 / 200,
        maxBeatInterval: 60 / 70,
        initPeriod: Math.min(8, emphasizedSegment.length / BPM_SAMPLE_RATE),
        expiryTime: 8,
      })

      const tempo = normalizeTempo(Number(tempoAnalyzer.tempo))
      if (!tempo) continue

      const beatCount = tempoAnalyzer.beats?.length ?? tempoAnalyzer.bestAgent?.events?.length ?? 0
      const agentScore = tempoAnalyzer.bestAgent?.score ?? 1
      const weight = Math.max(1, agentScore) * Math.max(1, beatCount)
      candidates.push({ tempo, weight })
    } catch {
      // Skip noisy segments that fail tempo extraction and keep the other candidates.
    }
  }

  const winningTempo = clusterTempoCandidates(candidates)
  return winningTempo ? Math.round(winningTempo) : ''
}

export async function analyzeMusicalKey(audioFile) {
  if (!audioFile) return 'Unknown'

  const { mono, sampleRate } = await decodeAudioFile(audioFile)
  const analysisSignal = resampleLinear(mono, sampleRate, KEY_SAMPLE_RATE)
  const tuningOffset = estimateTuningOffset(analysisSignal, KEY_SAMPLE_RATE, 16384)
  const segments = selectAnalysisSegments(analysisSignal, KEY_SAMPLE_RATE, {
    segmentSeconds: 16,
    maxSegments: 5,
  })

  const combinedChroma = Array(12).fill(0)
  let totalWeight = 0

  for (const segment of segments) {
    const chroma = buildTrackChroma(segment, KEY_SAMPLE_RATE, tuningOffset)
    if (!chroma) continue

    const weight = Math.max(0.01, computeRms(segment, 0, segment.length, 256))
    for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
      combinedChroma[pitchClass] += chroma[pitchClass] * weight
    }
    totalWeight += weight
  }

  if (!totalWeight) return 'Unknown'

  const chromaFingerprint = l1Normalize(combinedChroma.map((value) => value / totalWeight))
  const normalizedChroma = normalizeVector(chromaFingerprint)
  const normalizedMajorProfile = normalizeVector(MAJOR_PROFILE)
  const normalizedMinorProfile = normalizeVector(MINOR_PROFILE)
  const normalizedTemperleyMajorProfile = normalizeVector(TEMPERLEY_MAJOR_PROFILE)
  const normalizedTemperleyMinorProfile = normalizeVector(TEMPERLEY_MINOR_PROFILE)
  let bestLabel = 'Unknown'
  let bestScore = -Infinity
  let secondBestScore = -Infinity

  for (let root = 0; root < 12; root += 1) {
    const majorProfileScore =
      dotProduct(normalizedChroma, rotate(normalizedMajorProfile, root)) * 0.6 +
      dotProduct(normalizedChroma, rotate(normalizedTemperleyMajorProfile, root)) * 0.4
    const majorScore = majorProfileScore + getChordSupportScore(chromaFingerprint, root, 'major') * 0.28
    if (majorScore > bestScore) {
      secondBestScore = bestScore
      bestScore = majorScore
      bestLabel = `${NOTE_NAMES[root]} Major`
    } else if (majorScore > secondBestScore) {
      secondBestScore = majorScore
    }

    const minorProfileScore =
      dotProduct(normalizedChroma, rotate(normalizedMinorProfile, root)) * 0.6 +
      dotProduct(normalizedChroma, rotate(normalizedTemperleyMinorProfile, root)) * 0.4
    const minorScore = minorProfileScore + getChordSupportScore(chromaFingerprint, root, 'minor') * 0.28
    if (minorScore > bestScore) {
      secondBestScore = bestScore
      bestScore = minorScore
      bestLabel = `${NOTE_NAMES[root]} Minor`
    } else if (minorScore > secondBestScore) {
      secondBestScore = minorScore
    }
  }

  if (!Number.isFinite(bestScore) || bestScore < 0.2) {
    return 'Unknown'
  }

  if (bestScore - secondBestScore < 0.04 && bestScore < 0.35) {
    return 'Unknown'
  }

  return bestLabel
}
