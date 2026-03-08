import { Mic, Square, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TranscriptPane() {
  const isRecording = false;

  const mockTranscript = [
    { id: '1', speaker: 'social_worker', text: '陈伯，今日点啊？身体有冇边度唔舒服？' },
    { id: '2', speaker: 'elder', text: '唉，都系咁啦，最近对脚成日肿，行路都觉得重。' },
    { id: '3', speaker: 'social_worker', text: '脚肿？有冇按时食降压药啊？' },
    { id: '4', speaker: 'elder', text: '降压药... 有时唔记得食，前两日好似停咗两日。' },
    { id: '5', speaker: 'social_worker', text: '咁唔得噶喎，药一定要日日食。血压有冇量过？' },
  ];

  return (
    <div className="flex flex-col h-full relative bg-white">
      {/* Header */}
      <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-slate-800">家访录音</h2>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-md border border-emerald-200">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            转写已完成
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Action Bar (Recording controls) */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              isRecording 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'
            }`}
          >
            {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isRecording ? '结束录音' : '开始录音'}
          </button>
          {isRecording && (
            <div className="text-sm font-mono text-slate-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              12:45
            </div>
          )}
        </div>
      </div>

      {/* Transcript Editor Area */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-2xl mx-auto space-y-6">
          {mockTranscript.map((turn, idx) => (
            <motion.div 
              key={turn.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.15 }}
              className="group flex gap-4"
            >
              <div className="w-12 pt-1 flex-shrink-0 text-right">
                <span className="text-xs text-slate-400 font-mono select-none opacity-0 group-hover:opacity-100 transition-opacity">
                  {`0${idx}:2${idx}`}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    turn.speaker === 'social_worker' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {turn.speaker === 'social_worker' ? '社工 (你)' : '陈伯'}
                  </span>
                </div>
                <div className="text-slate-700 leading-relaxed">
                  {turn.speaker === 'elder' && idx === 3 ? (
                    <span>
                      降压药... 有时唔记得食，<span className="bg-red-100 text-red-800 px-1 py-0.5 rounded">前两日好似停咗两日</span>。
                    </span>
                  ) : turn.speaker === 'elder' && idx === 1 ? (
                    <span>
                      唉，都系咁啦，最近<span className="bg-amber-100 text-amber-800 px-1 py-0.5 rounded">对脚成日肿</span>，行路都觉得重。
                    </span>
                  ) : (
                    turn.text
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
