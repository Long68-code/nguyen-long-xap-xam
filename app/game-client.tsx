"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Arrangement, Card, PLAYERS, RANK_LABEL, arrangeBest, dealVerified, evaluate,
  isFoul, scoreRound, sortCards,
} from "../lib/game";

type Zone = "rack" | "front" | "middle" | "back";
type Screen = "arrange" | "reveal" | "tournament" | "settings";
type Saved = { money: number[]; total: number[]; games: number; dealer: number; muted: boolean };

const INITIAL: Saved = { money: [500, 500, 500, 500], total: [0, 0, 0, 0], games: 0, dealer: 0, muted: false };
const cap: Record<Zone, number> = { rack: 13, front: 3, middle: 5, back: 5 };

function SuitIcon({ suit }: { suit: Card["suit"] }) {
  const red = suit === "H" || suit === "D";
  const shapes = {
    H: "M12 21S3 14.7 3 8.7C3 5.5 5.4 3 8.4 3c1.8 0 3 1 3.6 2.2C12.6 4 13.8 3 15.6 3 18.6 3 21 5.5 21 8.7 21 14.7 12 21 12 21Z",
    D: "M12 1 21 12 12 23 3 12 12 1Z",
    S: "M12 2S3 9.2 3 14c0 3 2.2 5 5 5 1 0 2-.3 2.7-.9L9 22h6l-1.7-3.9c.7.6 1.7.9 2.7.9 2.8 0 5-2 5-5 0-4.8-9-12-9-12Z",
    C: "M12 3a4.5 4.5 0 0 0-3.8 6.9A4.5 4.5 0 1 0 9 18.7L7.4 22h9.2L15 18.7a4.5 4.5 0 1 0 .8-8.8A4.5 4.5 0 0 0 12 3Z",
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={red ? "suit red" : "suit"}><path d={shapes[suit]} /></svg>;
}

function PlayingCard({ card, selected, hidden, onClick, compact = false }: {
  card?: Card; selected?: boolean; hidden?: boolean; onClick?: () => void; compact?: boolean;
}) {
  if (hidden) return <div className={`card back ${compact ? "compact" : ""}`} aria-label="Lá bài úp"><span /></div>;
  if (!card) return <div className={`card slot ${compact ? "compact" : ""}`} aria-hidden="true" />;
  const red = card.suit === "H" || card.suit === "D";
  return (
    <button className={`card ${compact ? "compact" : ""} ${selected ? "selected" : ""} ${red ? "red-card" : ""}`}
      onClick={onClick} aria-label={`${RANK_LABEL[card.rank]} ${card.suit}`} type="button">
      <span className="corner"><b>{RANK_LABEL[card.rank]}</b><SuitIcon suit={card.suit} /></span>
      <span className="center-suit"><SuitIcon suit={card.suit} /></span>
    </button>
  );
}

function HandRow({ title, cards, capacity, selected, onCard, onDrop }: {
  title: string; cards: Card[]; capacity: number; selected: Set<string>; onCard: (card: Card) => void; onDrop: () => void;
}) {
  const label = cards.length === capacity ? evaluate(cards).label : `${cards.length}/${capacity} lá`;
  return (
    <section className="hand-row" onClick={onDrop}>
      <div className="hand-heading"><span>{title}</span><strong>{label}</strong></div>
      <div className={`card-grid cols-${capacity}`}>
        {Array.from({ length: capacity }).map((_, i) => <PlayingCard key={cards[i]?.id || `slot-${i}`} card={cards[i]}
          selected={cards[i] ? selected.has(cards[i].id) : false} onClick={cards[i] ? (e => { e.stopPropagation(); onCard(cards[i]); }) : undefined} />)}
      </div>
    </section>
  );
}

export default function GameClient() {
  const [saved, setSaved] = useState<Saved>(INITIAL);
  const [screen, setScreen] = useState<Screen>("arrange");
  // Chia bài sau khi app đã nằm trên thiết bị. Không chia trong lúc dựng HTML
  // phía máy chủ, nếu không hai phía bốc hai bộ ngẫu nhiên khác nhau.
  const [hands, setHands] = useState<Card[][]>([[], [], [], []]);
  const [zones, setZones] = useState<Record<Zone, Card[]>>({ rack: [], front: [], middle: [], back: [] });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [arrangements, setArrangements] = useState<Arrangement[] | null>(null);
  const [reveal, setReveal] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  const [roundScores, setRoundScores] = useState([0, 0, 0, 0]);
  const [thinking, setThinking] = useState(false);
  const [message, setMessage] = useState("Chạm lá để chọn, rồi chạm vào một chi");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("xap-xam-nguyen-long-v2");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.money) && parsed.money.length === 4 && parsed.money.every(Number.isFinite) &&
          Array.isArray(parsed.total) && parsed.total.length === 4 && parsed.total.every(Number.isFinite) &&
          Number.isInteger(parsed.games) && parsed.games >= 0 && Number.isInteger(parsed.dealer)) setSaved(parsed);
    } catch { /* dữ liệu hỏng: giữ mặc định */ }
  }, []);
  useEffect(() => {
    const dealt = dealVerified().map(sortCards);
    setHands(dealt);
    setZones({ rack: dealt[0], front: [], middle: [], back: [] });
  }, []);
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  useEffect(() => { localStorage.setItem("xap-xam-nguyen-long-v2", JSON.stringify(saved)); }, [saved]);

  const selectedCards = useMemo(() => Object.values(zones).flat().filter((card) => selected.has(card.id)), [zones, selected]);
  const toggle = (card: Card) => setSelected((old) => {
    const next = new Set(old); next.has(card.id) ? next.delete(card.id) : next.add(card.id); return next;
  });
  const move = (target: Zone) => {
    if (!selectedCards.length) return;
    const available = target === "rack" ? 13 : cap[target] - zones[target].length;
    const moving = selectedCards.slice(0, available);
    setZones((old) => {
      const next = { ...old };
      (Object.keys(next) as Zone[]).forEach((zone) => next[zone] = next[zone].filter((card) => !moving.some((m) => m.id === card.id)));
      next[target] = [...next[target], ...moving];
      return next;
    });
    setSelected(new Set());
  };

  const autoArrange = async () => {
    setThinking(true); setMessage("Máy đang quét đủ 72.072 cách xếp…");
    await new Promise((resolve) => setTimeout(resolve, 30));
    const best = arrangeBest(hands[0]);
    setZones({ rack: [], front: best.front, middle: best.middle, back: best.back });
    setThinking(false); setMessage("Đã chọn cách cân bằng sức mạnh và rủi ro sập hầm");
  };

  const finish = async () => {
    if (zones.rack.length || zones.front.length !== 3 || zones.middle.length !== 5 || zones.back.length !== 5) {
      setMessage("Cần xếp đủ 3 · 5 · 5 lá trước khi ra sảnh"); return;
    }
    const player = { front: zones.front, middle: zones.middle, back: zones.back, value: 0 };
    if (isFoul(player)) { setMessage("⚠️ Binh lủng: chi đầu ≤ chi giữa ≤ chi cuối"); return; }
    setThinking(true); setMessage("Ba nhà đang chốt bài…");
    await new Promise((resolve) => setTimeout(resolve, 40));
    const all = [player, arrangeBest(hands[1]), arrangeBest(hands[2]), arrangeBest(hands[3])];
    setArrangements(all); setReveal(1); setScreen("reveal"); setThinking(false);
    let shown = 1;
    const timer = window.setInterval(() => {
      shown += 1; setReveal(Math.min(shown, 4));
      if (shown >= 4) {
        clearInterval(timer);
        const result = scoreRound(all, saved.dealer, hands);
        setRoundScores(result.scores); setLines(result.lines);
        setSaved((old) => ({
          money: old.money.map((money, i) => money + result.scores[i]),
          total: old.total.map((score, i) => score + result.scores[i]),
          games: old.games + 1, dealer: (old.dealer + 1) % 4, muted: old.muted,
        }));
      }
    }, 650);
  };

  const newRound = () => {
    const dealt = dealVerified().map(sortCards);
    setHands(dealt); setZones({ rack: dealt[0], front: [], middle: [], back: [] });
    setArrangements(null); setReveal(0); setLines([]); setRoundScores([0, 0, 0, 0]);
    setSelected(new Set()); setMessage("Chạm lá để chọn, rồi chạm vào một chi"); setScreen("arrange");
  };

  const resetTournament = () => {
    if (confirm("Làm lại toàn bộ giải đấu và đưa mỗi người về 500đ?")) {
      setSaved({ ...INITIAL, muted: saved.muted }); newRound();
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><p className="eyebrow">NGUYEN LONG CASINO</p><h1>Binh Xập Xám</h1></div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setSaved((s) => ({ ...s, muted: !s.muted }))} aria-label="Bật tắt âm thanh">{saved.muted ? "🔇" : "🔊"}</button>
          <button className="icon-btn" onClick={() => setScreen("settings")} aria-label="Cài đặt">⚙</button>
        </div>
      </header>

      <section className="bank-strip">
        {PLAYERS.map((name, i) => <div className={`bank-cell ${i === saved.dealer ? "dealer" : ""}`} key={name}>
          <span>{i === saved.dealer ? "CÁI · " : ""}{name}</span><b>{saved.money[i]}đ</b>
        </div>)}
      </section>

      {screen === "arrange" && (
        <>
          <div className="status-card"><span className="pulse-dot" /><p>{thinking ? "Đang tính nước đi tốt nhất" : message}</p></div>
          <div className="felt-panel">
            <HandRow title="CHI ĐẦU · YẾU NHẤT" cards={zones.front} capacity={3} selected={selected} onCard={toggle} onDrop={() => move("front")} />
            <HandRow title="CHI GIỮA" cards={zones.middle} capacity={5} selected={selected} onCard={toggle} onDrop={() => move("middle")} />
            <HandRow title="CHI CUỐI · MẠNH NHẤT" cards={zones.back} capacity={5} selected={selected} onCard={toggle} onDrop={() => move("back")} />
          </div>
          <div className="rack-wrap">
            <div className="rack-label"><span>BÀI CỦA ANH</span><button onClick={() => move("rack")} disabled={!selected.size}>Thu về</button></div>
            <div className="rack-grid">
              {hands[0].map((original) => {
                const card = zones.rack.find((item) => item.id === original.id);
                return <PlayingCard key={original.id} card={card} selected={card ? selected.has(card.id) : false} onClick={card ? () => toggle(card) : undefined} />;
              })}
            </div>
          </div>
          <div className="action-dock">
            <button className="secondary-action" disabled={thinking} onClick={autoArrange}>✦ Máy xếp giúp</button>
            <button className="primary-action" disabled={thinking} onClick={finish}>Xong · Ra sảnh</button>
          </div>
        </>
      )}

      {screen === "reveal" && arrangements && (
        <section className="casino-table">
          <div className="table-glow" />
          {PLAYERS.map((name, i) => {
            const visible = i < reveal || i === 0;
            const arr = arrangements[i];
            return <article className={`seat seat-${i} ${i === saved.dealer ? "is-dealer" : ""}`} key={name}>
              <div className="seat-title"><span>{name}{i === saved.dealer && <em>CÁI</em>}</span><b className={roundScores[i] >= 0 ? "positive" : "negative"}>{lines.length ? `${roundScores[i] > 0 ? "+" : ""}${roundScores[i]} chi` : "Đang lật…"}</b></div>
              <div className="mini-hand">
                {[...arr.front, ...arr.middle, ...arr.back].map((card) => <PlayingCard key={card.id} card={visible ? card : undefined} hidden={!visible} compact />)}
              </div>
              {visible && <p>{evaluate(arr.front).label} · {evaluate(arr.middle).label} · {evaluate(arr.back).label}</p>}
            </article>;
          })}
          {lines.length > 0 && <div className="result-panel"><h2>{roundScores[0] > 0 ? `Anh thắng +${roundScores[0]} chi` : roundScores[0] < 0 ? `Anh thua ${Math.abs(roundScores[0])} chi` : "Anh hoà ván"}</h2>
            <p className="result-lines">{lines.join("  ·  ")}</p>
            <button className="primary-action" onClick={newRound}>Chia ván mới</button></div>}
        </section>
      )}

      {screen === "tournament" && <section className="modal-card page-card">
        <p className="eyebrow">GIẢI ĐẤU DÀI HƠI</p><h2>Bảng vàng casino</h2>
        <div className="leaderboard">{PLAYERS.map((name, i) => <div className="leader-row" key={name}><span>{Math.max(...saved.money) === saved.money[i] ? "👑" : `${i + 1}.`} {name}</span><b>{saved.money[i]}đ</b><small>{saved.total[i] > 0 ? "+" : ""}{saved.total[i]} chi</small></div>)}</div>
        <p className="games-count">Đã đấu {saved.games} ván · Tổng tiền bàn: {saved.money.reduce((a, b) => a + b, 0)}đ</p>
        <button className="danger-action" onClick={resetTournament}>Làm lại giải đấu</button>
      </section>}

      {screen === "settings" && <section className="modal-card page-card">
        <p className="eyebrow">PHÒNG ĐIỀU KHIỂN</p><h2>Cài đặt bàn chơi</h2>
        <label className="setting-row"><span>Âm thanh tổng<small>Câm tất cả tức thì</small></span><input type="checkbox" checked={!saved.muted} onChange={() => setSaved((s) => ({ ...s, muted: !s.muted }))} /></label>
        <div className="rule-summary"><h3>Luật nhà Nguyen Long</h3><p>2 bét bảng · A lớn nhất · sảnh bánh A-2-3-4-5 · hoà chi nhà cái thắng · sập hầm ×2 · sập cả bàn ×2 · chi Át · tứ quý A +4 chi mỗi nhà.</p></div>
        <button className="secondary-action full" onClick={() => setScreen("arrange")}>Về bàn xếp bài</button>
      </section>}

      <nav className="bottom-nav">
        <button className={screen === "arrange" ? "active" : ""} onClick={() => setScreen("arrange")}><span>♠</span>Bàn chơi</button>
        <button className={screen === "tournament" ? "active" : ""} onClick={() => setScreen("tournament")}><span>♛</span>Giải đấu</button>
        <button className={screen === "settings" ? "active" : ""} onClick={() => setScreen("settings")}><span>⚙</span>Cài đặt</button>
      </nav>
      <footer>Copyright © Nguyen Long 2026</footer>
    </main>
  );
}
