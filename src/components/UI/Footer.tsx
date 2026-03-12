import { Linkedin, Send, ExternalLink } from 'lucide-react'

export default function Footer() {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/80 via-black/60 to-transparent pt-16 pb-4 px-4">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-3">
        {/* Author info */}
        <p className="text-white/90 text-sm font-medium text-center">
          Автор: <span className="text-white font-semibold">Тим Зинин</span>. Строю AI-системы для бизнеса
        </p>

        {/* Social links */}
        <div className="flex items-center gap-4">
          <a
            href="https://linkedin.com/in/timzinin?utm_source=worldscope&utm_medium=footer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white text-xs"
          >
            <Linkedin size={14} />
            <span>LinkedIn</span>
          </a>
          <a
            href="https://t.me/timzinin?utm_source=worldscope&utm_medium=footer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white text-xs"
          >
            <Send size={14} />
            <span>Telegram</span>
          </a>
        </div>

        {/* CTA */}
        <a
          href="https://t.me/timzinin?text=Хочу%20консультацию%20по%20AI&utm_source=worldscope&utm_medium=footer"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 transition-colors text-white text-sm font-medium"
        >
          <ExternalLink size={14} />
          <span>Заказать консультацию</span>
        </a>
      </div>
    </div>
  )
}
