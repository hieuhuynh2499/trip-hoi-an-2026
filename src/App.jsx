import { useEffect, useState } from 'react'
import './App.css'

const questions = [
  { label: 'Ổ dầu', detail: 'Một địa danh giàu tài nguyên', icon: '✦' },
  { label: 'Di tích quốc gia\nđặc biệt', detail: 'Dấu ấn lịch sử nổi bật', icon: '⌁' },
  { label: '3.750.000', detail: 'Một con số đặc biệt', icon: '◎' },
  { label: 'Cấu trúc\nđộc đáo', detail: 'Khám phá kiến trúc', icon: '◇' },
  { label: 'Đất', detail: 'Nơi khởi đầu hành trình', icon: '◒' },
  { label: 'Kinh đô', detail: 'Trung tâm của một thời', icon: '♜' },
  { label: 'Nước Âu Lạc', detail: 'Một vương quốc cổ', icon: '≈' },
  { label: 'Tòa thành', detail: 'Bí ẩn qua nhiều thế kỷ', icon: '▦' },
  { label: 'Đông Anh,\nHà Nội', detail: 'Điểm đến của câu chuyện', icon: '⌖' },
  { label: 'Vòng thành', detail: 'Dấu vết của một hệ thống phòng thủ', icon: '◌' },
  { label: 'Nỏ thần', detail: 'Truyền thuyết gắn với thành cổ', icon: '➹' },
  { label: 'An Dương Vương', detail: 'Vị vua gắn với vùng đất này', icon: '♛' },
]

const topics = ['Thể thao', 'Lịch sử', 'Giải trí', 'Âm nhạc']
const topicIcons = [
  ['⚽', '🏆', '🥇', '🎯'],
  ['🏛️', '📜', '🛡️', '⌛'],
  ['🎬', '🎭', '📺', '🌟'],
  ['🎵', '🎤', '🎸', '🎧'],
]

const genericQuestionIcons = ['✦', '◆', '✦', '◆', '✦', '◆', '✦', '◆', '✦', '◆', '✦', '◆']

