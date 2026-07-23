export type Suit = "S" | "C" | "D" | "H";
export type Card = { rank: number; suit: Suit; id: string };
export type HandScore = { category: number; keys: number[]; label: string };
export type Arrangement = { front: Card[]; middle: Card[]; back: Card[]; value: number };

export const PLAYERS = ["Anh", "Tuấn", "Hùng", "Minh"] as const;
export const SUITS: Suit[] = ["S", "C", "D", "H"];
export const RANK_LABEL: Record<number, string> = {
  2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8",
  9: "9", 10: "10", 11: "J", 12: "Q", 13: "K", 14: "A",
};

const LABELS: Record<number, string> = {
  0: "Mậu thầu", 1: "Đôi", 2: "Thú", 3: "Sám cô", 4: "Sảnh",
  5: "Thùng", 6: "Cù lũ", 7: "Tứ quý", 8: "Thùng phá sảnh",
};

export const createDeck = (): Card[] => {
  const cards: Card[] = [];
  for (let rank = 2; rank <= 14; rank++) {
    for (const suit of SUITS) cards.push({ rank, suit, id: `${rank}${suit}` });
  }
  return cards;
};

export const shuffle = (input: Card[]): Card[] => {
  const deck = input.slice();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const dealVerified = (): Card[][] => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const deck = shuffle(createDeck());
    const unique = new Set(deck.map((card) => card.id));
    const aces = deck.filter((card) => card.rank === 14).length;
    if (deck.length === 52 && unique.size === 52 && aces === 4) {
      return [0, 1, 2, 3].map((i) => deck.slice(i * 13, i * 13 + 13));
    }
  }
  throw new Error("Không thể tạo bộ bài hợp lệ");
};

const straightHigh = (cards: Card[]): number | null => {
  const ranks = [...new Set(cards.map((card) => card.rank))].sort((a, b) => a - b);
  if (ranks.length !== cards.length) return null;
  if (cards.length === 5 && ranks.join(",") === "2,3,4,5,14") return 5;
  if (cards.length === 3 && ranks.join(",") === "2,3,14") return 3;
  for (let i = 1; i < ranks.length; i++) if (ranks[i] !== ranks[i - 1] + 1) return null;
  return ranks[ranks.length - 1];
};

