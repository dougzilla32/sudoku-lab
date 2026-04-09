export default function HomeScreen({ playerName, onChangeName, onPractice, onCreateGame, onJoinGame, onDailyPuzzle }) {
  return (
    <div className="home-screen">
      <div className="home-screen__header">
        <h1 className="home-screen__title">Sudoku Lab</h1>
        <p className="home-screen__subtitle">The multiplayer puzzle race</p>
      </div>

      <div className="home-screen__name">
        <span className="home-screen__greeting">Playing as</span>
        <button className="home-screen__name-btn" onClick={onChangeName}>
          {playerName}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 5 }}>
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>

      <div className="home-screen__buttons">
        <button className="home-btn home-btn--primary" onClick={onPractice}>
          <span className="home-btn__icon">🧩</span>
          <span className="home-btn__label">Practice</span>
          <span className="home-btn__sub">Solo puzzle, your pace</span>
        </button>

        <button className="home-btn home-btn--secondary" onClick={onCreateGame}>
          <span className="home-btn__icon">➕</span>
          <span className="home-btn__label">Create Game</span>
          <span className="home-btn__sub">Start a multiplayer game</span>
        </button>

        <button className="home-btn home-btn--secondary" onClick={onJoinGame}>
          <span className="home-btn__icon">🔗</span>
          <span className="home-btn__label">Join Game</span>
          <span className="home-btn__sub">Enter a game code</span>
        </button>

        <button className="home-btn home-btn--daily" onClick={onDailyPuzzle}>
          <span className="home-btn__icon">📅</span>
          <span className="home-btn__label">Daily Puzzle</span>
          <span className="home-btn__sub">Today's shared challenge</span>
        </button>
      </div>
    </div>
  )
}