const defaultQuestions = [
  ['Cristiano Ronaldo đã giành bao nhiêu Quả bóng vàng?', '5', 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Cristiano_Ronaldo_2018.jpg'],
  ['Pelé đã vô địch World Cup bao nhiêu lần?', '3', 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211'],
  ['Tuyển Việt Nam có vô địch Asian Cup 2024 không?', 'Không', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55'],
  ['Cầu thủ nào thường được gọi là “Messi Việt Nam”?', 'Nguyễn Quang Hải', 'https://images.unsplash.com/photo-1546519638-68e109498ffc'],
  ['Kỳ quan cổ đại nào nằm ở Ai Cập?', 'Kim tự tháp Giza', 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e'],
  ['Đấu trường nổi tiếng tại Rome tên là gì?', 'Colosseum', 'https://images.unsplash.com/photo-1552832230-c0197dd311b5'],
  ['Vị vua đầu tiên của nước Âu Lạc là ai?', 'An Dương Vương', 'https://images.unsplash.com/photo-1524661135-423995f22d0b'],
  ['Thành cổ nổi tiếng ở Đông Anh, Hà Nội?', 'Cổ Loa', 'https://images.unsplash.com/photo-1521292270410-a8c4d716d518'],
  ['Nghệ thuật kể chuyện qua hình ảnh trên màn ảnh?', 'Điện ảnh', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba'],
  ['Loại hình biểu diễn trên sân khấu có diễn viên?', 'Kịch', 'https://images.unsplash.com/photo-1503095396549-807759245b45'],
  ['Tượng vàng dành cho phim xuất sắc của Hollywood?', 'Oscar', 'https://images.unsplash.com/photo-1534190239940-9ba8944ea261'],
  ['Thiết bị quen thuộc để xem chương trình tại nhà?', 'Truyền hình', 'https://images.unsplash.com/photo-1593784991095-a205069470b6'],
  ['Nhạc cụ có sáu dây phổ biến?', 'Guitar', 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1'],
  ['Thiết bị dùng để thu và khuếch đại giọng hát?', 'Micro', 'https://images.unsplash.com/photo-1516280440614-37939bbacd81'],
  ['Thiết bị nghe nhạc đeo ở tai?', 'Tai nghe', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e'],
  ['Nhạc cụ gõ gồm nhiều mặt trống?', 'Trống', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f'],
]

const defaultQuestionIndexes = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14]

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
  const [questionData, setQuestionData] = useState(defaultQuestionIndexes.map((sourceIndex, index) => {
    const [question, label, imageUrl] = defaultQuestions[sourceIndex]
    const topicIndex = Math.floor(index / 2)
    return { question, label, imageUrl, detail: 'Câu hỏi', icon: genericQuestionIcons[index] }
  }))
  const [overallQuestion, setOverallQuestion] = useState('Địa danh nào đang được các gợi ý này hé lộ?')
  const [ultimateHintQuestion, setUltimateHintQuestion] = useState('Gợi ý nào sẽ giúp các đội giải đáp thử thách tối thượng?')
  const [hintTexts, setHintTexts] = useState(['Việt Nam', 'Con rồng', 'Di sản văn hóa thế giới'])
  const [isEditor, setIsEditor] = useState(false)
  const [results, setResults] = useState({})
  const [selected, setSelected] = useState(null)
  const [openedHints, setOpenedHints] = useState([])
  const [hintOwners, setHintOwners] = useState({})
  const [hintPrompt, setHintPrompt] = useState(null)
  const [promptedMilestones, setPromptedMilestones] = useState({})
  const [viewHint, setViewHint] = useState(null)
  const [winner, setWinner] = useState(null)
  const [winnerModal, setWinnerModal] = useState(false)
  const [celebratingWinner, setCelebratingWinner] = useState(null)
  const [ultimateHintModal, setUltimateHintModal] = useState(false)
  const [ultimateHintOpened, setUltimateHintOpened] = useState(false)
  const [countdownPaused, setCountdownPaused] = useState(false)
  const [countdownDuration, setCountdownDuration] = useState(20)
  const [countdown, setCountdown] = useState(null)
  const [hintThreshold, setHintThreshold] = useState(2)
  const [importMessage, setImportMessage] = useState('')
  const greenScore = Object.values(results).filter((result) => result === 'green').length
  const redScore = Object.values(results).filter((result) => result === 'red').length
  const revealedCount = Object.values(results).filter((result) => result === 'green' || result === 'red').length
  const greenHints = Object.values(hintOwners).filter((team) => team === 'green').length
  const redHints = Object.values(hintOwners).filter((team) => team === 'red').length
  const priorityTeam = greenHints === redHints ? null : greenHints > redHints ? 'green' : 'red'
  const showUltimateHint = Math.max(greenScore, redScore) >= 5 || ultimateHintOpened

  useEffect(() => {
    if (countdown === null || countdown <= 0 || countdownPaused) return undefined
    const timer = window.setTimeout(() => setCountdown((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown, countdownPaused])

  const markAnswer = (result) => {
    setResults({ ...results, [selected]: result })
    setSelected(null)
    if (result === 'green' || result === 'red') {
      const currentScore = Object.values(results).filter((value) => value === result).length
      const nextScore = currentScore + 1
      if (nextScore === 6) {
        setWinner(result)
        setCelebratingWinner(result)
        return
      }
      const milestoneKey = `${result}-${nextScore}`
      if (nextScore % hintThreshold === 0 && !promptedMilestones[milestoneKey] && openedHints.length < 3) {
        setPromptedMilestones({ ...promptedMilestones, [milestoneKey]: true })
        setHintPrompt({ team: result })
      }
    }
  }

  const importQuestions = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const rows = parseCsv(String(reader.result || ''))
      const header = rows.shift()?.map((value) => value.toLowerCase().replace(/\s+/g, '')) || []
      const column = (names, fallback) => {
        const position = header.findIndex((name) => names.includes(name))
        return position >= 0 ? position : fallback
      }
      const numberColumn = column(['number', 'stt', 'id', 'cau'], -1)
      const topicColumn = column(['topic', 'chude'], 0)
      const questionColumn = column(['question', 'cauhoi'], 1)
      const answerColumn = column(['answer', 'dapan'], 2)
      const imageColumn = column(['imageurl', 'image', 'urlhinh'], 3)
      const detailColumn = column(['detail', 'mota'], 4)
      const next = [...questionData]
      const topicPositions = {}
      let imported = 0

      rows.forEach((row, rowIndex) => {
        const topicIndex = topics.findIndex((topic) => topic.toLowerCase() === (row[topicColumn] || '').toLowerCase())
        const fallbackIndex = topicIndex >= 0 ? topicIndex * 3 + (topicPositions[topicIndex] || 0) : rowIndex
        if (topicIndex >= 0) topicPositions[topicIndex] = (topicPositions[topicIndex] || 0) + 1
        const declaredIndex = numberColumn >= 0 ? Number(row[numberColumn]) - 1 : fallbackIndex
        if (!Number.isInteger(declaredIndex) || declaredIndex < 0 || declaredIndex >= next.length || !row[questionColumn]) return
        next[declaredIndex] = {
          ...next[declaredIndex],
          question: row[questionColumn],
          label: row[answerColumn] || next[declaredIndex].label,
          imageUrl: row[imageColumn] || '',
          detail: row[detailColumn] || (topicIndex >= 0 ? topics[topicIndex] : next[declaredIndex].detail),
        }
        imported += 1
      })
      setQuestionData(next)
      setImportMessage(imported ? `Đã nhập ${imported} câu hỏi.` : 'Không tìm thấy câu hỏi hợp lệ trong file CSV.')
      event.target.value = ''
    }
    reader.readAsText(file, 'utf-8')
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div className="brand-line">
          <div className="matsuri-key-visual"><div className="matsuri-logos"><img className="ceyc-combined-logo" src={`${import.meta.env.BASE_URL}ceyc-matsuri-full.png`} alt="Logo CeYc Matsuri" /></div></div>
          <div className="status-controls"><div className="progress"><span>{revealedCount}</span> / {questionData.length} câu hỏi</div><label className="hint-mode">Mở gợi ý sau <select value={hintThreshold} onChange={(event) => setHintThreshold(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} điểm</option>)}</select></label><button className="setup-button" onClick={() => setUltimateHintModal(true)}>Mở gợi ý tối thượng</button><button className="setup-button" onClick={() => setIsEditor(true)}>Thiết lập</button></div>
        </div>
        <div className="overview">
          <button className="master-question" onClick={() => setWinnerModal(true)}><span>Thử thách tối thượng</span><strong>{winner ? `Đội chiến thắng: Đội ${winner === 'green' ? 'Xanh' : 'Đỏ'}` : overallQuestion}</strong></button>
          <div className={`team-score team-green ${priorityTeam === 'green' ? 'is-priority' : ''}`}><span>Đội Xanh</span><strong>{greenScore}</strong><small>điểm</small>{priorityTeam === 'green' && <em>Ưu tiên trả lời</em>}</div>
          <div className={`team-score team-red ${priorityTeam === 'red' ? 'is-priority' : ''}`}><span>Đội Đỏ</span><strong>{redScore}</strong><small>điểm</small>{priorityTeam === 'red' && <em>Ưu tiên trả lời</em>}</div>
        </div>
      </header>

      <section className={`hint-grid ${showUltimateHint ? 'has-ultimate-hint' : ''}`} aria-label="Gợi ý">
        {[0, 1, 2].map((index) => <div key={index} className={`hint-card ${openedHints.includes(index) ? 'is-unlocked' : 'is-locked'}`} aria-label={openedHints.includes(index) ? `Gợi ý ${index + 1}: ${hintTexts[index]}` : `Gợi ý ${index + 1} đang khóa`}><span>{openedHints.includes(index) ? hintTexts[index] : '?'}</span></div>)}
        {showUltimateHint && <button className={`hint-card ultimate-hint ${ultimateHintOpened ? 'is-unlocked' : ''}`} onClick={() => !ultimateHintOpened && setUltimateHintModal(true)} aria-label="Mở gợi ý tối thượng"><span>{ultimateHintOpened ? ultimateHintQuestion : 'Gợi ý tối thượng'}</span>{!ultimateHintOpened && <b>?</b>}</button>}
      </section>

      <section className="question-grid" aria-label="Bảng câu hỏi">
        {questionData.map((item, index) => {
          const result = results[index]
          const isOpen = result === 'green' || result === 'red'
          const isWrong = result === 'wrong'
          const hasLongAnswer = item.label.trim().length > 14
          return (
            <button
              className={`question-card ${isOpen ? 'is-open' : ''} ${isWrong ? 'is-wrong' : ''} ${hasLongAnswer ? 'has-long-answer' : ''}`}
              key={item.label}
              onClick={() => !result && setSelected(index)}
              disabled={Boolean(result)}
            >
              {!isOpen && !isWrong && <span className="card-preview">{genericQuestionIcons[index]}</span>}
              {isOpen && <span className="card-icon">✓</span>}
              <strong className={isOpen ? 'revealed-answer' : ''}>{isOpen ? '✓' : String(index + 1).padStart(2, '0')}</strong>
              {isWrong && <small>Đáp án không đúng</small>}
            </button>
          )
        })}
      </section>

      {selected !== null && (
        <div className="modal-backdrop" role="presentation">
          <section className="answer-modal" role="dialog" aria-modal="true" aria-labelledby="question-title">
            <button className="close-modal" onClick={() => setSelected(null)} aria-label="Đóng">×</button>
            <p className="modal-label">CÂU HỎI {String(selected + 1).padStart(2, '0')}</p>
            <h2 id="question-title">{questionData[selected].question}</h2>
            {questionData[selected].imageUrl && <img className="question-image" src={questionData[selected].imageUrl} alt="Hình minh họa câu hỏi" />}
            <p className="modal-question">Hãy nghe phần trả lời của người chơi, sau đó chọn kết quả chấm.</p>
            <div className="modal-actions">
              <button className="wrong-action" onClick={() => markAnswer('wrong')}>Sai</button>
              <button className="green-action" onClick={() => markAnswer('green')}>Đội Xanh đúng</button>
              <button className="red-action" onClick={() => markAnswer('red')}>Đội Đỏ đúng</button>
            </div>
          </section>
        </div>
      )}

      {hintPrompt && (
        <div className="modal-backdrop" role="presentation">
          <section className="answer-modal hint-modal" role="dialog" aria-modal="true">
            <p className="modal-label">CHỌN MỘT GỢI Ý</p>
            <h2>Mở ô nào?</h2>
            <div className="hint-picker">{[0, 1, 2].map((index) => <button key={index} disabled={openedHints.includes(index)} onClick={() => { setOpenedHints([...openedHints, index]); setHintOwners({ ...hintOwners, [index]: hintPrompt.team }); setHintPrompt(null) }}>?</button>)}</div>
          </section>
        </div>
      )}

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

      {ultimateHintModal && (
        <div className="modal-backdrop" role="presentation">
          <section className="answer-modal hint-modal" role="dialog" aria-modal="true">
            <button className="close-modal" onClick={() => setUltimateHintModal(false)} aria-label="Đóng">×</button>
            <p className="modal-label">GỢI Ý TỐI THƯỢNG</p>
            <h2>{ultimateHintQuestion}</h2>
            <p className="modal-question">Câu hỏi này tách biệt với thử thách tối thượng.</p>
            <div className="modal-actions two-actions"><button className="wrong-action" onClick={() => setUltimateHintModal(false)}>Đóng</button><button className="green-action" onClick={() => { setUltimateHintOpened(true); setUltimateHintModal(false) }}>Mở gợi ý</button></div>
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
              <div><span>NHẬP NHANH</span><h2>Import câu hỏi từ CSV</h2><p>Dùng các cột: <b>topic, question, answer, imageUrl, detail</b>. Có thể thêm cột <b>number</b> (01–08) để chọn đúng vị trí câu hỏi.</p></div>
              <label className="csv-upload">Chọn file CSV<input type="file" accept=".csv,text/csv" onChange={importQuestions} /></label>
              {importMessage && <small>{importMessage}</small>}
            </section>
            <label className="field full-field">Câu hỏi tổng thể<input value={overallQuestion} onChange={(event) => setOverallQuestion(event.target.value)} /></label>
            <label className="field full-field">Câu hỏi Gợi ý tối thượng<input value={ultimateHintQuestion} onChange={(event) => setUltimateHintQuestion(event.target.value)} /></label>
            <label className="field full-field">Thời gian đếm ngược Thử thách tối thượng (giây)<input type="number" min="1" value={countdownDuration} onChange={(event) => setCountdownDuration(Math.max(1, Number(event.target.value) || 1))} /></label>
            <div className="hint-fields">{hintTexts.map((hint, index) => <label className="field" key={index}>Gợi ý {index + 1}<input value={hint} onChange={(event) => setHintTexts(hintTexts.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} /></label>)}</div>
            <div className="editor-topics">{topics.map((topic, topicIndex) => <section className="editor-topic" key={topic}><header><span>CHỦ ĐỀ {String(topicIndex + 1).padStart(2, '0')}</span><h2>{topic}</h2><small>Câu {String(topicIndex * 3 + 1).padStart(2, '0')}–{String(topicIndex * 3 + 3).padStart(2, '0')}</small></header><div className="question-fields">{questionData.slice(topicIndex * 3, topicIndex * 3 + 3).map((item, relativeIndex) => { const index = topicIndex * 3 + relativeIndex; return <article className="edit-question" key={index}><b>{String(index + 1).padStart(2, '0')}</b><label className="field">Câu hỏi<input value={item.question} onChange={(event) => setQuestionData(questionData.map((value, itemIndex) => itemIndex === index ? { ...value, question: event.target.value } : value))} /></label><label className="field">URL hình ảnh<input placeholder="https://example.com/image.jpg" value={item.imageUrl} onChange={(event) => setQuestionData(questionData.map((value, itemIndex) => itemIndex === index ? { ...value, imageUrl: event.target.value } : value))} /></label><label className="field">Đáp án khi mở ô<input value={item.label} onChange={(event) => setQuestionData(questionData.map((value, itemIndex) => itemIndex === index ? { ...value, label: event.target.value } : value))} /></label><label className="field">Mô tả<input value={item.detail} onChange={(event) => setQuestionData(questionData.map((value, itemIndex) => itemIndex === index ? { ...value, detail: event.target.value } : value))} /></label></article>})}</div></section>)}</div>
          </div>
        </section>
      )}

      <footer>Company Trip 2026 <span>·</span> Cùng khám phá, cùng kết nối</footer>
    </main>
  )
}

export default App
