'use client'
import { useEffect, useRef } from 'react'

export default function HackerBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.width = window.innerWidth
        canvas.height = window.innerHeight

        const lines: Array<{
            x: number
            y: number
            length: number
            speed: number
            opacity: number
        }> = []

        // Create random green lines with varying properties
        for (let i = 0; i < 80; i++) {
            lines.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                length: Math.random() * 300 + 100,
                speed: Math.random() * 3 + 0.3,
                opacity: Math.random() * 0.4 + 0.05
            })
        }

        function animate() {
            if (!ctx || !canvas) return
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)'
            ctx.lineWidth = 1.5

            lines.forEach((line, index) => {
                line.y += line.speed
                if (line.y > canvas.height) {
                    line.y = -line.length
                    line.x = Math.random() * canvas.width
                    // Occasionally change speed for variety
                    if (Math.random() > 0.7) {
                        line.speed = Math.random() * 3 + 0.3
                    }
                }

                // Vary opacity slightly for flicker effect
                const flicker = Math.sin(Date.now() * 0.001 + index) * 0.1 + 1
                ctx.globalAlpha = line.opacity * flicker

                // Add glow effect with varying intensity
                ctx.shadowBlur = 8 + Math.sin(Date.now() * 0.002 + index) * 4
                ctx.shadowColor = `rgba(34, 197, 94, ${0.3 + Math.sin(Date.now() * 0.001 + index) * 0.2})`

                ctx.beginPath()
                ctx.moveTo(line.x, line.y)
                ctx.lineTo(line.x, line.y + line.length)
                ctx.stroke()

                ctx.shadowBlur = 0
            })

            ctx.globalAlpha = 1
            requestAnimationFrame(animate)
        }

        animate()

        const handleResize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
            style={{ opacity: 0.5 }}
        />
    )
}

