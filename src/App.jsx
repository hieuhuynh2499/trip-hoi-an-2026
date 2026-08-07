import { useEffect, useState } from 'react'
import './App.css'
import { getNextUnpromptedHintMilestone } from './hintMilestones'
import { questionImageAssets } from './questionImageAssets'

const topics = ['Thể thao', 'Lịch sử', 'Giải trí', 'Âm nhạc']
const genericQuestionIcons = ['✦', '◆', '✦', '◆', '✦', '◆', '✦', '◆', '✦', '◆', '✦', '◆']
const QUESTION_TYPE_SINGLE = 'single'
const QUESTION_TYPE_MULTIPLE = 'multiple'
const MULTIPLE_CHOICE_COUNT = 4
const STANDARD_HINT_COUNT = 3
const SPECIAL_HINT_INDEX = 3
const DEFAULT_HINT_THRESHOLD = 3
const GAME_STORAGE_KEY = 'trip-hoi-an-2026-game-state-v1'
const choiceLetters = ['A', 'B', 'C', 'D']
const questionTypeLabels = {
  [QUESTION_TYPE_SINGLE]: 'Một đáp án',
  [QUESTION_TYPE_MULTIPLE]: 'Trắc nghiệm',
}
const DEFAULT_OVERALL_QUESTION = 'Center 3 đã bước sang năm thứ 2. Trong kỷ nguyên AI, nếu chỉ đứng yên và chờ đợi, chúng ta rất dễ bỏ lỡ những cơ hội mới. Theo bạn, câu tục ngữ nào của người Việt diễn tả đúng nhất điều đó?'
const ULTIMATE_ANSWER = 'Trâu chậm uống nước đục'
const DEFAULT_HINT_TEXTS = ['Một câu tục ngữ gồm 5 chữ', 'Câu tục ngữ nói về tốc độ quyết định cơ hội', 'Mở đầu bằng con giáp đứng thứ hai trong 12 con giáp.', 'T_ _ _  C_ậ_  U_ _g  N_ _c  Đ_c']
const LEGACY_SPECIAL_HINT_TEXTS = ['Gợi ý đặc biệt', 'T_ _ _ c_ _m  u_ _g   n_ _c _ _c', 'T_ _ _  C_ậ_  *U* _ _ *g  N* _ _ c   Đ _ c']
const UPDATED_FISHING_QUESTION = 'Trên nhấp dưới giật là đang làm gì?'
const UPDATED_DEPUTY_QUESTION = 'Trưởng BVH C3 hiện tại là Tùng Quân. Vậy phó BVH C3 hiện tại là ai?'
const UPDATED_SLEEPY_LEAF_QUESTION = 'Lá gì luôn ngủ rất say'
const UPDATED_CANDY_QUESTION = 'Như bạn biết, 5 chia cho 5 thì bằng 1. Nếu bạn Tí có 5 cục kẹo chia đều cho 5 người bạn của mình, thì bạn Tí còn mấy cục kẹo?'

const cleanText = (value) => String(value ?? '').trim()
const isExternalAssetUrl = (value) => /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i.test(cleanText(value))
const getPublicAssetUrl = (value) => {
  const source = cleanText(value)
  if (!source) return ''
  if (isExternalAssetUrl(source)) return source

  const basePath = import.meta.env.BASE_URL || '/'
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`
  if (normalizedBasePath !== '/' && source.startsWith(normalizedBasePath)) return source

  const trimmedSource = source.replace(/^\/+/, '')
  if (normalizedBasePath !== '/' && trimmedSource.startsWith(normalizedBasePath.slice(1))) return `/${trimmedSource}`
  return `${normalizedBasePath}${trimmedSource}`
}
const normalizePublicAssetPath = (value) => {
  const source = cleanText(value)
  if (!source || isExternalAssetUrl(source)) return ''

  const basePath = import.meta.env.BASE_URL || '/'
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`
  const trimmedSource = source.replace(/^\/+/, '')
  const trimmedBasePath = normalizedBasePath.replace(/^\/+|\/+$/g, '')
  if (trimmedBasePath && trimmedSource.startsWith(`${trimmedBasePath}/`)) {
    return `/${trimmedSource.slice(trimmedBasePath.length + 1)}`
  }
  return `/${trimmedSource}`
}
const getQuestionImageAssetValue = (asset) => cleanText(asset?.value || asset?.imagePath)
const getQuestionImageAsset = (value) => {
  const normalizedPath = normalizePublicAssetPath(value)
  if (!normalizedPath) return null
  return questionImageAssets.find((asset) => (
    [asset.value, asset.imagePath].some((assetValue) => normalizePublicAssetPath(assetValue) === normalizedPath)
  )) || null
}
const getQuestionImageAssetById = (id) => questionImageAssets.find((asset) => asset.id === id) || null
const getQuestionImagePatch = (value) => {
  const imageUrl = cleanText(value)
  const imageAsset = getQuestionImageAsset(imageUrl)
  if (imageAsset) {
    return {
      imagePath: imageAsset.imagePath,
      imageUrl: imageUrl || getQuestionImageAssetValue(imageAsset),
    }
  }

  return {
    imagePath: normalizePublicAssetPath(imageUrl),
    imageUrl,
  }
}
const getQuestionImageSrc = (item) => {
  const imageAsset = getQuestionImageAsset(item?.imageUrl || item?.imagePath)
  return getPublicAssetUrl(imageAsset?.imagePath || item?.imagePath || item?.imageUrl)
}
const foldVietnameseText = (value) => cleanText(value)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
const normalizeForCompare = (value) => foldVietnameseText(value)
const normalizeHeaderName = (value) => foldVietnameseText(value).replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')

const normalizeChoices = (choices = [], fallbackAnswer = '') => {
  const normalized = Array.from({ length: MULTIPLE_CHOICE_COUNT }, (_, index) => cleanText(choices[index]))
  if (!normalized.some(Boolean) && fallbackAnswer) normalized[0] = cleanText(fallbackAnswer)
  return normalized
}

const normalizeCorrectChoiceIndex = (index) => {
  const numericIndex = Number(index)
  return Number.isInteger(numericIndex) && numericIndex >= 0 && numericIndex < MULTIPLE_CHOICE_COUNT ? numericIndex : 0
}

const parseQuestionType = (value, fallback = QUESTION_TYPE_SINGLE) => {
  const normalized = normalizeHeaderName(value)
  if (!normalized) return fallback
  if (['multiple', 'multiplechoice', 'mcq', 'tracnghiem'].includes(normalized)) return QUESTION_TYPE_MULTIPLE
  return QUESTION_TYPE_SINGLE
}

const parseCorrectChoiceIndex = (value, choices, fallbackIndex = 0) => {
  const normalized = normalizeForCompare(value)
  const numericChoice = Number(normalized)
  if (Number.isInteger(numericChoice) && numericChoice >= 1 && numericChoice <= MULTIPLE_CHOICE_COUNT) return numericChoice - 1
  const letterIndex = choiceLetters.findIndex((letter) => letter.toLowerCase() === normalized)
  if (letterIndex >= 0) return letterIndex
  const matchingIndex = choices.findIndex((choice) => normalizeForCompare(choice) === normalized)
  return matchingIndex >= 0 ? matchingIndex : normalizeCorrectChoiceIndex(fallbackIndex)
}

const getQuestionAnswer = (item) => {
  if (item.questionType !== QUESTION_TYPE_MULTIPLE) return cleanText(item.label)
  const choices = normalizeChoices(item.choices, item.label)
  return choices[normalizeCorrectChoiceIndex(item.correctChoiceIndex)] || cleanText(item.label)
}

