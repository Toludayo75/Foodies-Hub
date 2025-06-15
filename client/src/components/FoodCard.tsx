import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/price";

interface FoodCardProps {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
}

export default function FoodCard({ id, name, description, price, image }: FoodCardProps) {
  const { addItem } = useCart();
  
  const handleAddToCart = () => {
    addItem({ id, name, description, price, image });
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-2">
      <img 
        src={image} 
        alt={name} 
        className="w-full h-24 object-cover rounded-lg"
        loading="lazy"
      />
      <div className="mt-2">
        <h3 className="font-medium">{name}</h3>
        <p className="text-xs text-secondary-content">{description}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="font-semibold">{formatPrice(price)}</span>
          <button 
            onClick={handleAddToCart}
            className="w-8 h-8 bg-primary-color rounded-full flex items-center justify-center text-white"
          >
            <i className="fa-solid fa-plus text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
