import { useEffect, useState } from "react";
import { fetchTruth, fetchLies } from "../../api";
import FactBox from "../../components/FactBox";
import Header from "../../components/Header";
import StatusMessage from "../../components/StatusMessage";
import { useTimer } from "../hooks/useTimer.ts";
import Scoreboard from "../Scoreboard";
import redheart from "../../assets/redheart.png";
import blackheart from "../../assets/blackheart.png";

export default function GamePage({
  mode,
  onBack,
}: {
  mode: "classic" | "timer";
  onBack: () => void;
}) {
  const [facts, setFacts] = useState<string[]>([]);
  const [correctIndex, setCorrectIndex] = useState<number>(-1);
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [highscore, setHighscore] = useState(() => {
    const saved = localStorage.getItem("highscore");
    return saved ? Number(saved) : 0;
  });
  const [highscores, setHighscores] = useState<number[]>(() => {
    const saved = localStorage.getItem("highscores");
    return saved ? JSON.parse(saved) : [];
  });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useTimer(10, () => {
    if (
      clickedIndex === null &&
      facts.length > 0 &&
      !status.startsWith("Fehler") &&
      mode !== "classic"
    ) {
      handleClick(-1);
    }
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [mistakes, setMistakes] = useState(0);

  useEffect(() => {
    localStorage.setItem("highscores", JSON.stringify(highscores));
  }, [highscores]);

  useEffect(() => {
    localStorage.setItem("highscore", String(highscore));
  }, [highscore]);

  const generateFacts = async () => {
    setLoading(true);
    if (!isInitialLoad) {
      setClickedIndex(null);
      setStatus("");
    }

    try {
      const [truth, lies] = await Promise.all([fetchTruth(), fetchLies()]);
      if (!Array.isArray(lies)) {
        setStatus("Fehler beim Laden der Lügen. Bitte Backend prüfen!");
        setLoading(false);
        if (mode === "timer") setTimer(0);
        setFacts([]);
        setCorrectIndex(-1);
        return;
      }
      const combined = [...lies, truth].sort(() => Math.random() - 0.5);
      setFacts(combined);
      setCorrectIndex(combined.indexOf(truth));
      if (mode === "timer") setTimer(10);
    } catch (e) {
      setStatus("Fehler beim Laden der Fakten.");
      if (mode === "timer") setTimer(0);
      setFacts([]);
      setCorrectIndex(-1);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    generateFacts();
  }, []);

  const handleClick = (index: number) => {
    if (clickedIndex !== null || loading || facts.length === 0) return;

    setClickedIndex(index);
    const isCorrect = index === correctIndex;

    if (isCorrect) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setHighscore((prev) => Math.max(prev, nextStreak));
      setStatus("✅ Richtig!");
      setTimeout(() => generateFacts(), 2000);
    } else {
      if (mode === "classic") {
        const newMistakes = mistakes + 1;
        setMistakes(newMistakes);
        if (newMistakes >= 3) {
          if (streak > 0) {
            setHighscores((prev) => {
              const newScores = [...prev, streak]
                .filter((score) => score > 0)
                .sort((a, b) => b - a)
                .slice(0, 5);
              return newScores;
            });
          }
          setStatus("❌ Game Over! Deine Streak war " + streak);
          setStreak(0);
        } else {
          setStatus("❌ Falsch!");
          setTimeout(() => generateFacts(), 2000);
        }
      } else {
        if (streak > 0) {
          setHighscores((prev) => {
            const newScores = [...prev, streak]
              .filter((score) => score > 0)
              .sort((a, b) => b - a)
              .slice(0, 5);
            return newScores;
          });
        }
        setStatus("❌ Game Over! Deine Streak war " + streak);
        setStreak(0);
        setTimer(0);
      }
    }
  };

  const handleRestart = () => {
    setStatus("");
    setClickedIndex(null);
    setStreak(0);
    setMistakes(0);
    generateFacts();
  };

  return (
    <div className="game-container">
      <Header onBack={onBack} />

      {mode === "classic" && (
        <div
          style={{
            position: "absolute",
            top: 110,
            left: 20,
            display: "flex",
            gap: 2,
            zIndex: 2,
          }}
        >
          {[0, 1, 2].map((i) => (
            <img
              key={i}
              src={i < 3 - mistakes ? redheart : blackheart}
              alt="heart"
              width={56}
              height={56}
              style={{ display: "block" }}
            />
          ))}
        </div>
      )}

      <Scoreboard highscores={highscores} />

      <div style={{ marginTop: 20, marginBottom: 10 }}>
        <div style={{ fontSize: "0.9em" }}>
          🔥 Streak: {streak} | 🏆 Highscore: {highscore}
        </div>
      </div>

      {loading ? (
        <p className="loading-text">
          Fakten werden geladen<span className="loading-dots"></span>
        </p>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {facts.map((fact, idx) => (
              <FactBox
                key={idx}
                fact={fact}
                onClick={() => handleClick(idx)}
                selected={clickedIndex !== null && clickedIndex === idx}
                isCorrect={idx === correctIndex}
                showCorrect={
                  clickedIndex !== null &&
                  idx === correctIndex &&
                  (clickedIndex !== correctIndex ||
                    clickedIndex === correctIndex)
                }
              />
            ))}
          </div>
          <StatusMessage text={status} />
          {status.startsWith("❌ Game Over") && (
            <button
              style={{
                marginTop: 12,
                padding: "8px 18px",
                fontSize: "1rem",
                borderRadius: 6,
                border: "none",
                background: "#2ecc40",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "bold",
              }}
              onClick={handleRestart}
            >
              Spiel neu starten
            </button>
          )}
          {mode === "timer" &&
            clickedIndex === null &&
            !status.startsWith("Fehler") &&
            facts.length > 0 && (
              <div className="timer-display">⏱️ Zeit: {timer}s</div>
            )}
        </>
      )}
    </div>
  );
}
