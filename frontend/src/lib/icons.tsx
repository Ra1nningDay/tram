import { MapPin, Bus, Coffee, Utensils, Landmark, Building, School, Trees, Hospital, ShoppingCart, type LucideIcon } from "lucide-react";

export type IconConfig = {
    name: string;
    label: string;
    component: LucideIcon;
};

export const AVAILABLE_ICONS: IconConfig[] = [
    { name: "MapPin", label: "Pin", component: MapPin },
    { name: "Bus", label: "Bus", component: Bus },
    { name: "Coffee", label: "Coffee", component: Coffee },
    { name: "Utensils", label: "Food", component: Utensils },
    { name: "Landmark", label: "Place", component: Landmark },
    { name: "Building", label: "Building", component: Building },
    { name: "School", label: "School", component: School },
    { name: "Trees", label: "Park", component: Trees },
    { name: "Hospital", label: "Health", component: Hospital },
    { name: "ShoppingCart", label: "Shop", component: ShoppingCart },
];

export function getIconComponent(name: string): LucideIcon {
    return AVAILABLE_ICONS.find((i) => i.name === name)?.component || MapPin;
}
