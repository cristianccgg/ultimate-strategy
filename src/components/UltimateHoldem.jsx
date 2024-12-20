import React, { useState, useEffect } from "react";
import { Plus, Minus, Trophy, XCircle, RotateCcw } from "lucide-react";

const rankNames = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "Jack",
  12: "Queen",
  13: "King",
  14: "Ace",
};

const suits = ["Hearts", "Diamonds", "Clubs", "Spades"];
const suitSymbols = { Hearts: "♥", Diamonds: "♦", Clubs: "♣", Spades: "♠" };

function isSuited(cards) {
  return cards[0].suit === cards[1].suit;
}

function hasStraightDraw(cards) {
  const ranks = cards.map((card) => card.rank).sort((a, b) => a - b);
  const uniqueRanks = [...new Set(ranks)];
  const gaps = [];

  for (let i = 0; i < uniqueRanks.length - 1; i++) {
    gaps.push(uniqueRanks[i + 1] - uniqueRanks[i]);
  }

  return gaps.filter((gap) => gap === 1).length >= 3;
}

function hasFlushDraw(cards) {
  const suitCounts = {};
  cards.forEach((card) => {
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
  });
  return Object.values(suitCounts).some((count) => count >= 4);
}

function hasPair(cards) {
  const ranks = cards.map((card) => card.rank);
  return ranks.some((r) => ranks.filter((x) => x === r).length >= 2);
}

function hasTrips(cards) {
  const ranks = cards.map((card) => card.rank);
  return ranks.some((r) => ranks.filter((x) => x === r).length >= 3);
}

function hasTwoPair(cards) {
  const rankCounts = {};
  cards.forEach((card) => {
    rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
  });
  return Object.values(rankCounts).filter((count) => count >= 2).length >= 2;
}

function getHandType(cards) {
  // Ordenar las cartas por el valor de su rango
  const sortedCards = cards.sort((a, b) => a.rank - b.rank);
  const ranks = sortedCards.map((card) => card.rank);
  const suits = sortedCards.map((card) => card.suit);

  // Verificar pares, tríos y más
  const rankCounts = {};
  ranks.forEach((rank) => {
    rankCounts[rank] = (rankCounts[rank] || 0) + 1;
  });

  // Comprobar si se tiene una escalera
  const isStraight =
    ranks.length >= 5 &&
    new Set(ranks).size === ranks.length &&
    Math.max(...ranks) - Math.min(...ranks) === ranks.length - 1;

  // Comprobar si se tiene un color
  const isFlush = suits.some(
    (suit) => suits.filter((s) => s === suit).length >= 5
  );

  // Determinar tipo de mano
  if (isStraight && isFlush) return "Straight Flush";
  if (Object.values(rankCounts).includes(4)) return "Four of a Kind";
  if (
    Object.values(rankCounts).includes(3) &&
    Object.values(rankCounts).includes(2)
  )
    return "Full House";
  if (isFlush) return "Flush";
  if (isStraight) return "Straight";
  if (Object.values(rankCounts).includes(3)) return "Three of a Kind";
  if (Object.values(rankCounts).filter((count) => count === 2).length === 2)
    return "Two Pair";
  if (Object.values(rankCounts).includes(2)) return "One Pair";
  return "High Card";
}

function getFirstDecisionStrategy(playerCards) {
  const ranks = playerCards.map((card) => card.rank).sort((a, b) => b - a);
  const suited = isSuited(playerCards);

  // Pairs
  if (ranks[0] === ranks[1]) {
    if (ranks[0] >= 3) return "Raise"; // Pair of 3's or higher
    return "Check";
  }

  // Ace anything
  if (ranks[0] === 14) return "Raise"; // Ace + anything

  // Suited cards
  if (suited) {
    if (ranks[0] === 13) return "Raise"; // Any suited King
    if (ranks[0] === 12 && ranks[1] >= 6) return "Raise"; // Queen + 6 or higher suited
    if (ranks[0] === 11 && ranks[1] >= 8) return "Raise"; // Jack + 8 or higher suited
  }

  // Offsuit cards
  if (ranks[0] === 13 && ranks[1] >= 5) return "Raise"; // King + 5 or higher
  if (ranks[0] === 12 && ranks[1] >= 8) return "Raise"; // Queen + 8 or higher
  if (ranks[0] === 11 && ranks[1] >= 10) return "Raise"; // Jack + Ten

  return "Check";
}