const createQuestion = ({ question, label, imagePath, imageUrl, detail, icon, questionType = QUESTION_TYPE_SINGLE, choices, correctChoiceIndex = 0 }) => {
  const normalizedQuestionType = questionType === QUESTION_TYPE_MULTIPLE ? QUESTION_TYPE_MULTIPLE : QUESTION_TYPE_SINGLE
  const normalizedChoices = normalizeChoices(choices, label)
  const normalizedCorrectChoiceIndex = normalizeCorrectChoiceIndex(correctChoiceIndex)
  const answer = normalizedQuestionType === QUESTION_TYPE_MULTIPLE ? normalizedChoices[normalizedCorrectChoiceIndex] || cleanText(label) : cleanText(label)
  const normalizedImageUrl = cleanText(imageUrl || imagePath)
  const normalizedImagePath = cleanText(imagePath) || normalizePublicAssetPath(normalizedImageUrl)
  return {
    question,
    label: answer,
    imagePath: normalizedImagePath,
    imageUrl: normalizedImageUrl,
    detail,
    icon,
    questionType: normalizedQuestionType,
    choices: normalizedChoices,
    correctChoiceIndex: normalizedCorrectChoiceIndex,
  }
}

const csvCell = (value) => {
  const text = String(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const defaultQuestions = [
  ['Hóa học dạy ta điều gì về tình yêu?', 'Không phải chất nào trộn vào cũng hợp.', 'cau-15'],
  [UPDATED_FISHING_QUESTION, 'Câu cá', 'cau-1'],
  ['Với con người, thời điểm tốt nhất để đi ngủ là khi nào?', 'Khi buồn ngủ.', 'cau-2'],
  ['Khi nhắc đến cối xay gió, người ta thường nghĩ đến đất nước nào?', 'Hà Lan.', 'cau-3'],
  ['Tổng số tuổi của HEAD + 4 SDM nhà mình là bao nhiêu?', '187 tuổi.', 'cau-4'],
  [UPDATED_DEPUTY_QUESTION, 'Không có', 'cau-5'],
  ['Giao gì khiến chúng ta lo lắng?', 'Giao trứng cho ác.', 'cau-6'],
  [UPDATED_SLEEPY_LEAF_QUESTION, 'Lá mơ', 'cau-7'],
  ['Điểm gì ăn được?', 'Điểm tâm.', 'cau-8'],
  ['Cái gì đánh cha, đánh má, đánh anh, đánh chị, đánh em?', 'Bàn chải đánh răng.', 'cau-11'],
  [UPDATED_CANDY_QUESTION, 'Không còn cục nào', 'cau-9'],
  ['Làm gì mà không phát ra tiếng?', 'Làm thinh.', 'cau-10'],
]

const createDefaultQuestionData = () => defaultQuestions.map(([question, label, imageAssetId], index) => {
  const imageAsset = getQuestionImageAssetById(imageAssetId)
  const imagePath = imageAsset?.imagePath || ''
  const imageUrl = getQuestionImageAssetValue(imageAsset)
  return createQuestion({
    question,
    label,
    imagePath,
    imageUrl,
    detail: topics[Math.floor(index / 3)] || 'Câu hỏi',
    icon: genericQuestionIcons[index],
  })
})

const createEmptyQuestion = (index, questionType = QUESTION_TYPE_SINGLE) => createQuestion({
  question: '',
  label: '',
  imagePath: '',
  imageUrl: '',
  detail: '',
  icon: genericQuestionIcons[index],
  questionType: questionType === QUESTION_TYPE_MULTIPLE ? QUESTION_TYPE_MULTIPLE : QUESTION_TYPE_SINGLE,
  choices: Array(MULTIPLE_CHOICE_COUNT).fill(''),
  correctChoiceIndex: 0,
})

const defaultSideQuestions = [
  { question: 'Hóa học dạy ta điều gì về tình yêu?', answer: 'Không phải chất nào trộn vào cũng hợp.' },
  { question: UPDATED_FISHING_QUESTION, answer: 'Câu cá' },
  { question: 'Với con người, thời điểm tốt nhất để đi ngủ là khi nào?', answer: 'Khi buồn ngủ.' },
  { question: 'Khi nhắc đến cối xay gió, người ta thường nghĩ đến đất nước nào?', answer: 'Hà Lan.' },
  { question: 'Tổng số tuổi của HEAD + 4 SDM nhà mình là bao nhiêu?', answer: '187 tuổi.' },
  { question: UPDATED_DEPUTY_QUESTION, answer: 'Không có' },
  { question: 'Giao gì khiến chúng ta lo lắng?', answer: 'Giao trứng cho ác.' },
  { question: UPDATED_SLEEPY_LEAF_QUESTION, answer: 'Lá mơ' },
  { question: 'Điểm gì ăn được?', answer: 'Điểm tâm.' },
  { question: 'Cái gì đánh cha, đánh má, đánh anh, đánh chị, đánh em?', answer: 'Bàn chải đánh răng.' },
  { question: UPDATED_CANDY_QUESTION, answer: 'Không còn cục nào' },
  { question: 'Làm gì mà không phát ra tiếng?', answer: 'Làm thinh.' },
]

const normalizeSideQuestion = ({ question, answer }) => ({
  question: cleanText(question),
  answer: cleanText(answer),
})

const parseCsv = (text) => {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1 } else quoted = !quoted
    } else if (character === ',' && !quoted) { row.push(cell.trim()); cell = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []; cell = ''
    } else cell += character
  }
  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

const normalizeSavedQuestionData = (value) => {
  const fallbackQuestions = createDefaultQuestionData()
  if (!Array.isArray(value) || value.length !== fallbackQuestions.length) return fallbackQuestions

  return fallbackQuestions.map((fallback, index) => {
    const saved = value[index] || {}
    if (index === 9 && saved.question === 'Thứ gì càng gần deadline càng chạy nhanh?') {
      saved.question = fallback.question
      saved.label = fallback.label
    }
    if (index === 1 && saved.question === 'Sở thú bị cháy, đố bạn con gì chạy ra đầu tiên?') {
      saved.question = fallback.question
      saved.label = fallback.label
    }
    if (index === 5 && [
      'Trưởng phòng C3 hiện tại là Tùng. Vậy phó trưởng BVH C3 hiện tại là ai?',
      'Trưởng BVH C3 hiện tại là Tùng Quân. Vậy phó trưởng BVH C3 hiện tại là ai?',
    ].includes(saved.question)) {
      saved.question = fallback.question
      saved.label = fallback.label
    }
    if (index === 7 && saved.question === 'Lá gì luôn ngửi rất say?') {
      saved.question = fallback.question
      saved.label = fallback.label
    }
    if (index === 10 && saved.question === 'Nếu bạn Tí có 5 cục kẹo chia đều cho 5 người bạn của mình, thì bạn Tí còn mấy cục kẹo?') {
      saved.question = fallback.question
      saved.label = fallback.label
    }
    const savedImageValue = Object.hasOwn(saved, 'imageUrl')
      ? saved.imageUrl
      : Object.hasOwn(saved, 'imagePath') ? saved.imagePath : fallback.imageUrl
    const imagePatch = getQuestionImagePatch(index === 0 && normalizePublicAssetPath(savedImageValue) === '/images/hoa-hoc-tinh-yeu.png'
      ? 'src/assets/cau-15.png'
      : savedImageValue)
    return createQuestion({
      ...fallback,
      ...saved,
      ...imagePatch,
      icon: saved.icon || fallback.icon,
    })
  })
}

const normalizeSavedIndexArray = (value, max) => {
  if (!Array.isArray(value)) return []
  return [...new Set(value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0 && item < max))]
}

const normalizeSavedResultMap = (value, max) => {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(Object.entries(value).filter(([key, result]) => {
    const index = Number(key)
    return Number.isInteger(index) && index >= 0 && index < max && ['green', 'red', 'wrong'].includes(result)
  }))
}

const normalizeSavedBooleanMap = (value) => {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(Object.entries(value).filter(([, enabled]) => Boolean(enabled)).map(([key]) => [key, true]))
}