export const evaluate = (cards: Card[]): HandScore => {
  const groups = new Map<number, number>();
  for (const card of cards) groups.set(card.rank, (groups.get(card.rank) || 0) + 1);
  const grouped = [...groups.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const ranks = cards.map((card) => card.rank).sort((a, b) => b - a);

  if (cards.length === 3) {
    if (grouped[0][1] === 3) return { category: 3, keys: [grouped[0][0]], label: "Sám cô" };
    if (grouped[0][1] === 2) return { category: 1, keys: [grouped[0][0], grouped[1][0]], label: "Đôi" };
    return { category: 0, keys: ranks, label: "Mậu thầu" };
  }

  const flush = cards.every((card) => card.suit === cards[0].suit);
  const straight = straightHigh(cards);
  let category = 0;
  let keys = ranks;
  if (flush && straight !== null) { category = 8; keys = [straight]; }
  else if (grouped[0][1] === 4) { category = 7; keys = [grouped[0][0], grouped[1][0]]; }
  else if (grouped[0][1] === 3 && grouped[1][1] === 2) { category = 6; keys = [grouped[0][0], grouped[1][0]]; }
  else if (flush) { category = 5; }
  else if (straight !== null) { category = 4; keys = [straight]; }
  else if (grouped[0][1] === 3) { category = 3; keys = grouped.map(([rank]) => rank); }
  else if (grouped[0][1] === 2 && grouped[1][1] === 2) { category = 2; keys = grouped.map(([rank]) => rank); }
  else if (grouped[0][1] === 2) { category = 1; keys = grouped.map(([rank]) => rank); }
  return { category, keys, label: LABELS[category] };
};

export const compareScores = (a: HandScore, b: HandScore): number => {
  if (a.category !== b.category) return Math.sign(a.category - b.category);
  const len = Math.max(a.keys.length, b.keys.length);
  for (let i = 0; i < len; i++) {
    const diff = (a.keys[i] || 0) - (b.keys[i] || 0);
    if (diff) return Math.sign(diff);
  }
  return 0;
};

export const compareHands = (a: Card[], b: Card[]) => compareScores(evaluate(a), evaluate(b));

export const isFoul = (arrangement: Pick<Arrangement, "front" | "middle" | "back">) =>
  compareHands(arrangement.middle, arrangement.front) < 0 ||
  compareHands(arrangement.back, arrangement.middle) < 0;

const strength = (cards: Card[], position: number): number => {
  const score = evaluate(cards);
  const key = score.keys.reduce((acc, rank, i) => acc + rank / Math.pow(15, i + 1), 0);
  const base = score.category * 1.8 + key;
  const positionTarget = position === 0 ? 1.3 : position === 1 ? 4.3 : 5.5;
  return base - Math.abs(base - positionTarget) * 0.08;
};

const royalty = (cards: Card[], position: number): number => {
  const category = evaluate(cards).category;
  if (position === 0 && category === 3) return 3;
  if (position === 1 && category === 6) return 2;
  if (position === 1 && category === 7) return 8;
  if (position === 1 && category === 8) return 10;
  if (position === 2 && category === 7) return 4;
  if (position === 2 && category === 8) return 5;
  return 0;
};

const combinations = (n: number, k: number): number[][] => {
  const out: number[][] = [];
  const picked: number[] = [];
  const walk = (start: number) => {
    if (picked.length === k) { out.push(picked.slice()); return; }
    for (let i = start; i <= n - (k - picked.length); i++) {
      picked.push(i); walk(i + 1); picked.pop();
    }
  };
  walk(0);
  return out;
};

const FRONT_COMBOS = combinations(13, 3);
const MIDDLE_COMBOS = combinations(10, 5);

export const arrangeBest = (cards: Card[]): Arrangement => {
  let best: Arrangement | null = null;
  for (const frontIndexes of FRONT_COMBOS) {
    const frontSet = new Set(frontIndexes);
    const rest = cards.filter((_, i) => !frontSet.has(i));
    const front = frontIndexes.map((i) => cards[i]);
    for (const middleIndexes of MIDDLE_COMBOS) {
      const middleSet = new Set(middleIndexes);
      const middle = middleIndexes.map((i) => rest[i]);
      const back = rest.filter((_, i) => !middleSet.has(i));
      const candidate = { front, middle, back, value: -Infinity };
      if (isFoul(candidate)) continue;
      const p = [strength(front, 0), strength(middle, 1), strength(back, 2)];
      const balance = Math.min(...p) * 0.35;
      const sweep = Math.max(0, p[0]) * Math.max(0, p[1]) * Math.max(0, p[2]) * 0.002;
      candidate.value = p[0] + p[1] + p[2] + balance + sweep +
        royalty(front, 0) + royalty(middle, 1) + royalty(back, 2);
      if (!best || candidate.value > best.value) best = candidate;
    }
  }
  if (!best) throw new Error("Không tìm được cách xếp hợp lệ");
  return best;
};

// Các mức 3/2/4/8/5/10 là TỔNG chi của hàng thắng, không phải chi cộng thêm.
const handPoints = (winner: Card[], position: number) => royalty(winner, position) || 1;

export type ScoreResult = { scores: number[]; lines: string[]; sweepBy: number | null };

export const scoreRound = (arrangements: Arrangement[], dealer: number, hands: Card[][]): ScoreResult => {
  const scores = [0, 0, 0, 0];
  const lines: string[] = [];
  const swept = [0, 0, 0, 0];
  const pairRecords: { i: number; j: number; base: number }[] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const wins = [0, 0];
      let base = 0;
      let bonus = 0;
      const ai = arrangements[i], aj = arrangements[j];
      const rows: [Card[], Card[]][] = [[ai.front, aj.front], [ai.middle, aj.middle], [ai.back, aj.back]];
      rows.forEach(([left, right], position) => {
        let cmp = compareHands(left, right);
        if (cmp === 0) cmp = dealer === i ? 1 : dealer === j ? -1 : 0;
        if (cmp > 0) {
          base += 1;
          bonus += handPoints(left, position) - 1;
          wins[0]++;
        }
        if (cmp < 0) {
          base -= 1;
          bonus -= handPoints(right, position) - 1;
          wins[1]++;
        }
      });
      if (wins[0] === 3 || wins[1] === 3) {
        base *= 2;
        const winner = wins[0] === 3 ? i : j;
        swept[winner]++;
        lines.push(`💥 ${PLAYERS[winner]} sập hầm ${PLAYERS[winner === i ? j : i]}`);
      } else {
        const pair = base + bonus;
        const winner = pair > 0 ? i : j;
        lines.push(`${PLAYERS[winner]} ${pair === 0 ? "hoà" : `ăn ${Math.abs(pair)} chi của ${PLAYERS[winner === i ? j : i]}`}`);
      }
      const pair = base + bonus;
      pairRecords.push({ i, j, base });
      scores[i] += pair; scores[j] -= pair;
    }
  }

  const sweepBy = swept.findIndex((count) => count === 3);
  if (sweepBy >= 0) {
    for (const record of pairRecords) {
      if (record.i !== sweepBy && record.j !== sweepBy) continue;
      // Sập cả bàn: nhân đôi thêm phần so ba chi; thưởng hàng không bị nhân.
      scores[record.i] += record.base;
      scores[record.j] -= record.base;
    }
    lines.unshift(`💥💥💥 ${PLAYERS[sweepBy]} SẬP HẦM CẢ BÀN — điểm so chi nhân đôi`);
  }

  const aceCounts = hands.map((hand) => hand.filter((card) => card.rank === 14).length);
  const fourAces = aceCounts.findIndex((count) => count === 4);
  const arrangedFourAces = fourAces >= 0 && [arrangements[fourAces].middle, arrangements[fourAces].back]
    .some((row) => row.filter((card) => card.rank === 14).length === 4);
  if (arrangedFourAces) {
    lines.push(`🅰️🅰️🅰️🅰️ ${PLAYERS[fourAces]} xếp tứ quý A — tính thưởng tứ quý theo vị trí, không cộng chi Át`);
  } else {
    aceCounts.forEach((count, i) => scores[i] += count * 4 - 4);
    lines.push(`🅰️ Chi Át: ${aceCounts.map((count, i) => `${PLAYERS[i]} ${count}A`).join(" · ")}`);
  }
  return { scores, lines, sweepBy: sweepBy >= 0 ? sweepBy : null };
};

export const sortCards = (cards: Card[]) => cards.slice().sort((a, b) => b.rank - a.rank || SUITS.indexOf(b.suit) - SUITS.indexOf(a.suit));