function getSecondDecisionStrategy(playerCards, communityCards) {
  const allCards = [...playerCards, ...communityCards.slice(0, 3)];
  const boardCards = communityCards.slice(0, 3);
  const hasBoardPair = hasPair(boardCards);
  const isBoardSuited = hasFlushDraw(boardCards);

  // Check for pair with hole card
  if (hasPair(allCards)) {
    // Small pocket pair check
    if (
      playerCards[0].rank === playerCards[1].rank &&
      playerCards[0].rank <= 4
    ) {
      if (
        hasBoardPair &&
        Math.max(...boardCards.map((c) => c.rank)) > playerCards[0].rank
      ) {
        return "Check";
      }
    }

    // Suited board check
    if (isBoardSuited) {
      const hasFlushDr = hasFlushDraw(allCards);
      const kicker = Math.max(...playerCards.map((c) => c.rank));
      const maxBoardRank = Math.max(...boardCards.map((c) => c.rank));

      if (!hasFlushDr && kicker < maxBoardRank) {
        return "Check";
      }
    }

    return "Raise";
  }

  // High card on paired board
  if (hasBoardPair && Math.max(...playerCards.map((c) => c.rank)) === 14) {
    return "Raise";
  }

  // Straight draws
  if (hasStraightDraw(allCards)) {
    if (!isBoardSuited || hasFlushDraw(allCards)) {
      const minPlayerRank = Math.min(...playerCards.map((c) => c.rank));
      if (minPlayerRank >= 8) return "Raise"; // JT98 or better
    }
  }

  // Flush draws
  if (hasFlushDraw(allCards)) {
    // Implementar lógica de flush draw según la posición (4th nut o mejor)
    return "Raise";
  }

  return "Check";
}

function getFinalDecisionStrategy(playerCards, communityCards) {
  const allCards = [...playerCards, ...communityCards];
  const handType = getHandType(allCards); // Obtener tipo de mano

  const boardCards = communityCards;

  // Verificar si la mano en la mesa es ganadora
  const hasBoardStraight =
    hasStraightDraw(boardCards) && boardCards.length >= 5;
  const hasBoardFlush = hasFlushDraw(boardCards) && boardCards.length >= 5;

  if (hasBoardStraight || hasBoardFlush) return "Raise"; // Call to play the board

  // Verificar la mano ganadora
  const handMessage = `Current Hand: ${handType}`;

  // Has pair that plays
  if (hasPair(allCards)) {
    const pairWithHoleCard = playerCards.some((playerCard) =>
      communityCards.some(
        (communityCard) => playerCard.rank === communityCard.rank
      )
    );
    if (pairWithHoleCard) return handMessage; // Mostrar la mano
  }

  // Comprobar pares en la mesa
  const hasBoardPair = hasPair(boardCards);
  if (hasBoardPair) {
    const highCard = Math.max(...playerCards.map((c) => c.rank));
    if (highCard >= 13) return "Raise"; // 3rd nut kicker or better
  }

  return "Fold";
}

const Card = ({ rank, suit, onClick, selected, disabled }) => (
  <div
    className={`border rounded-md p-0.5 m-0.5 w-14 h-16 flex flex-col justify-center items-center cursor-pointer 
      ${selected ? "bg-blue-500 text-white" : "bg-white"}
      ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"}
    `}
    onClick={() => !disabled && onClick()}
  >
    <span className="text-[1rem] font-bold">
      {rank ? rankNames[rank] : "?"}
    </span>
    <span
      className="text-sm"
      style={{
        color:
          (suit === "Hearts" || suit === "Diamonds") && !selected
            ? "red"
            : selected
            ? "white"
            : "black",
      }}
    >
      {suit ? suitSymbols[suit] : ""}
    </span>
  </div>
);

