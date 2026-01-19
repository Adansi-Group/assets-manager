


// components/Card.tsx
type Props = {
  title: string;
  value: number;
  color?: "green" | "blue" | "red";
};

export default function Card({ title, value, color }: Props) {
  const colors: Record<string, string> = {
    green: "text-green-600",
    blue: "text-blue-600",
    red: "text-red-600",
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-2xl font-bold ${colors[color || ""]}`}>
        {value}
      </p>
    </div>
  );
}
