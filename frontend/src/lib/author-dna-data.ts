export type SentenceDiffMode = 'block' | 'word'

export type MetricSubMetric = {
  label: string
  userValue: string
  textValue: string
  aligned: boolean
}

export type MetricCategory = {
  id: string
  name: string
  score: number
  observation: string
  subMetrics: MetricSubMetric[]
}

export type UserBaseline = {
  name: string
  samplesAnalyzed: number
  wordsProfiled: number
  voiceSummary: string
}

export type SentenceDiffConfig = {
  mode?: SentenceDiffMode
}

export type Tradeoff = {
  gain: string
  loss: string
}

export type AuthorDnaSuggestion = {
  id: string
  category: string
  severity: 'low' | 'medium' | 'high'
  excerpt: string
  paragraphIndex: number
  targetText: string
  observation: string
  tradeoff: Tradeoff
  proposed: string
  proposedPreview?: string
  sentenceDiff?: SentenceDiffConfig
}

export type AuthorDnaDataset = {
  schemaVersion: string
  sampleText?: string
  document: {
    title: string
    paragraphs: string[]
  }
  userBaseline?: UserBaseline
  profile: UserBaseline
  metrics: MetricCategory[]
  suggestions: AuthorDnaSuggestion[]
}

const DATA_URL = '/data/author-dna-dataset.json'
let datasetPromise: Promise<AuthorDnaDataset> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function toParagraphsFromSampleText(value: unknown): string[] {
  if (typeof value !== 'string') {
    return []
  }

  return value
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function toMetricSubMetrics(value: unknown): MetricSubMetric[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return []
    }

    const label = typeof item.label === 'string' ? item.label : ''
    const userValue = typeof item.userValue === 'string' ? item.userValue : ''
    const textValue = typeof item.textValue === 'string' ? item.textValue : ''
    const aligned = typeof item.aligned === 'boolean' ? item.aligned : false

    if (!label || !userValue || !textValue) {
      return []
    }

    return [{ label, userValue, textValue, aligned }]
  })
}

function toMetrics(value: unknown): MetricCategory[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return []
    }

    const id = typeof item.id === 'string' ? item.id : ''
    const name = typeof item.name === 'string' ? item.name : ''
    const observation = typeof item.observation === 'string' ? item.observation : ''
    const score = typeof item.score === 'number' ? item.score : Number.NaN
    const subMetrics = toMetricSubMetrics(item.subMetrics)

    if (!id || !name || !observation || Number.isNaN(score)) {
      return []
    }

    return [{ id, name, score, observation, subMetrics }]
  })
}

function toSuggestions(value: unknown): AuthorDnaSuggestion[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return []
    }

    const id = typeof item.id === 'string' ? item.id : ''
    const category = typeof item.category === 'string' ? item.category : ''
    const severity = item.severity === 'low' || item.severity === 'medium' || item.severity === 'high' ? item.severity : ''
    const excerpt = typeof item.excerpt === 'string' ? item.excerpt : ''
    const targetText = typeof item.targetText === 'string' ? item.targetText : ''
    const observation = typeof item.observation === 'string' ? item.observation : ''
    const proposed = typeof item.proposed === 'string' ? item.proposed : ''
    const proposedPreview = typeof item.proposedPreview === 'string' ? item.proposedPreview : undefined
    const paragraphIndex = typeof item.paragraphIndex === 'number' ? item.paragraphIndex : -1
    const tradeoffRecord = isRecord(item.tradeoff) ? item.tradeoff : null
    const gain = tradeoffRecord && typeof tradeoffRecord.gain === 'string' ? tradeoffRecord.gain : ''
    const loss = tradeoffRecord && typeof tradeoffRecord.loss === 'string' ? tradeoffRecord.loss : ''
    const sentenceDiffRecord = isRecord(item.sentenceDiff) ? item.sentenceDiff : null
    const sentenceDiffMode =
      sentenceDiffRecord && (sentenceDiffRecord.mode === 'block' || sentenceDiffRecord.mode === 'word')
        ? sentenceDiffRecord.mode
        : undefined

    if (!id || !category || !severity || !excerpt || paragraphIndex < 0 || !targetText || !observation || !gain || !loss || !proposed) {
      return []
    }

    return [
      {
        id,
        category,
        severity,
        excerpt,
        paragraphIndex,
        targetText,
        observation,
        tradeoff: { gain, loss },
        proposed,
        proposedPreview,
        sentenceDiff: sentenceDiffMode ? { mode: sentenceDiffMode } : undefined,
      },
    ]
  })
}

export function normalizeAuthorDnaDataset(raw: unknown): AuthorDnaDataset {
  if (!isRecord(raw)) {
    throw new Error('AuthorDNA dataset must be a JSON object')
  }

  const schemaVersion = typeof raw.schemaVersion === 'string' ? raw.schemaVersion : '1.0'
  const sampleText = typeof raw.sampleText === 'string' ? raw.sampleText : undefined
  const documentRecord = isRecord(raw.document) ? raw.document : null
  const baselineRecord = isRecord(raw.userBaseline) ? raw.userBaseline : isRecord(raw.profile) ? raw.profile : null
  const documentTitle = documentRecord && typeof documentRecord.title === 'string' ? documentRecord.title : 'Writing in the age of AI'
  const documentParagraphs =
    documentRecord && toStringArray(documentRecord.paragraphs).length > 0
      ? toStringArray(documentRecord.paragraphs)
      : toParagraphsFromSampleText(sampleText)
  const userBaseline: UserBaseline = {
    name: baselineRecord && typeof baselineRecord.name === 'string' ? baselineRecord.name : 'Unknown',
    samplesAnalyzed: baselineRecord && typeof baselineRecord.samplesAnalyzed === 'number' ? baselineRecord.samplesAnalyzed : 0,
    wordsProfiled: baselineRecord && typeof baselineRecord.wordsProfiled === 'number' ? baselineRecord.wordsProfiled : 0,
    voiceSummary: baselineRecord && typeof baselineRecord.voiceSummary === 'string' ? baselineRecord.voiceSummary : '',
  }

  return {
    schemaVersion,
    sampleText: sampleText ?? documentParagraphs.join('\n\n'),
    document: {
      title: documentTitle,
      paragraphs: documentParagraphs,
    },
    userBaseline,
    profile: userBaseline,
    metrics: toMetrics(raw.metrics),
    suggestions: toSuggestions(raw.suggestions),
  }
}

export async function loadAuthorDnaDataset(): Promise<AuthorDnaDataset> {
  const response = await fetch(DATA_URL)
  if (!response.ok) {
    throw new Error(`Failed to load AuthorDNA dataset (${response.status})`)
  }

  const raw = await response.json()
  return normalizeAuthorDnaDataset(raw)
}

export function getAuthorDnaDataset(): Promise<AuthorDnaDataset> {
  if (!datasetPromise) {
    datasetPromise = loadAuthorDnaDataset()
  }

  return datasetPromise
}