const ProgressIndicator = ({ currentStage }) => {
  const stages = [
    { num: 1, name: "Initial" },
    { num: 2, name: "Flop" },
    { num: 3, name: "Final" },
  ];

  return (
    <div className="flex justify-between mb-4">
      {stages.map((stage, index) => (
        <div
          key={stage.num}
          className={`flex-1 text-center relative ${
            index !== stages.length - 1 ? "border-b-2" : ""
          } ${
            currentStage === stage.num ? "border-blue-500" : "border-gray-300"
          }`}
        >
          <div
            className={`w-6 h-6 text-sm rounded-full mx-auto mb-1 flex items-center justify-center ${
              currentStage === stage.num
                ? "bg-blue-500 text-white"
                : "bg-gray-300"
            }`}
          >
            {stage.num}
          </div>
          <span
            className={`text-xs ${
              currentStage === stage.num ? "font-bold" : ""
            }`}
          >
            {stage.name}
          </span>
        </div>
      ))}
    </div>
  );
};

const SessionStats = ({ stats, onUpdateStats, onResetStats }) => (
  <div className="bg-gray-50 p-4 rounded-lg mb-4">
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-lg font-semibold flex items-center">
        <Trophy className="w-5 h-5 mr-2" /> Session Stats
      </h3>
      <button
        onClick={onResetStats}
        className="text-gray-600 hover:text-gray-800 flex items-center"
        title="Reset Stats"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <span>Hands Played:</span>
          <span className="font-bold">{stats.handsPlayed}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Win Rate:</span>
          <span className="font-bold">
            {stats.handsPlayed > 0
              ? `${((stats.handsWon / stats.handsPlayed) * 100).toFixed(1)}%`
              : "0%"}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onUpdateStats("win")}
          className="flex-1 bg-green-500 text-white p-2 rounded hover:bg-green-600 flex items-center justify-center"
        >
          <Plus className="w-4 h-4 mr-1" /> Win
        </button>
        <button
          onClick={() => onUpdateStats("loss")}
          className="flex-1 bg-red-500 text-white p-2 rounded hover:bg-red-600 flex items-center justify-center"
        >
          <Minus className="w-4 h-4 mr-1" /> Loss
        </button>
      </div>
    </div>
  </div>
);

