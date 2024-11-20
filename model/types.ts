export interface Chapter {
    label: string;
    href: string;
    cfi: string; 
    level: number; 
    children?: Chapter[];
    
}
