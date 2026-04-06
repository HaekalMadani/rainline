"use client"

import { animate } from "framer-motion"
import { useEffect, useRef, useState } from "react"

interface AnimatedNumberProps {
  value: number
}

export default function AnimatedNumber({ value }: AnimatedNumberProps) {
  const [display, setDisplay] = useState<number>(value)
  const previousValue = useRef<number>(value)

  useEffect(() => {
    const controls = animate(previousValue.current, value, {
      duration: 0.5,
      ease: "easeInOut",
      onUpdate: (latest) => {
        setDisplay(Math.floor(latest))
      },
    })

    previousValue.current = value

    return () => controls.stop()
  }, [value])

  return <span>{display}</span>
}