const UltimateHoldem = () => {
  const [playerCards, setPlayerCards] = useState([
    { rank: null, suit: null },
    { rank: null, suit: null },
  ]);
  const [communityCards, setCommunityCards] = useState(
    Array(5).fill({ rank: null, suit: null })
  );
  const [nextCardIndex, setNextCardIndex] = useState(0);
  const [result, setResult] = useState("");
  const [currentStage, setCurrentStage] = useState(0);
  const [usedCards, setUsedCards] = useState(new Set());
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem("holdemStats");
    return saved
      ? JSON.parse(saved)
      : {
          handsPlayed: 0,
          handsWon: 0,
          currentStreak: 0,
        };
  });

  useEffect(() => {
    localStorage.setItem("holdemStats", JSON.stringify(stats));
  }, [stats]);

  const handleReset = () => {
    setPlayerCards([
      { rank: null, suit: null },
      { rank: null, suit: null },
    ]);
    setCommunityCards(Array(5).fill({ rank: null, suit: null }));
    setNextCardIndex(0);
    setResult("");
    setCurrentStage(0);
    setUsedCards(new Set());
  };

  const updateRecommendation = (newIndex) => {
    if (newIndex === 2) {
      const move = getFirstDecisionStrategy(playerCards);
      setResult(move === "Raise" ? "Raise x3 or x4" : "Check (First)");
      setCurrentStage(1);
    } else if (newIndex === 5) {
      const move = getSecondDecisionStrategy(playerCards, communityCards);
      setResult(move === "Raise" ? "Raise x2" : "Check (Flop)");
      setCurrentStage(2);
    } else if (newIndex === 7) {
      const move = getFinalDecisionStrategy(playerCards, communityCards);
      setResult(move === "Raise" ? "Raise x1" : "Fold (Final)");
      setCurrentStage(3);
    } else {
      setResult("");
    }
  };

  const handleCardClick = (rank, suit) => {
    const cardKey = `${rank}-${suit}`;
    if (usedCards.has(cardKey)) return;

    if (nextCardIndex < 2) {
      const updatedCards = [...playerCards];
      updatedCards[nextCardIndex] = { rank, suit };
      setPlayerCards(updatedCards);
      if (nextCardIndex === 1) {
        updateRecommendation(2);
      }
    } else if (nextCardIndex < 7) {
      const updatedCards = [...communityCards];
      updatedCards[nextCardIndex - 2] = { rank, suit };
      setCommunityCards(updatedCards);
      if (nextCardIndex === 4 || nextCardIndex === 6) {
        updateRecommendation(nextCardIndex + 1);
      } else {
        setResult("");
      }
    }
    setUsedCards(new Set([...usedCards, cardKey]));
    setNextCardIndex(nextCardIndex + 1);
  };

  const handleUpdateStats = (result) => {
    setStats((prev) => ({
      handsPlayed: prev.handsPlayed + 1,
      handsWon: prev.handsWon + (result === "win" ? 1 : 0),
      currentStreak: result === "win" ? prev.currentStreak + 1 : 0,
    }));
  };

  const handleResetStats = () => {
    setStats({
      handsPlayed: 0,
      handsWon: 0,
      currentStreak: 0,
    });
  };

  const renderCards = () => {
    return suits.map((suit) => (
      <div key={suit} className="mb-2">
        <div className="text-[1rem] font-semibold text-gray-600 mb-1">
          {suit} {suitSymbols[suit]}
        </div>
        <div className="flex flex-wrap gap-1">
          {Object.entries(rankNames)
            .sort(([rankA], [rankB]) => Number(rankA) - Number(rankB))
            .map(([rank, rankName]) => {
              const cardKey = `${rank}-${suit}`;
              return (
                <Card
                  key={cardKey}
                  rank={Number(rank)}
                  suit={suit}
                  onClick={() => handleCardClick(Number(rank), suit)}
                  disabled={usedCards.has(cardKey)}
                />
              );
            })}
        </div>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <div className="bg-white p-4 rounded-lg shadow-lg w-full ">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">Ultimate Hold'em Strategy</h1>
          <button
            onClick={handleReset}
            className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 flex items-center"
          >
            <XCircle className="w-4 h-4 mr-1" /> Reset Hand
          </button>
        </div>

        <SessionStats
          stats={stats}
          onUpdateStats={handleUpdateStats}
          onResetStats={handleResetStats}
        />

        <ProgressIndicator currentStage={currentStage} />

        <div className="flex gap-10 ">
          <div>
            <h2 className="text-md font-semibold mb-2">Your Cards</h2>
            <div className="flex mb-4">
              {playerCards.map((card, index) => (
                <Card key={index} rank={card.rank} suit={card.suit} />
              ))}
            </div>

            <h2 className="text-md font-semibold mb-2">Community Cards</h2>
            <div className="flex flex-wrap mb-4">
              {communityCards.map((card, index) => (
                <Card key={index} rank={card.rank} suit={card.suit} />
              ))}
            </div>

            {result && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-md font-medium text-blue-800">
                  Recommendation:
                </p>
                <p className="text-xl font-bold text-blue-600">{result}</p>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-md font-semibold mb-2">Select Cards</h2>
            <div className="space-y-2">{renderCards()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UltimateHoldem;
