import { Card3D } from "@/components/Card3D";
import type { CardItem } from "@/lib/fallback-data";

export function CardGrid({
  items,
  basePath,
}: {
  items: CardItem[];
  basePath: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-navy-700/70">
        Content for this section is coming soon.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => (
        <Card3D
          key={item._id}
          href={`${basePath}/${item.slug}`}
          title={item.title}
          description={item.description}
          icon={item.icon}
          index={index}
        />
      ))}
    </div>
  );
}
