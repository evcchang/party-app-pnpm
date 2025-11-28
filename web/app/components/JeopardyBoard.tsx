"use client";

type Question = {
  id: string;
  category: string;
  value: number;
  used: boolean;
};

type Props = {
  questions: Question[];
  disabled?: boolean;
  onSelect?: (id: string) => void;
};

export default function JeopardyBoard({ questions, disabled, onSelect }: Props) {
  // group by category
  const categories = Array.from(
    new Set(questions.map((q) => q.category))
  );

  const byCategory: Record<string, Question[]> = {};
  categories.forEach((cat) => {
    byCategory[cat] = questions
      .filter((q) => q.category === cat)
      .sort((a, b) => a.value - b.value);
  });

  return (
    <div className="w-full overflow-x-auto">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}>
        {categories.map((cat) => (
          <div key={cat} className="border border-gray-600">
            <div className="bg-blue-900 text-white text-center p-2 font-bold text-sm">
              {cat}
            </div>
            {byCategory[cat].map((q) => (
              <button
                key={q.id}
                disabled={disabled || q.used}
                onClick={() => onSelect && onSelect(q.id)}
                className={`w-full h-16 flex items-center justify-center text-yellow-300 text-xl font-bold border-t border-gray-700
                  ${q.used ? "bg-gray-800 text-gray-500" : "bg-blue-800 hover:bg-blue-700"}
                  ${disabled ? "cursor-default" : "cursor-pointer"}
                `}
              >
                {q.value}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
