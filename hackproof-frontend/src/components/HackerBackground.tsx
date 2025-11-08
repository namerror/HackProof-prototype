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

        // Create random green lines
        for (let i = 0; i < 50; i++) {
            lines.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                length: Math.random() * 200 + 50,
                speed: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.3 + 0.1
            })
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)'
            ctx.lineWidth = 1

            lines.forEach((line, index) => {
                line.y += line.speed
                if (line.y > canvas.height) {
                    line.y = -line.length
                    line.x = Math.random() * canvas.width
                }

                ctx.globalAlpha = line.opacity
                ctx.beginPath()
                ctx.moveTo(line.x, line.y)
                ctx.lineTo(line.x, line.y + line.length)
                ctx.stroke()

                // Add glow effect
                ctx.shadowBlur = 10
                ctx.shadowColor = 'rgba(34, 197, 94, 0.5)'
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
            style={{ opacity: 0.4 }}
        />
    )
}

