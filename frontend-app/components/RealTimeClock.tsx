"use client";

import { useState, useEffect } from 'react';

// Función para formatear la hora, asegurando dos dígitos
const formatTime = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

export function RealTimeClock() {
  const [time, setTime] = useState(formatTime(new Date()));

  useEffect(() => {
    // Inicia un intervalo que se ejecuta cada segundo
    const timerId = setInterval(() => {
      setTime(formatTime(new Date()));
    }, 1000);

    // Función de limpieza: se ejecuta cuando el componente se desmonta
    // para evitar fugas de memoria. ¡Muy importante!
    return () => {
      clearInterval(timerId);
    };
  }, []); // El array vacío asegura que el efecto se ejecute solo una vez

  return <span>{time}</span>;
}