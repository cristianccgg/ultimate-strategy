import React, { useState, useCallback } from "react";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

const PlayingCard = ({ rank, suit, selected, onClick }) => (
  <div
    onClick={onClick}
    className={`
      w-16 h-24 m-1 rounded-lg cursor-pointer border-2
      ${selected ? "border-blue-500" : "border-gray-300"}
      ${suit === "♥" || suit === "♦" ? "text-red-500" : "text-black"}
      flex items-center justify-center
      hover:border-blue-300 transition-colors
      bg-white shadow-md
    `}
  >
    <div className="text-center">
      <div className="text-xl font-bold">{rank}</div>
      <div className="text-2xl">{suit}</div>
    </div>
  </div>
);

const Button = ({ onClick, children, className = "" }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg font-semibold flex items-center justify-center ${className}`}
  >
    {children}
  </button>
);

const INITIAL_STATS = {
  wins: 0,
  losses: 0,
  totalGames: 0,
  winRate: 0,
};
export default function TexasHoldemStrategy() {
  const [selectedCards, setSelectedCards] = useState([]);
  const [stats, setStats] = useState(INITIAL_STATS);

  const getRankValue = (rank) => {
    const values = { A: 14, K: 13, Q: 12, J: 11 };
    return values[rank] || parseInt(rank);
  };

  const isSuited = (card1, card2) => {
    return card1 && card2 && card1.suit === card2.suit;
  };

  const countRanks = (cards) => {
    return cards.reduce((acc, card) => {
      acc[card.rank] = (acc[card.rank] || 0) + 1;
      return acc;
    }, {});
  };

  const hasRoyalFlush = (cards) => {
    if (!hasFlush(cards)) return false;
    const flushSuit = cards.find(
      (card) => cards.filter((c) => c.suit === card.suit).length >= 5
    )?.suit;
    const flushCards = cards
      .filter((card) => card.suit === flushSuit)
      .map((card) => getRankValue(card.rank))
      .sort((a, b) => a - b);
    return flushCards.join(",").includes("10,11,12,13,14");
  };

  const hasStraightFlush = (cards) => {
    if (!hasFlush(cards)) return false;
    const flushSuit = cards.find(
      (card) => cards.filter((c) => c.suit === card.suit).length >= 5
    )?.suit;
    return hasStraight(cards.filter((card) => card.suit === flushSuit));
  };

  const hasFourOfAKind = (cards) => {
    const rankCounts = countRanks(cards);
    return Object.values(rankCounts).some((count) => count >= 4);
  };

  const hasFullHouse = (cards) => {
    const rankCounts = countRanks(cards);
    const hasThreeOfKind = Object.values(rankCounts).some(
      (count) => count >= 3
    );
    const pairs = Object.values(rankCounts).filter(
      (count) => count >= 2
    ).length;
    return hasThreeOfKind && pairs >= 2;
  };

  const hasFlush = (cards) => {
    const suitCounts = cards.reduce((acc, card) => {
      acc[card.suit] = (acc[card.suit] || 0) + 1;
      return acc;
    }, {});
    return Object.values(suitCounts).some((count) => count >= 5);
  };

  const hasStraight = (cards) => {
    const ranks = [
      ...new Set(cards.map((card) => getRankValue(card.rank))),
    ].sort((a, b) => a - b);
    for (let i = 0; i <= ranks.length - 5; i++) {
      if (ranks[i + 4] - ranks[i] === 4) return true;
    }
    // Check Ace-low straight (A,2,3,4,5)
    if (ranks.includes(14)) {
      const lowAceRanks = [...ranks.filter((r) => r <= 5), 1];
      lowAceRanks.sort((a, b) => a - b);
      for (let i = 0; i <= lowAceRanks.length - 5; i++) {
        if (lowAceRanks[i + 4] - lowAceRanks[i] === 4) return true;
      }
    }
    return false;
  };

  const hasThreeOfAKind = (cards) => {
    const rankCounts = countRanks(cards);
    return Object.values(rankCounts).some((count) => count >= 3);
  };

  const hasTwoPair = (cards) => {
    const rankCounts = countRanks(cards);
    return Object.values(rankCounts).filter((count) => count >= 2).length >= 2;
  };

  const hasPair = (cards) => {
    const rankCounts = countRanks(cards);
    return Object.values(rankCounts).some((count) => count >= 2);
  };

  const hasHiddenPair = (cards) => {
    if (cards.length < 2) return false;
    const holeCards = cards.slice(0, 2);
    const communityCards = cards.slice(2);

    // Check if hole cards form a pair
    if (holeCards[0].rank === holeCards[1].rank) return true;

    // Check if either hole card pairs with any community card
    return holeCards.some((holeCard) =>
      communityCards.some(
        (communityCard) => holeCard.rank === communityCard.rank
      )
    );
  };

  const evaluateHand = (cards) => {
    if (hasRoyalFlush(cards)) return { rank: 10, name: "Royal Flush" };
    if (hasStraightFlush(cards)) return { rank: 9, name: "Straight Flush" };
    if (hasFourOfAKind(cards)) return { rank: 8, name: "Four of a Kind" };
    if (hasFullHouse(cards)) return { rank: 7, name: "Full House" };
    if (hasFlush(cards)) return { rank: 6, name: "Flush" };
    if (hasStraight(cards)) return { rank: 5, name: "Straight" };
    if (hasThreeOfAKind(cards)) return { rank: 4, name: "Three of a Kind" };
    if (hasTwoPair(cards)) return { rank: 3, name: "Two Pair" };
    if (hasPair(cards)) return { rank: 2, name: "Pair" };
    return { rank: 1, name: "High Card" };
  };

  const getRecommendation = useCallback(() => {
    if (selectedCards.length < 2) return "";

    const [card1, card2] = selectedCards;

    // Large Raise (4x) logic for first two cards
    if (selectedCards.length === 2) {
      const suited = isSuited(card1, card2);
      const ranks = [getRankValue(card1.rank), getRankValue(card2.rank)].sort(
        (a, b) => b - a
      );

      // Ace with any card
      if (ranks.includes(14)) return "Raise 4X";

      // King logic
      if (ranks[0] === 13) {
        if (suited && ranks[1] >= 2) return "Raise 4X";
        if (!suited && ranks[1] >= 5) return "Raise 4X";
      }

      // Queen logic
      if (ranks[0] === 12) {
        if (suited && ranks[1] >= 6) return "Raise 4X";
        if (!suited && ranks[1] >= 8) return "Raise 4X";
      }

      // Jack logic
      if (ranks[0] === 11) {
        if (suited && ranks[1] >= 8) return "Raise 4X";
        if (!suited && ranks[1] >= 11) return "Raise 4X";
      }

      // Pair of 3s or higher
      if (card1.rank === card2.rank && getRankValue(card1.rank) >= 3)
        return "Raise 3X";
    }

    // Medium Raise (2x) logic after flop
    if (selectedCards.length === 5) {
      const hand = evaluateHand(selectedCards);
      if (hand.rank >= 2) return "Raise 2X"; // Pair or better
      // Additional flush draw logic can be added here
    }

    // Small Raise (1x) logic after all cards
    if (selectedCards.length === 7) {
      const hand = evaluateHand(selectedCards);
      if (hand.rank >= 2) return "Raise 1X"; // Pair or better
    }

    return "Check/Fold";
  }, [selectedCards]);

  const handleCardSelect = (rank, suit) => {
    const card = { rank, suit };
    const isCardSelected = selectedCards.some(
      (c) => c.rank === rank && c.suit === suit
    );

    if (isCardSelected) {
      setSelectedCards(
        selectedCards.filter((c) => !(c.rank === rank && c.suit === suit))
      );
    } else if (selectedCards.length < 7) {
      setSelectedCards([...selectedCards, card]);
    }
  };

  const handleGameResult = (won) => {
    setStats((prev) => {
      const wins = won ? prev.wins + 1 : prev.wins;
      const losses = won ? prev.losses : prev.losses + 1;
      const totalGames = prev.totalGames + 1;
      return {
        wins,
        losses,
        totalGames,
        winRate: ((wins / totalGames) * 100).toFixed(1),
      };
    });
  };

  const resetCards = () => {
    setSelectedCards([]);
  };

  const resetStats = () => {
    setStats(INITIAL_STATS);
  };

  // Get current hand evaluation for display
  const currentHand =
    selectedCards.length >= 2 ? evaluateHand(selectedCards) : null;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg mb-6">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              Ultimate Texas Hold'em Strategy
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={resetCards}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Reset Cards
              </Button>
              <Button
                onClick={resetStats}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Reset Stats
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Selected Cards ({selectedCards.length}/7)
              </h3>
              <div className="flex flex-wrap gap-2 min-h-24 p-4 bg-gray-50 rounded-lg">
                {selectedCards.map((card, i) => (
                  <PlayingCard
                    key={`${card.rank}${card.suit}-${i}`}
                    rank={card.rank}
                    suit={card.suit}
                    selected={true}
                    onClick={() => handleCardSelect(card.rank, card.suit)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Available Cards</h3>
              <div className="flex gap-0 overflow-x-auto h-[400px]">
                {RANKS.map((rank) => (
                  <div
                    key={rank}
                    className="flex flex-col scale-50 xl:scale-100"
                  >
                    {SUITS.map((suit) => (
                      <PlayingCard
                        key={`${rank}${suit}`}
                        rank={rank}
                        suit={suit}
                        selected={selectedCards.some(
                          (card) => card.rank === rank && card.suit === suit
                        )}
                        onClick={() => handleCardSelect(rank, suit)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Current Hand</h3>
                <p className="text-xl font-bold text-blue-700">
                  {currentHand
                    ? currentHand.name
                    : "Select cards to see your hand"}
                </p>
                <h3 className="text-lg font-semibold mb-2 mt-4">
                  Recommendation
                </h3>
                <p className="text-xl font-bold text-blue-700">
                  {getRecommendation() ||
                    "Select cards to get a recommendation"}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex gap-4">
                <Button
                  onClick={() => handleGameResult(true)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  Win
                </Button>
                <Button
                  onClick={() => handleGameResult(false)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  Loss
                </Button>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Statistics</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-sm text-gray-600">Wins</div>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.wins}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-sm text-gray-600">Losses</div>
                  <div className="text-2xl font-bold text-red-600">
                    {stats.losses}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-sm text-gray-600">Total Games</div>
                  <div className="text-2xl font-bold">{stats.totalGames}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-sm text-gray-600">Win Rate</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.winRate}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
