import { useCart } from "@/context/CartContext";
import { Trash2, Minus, Plus } from "lucide-react";
import { formatPrice } from "@/lib/price";

interface CartItemProps {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  quantity: number;
}

export default function CartItem({ id, name, description, price, image, quantity }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();
  
  const handleIncrement = () => {
    updateQuantity(id, quantity + 1);
  };
  
  const handleDecrement = () => {
    if (quantity > 1) {
      updateQuantity(id, quantity - 1);
    } else {
      removeItem(id);
    }
  };
  
  const handleRemove = () => {
    removeItem(id);
  };
  
  return (
    <div className="bg-white rounded-lg p-4 flex items-center mb-3">
      <img 
        src={image} 
        alt={name} 
        className="w-16 h-16 rounded-full object-cover mr-4" 
        loading="lazy"
      />
      <div className="flex-1">
        <h3 className="font-medium text-base">{name}</h3>
        <p className="text-sm text-gray-500">{description}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center">
            <button 
              onClick={handleDecrement}
              className="w-8 h-8 flex items-center justify-center text-gray-500"
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>
            <span className="mx-3 text-base font-medium">{quantity}</span>
            <button 
              onClick={handleIncrement}
              className="w-8 h-8 flex items-center justify-center text-gray-500"
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>
          </div>
          <span className="font-semibold text-foodies-green">{formatPrice(price)}</span>
        </div>
      </div>
      <button 
        onClick={handleRemove}
        className="ml-3 p-2 rounded-md bg-red-50 text-red-500"
        aria-label="Remove item"
      >
        <Trash2 size={20} className="text-red-500" />
      </button>
    </div>
  );
}
