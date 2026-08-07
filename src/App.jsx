import { useEffect, useState } from 'react'
import './App.css'
import { getNextUnpromptedHintMilestone } from './hintMilestones'

const topics = ['Thể thao', 'Lịch sử', 'Giải trí', 'Âm nhạc']
const genericQuestionIcons = ['✦', '◆', '✦', '◆', '✦', '◆', '✦', '◆', '✦', '◆', '✦', '◆']
const QUESTION_TYPE_SINGLE = 'single'
const QUESTION_TYPE_MULTIPLE = 'multiple'
const MULTIPLE_CHOICE_COUNT = 4
const choiceLetters = ['A', 'B', 'C', 'D']
const questionTypeLabels = {
  [QUESTION_TYPE_SINGLE]: 'Một đáp án',
  [QUESTION_TYPE_MULTIPLE]: 'Trắc nghiệm',
}

const cleanText = (value) => String(value ?? '').trim()
const getPublicAssetUrl = (value) => {
  const source = cleanText(value)
  if (!source) return ''
  if (/^(?:[a-z][a-z\d+\-.]*:|\/\/)/i.test(source)) return source

  const basePath = import.meta.env.BASE_URL || '/'
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`
  if (normalizedBasePath !== '/' && source.startsWith(normalizedBasePath)) return source

  const trimmedSource = source.replace(/^\/+/, '')
  if (normalizedBasePath !== '/' && trimmedSource.startsWith(normalizedBasePath.slice(1))) return `/${trimmedSource}`
  return `${normalizedBasePath}${trimmedSource}`
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

const createQuestion = ({ question, label, imageUrl, detail, icon, questionType = QUESTION_TYPE_SINGLE, choices, correctChoiceIndex = 0 }) => {
  const normalizedQuestionType = questionType === QUESTION_TYPE_MULTIPLE ? QUESTION_TYPE_MULTIPLE : QUESTION_TYPE_SINGLE
  const normalizedChoices = normalizeChoices(choices, label)
  const normalizedCorrectChoiceIndex = normalizeCorrectChoiceIndex(correctChoiceIndex)
  const answer = normalizedQuestionType === QUESTION_TYPE_MULTIPLE ? normalizedChoices[normalizedCorrectChoiceIndex] || cleanText(label) : cleanText(label)
  return {
    question,
    label: answer,
    imageUrl,
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
  ['Hóa học dạy ta điều gì về tình yêu?', 'Không phải chất nào trộn vào cũng hợp.', ''],
  ['Sở thú bị cháy, đố bạn con gì chạy ra đầu tiên?', 'Con người.', ''],
  ['Với con người, thời điểm tốt nhất để đi ngủ là khi nào?', 'Khi buồn ngủ.', ''],
  ['Khi nhắc đến cối xay gió, người ta thường nghĩ đến đất nước nào?', 'Hà Lan.', ''],
  ['Tổng số tuổi của HEAD + 4 SDM nhà mình là bao nhiêu?', '187 tuổi.', ''],
  ['Trưởng phòng C3 hiện tại là Tùng. Vậy phó trưởng BVH C3 hiện tại là ai?', 'K Cô.', ''],
  ['Giao gì khiến chúng ta lo lắng?', 'Giao trứng cho ác.', ''],
  ['Lá gì luôn ngửi rất say?', 'Lá mơ.', ''],
  ['Điểm gì ăn được?', 'Điểm tâm.', ''],
  ['Thứ gì càng gần deadline càng chạy nhanh?', 'Người chạy deadline.', ''],
  ['Nếu bạn Tí có 5 cục kẹo chia đều cho 5 người bạn của mình, thì bạn Tí còn mấy cục kẹo?', 'Không còn cục nào.', ''],
  ['Làm gì mà không phát ra tiếng?', 'Làm thinh.', ''],
]

const createDefaultQuestionData = () => defaultQuestions.map(([question, label, imageUrl], index) => {
  return createQuestion({
    question,
    label,
    imageUrl,
    detail: topics[Math.floor(index / 3)] || 'Câu hỏi',
    icon: genericQuestionIcons[index],
  })
})

const createEmptyQuestion = (index, questionType = QUESTION_TYPE_SINGLE) => createQuestion({
  question: '',
  label: '',
  imageUrl: '',
  detail: '',
  icon: genericQuestionIcons[index],
  questionType: questionType === QUESTION_TYPE_MULTIPLE ? QUESTION_TYPE_MULTIPLE : QUESTION_TYPE_SINGLE,
  choices: Array(MULTIPLE_CHOICE_COUNT).fill(''),
  correctChoiceIndex: 0,
})

const defaultSideQuestions = [
  { question: 'Hóa học dạy ta điều gì về tình yêu?', answer: 'Không phải chất nào trộn vào cũng hợp.' },
  { question: 'Sở thú bị cháy, đố bạn con gì chạy ra đầu tiên?', answer: 'Con người.' },
  { question: 'Với con người, thời điểm tốt nhất để đi ngủ là khi nào?', answer: 'Khi buồn ngủ.' },
  { question: 'Khi nhắc đến cối xay gió, người ta thường nghĩ đến đất nước nào?', answer: 'Hà Lan.' },
  { question: 'Tổng số tuổi của HEAD + 4 SDM nhà mình là bao nhiêu?', answer: '187 tuổi.' },
  { question: 'Trưởng phòng C3 hiện tại là Tùng. Vậy phó trưởng BVH C3 hiện tại là ai?', answer: 'K Cô.' },
  { question: 'Giao gì khiến chúng ta lo lắng?', answer: 'Giao trứng cho ác.' },
  { question: 'Lá gì luôn ngửi rất say?', answer: 'Lá mơ.' },
  { question: 'Điểm gì ăn được?', answer: 'Điểm tâm.' },
  { question: 'Thứ gì càng gần deadline càng chạy nhanh?', answer: 'Người chạy deadline.' },
  { question: 'Nếu bạn Tí có 5 cục kẹo chia đều cho 5 người bạn của mình, thì bạn Tí còn mấy cục kẹo?', answer: 'Không còn cục nào.' },
  { question: 'Làm gì mà không phát ra tiếng?', answer: 'Làm thinh.' },
]

const normalizeSideQuestion = ({ question, answer }) => ({
  question: cleanText(question),
  answer: cleanText(answer),
})

const getNextSideQuestionIndex = (sideQuestions, usedIndexes = []) => {
  const used = new Set(usedIndexes)
  const nextIndex = sideQuestions.findIndex((_, index) => !used.has(index))
  return nextIndex >= 0 ? nextIndex : 0
}

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

function App() {
  const [questionData, setQuestionData] = useState(createDefaultQuestionData)
  const [overallQuestion, setOverallQuestion] = useState('Địa danh nào đang được các gợi ý này hé lộ?')
  const [hintTexts, setHintTexts] = useState(['Việt Nam', 'Con rồng', 'Di sản văn hóa thế giới'])
  const [isEditor, setIsEditor] = useState(false)
  const [clearQuestionsConfirm, setClearQuestionsConfirm] = useState(false)
  const [results, setResults] = useState({})
  const [selected, setSelected] = useState(null)
  const [openedHints, setOpenedHints] = useState([])
  const [hintOwners, setHintOwners] = useState({})
  const [hintPrompt, setHintPrompt] = useState(null)
  const [sideQuestions, setSideQuestions] = useState(defaultSideQuestions)
  const [usedSideQuestionIndexes, setUsedSideQuestionIndexes] = useState([])
  const [revealedSideAnswer, setRevealedSideAnswer] = useState(false)
  const [promptedMilestones, setPromptedMilestones] = useState({})
  const [viewHint, setViewHint] = useState(null)
  const [winner, setWinner] = useState(null)
  const [winnerModal, setWinnerModal] = useState(false)
  const [celebratingWinner, setCelebratingWinner] = useState(null)
  const [countdownPaused, setCountdownPaused] = useState(false)
  const [countdownDuration, setCountdownDuration] = useState(20)
  const [countdown, setCountdown] = useState(null)
  const [hintThreshold, setHintThreshold] = useState(2)
  const [importMessage, setImportMessage] = useState('')
  const [sideImportMessage, setSideImportMessage] = useState('')
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState(null)
  const greenScore = Object.values(results).filter((result) => result === 'green').length
  const redScore = Object.values(results).filter((result) => result === 'red').length
  const revealedCount = Object.values(results).filter((result) => result === 'green' || result === 'red').length
  const greenHints = Object.values(hintOwners).filter((team) => team === 'green').length
  const redHints = Object.values(hintOwners).filter((team) => team === 'red').length
  const priorityTeam = greenHints === redHints ? null : greenHints > redHints ? 'green' : 'red'
  const hasAvailableHints = openedHints.length < 3

  useEffect(() => {
    if (countdown === null || countdown <= 0 || countdownPaused) return undefined
    const timer = window.setTimeout(() => setCountdown((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown, countdownPaused])

  const startHintPrompt = (team) => {
    setRevealedSideAnswer(false)
    setHintPrompt({
      team,
      sideQuestionIndex: getNextSideQuestionIndex(sideQuestions, usedSideQuestionIndexes),
      sideQuestionCleared: false,
    })
  }

  const closeHintPrompt = () => {
    setHintPrompt(null)
    setRevealedSideAnswer(false)
  }

  const finishSideQuestion = (isCorrect) => {
    if (!hintPrompt) return
    setUsedSideQuestionIndexes((current) => (
      current.includes(hintPrompt.sideQuestionIndex) ? current : [...current, hintPrompt.sideQuestionIndex]
    ))
    setRevealedSideAnswer(false)
    setHintPrompt(isCorrect ? { ...hintPrompt, sideQuestionCleared: true } : null)
  }

  const markAnswer = (result) => {
    setResults({ ...results, [selected]: result })
    setSelected(null)
    setSelectedChoiceIndex(null)
    if (result === 'green' || result === 'red') {
      const currentScore = Object.values(results).filter((value) => value === result).length
      const nextScore = currentScore + 1
      const currentTotalScore = Object.values(results).filter((value) => value === 'green' || value === 'red').length
      const nextTotalScore = currentTotalScore + 1
      if (nextScore === 6) {
        setWinner(result)
        setCelebratingWinner(result)
        return
      }
      const hintMilestone = getNextUnpromptedHintMilestone({
        totalScore: nextTotalScore,
        hintThreshold,
        promptedMilestones,
      })
      if (hintMilestone !== null && openedHints.length < 3) {
        setPromptedMilestones({ ...promptedMilestones, [hintMilestone]: true })
        startHintPrompt(result)
      }
    }
  }

  const updateQuestion = (index, patch) => {
    setQuestionData((current) => current.map((item, itemIndex) => (
      itemIndex === index ? createQuestion({ ...item, ...patch }) : item
    )))
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
    setSelected(null)
    setSelectedChoiceIndex(null)
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
          imageUrl: row[imageColumn] || '',
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
          <div className="status-controls"><div className="progress"><span>{revealedCount}</span> / {questionData.length} câu hỏi</div><label className="hint-mode">Mở gợi ý sau <select value={hintThreshold} onChange={(event) => setHintThreshold(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} điểm</option>)}</select></label><button className="setup-button" onClick={() => startHintPrompt(null)} disabled={!hasAvailableHints}>Tự mở gợi ý</button><button className="setup-button" onClick={() => setIsEditor(true)}>Thiết lập</button></div>
        </div>
        <div className="overview">
          <button className="master-question" onClick={() => setWinnerModal(true)}><span>Thử thách tối thượng</span><strong>{winner ? `Đội chiến thắng: Đội ${winner === 'green' ? 'Xanh' : 'Đỏ'}` : overallQuestion}</strong></button>
          <div className={`team-score team-green ${priorityTeam === 'green' ? 'is-priority' : ''}`}><span>Đội Xanh</span><strong>{greenScore}</strong><small>điểm</small>{priorityTeam === 'green' && <em>Ưu tiên trả lời</em>}</div>
          <div className={`team-score team-red ${priorityTeam === 'red' ? 'is-priority' : ''}`}><span>Đội Đỏ</span><strong>{redScore}</strong><small>điểm</small>{priorityTeam === 'red' && <em>Ưu tiên trả lời</em>}</div>
        </div>
      </header>

      <section className="hint-grid" aria-label="Gợi ý">
        {[0, 1, 2].map((index) => <div key={index} className={`hint-card ${openedHints.includes(index) ? 'is-unlocked' : 'is-locked'}`} aria-label={openedHints.includes(index) ? `Gợi ý ${index + 1}: ${hintTexts[index]}` : `Gợi ý ${index + 1} đang khóa`}><span>{openedHints.includes(index) ? hintTexts[index] : '?'}</span></div>)}
      </section>

      <section className="question-grid" aria-label="Bảng câu hỏi">
        {questionData.map((item, index) => {
          const result = results[index]
          const isOpen = result === 'green' || result === 'red'
          const isWrong = result === 'wrong'
          const revealedAnswer = getQuestionAnswer(item)
          const hasLongAnswer = revealedAnswer.length > 14
          return (
            <button
              className={`question-card ${isOpen ? 'is-open' : ''} ${isWrong ? 'is-wrong' : ''} ${hasLongAnswer ? 'has-long-answer' : ''}`}
              data-testid={`question-card-${index + 1}`}
              key={index}
              onClick={() => { if (!result) { setSelected(index); setSelectedChoiceIndex(null) } }}
              disabled={Boolean(result)}
            >
              {!isOpen && !isWrong && <span className="card-preview">{genericQuestionIcons[index]}</span>}
              {isOpen && <span className="card-icon">✓</span>}
              <strong className={isOpen ? 'revealed-answer' : ''}>{isOpen ? revealedAnswer : String(index + 1).padStart(2, '0')}</strong>
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
        const selectedQuestionImageSrc = getPublicAssetUrl(selectedQuestion.imageUrl)
        return (
        <div className="modal-backdrop" role="presentation">
          <section className="answer-modal" role="dialog" aria-modal="true" aria-labelledby="question-title">
            <button className="close-modal" onClick={() => { setSelected(null); setSelectedChoiceIndex(null) }} aria-label="Đóng">×</button>
            <p className="modal-label">CÂU HỎI {String(selected + 1).padStart(2, '0')}</p>
            <h2 id="question-title">{selectedQuestion.question}</h2>
            {selectedQuestionImageSrc && <img className="question-image" src={selectedQuestionImageSrc} alt="Hình minh họa câu hỏi" />}
            {isMultipleChoice && (
              <div className="choice-list" aria-label="Lựa chọn trắc nghiệm">
                {choices.map((choice, choiceIndex) => {
                  const isSelectedChoice = selectedChoiceIndex === choiceIndex
                  return (
                    <button
                      className={`choice-option ${isSelectedChoice ? 'is-selected' : ''} ${isSelectedChoice && selectedChoiceIsCorrect ? 'is-correct' : ''} ${isSelectedChoice && !selectedChoiceIsCorrect ? 'is-incorrect' : ''}`}
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
            )}
            <p className="modal-question">{isMultipleChoice ? (hasSelectedChoice ? `Đã chọn ${choiceLetters[selectedChoiceIndex]}. ${choices[selectedChoiceIndex] || `Lựa chọn ${selectedChoiceIndex + 1}`}${selectedChoiceIsCorrect ? ' — đáp án đúng.' : ` — đáp án đúng là ${getQuestionAnswer(selectedQuestion)}.`}` : 'Chọn một trong bốn đáp án, sau đó chọn kết quả chấm.') : 'Hãy nghe phần trả lời của người chơi, sau đó chọn kết quả chấm.'}</p>
            <div className="modal-actions">
              <button className="wrong-action" onClick={() => markAnswer('wrong')}>Sai</button>
              <button className="green-action" onClick={() => markAnswer('green')}>Đội Xanh đúng</button>
              <button className="red-action" onClick={() => markAnswer('red')}>Đội Đỏ đúng</button>
            </div>
          </section>
        </div>
        )
      })()}

      {hintPrompt && (() => {
        const sideQuestionIndex = Number.isInteger(hintPrompt.sideQuestionIndex) ? hintPrompt.sideQuestionIndex : 0
        const sideQuestion = sideQuestions[sideQuestionIndex] || sideQuestions[0] || defaultSideQuestions[0]
        if (!hintPrompt.sideQuestionCleared) {
          return (
            <div className="modal-backdrop" role="presentation">
              <section className="answer-modal hint-modal" role="dialog" aria-modal="true">
                <button className="close-modal" onClick={closeHintPrompt} aria-label="Đóng">×</button>
                <p className="modal-label">CÂU HỎI PHỤ {String(sideQuestionIndex + 1).padStart(2, '0')}</p>
                <h2>{sideQuestion.question}</h2>
                {revealedSideAnswer && <p className="side-answer"><span>Đáp án</span><strong>{sideQuestion.answer}</strong></p>}
                <p className="modal-question">{hintPrompt.team ? `Đội ${hintPrompt.team === 'green' ? 'Xanh' : 'Đỏ'} đang tranh quyền mở gợi ý.` : 'Câu hỏi phụ để mở gợi ý thủ công.'}</p>
                <div className="modal-actions side-question-actions">
                  <button className="wrong-action" onClick={() => finishSideQuestion(false)}>Sai</button>
                  <button className="countdown-button" onClick={() => setRevealedSideAnswer(!revealedSideAnswer)}>{revealedSideAnswer ? 'Ẩn đáp án' : 'Hiện đáp án'}</button>
                  <button className="green-action" onClick={() => finishSideQuestion(true)}>Đúng</button>
                </div>
              </section>
            </div>
          )
        }
        return (
        <div className="modal-backdrop" role="presentation">
          <section className="answer-modal hint-modal" role="dialog" aria-modal="true">
            <button className="close-modal" onClick={closeHintPrompt} aria-label="Đóng">×</button>
            <p className="modal-label">CHỌN MỘT GỢI Ý</p>
            <h2>Mở ô nào?</h2>
            <div className="hint-picker">{[0, 1, 2].map((index) => <button key={index} disabled={openedHints.includes(index)} onClick={() => { setOpenedHints([...openedHints, index]); setHintOwners({ ...hintOwners, [index]: hintPrompt.team }); closeHintPrompt() }}>?</button>)}</div>
          </section>
        </div>
        )
      })()}

      {viewHint !== null && (
        <div className="modal-backdrop" role="presentation">
          <section className="answer-modal hint-modal" role="dialog" aria-modal="true">
            <button className="close-modal" onClick={() => setViewHint(null)} aria-label="Đóng">×</button>
            <p className="modal-label">GỢI Ý ĐÃ MỞ</p>
            <h2>{hintTexts[viewHint]}</h2>
            <p className="modal-question">Gợi ý {viewHint + 1} cho câu hỏi tổng thể.</p>
          </section>
        </div>
      )}

      {winnerModal && (
        <div className="modal-backdrop" role="presentation">
          <section className="answer-modal hint-modal" role="dialog" aria-modal="true">
            <button className="close-modal" onClick={() => { setWinnerModal(false); setCountdown(null); setCountdownPaused(false); setCelebratingWinner(null) }} aria-label="Đóng">×</button>
            {countdown !== null && countdown > 0 ? <div className="countdown-display" role="timer" aria-live="assertive"><span>THỜI GIAN CÒN LẠI</span><div className="countdown-value"><strong>{countdown}</strong><small>GIÂY</small></div><button className="pause-countdown-button" onClick={() => setCountdownPaused(!countdownPaused)}>{countdownPaused ? 'Tiếp tục' : 'Dừng'}</button></div> : <><p className="modal-label">THỬ THÁCH TỐI THƯỢNG</p><h2>{overallQuestion}</h2><p className="modal-question">Chọn đội trả lời đúng đáp án thử thách tối thượng.</p><div className="modal-actions winner-actions"><button className="countdown-button" onClick={() => { setCountdown(countdownDuration); setCountdownPaused(false) }}>{countdown === 0 ? 'Hết giờ — đếm lại' : 'Đếm giây'}</button><button className="green-action" onClick={() => { setWinner('green'); setWinnerModal(false); setCelebratingWinner('green') }}>Đội Xanh chiến thắng</button><button className="red-action" onClick={() => { setWinner('red'); setWinnerModal(false); setCelebratingWinner('red') }}>Đội Đỏ chiến thắng</button></div></>}
          </section>
        </div>
      )}

      {celebratingWinner && <div className="winner-overlay" role="dialog" aria-modal="true"><button className="close-modal" onClick={() => setCelebratingWinner(null)} aria-label="Đóng">×</button><div className={`winner-celebration ${celebratingWinner}`}><i className="firework firework-one" /><i className="firework firework-two" /><i className="firework firework-three" /><i className="firework firework-four" /><i className="firework firework-five" /><i className="firework firework-six" /><i className="firework firework-seven" /><i className="firework firework-eight" /><i className="firework firework-nine" /><i className="firework firework-ten" /><p>CHÚC MỪNG</p><h2>ĐỘI {celebratingWinner === 'green' ? 'XANH' : 'ĐỎ'} CHIẾN THẮNG!</h2><span>✦ ✦ ✦</span></div></div>}

      {isEditor && (
        <section className="editor-page" aria-label="Thiết lập câu hỏi">
          <header className="editor-header"><div><p className="eyebrow">THIẾT LẬP NỘI DUNG</p><h1>Chỉnh sửa câu hỏi</h1></div><button className="done-button" onClick={() => setIsEditor(false)}>Xong</button></header>
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
                      return (
                        <article className="edit-question" key={index}>
                          <b>{String(index + 1).padStart(2, '0')}</b>
                          <label className="field">Loại câu hỏi
                            <select value={questionType} onChange={(event) => updateQuestion(index, { questionType: event.target.value })}>
                              <option value={QUESTION_TYPE_SINGLE}>Một đáp án</option>
                              <option value={QUESTION_TYPE_MULTIPLE}>Trắc nghiệm</option>
                            </select>
                          </label>
                          <label className="field">Câu hỏi<input value={item.question} onChange={(event) => updateQuestion(index, { question: event.target.value })} /></label>
                          <label className="field image-path-field">Ảnh minh họa<input placeholder="/images/ten-anh.jpg hoặc https://example.com/image.jpg" value={item.imageUrl} onChange={(event) => updateQuestion(index, { imageUrl: event.target.value })} /><small>Chép file vào public/images rồi nhập /images/tên-file. URL https vẫn dùng được.</small></label>
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
        <div className="modal-backdrop editor-confirm-backdrop" role="presentation">
          <section className="answer-modal clear-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="clear-questions-title">
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