const normalizeSavedTeam = (value) => (['green', 'red'].includes(value) ? value : null)

const normalizeSavedSideQuestions = (value) => {
  if (!Array.isArray(value)) return defaultSideQuestions
  const normalized = value.map(normalizeSideQuestion).filter((item) => item.question && item.answer)
  const oldQuestionIndex = normalized.findIndex((item) => item.question === 'Thứ gì càng gần deadline càng chạy nhanh?')
  if (oldQuestionIndex >= 0) normalized[oldQuestionIndex] = defaultSideQuestions[9]
  const zooQuestionIndex = normalized.findIndex((item) => item.question === 'Sở thú bị cháy, đố bạn con gì chạy ra đầu tiên?')
  if (zooQuestionIndex >= 0) normalized[zooQuestionIndex] = defaultSideQuestions[1]
  const oldDeputyQuestionIndex = normalized.findIndex((item) => item.question === 'Trưởng phòng C3 hiện tại là Tùng. Vậy phó trưởng BVH C3 hiện tại là ai?')
  if (oldDeputyQuestionIndex >= 0) normalized[oldDeputyQuestionIndex] = defaultSideQuestions[5]
  const recentDeputyQuestionIndex = normalized.findIndex((item) => item.question === 'Trưởng BVH C3 hiện tại là Tùng Quân. Vậy phó trưởng BVH C3 hiện tại là ai?')
  if (recentDeputyQuestionIndex >= 0) normalized[recentDeputyQuestionIndex] = defaultSideQuestions[5]
  const sleepyLeafQuestionIndex = normalized.findIndex((item) => item.question === 'Lá gì luôn ngửi rất say?')
  if (sleepyLeafQuestionIndex >= 0) normalized[sleepyLeafQuestionIndex] = defaultSideQuestions[7]
  const shortCandyQuestionIndex = normalized.findIndex((item) => item.question === 'Nếu bạn Tí có 5 cục kẹo chia đều cho 5 người bạn của mình, thì bạn Tí còn mấy cục kẹo?')
  if (shortCandyQuestionIndex >= 0) normalized[shortCandyQuestionIndex] = defaultSideQuestions[10]
  return normalized.length ? normalized : defaultSideQuestions
}

const normalizeSavedGameState = (value) => {
  if (!value || typeof value !== 'object') return null
  const questionData = normalizeSavedQuestionData(value.questionData)
  const hintTexts = Array.isArray(value.hintTexts)
    ? DEFAULT_HINT_TEXTS.map((fallback, index) => cleanText(value.hintTexts[index]) || fallback)
    : DEFAULT_HINT_TEXTS
  if (LEGACY_SPECIAL_HINT_TEXTS.includes(hintTexts[SPECIAL_HINT_INDEX])) hintTexts[SPECIAL_HINT_INDEX] = DEFAULT_HINT_TEXTS[SPECIAL_HINT_INDEX]
  const savedHintThreshold = Math.max(1, Number(value.hintThreshold) || DEFAULT_HINT_THRESHOLD)
  const hintThreshold = value.hintThresholdDefaultMigrated === true
    ? savedHintThreshold
    : savedHintThreshold === 2 ? DEFAULT_HINT_THRESHOLD : savedHintThreshold

  return {
    questionData,
    overallQuestion: cleanText(value.overallQuestion) || DEFAULT_OVERALL_QUESTION,
    hintTexts,
    results: normalizeSavedResultMap(value.results, questionData.length),
    openedHints: normalizeSavedIndexArray(value.openedHints, DEFAULT_HINT_TEXTS.length),
    sideQuestions: normalizeSavedSideQuestions(value.sideQuestions),
    revealedMainAnswer: false,
    revealedSideAnswer: false,
    promptedMilestones: normalizeSavedBooleanMap(value.promptedMilestones),
    viewHint: null,
    winner: normalizeSavedTeam(value.winner),
    winnerModal: false,
    celebratingWinner: null,
    countdownPaused: value.countdownPaused === true,
    countdownDuration: Math.max(1, Number(value.countdownDuration) || 20),
    countdown: Number.isFinite(Number(value.countdown)) ? Math.max(0, Number(value.countdown)) : null,
    hintThreshold,
    hintThresholdDefaultMigrated: true,
    winningScoreEnabled: value.winningScoreEnabled === true,
    winningScore: Math.max(1, Number(value.winningScore) || 6),
    selected: null,
    selectedChoiceIndex: null,
  }
}

const loadSavedGameState = () => {
  try {
    if (typeof window === 'undefined') return null
    const rawState = window.localStorage.getItem(GAME_STORAGE_KEY)
    if (!rawState) return null
    const parsedState = JSON.parse(rawState)
    return normalizeSavedGameState(parsedState)
  } catch {
    return null
  }
}

const saveGameState = (state) => {
  try {
    window.localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage failures so gameplay never crashes in private mode or quota limits.
  }
}

