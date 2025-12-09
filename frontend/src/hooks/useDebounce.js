// src/hooks/useDebounce.js
import { useState, useEffect } from "react";


export default function useDebounce(value, ms = 300) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return v;
}
