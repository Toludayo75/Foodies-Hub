import { Link } from "wouter";
import {
  Utensils,
  Beef,
  Soup,
  Fish,
  Flame,
  Cake,
  ShoppingBasket
} from "lucide-react";

interface CategoryItemProps {
  id: number;
  name: string;
  icon: string;
}

export default function CategoryItem({ id, name, icon }: CategoryItemProps) {
  // Get icon component based on icon name
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "utensils":
        return <Utensils className="text-primary-color" size={24} />;
      case "burger":
        return <Beef className="text-primary-color" size={24} />;
      case "soup":
        return <Soup className="text-primary-color" size={24} />;
      case "fish":
        return <Fish className="text-primary-color" size={24} />;
      case "flame":
        return <Flame className="text-primary-color" size={24} />;
      case "cake":
        return <Cake className="text-primary-color" size={24} />;
      default:
        return <ShoppingBasket className="text-primary-color" size={24} />;
    }
  };
  
  return (
    <Link href={`/menu?category=${id}`} className="flex flex-col items-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2 shadow-sm">
        {getIcon(icon)}
      </div>
      <span className="text-sm font-medium whitespace-nowrap">{name}</span>
    </Link>
  );
}