function App() {
  const [savedGameState] = useState(loadSavedGameState)
  const [questionData, setQuestionData] = useState(() => savedGameState?.questionData || createDefaultQuestionData())
  const [overallQuestion, setOverallQuestion] = useState(() => savedGameState?.overallQuestion || DEFAULT_OVERALL_QUESTION)
  const [hintTexts, setHintTexts] = useState(() => savedGameState?.hintTexts || DEFAULT_HINT_TEXTS)
  const [isEditor, setIsEditor] = useState(false)
  const [clearQuestionsConfirm, setClearQuestionsConfirm] = useState(false)
  const [results, setResults] = useState(() => savedGameState?.results || {})
  const [selected, setSelected] = useState(() => savedGameState?.selected ?? null)
  const [openedHints, setOpenedHints] = useState(() => savedGameState?.openedHints || [])
  const [hintPrompt, setHintPrompt] = useState(null)
  const [sideQuestions, setSideQuestions] = useState(() => savedGameState?.sideQuestions || defaultSideQuestions)
  const [, setUsedSideQuestionIndexes] = useState([])
  const [revealedMainAnswer, setRevealedMainAnswer] = useState(() => savedGameState?.revealedMainAnswer || false)
  const [revealedSideAnswer, setRevealedSideAnswer] = useState(() => savedGameState?.revealedSideAnswer || false)
  const [promptedMilestones, setPromptedMilestones] = useState(() => savedGameState?.promptedMilestones || {})
  const [viewHint, setViewHint] = useState(null)
  const [winner, setWinner] = useState(() => savedGameState?.winner || null)
  const [winnerModal, setWinnerModal] = useState(() => savedGameState?.winnerModal || false)
  const [celebratingWinner, setCelebratingWinner] = useState(() => savedGameState?.celebratingWinner || null)
  const [countdownPaused, setCountdownPaused] = useState(() => savedGameState?.countdownPaused || false)
  const [countdownDuration, setCountdownDuration] = useState(() => savedGameState?.countdownDuration || 20)
  const [countdown, setCountdown] = useState(() => savedGameState?.countdown ?? null)
  const [hintThreshold, setHintThreshold] = useState(() => savedGameState?.hintThreshold || DEFAULT_HINT_THRESHOLD)
  const [winningScoreEnabled, setWinningScoreEnabled] = useState(() => savedGameState?.winningScoreEnabled || false)
  const [winningScore, setWinningScore] = useState(() => savedGameState?.winningScore || 6)
  const [importMessage, setImportMessage] = useState('')
  const [sideImportMessage, setSideImportMessage] = useState('')
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState(() => savedGameState?.selectedChoiceIndex ?? null)
  const [expandedImagePickerIndex, setExpandedImagePickerIndex] = useState(null)
  const greenScore = Object.values(results).filter((result) => result === 'green').length
  const redScore = Object.values(results).filter((result) => result === 'red').length
  const revealedCount = Object.values(results).filter((result) => result === 'green' || result === 'red').length
  const hasAvailableStandardHints = Array.from({ length: STANDARD_HINT_COUNT }, (_, index) => index).some((index) => !openedHints.includes(index))
  const isSpecialHintOpen = openedHints.includes(SPECIAL_HINT_INDEX)
  const visibleHintIndexes = Array.from({ length: STANDARD_HINT_COUNT }, (_, index) => index)
  if (isSpecialHintOpen) visibleHintIndexes.push(SPECIAL_HINT_INDEX)

  useEffect(() => {
    if (countdown === null || countdown <= 0 || countdownPaused) return undefined
    const timer = window.setTimeout(() => setCountdown((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown, countdownPaused])

  useEffect(() => {
    saveGameState({
      questionData,
      overallQuestion,
      hintTexts,
      results,
      selected,
      openedHints,
      sideQuestions,
      revealedMainAnswer,
      revealedSideAnswer,
      promptedMilestones,
      winner,
      winnerModal,
      celebratingWinner,
      countdownPaused,
      countdownDuration,
      countdown,
      hintThreshold,
      hintThresholdDefaultMigrated: true,
      winningScoreEnabled,
      winningScore,
      selectedChoiceIndex,
    })
  }, [
    questionData,
    overallQuestion,
    hintTexts,
    results,
    selected,
    openedHints,
    sideQuestions,
    revealedMainAnswer,
    revealedSideAnswer,
    promptedMilestones,
    winner,
    winnerModal,
    celebratingWinner,
    countdownPaused,
    countdownDuration,
    countdown,
    hintThreshold,
    winningScoreEnabled,
    winningScore,
    selectedChoiceIndex,
  ])

  const closeHintPrompt = () => {
    setHintPrompt(null)
    setRevealedSideAnswer(false)
  }

  const openNextStandardHint = () => {
    const hintIndex = Array.from({ length: STANDARD_HINT_COUNT }, (_, index) => index).find((index) => !openedHints.includes(index))
    if (!Number.isInteger(hintIndex)) return
    setOpenedHints((current) => (current.includes(hintIndex) ? current : [...current, hintIndex]))
  }

  const openSpecialHint = () => {
    setOpenedHints((current) => (current.includes(SPECIAL_HINT_INDEX) ? current : [...current, SPECIAL_HINT_INDEX]))
  }

  const resetGameProgress = () => {
    setResults({})
    setSelected(null)
    setOpenedHints([])
    setHintPrompt(null)
    setUsedSideQuestionIndexes([])
    setRevealedMainAnswer(false)
    setRevealedSideAnswer(false)
    setPromptedMilestones({})
    setViewHint(null)
    setWinner(null)
    setWinnerModal(false)
    setCelebratingWinner(null)
    setCountdown(null)
    setCountdownPaused(false)
    setSelectedChoiceIndex(null)
    setExpandedImagePickerIndex(null)
    setClearQuestionsConfirm(false)
  }

  const finishSideQuestion = (winningTeam) => {
    if (!hintPrompt) return
    if (winningTeam !== 'green' && winningTeam !== 'red') return
    setUsedSideQuestionIndexes((current) => (
      current.includes(hintPrompt.sideQuestionIndex) ? current : [...current, hintPrompt.sideQuestionIndex]
    ))
    setRevealedSideAnswer(false)
    setHintPrompt({ ...hintPrompt, team: winningTeam, sideQuestionCleared: true })
  }

  const openMainQuestion = (index) => {
    setSelected(index)
    setSelectedChoiceIndex(null)
    setRevealedMainAnswer(false)
  }

  const closeMainQuestion = () => {
    setSelected(null)
    setSelectedChoiceIndex(null)
    setRevealedMainAnswer(false)
  }

  const stopModalClick = (event) => {
    event.stopPropagation()
  }

  const closeWinnerModal = () => {
    setWinnerModal(false)
    setCountdown(null)
    setCountdownPaused(false)
    setCelebratingWinner(null)
  }

  const markAnswer = (result) => {
    setResults({ ...results, [selected]: result })
    closeMainQuestion()
    if (result === 'green' || result === 'red') {
      const currentTeamScore = Object.values(results).filter((value) => value === result).length
      const nextTeamScore = currentTeamScore + 1
      if (winningScoreEnabled && nextTeamScore >= winningScore) {
        setWinner(result)
        setCelebratingWinner(result)
        return
      }
      const currentTotalScore = Object.values(results).filter((value) => value === 'green' || value === 'red').length
      const nextTotalScore = currentTotalScore + 1
      const hintMilestone = getNextUnpromptedHintMilestone({
        totalScore: nextTotalScore,
        hintThreshold,
        promptedMilestones,
      })
      if (hintMilestone !== null && hasAvailableStandardHints) {
        setPromptedMilestones({ ...promptedMilestones, [hintMilestone]: true })
        openNextStandardHint()
      }
    }
  }

  const updateQuestion = (index, patch) => {
    setQuestionData((current) => current.map((item, itemIndex) => (
      itemIndex === index ? createQuestion({ ...item, ...patch }) : item
    )))
  }

  const toggleImagePicker = (index) => {
    setExpandedImagePickerIndex((current) => (current === index ? null : index))
  }

  const chooseQuestionImage = (index, imagePath) => {
    const imageAsset = getQuestionImageAsset(imagePath)
    updateQuestion(index, imagePath ? {
      imagePath,
      imageUrl: getQuestionImageAssetValue(imageAsset) || imagePath,
    } : getQuestionImagePatch(''))
    setExpandedImagePickerIndex(null)
  }

  const updateQuestionChoice = (questionIndex, choiceIndex, choice) => {
    setQuestionData((current) => current.map((item, itemIndex) => {
      if (itemIndex !== questionIndex) return item
      const choices = normalizeChoices(item.choices, item.label).map((value, index) => (index === choiceIndex ? choice : value))
      return createQuestion({ ...item, choices })
    }))
  }

  const clearMainQuestions = () => {
    setQuestionData((current) => current.map((item, index) => createEmptyQuestion(index, item.questionType)))
    setResults({})
    closeMainQuestion()
    setWinner(null)
    setWinnerModal(false)
    setCelebratingWinner(null)
    setCountdown(null)
    setCountdownPaused(false)
    setPromptedMilestones({})
    setClearQuestionsConfirm(false)
    setImportMessage('Đã xóa nội dung 12 câu hỏi chính. Có thể phục hồi bằng cách import CSV.')
  }

  const exportQuestions = () => {
    const headers = ['number', 'topic', 'type', 'question', 'answer', 'correctChoice', 'choiceA', 'choiceB', 'choiceC', 'choiceD', 'imageUrl', 'detail']
    const rows = questionData.map((item, index) => {
      const choices = normalizeChoices(item.choices, item.label)
      const questionType = item.questionType === QUESTION_TYPE_MULTIPLE ? QUESTION_TYPE_MULTIPLE : QUESTION_TYPE_SINGLE
      return [
        index + 1,
        topics[Math.floor(index / 3)] || '',
        questionTypeLabels[questionType],
        item.question,
        getQuestionAnswer(item),
        questionType === QUESTION_TYPE_MULTIPLE ? choiceLetters[normalizeCorrectChoiceIndex(item.correctChoiceIndex)] : '',
        ...choices,
        item.imageUrl,
        item.detail,
      ]
    })
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'trip-2026-questions.csv'
    link.click()
    window.URL.revokeObjectURL(url)
    setImportMessage('Đã xuất file CSV có đủ dữ liệu trắc nghiệm.')
  }

  const importQuestions = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const rows = parseCsv(String(reader.result || ''))
      const header = rows.shift()?.map(normalizeHeaderName) || []
      const column = (names, fallback) => {
        const position = header.findIndex((name) => names.includes(name))
        return position >= 0 ? position : fallback
      }
      const numberColumn = column(['number', 'stt', 'id', 'cau'], -1)
      const topicColumn = column(['topic', 'chude'], 0)
      const questionColumn = column(['question', 'cauhoi'], 1)
      const answerColumn = column(['answer', 'dapan'], 2)
      const imageColumn = column(['imageurl', 'imagepath', 'image', 'urlhinh', 'duongdananh'], 3)
      const detailColumn = column(['detail', 'mota'], 4)
      const typeColumn = column(['type', 'questiontype', 'loai', 'loaicauhoi'], -1)
      const choicesColumn = column(['choices', 'options', 'luachon', 'phuongan'], -1)
      const correctColumn = column(['correctchoice', 'correctanswer', 'correct', 'dapandung', 'luachondung'], -1)
      const choiceColumns = choiceLetters.map((letter, index) => column([
        `choice${letter.toLowerCase()}`,
        `option${letter.toLowerCase()}`,
        `choice${index + 1}`,
        `option${index + 1}`,
        `luachon${index + 1}`,
        `phuongan${index + 1}`,
        `dapan${letter.toLowerCase()}`,
      ], -1))
      const next = [...questionData]
      const topicPositions = {}
      let imported = 0

      rows.forEach((row, rowIndex) => {
        const topicIndex = topics.findIndex((topic) => topic.toLowerCase() === (row[topicColumn] || '').toLowerCase())
        const fallbackIndex = topicIndex >= 0 ? topicIndex * 3 + (topicPositions[topicIndex] || 0) : rowIndex
        if (topicIndex >= 0) topicPositions[topicIndex] = (topicPositions[topicIndex] || 0) + 1
        const declaredIndex = numberColumn >= 0 ? Number(row[numberColumn]) - 1 : fallbackIndex
        if (!Number.isInteger(declaredIndex) || declaredIndex < 0 || declaredIndex >= next.length || !row[questionColumn]) return
        const current = next[declaredIndex]
        const readCell = (position) => (position >= 0 ? row[position] || '' : '')
        const importedColumnChoices = choiceColumns.map(readCell)
        const splitChoices = readCell(choicesColumn).split(/[;|]/).map(cleanText).filter(Boolean)
        const hasImportedChoices = importedColumnChoices.some(Boolean) || splitChoices.length > 0
        const answer = row[answerColumn] || getQuestionAnswer(current)
        const choices = normalizeChoices(hasImportedChoices ? (importedColumnChoices.some(Boolean) ? importedColumnChoices : splitChoices) : current.choices, answer)
        const questionType = typeColumn >= 0
          ? parseQuestionType(row[typeColumn], current.questionType)
          : hasImportedChoices ? QUESTION_TYPE_MULTIPLE : current.questionType
        const correctChoiceIndex = questionType === QUESTION_TYPE_MULTIPLE
          ? parseCorrectChoiceIndex(readCell(correctColumn) || answer, choices, current.correctChoiceIndex)
          : normalizeCorrectChoiceIndex(current.correctChoiceIndex)
        next[declaredIndex] = {
          ...createQuestion({
            ...current,
            question: row[questionColumn],
            label: answer,
            ...getQuestionImagePatch(row[imageColumn] || ''),
            detail: row[detailColumn] || (topicIndex >= 0 ? topics[topicIndex] : current.detail),
            questionType,
            choices,
            correctChoiceIndex,
          }),
        }
        imported += 1
      })
      setQuestionData(next)
      setImportMessage(imported ? `Đã nhập ${imported} câu hỏi.` : 'Không tìm thấy câu hỏi hợp lệ trong file CSV.')
      event.target.value = ''
    }
    reader.readAsText(file, 'utf-8')
  }

  const importSideQuestions = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const rows = parseCsv(String(reader.result || ''))
      const header = rows.shift()?.map(normalizeHeaderName) || []
      const column = (names) => header.findIndex((name) => names.includes(name))
      const questionColumn = column(['question', 'cauhoi'])
      const answerColumn = column(['answer', 'dapan'])

      if (questionColumn < 0 || answerColumn < 0) {
        setSideImportMessage('CSV câu hỏi phụ cần có cột question, answer hoặc cauhoi, dapan.')
        event.target.value = ''
        return
      }

      const importedSideQuestions = rows
        .map((row) => normalizeSideQuestion({
          question: row[questionColumn],
          answer: row[answerColumn],
        }))
        .filter((item) => item.question && item.answer)

      if (!importedSideQuestions.length) {
        setSideImportMessage('Không tìm thấy câu hỏi phụ hợp lệ trong file CSV.')
        event.target.value = ''
        return
      }

      setSideQuestions(importedSideQuestions)
      setUsedSideQuestionIndexes([])
      setRevealedSideAnswer(false)
      setHintPrompt((current) => (current ? { ...current, sideQuestionIndex: 0, sideQuestionCleared: false } : current))
      setSideImportMessage(`Đã nhập ${importedSideQuestions.length} câu hỏi phụ.`)
      event.target.value = ''
    }
    reader.readAsText(file, 'utf-8')
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div className="brand-line">
          <div className="matsuri-key-visual"><div className="matsuri-logos"><img className="ceyc-combined-logo" src={`${import.meta.env.BASE_URL}ceyc-matsuri-full.png`} alt="Logo CeYc Matsuri" /></div></div>
          <div className="status-controls"><div className="progress"><span>{revealedCount}</span> / {questionData.length} câu hỏi</div><label className="hint-mode">Mở gợi ý sau <select value={hintThreshold} onChange={(event) => setHintThreshold(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} điểm</option>)}</select></label><button className="setup-button" onClick={openSpecialHint} disabled={isSpecialHintOpen}>Mở gợi ý đặc biệt</button><button className="setup-button reset-button" onClick={resetGameProgress}>Reset</button><button className="setup-button" onClick={() => setIsEditor(true)}>Thiết lập</button></div>
        </div>
        <div className="overview">
          <button className="master-question" onClick={() => setWinnerModal(true)}><span>Thử thách tối thượng</span><strong>{winner ? `Đội chiến thắng: Đội ${winner === 'green' ? 'Xanh' : 'Đỏ'}` : overallQuestion}</strong></button>
          <div className="team-score team-green"><span>Đội Xanh</span><strong>{greenScore}</strong><small>điểm</small></div>
          <div className="team-score team-red"><span>Đội Đỏ</span><strong>{redScore}</strong><small>điểm</small></div>
        </div>
      </header>

      <section className={`hint-grid ${isSpecialHintOpen ? 'has-special-hint' : ''}`} aria-label="Gợi ý">
        {visibleHintIndexes.map((index) => <div key={index} className={`hint-card ${index === SPECIAL_HINT_INDEX ? 'is-special-hint' : ''} ${openedHints.includes(index) ? 'is-unlocked' : 'is-locked'}`} aria-label={openedHints.includes(index) ? `Gợi ý ${index + 1}: ${hintTexts[index]}` : `Gợi ý ${index + 1} đang khóa`}><span>{openedHints.includes(index) ? hintTexts[index] : '?'}</span></div>)}
      </section>

      <section className="question-grid" aria-label="Bảng câu hỏi">
        {questionData.map((item, index) => {
          const result = results[index]
          const isOpen = result === 'green' || result === 'red'
          const isWrong = result === 'wrong'
          const isMultipleChoiceCard = item.questionType === QUESTION_TYPE_MULTIPLE
          const scoredTeamLabel = result === 'green' ? 'Đội Xanh' : 'Đội Đỏ'
          return (
            <button
              className={`question-card ${isOpen ? 'is-open' : ''} ${isWrong ? 'is-wrong' : ''} ${isMultipleChoiceCard ? 'is-multiple-choice' : ''}`}
              data-testid={`question-card-${index + 1}`}
              key={index}
              onClick={() => { if (!result) openMainQuestion(index) }}
              disabled={Boolean(result)}
            >
              {!result && isMultipleChoiceCard && <span className="question-type-badge">TN</span>}
              {!isOpen && !isWrong && <span className="card-preview">{genericQuestionIcons[index]}</span>}
              {isOpen && <span className="card-icon">✓</span>}
              <strong className={isOpen ? 'scored-team-label' : undefined}>{isOpen ? scoredTeamLabel : String(index + 1).padStart(2, '0')}</strong>
              {isWrong && <small>Đáp án không đúng</small>}
            </button>
          )
        })}
      </section>

      {selected !== null && (() => {
        const selectedQuestion = questionData[selected]
        const isMultipleChoice = selectedQuestion.questionType === QUESTION_TYPE_MULTIPLE
        const choices = normalizeChoices(selectedQuestion.choices, selectedQuestion.label)
        const correctChoiceIndex = normalizeCorrectChoiceIndex(selectedQuestion.correctChoiceIndex)
        const hasSelectedChoice = selectedChoiceIndex !== null
        const selectedChoiceIsCorrect = selectedChoiceIndex === correctChoiceIndex
        const selectedQuestionImageSrc = getQuestionImageSrc(selectedQuestion)
        const renderChoiceOptions = (revealed) => (
          <div className={`choice-list ${revealed ? 'is-revealed' : 'is-selecting'}`} aria-label="Lựa chọn trắc nghiệm">
            {choices.map((choice, choiceIndex) => {
              const isSelectedChoice = selectedChoiceIndex === choiceIndex
              const isCorrectChoice = choiceIndex === correctChoiceIndex
              return (
                <button
                  className={`choice-option ${isSelectedChoice ? 'is-selected' : ''} ${revealed && isCorrectChoice ? 'is-correct' : ''} ${revealed && isSelectedChoice && !isCorrectChoice ? 'is-incorrect' : ''}`}
                  data-testid={`choice-option-${choiceLetters[choiceIndex].toLowerCase()}`}
                  data-choice-value={choice}
                  key={choiceLetters[choiceIndex]}
                  type="button"
                  aria-pressed={isSelectedChoice}
                  onClick={() => setSelectedChoiceIndex(choiceIndex)}
                >
                  <span>{choiceLetters[choiceIndex]}</span>
                  <strong>{choice || `Lựa chọn ${choiceIndex + 1}`}</strong>
                </button>
              )
            })}
          </div>
        )
        return (
        <div className="modal-backdrop" role="presentation" onClick={closeMainQuestion}>
          <section className="answer-modal main-question-modal" role="dialog" aria-modal="true" aria-labelledby={selectedQuestionImageSrc ? undefined : 'question-title'} aria-label={selectedQuestionImageSrc ? `Câu hỏi ${String(selected + 1).padStart(2, '0')}` : undefined} onClick={stopModalClick}>
            <button className="close-modal" onClick={closeMainQuestion} aria-label="Đóng">×</button>
            <p className="modal-label">CÂU HỎI {String(selected + 1).padStart(2, '0')}{isMultipleChoice ? ' - TRẮC NGHIỆM' : ''}</p>
            {!selectedQuestionImageSrc && <h2 id="question-title">{selectedQuestion.question}</h2>}
            {selectedQuestionImageSrc && <img className="question-image" src={selectedQuestionImageSrc} alt="Hình minh họa câu hỏi" />}
            {revealedMainAnswer ? (
              <>
                {isMultipleChoice ? (
                  <>
                    {renderChoiceOptions(true)}
                    <p className="modal-question">{hasSelectedChoice ? `Đã chọn ${choiceLetters[selectedChoiceIndex]}. ${choices[selectedChoiceIndex] || `Lựa chọn ${selectedChoiceIndex + 1}`}${selectedChoiceIsCorrect ? ' - đáp án đúng.' : ` - đáp án đúng là ${choiceLetters[correctChoiceIndex]}. ${getQuestionAnswer(selectedQuestion)}.`}` : `Đáp án đúng là ${choiceLetters[correctChoiceIndex]}. ${getQuestionAnswer(selectedQuestion)}.`}</p>
                  </>
                ) : (
                  <p className="side-answer main-answer"><span>Đáp án</span><strong>{getQuestionAnswer(selectedQuestion)}</strong></p>
                )}
                <div className="modal-actions main-winner-actions">
                  <button className="wrong-action" onClick={() => markAnswer('wrong')}>Trả lời sai</button>
                  <button className="green-action" onClick={() => markAnswer('green')}>Đội Xanh thắng</button>
                  <button className="red-action" onClick={() => markAnswer('red')}>Đội Đỏ thắng</button>
                </div>
              </>
            ) : (
              <>
                {isMultipleChoice && (
                  <>
                    {renderChoiceOptions(false)}
                    <p className="modal-question choice-instruction">{hasSelectedChoice ? `Đã chọn ${choiceLetters[selectedChoiceIndex]}. Bấm Hiện đáp án để kiểm tra.` : 'Chọn một phương án trước khi hiện đáp án.'}</p>
                  </>
                )}
                <div className="modal-actions main-reveal-actions">
                  <button className="countdown-button" onClick={() => setRevealedMainAnswer(true)}>{isMultipleChoice ? 'Hiện đáp án trắc nghiệm' : 'Hiện đáp án'}</button>
                </div>
              </>
            )}
          </section>
        </div>
        )
      })()}

      {hintPrompt && (() => {
        const sideQuestionIndex = Number.isInteger(hintPrompt.sideQuestionIndex) ? hintPrompt.sideQuestionIndex : 0
        const sideQuestion = sideQuestions[sideQuestionIndex] || sideQuestions[0] || defaultSideQuestions[0]
        if (!hintPrompt.sideQuestionCleared) {
          const promptedTeamName = hintPrompt.team === 'green' ? 'Đội Xanh' : 'Đội Đỏ'
          return (
            <div className="modal-backdrop" role="presentation" onClick={closeHintPrompt}>
              <section className="answer-modal hint-modal side-question-modal" role="dialog" aria-modal="true" onClick={stopModalClick}>
                <button className="close-modal" onClick={closeHintPrompt} aria-label="Đóng">×</button>
                <p className="modal-label">CÂU HỎI PHỤ {String(sideQuestionIndex + 1).padStart(2, '0')}</p>
                <h2>{sideQuestion.question}</h2>
                <p className="modal-question">{promptedTeamName} đã kích hoạt mốc gợi ý. Trả lời câu hỏi phụ để tranh quyền mở gợi ý.</p>
                <div className={`side-question-state ${revealedSideAnswer ? 'is-revealed' : 'is-hidden'}`} aria-live="polite">
                  <span>{revealedSideAnswer ? 'ĐÁP ÁN ĐÃ HIỆN' : 'ĐÁP ÁN ĐANG ẨN'}</span>
                  <strong>{revealedSideAnswer ? 'Chọn đội thắng câu hỏi phụ để tiếp tục mở gợi ý.' : 'Bấm Hiện đáp án khi cần kiểm tra câu trả lời.'}</strong>
                </div>
                {revealedSideAnswer ? (
                  <>
                    <p className="side-answer"><span>Đáp án</span><strong>{sideQuestion.answer}</strong></p>
                    <div className="side-winner-control" aria-label="Chọn đội thắng câu hỏi phụ">
                      <p>Đội thắng câu hỏi phụ</p>
                      <div className="modal-actions side-winner-actions">
                        <button className="green-action" onClick={() => finishSideQuestion('green')}>Đội Xanh</button>
                        <button className="red-action" onClick={() => finishSideQuestion('red')}>Đội Đỏ</button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="modal-actions side-question-actions">
                    <button className="countdown-button" onClick={() => setRevealedSideAnswer(true)}>Hiện đáp án</button>
                  </div>
                )}
              </section>
            </div>
          )
        }
        return (
        <div className="modal-backdrop" role="presentation" onClick={closeHintPrompt}>
          <section className="answer-modal hint-modal" role="dialog" aria-modal="true" onClick={stopModalClick}>
            <button className="close-modal" onClick={closeHintPrompt} aria-label="Đóng">×</button>
            <p className="modal-label">CHỌN MỘT GỢI Ý</p>
            <h2>Mở ô nào?</h2>
            <div className="hint-picker">{Array.from({ length: STANDARD_HINT_COUNT }, (_, index) => <button key={index} disabled={openedHints.includes(index)} onClick={() => { setOpenedHints([...openedHints, index]); closeHintPrompt() }}>?</button>)}</div>
          </section>
        </div>
        )
      })()}

      {viewHint !== null && (
        <div className="modal-backdrop" role="presentation" onClick={() => setViewHint(null)}>
          <section className="answer-modal hint-modal" role="dialog" aria-modal="true" onClick={stopModalClick}>
            <button className="close-modal" onClick={() => setViewHint(null)} aria-label="Đóng">×</button>
            <p className="modal-label">GỢI Ý ĐÃ MỞ</p>
            <h2>{hintTexts[viewHint]}</h2>
            <p className="modal-question">Gợi ý {viewHint + 1} cho câu hỏi tổng thể.</p>
          </section>
        </div>
      )}

      {winnerModal && (
        <div className="modal-backdrop" role="presentation" onClick={closeWinnerModal}>
          <section className="answer-modal hint-modal" role="dialog" aria-modal="true" onClick={stopModalClick}>
            <button className="close-modal" onClick={closeWinnerModal} aria-label="Đóng">×</button>
            {countdown !== null && countdown > 0 ? <div className="countdown-display" role="timer" aria-live="assertive"><span>THỜI GIAN CÒN LẠI</span><div className="countdown-value"><strong>{countdown}</strong><small>GIÂY</small></div><button className="pause-countdown-button" onClick={() => setCountdownPaused(!countdownPaused)}>{countdownPaused ? 'Tiếp tục' : 'Dừng'}</button></div> : <><p className="modal-label">THỬ THÁCH TỐI THƯỢNG</p><h2>{overallQuestion}</h2><p className="modal-question">Chọn đội trả lời đúng đáp án thử thách tối thượng.</p><div className="modal-actions winner-actions"><button className="countdown-button" onClick={() => { setCountdown(countdownDuration); setCountdownPaused(false) }}>{countdown === 0 ? 'Hết giờ — đếm lại' : 'Đếm giây'}</button><button className="green-action" onClick={() => { setWinner('green'); setWinnerModal(false); setCelebratingWinner('green') }}>Đội Xanh chiến thắng</button><button className="red-action" onClick={() => { setWinner('red'); setWinnerModal(false); setCelebratingWinner('red') }}>Đội Đỏ chiến thắng</button></div></>}
          </section>
        </div>
      )}

      {celebratingWinner && <div className="winner-overlay" role="dialog" aria-modal="true"><button className="close-modal" onClick={() => setCelebratingWinner(null)} aria-label="Đóng">×</button><div className={`winner-celebration ${celebratingWinner}`}><i className="firework firework-one" /><i className="firework firework-two" /><i className="firework firework-three" /><i className="firework firework-four" /><i className="firework firework-five" /><i className="firework firework-six" /><i className="firework firework-seven" /><i className="firework firework-eight" /><i className="firework firework-nine" /><i className="firework firework-ten" /><p>CHÚC MỪNG</p><h2>ĐỘI {celebratingWinner === 'green' ? 'XANH' : 'ĐỎ'} CHIẾN THẮNG!</h2><div className="ultimate-answer"><span>ĐÁP ÁN THỬ THÁCH TỐI THƯỢNG</span><strong>{ULTIMATE_ANSWER}</strong></div><span>✦ ✦ ✦</span></div></div>}

      {isEditor && (
        <section className="editor-page" aria-label="Thiết lập câu hỏi">
          <header className="editor-header"><div><p className="eyebrow">THIẾT LẬP NỘI DUNG</p><h1>Chỉnh sửa câu hỏi</h1></div><button className="done-button" onClick={() => { setExpandedImagePickerIndex(null); setIsEditor(false) }}>Xong</button></header>
          <div className="editor-form">
            <section className="csv-import">
              <div><span>NHẬP NHANH</span><h2>Import câu hỏi từ CSV</h2><p>Dùng các cột: <b>topic, type, question, answer, correctChoice, choiceA, choiceB, choiceC, choiceD, imageUrl, detail</b>. Cột <b>imageUrl</b> chấp nhận <b>/images/ten-anh.jpg</b> hoặc URL <b>https</b>. Có thể thêm cột <b>number</b> (01–12) để chọn đúng vị trí câu hỏi.</p></div>
              <div className="csv-actions">
                <button className="csv-export" type="button" onClick={exportQuestions}>Xuất CSV</button>
                <label className="csv-upload">Chọn file CSV<input type="file" accept=".csv,text/csv" onChange={importQuestions} /></label>
              </div>
              {importMessage && <small>{importMessage}</small>}
            </section>
            <section className="csv-import clear-questions-panel">
              <div><span>XÓA NHANH</span><h2>Xóa toàn bộ câu hỏi chính</h2><p>Xóa nội dung 12 câu hỏi chính: câu hỏi, đáp án, bốn lựa chọn trắc nghiệm, đường dẫn ảnh và mô tả tùy biến. Câu hỏi phụ và gợi ý được giữ nguyên.</p></div>
              <div className="csv-actions">
                <button className="clear-questions-button" type="button" onClick={() => setClearQuestionsConfirm(true)}>Xóa toàn bộ câu hỏi</button>
              </div>
            </section>
            <section className="csv-import">
              <div><span>CÂU HỎI PHỤ</span><h2>Import câu hỏi phụ từ CSV</h2><p>Dùng các cột: <b>question, answer</b>. Có thể dùng tên cột tiếng Việt <b>cauhoi, dapan</b>. Danh sách này chỉ dùng cho luồng mở gợi ý.</p></div>
              <div className="csv-actions">
                <label className="csv-upload">Chọn CSV phụ<input type="file" accept=".csv,text/csv" onChange={importSideQuestions} /></label>
              </div>
              <small>{sideImportMessage || `Đang có ${sideQuestions.length} câu hỏi phụ.`}</small>
            </section>
            <label className="field full-field">Câu hỏi tổng thể<input value={overallQuestion} onChange={(event) => setOverallQuestion(event.target.value)} /></label>
            <label className="field full-field">Thời gian đếm ngược Thử thách tối thượng (giây)<input type="number" min="1" value={countdownDuration} onChange={(event) => setCountdownDuration(Math.max(1, Number(event.target.value) || 1))} /></label>
            <section className={`csv-import winning-score-panel ${winningScoreEnabled ? 'is-enabled' : ''}`}>
              <div>
                <span>ĐIỂM CHIẾN THẮNG</span>
                <h2>Điểm thắng tự động</h2>
                <p>{winningScoreEnabled ? `Đang bật: đội nào đạt ${winningScore} điểm sau khi trả lời đúng sẽ chiến thắng.` : 'Mặc định đang tắt. Bật khi muốn đội đạt mốc điểm tự động chiến thắng.'}</p>
              </div>
              <div className="csv-actions winning-score-actions">
                {winningScoreEnabled ? (
                  <>
                    <label className="field winning-score-field">Điểm thắng<input type="number" min="1" value={winningScore} onChange={(event) => setWinningScore(Math.max(1, Number(event.target.value) || 1))} /></label>
                    <button className="clear-questions-button winning-score-disable" type="button" onClick={() => setWinningScoreEnabled(false)}>Tắt điểm chiến thắng</button>
                  </>
                ) : (
                  <button className="csv-export winning-score-enable" type="button" onClick={() => setWinningScoreEnabled(true)}>Set điểm chiến thắng</button>
                )}
              </div>
            </section>
            <div className="hint-fields">{hintTexts.map((hint, index) => <label className="field" key={index}>Gợi ý {index + 1}<input value={hint} onChange={(event) => setHintTexts(hintTexts.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} /></label>)}</div>
            <div className="editor-topics">
              {topics.map((topic, topicIndex) => (
                <section className="editor-topic" key={topic}>
                  <header><span>CHỦ ĐỀ {String(topicIndex + 1).padStart(2, '0')}</span><h2>{topic}</h2><small>Câu {String(topicIndex * 3 + 1).padStart(2, '0')}–{String(topicIndex * 3 + 3).padStart(2, '0')}</small></header>
                  <div className="question-fields">
                    {questionData.slice(topicIndex * 3, topicIndex * 3 + 3).map((item, relativeIndex) => {
                      const index = topicIndex * 3 + relativeIndex
                      const questionType = item.questionType === QUESTION_TYPE_MULTIPLE ? QUESTION_TYPE_MULTIPLE : QUESTION_TYPE_SINGLE
                      const choices = normalizeChoices(item.choices, item.label)
                      const selectedImageAsset = getQuestionImageAsset(item.imageUrl || item.imagePath)
                      const imagePreviewSrc = getQuestionImageSrc(item)
                      const imagePreviewLabel = selectedImageAsset?.name || item.imageUrl || 'No image'
                      const isImagePickerExpanded = expandedImagePickerIndex === index
                      return (
                        <article className="edit-question" key={index}>
                          <b>{String(index + 1).padStart(2, '0')}</b>
                          <div className="field question-mode-field">
                            <span>Loại câu hỏi</span>
                            <div className="mode-switch" role="group" aria-label={`Loại câu hỏi ${index + 1}`}>
                              <button
                                className={questionType === QUESTION_TYPE_SINGLE ? 'is-active' : ''}
                                type="button"
                                aria-pressed={questionType === QUESTION_TYPE_SINGLE}
                                onClick={() => updateQuestion(index, { questionType: QUESTION_TYPE_SINGLE })}
                              >
                                Một đáp án
                              </button>
                              <button
                                className={questionType === QUESTION_TYPE_MULTIPLE ? 'is-active' : ''}
                                type="button"
                                aria-pressed={questionType === QUESTION_TYPE_MULTIPLE}
                                onClick={() => updateQuestion(index, { questionType: QUESTION_TYPE_MULTIPLE })}
                              >
                                Trắc nghiệm
                              </button>
                            </div>
                          </div>
                          <label className="field">Câu hỏi<input value={item.question} onChange={(event) => updateQuestion(index, { question: event.target.value })} /></label>
                          <div className="field image-picker-field">
                            <span>Ảnh minh họa</span>
                            <div className={`image-picker-preview ${imagePreviewSrc ? '' : 'is-empty'}`}>
                              {imagePreviewSrc ? (
                                <img src={imagePreviewSrc} alt="Ảnh minh họa đang chọn" />
                              ) : (
                                <span className="image-picker-empty">Không ảnh</span>
                              )}
                              <span>
                                <strong>{imagePreviewLabel}</strong>
                                <small>{imagePreviewSrc ? 'Ảnh đang chọn' : 'Chưa chọn ảnh minh họa'}</small>
                              </span>
                              <button
                                className="image-picker-toggle"
                                type="button"
                                aria-controls={`image-picker-options-${index}`}
                                aria-expanded={isImagePickerExpanded}
                                onClick={() => toggleImagePicker(index)}
                              >
                                {isImagePickerExpanded ? 'Thu gọn' : imagePreviewSrc ? 'Đổi ảnh' : 'Chọn ảnh'}
                              </button>
                            </div>
                            {isImagePickerExpanded && (
                              <div className="image-picker-catalog" id={`image-picker-options-${index}`}>
                                <div className="image-picker-options" aria-label={`Ảnh minh họa câu ${index + 1}`}>
                                  <button
                                    className={`image-picker-option ${!item.imageUrl ? 'is-selected' : ''}`}
                                    type="button"
                                    aria-label={!item.imageUrl ? 'No image đang chọn' : 'No image'}
                                    aria-pressed={!item.imageUrl}
                                    onClick={() => chooseQuestionImage(index, '')}
                                  >
                                    <span className="image-picker-empty">Không ảnh</span>
                                    <strong>No image</strong>
                                  </button>
                                  {questionImageAssets.map((asset) => {
                                    const isSelectedImageAsset = selectedImageAsset?.id === asset.id
                                    return (
                                      <button
                                        className={`image-picker-option ${isSelectedImageAsset ? 'is-selected' : ''}`}
                                        type="button"
                                        key={asset.id}
                                        aria-label={isSelectedImageAsset ? `${asset.name} đang chọn` : asset.name}
                                        aria-pressed={isSelectedImageAsset}
                                        onClick={() => chooseQuestionImage(index, asset.imagePath)}
                                      >
                                        <img src={getPublicAssetUrl(asset.imagePath)} alt="" />
                                        <strong>{asset.name}</strong>
                                      </button>
                                    )
                                  })}
                                </div>
                                <input placeholder="/images/ten-anh.jpg hoặc https://example.com/image.jpg" value={item.imageUrl} onChange={(event) => updateQuestion(index, getQuestionImagePatch(event.target.value))} />
                                <small>Nội bộ: /images/ten-file. URL https vẫn dùng được.</small>
                              </div>
                            )}
                          </div>
                          {questionType === QUESTION_TYPE_MULTIPLE && (
                            <div className="choice-editor">
                              {choices.map((choice, choiceIndex) => (
                                <label className="field" key={choiceLetters[choiceIndex]}>Lựa chọn {choiceLetters[choiceIndex]}<input value={choice} onChange={(event) => updateQuestionChoice(index, choiceIndex, event.target.value)} /></label>
                              ))}
                              <label className="field correct-choice-field">Đáp án đúng
                                <select value={normalizeCorrectChoiceIndex(item.correctChoiceIndex)} onChange={(event) => updateQuestion(index, { correctChoiceIndex: Number(event.target.value) })}>
                                  {choices.map((choice, choiceIndex) => <option key={choiceLetters[choiceIndex]} value={choiceIndex}>{choiceLetters[choiceIndex]}. {choice || `Lựa chọn ${choiceIndex + 1}`}</option>)}
                                </select>
                              </label>
                            </div>
                          )}
                          {questionType === QUESTION_TYPE_SINGLE && <label className="field">Đáp án khi mở ô<input value={item.label} onChange={(event) => updateQuestion(index, { label: event.target.value })} /></label>}
                          <label className="field">Mô tả<input value={item.detail} onChange={(event) => updateQuestion(index, { detail: event.target.value })} /></label>
                        </article>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
      )}

      {clearQuestionsConfirm && (
        <div className="modal-backdrop editor-confirm-backdrop" role="presentation" onClick={() => setClearQuestionsConfirm(false)}>
          <section className="answer-modal clear-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="clear-questions-title" onClick={stopModalClick}>
            <button className="close-modal" onClick={() => setClearQuestionsConfirm(false)} aria-label="Đóng">×</button>
            <p className="modal-label">XÁC NHẬN XÓA</p>
            <h2 id="clear-questions-title">Xóa toàn bộ câu hỏi chính?</h2>
            <p className="modal-question">Hành động này sẽ xóa nội dung 12 câu hỏi chính: câu hỏi, đáp án, bốn lựa chọn trắc nghiệm, ảnh và mô tả tùy biến. Câu hỏi phụ và gợi ý được giữ nguyên. Có thể phục hồi bằng cách import CSV sau đó.</p>
            <div className="modal-actions clear-confirm-actions">
              <button className="countdown-button" type="button" onClick={() => setClearQuestionsConfirm(false)}>Hủy</button>
              <button className="wrong-action clear-confirm-delete" type="button" onClick={clearMainQuestions}>Xóa toàn bộ câu hỏi</button>
            </div>
          </section>
        </div>
      )}

      <footer>Company Trip 2026 <span>·</span> Cùng khám phá, cùng kết nối</footer>
    </main>
  )
}

export default App
