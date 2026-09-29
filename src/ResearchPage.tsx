import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { serverRequest } from './lib/api'

export interface ResearchReport {
  id: string
  query: string
  kind: 'stock' | 'fund'
  asset: Record<string, unknown>
  analysis: { fact_summary?: string[]; ai_inferences?: string[]; risks_to_verify?: string[]; research_questions?: string[]; disclaimer?: string }
  fetchedAt: string
  sources: { provider: string; endpoint: string; fetchedAt: string }[]
  disclaimer: string
}

function ReportSection({ title, tone, items }: { title: string; tone: 'blue' | 'violet' | 'amber' | 'slate'; items?: string[] }) {
  if (!items?.length) return null
  const styles = { blue: 'border-blue-100 bg-blue-50/60 text-blue-900', violet: 'border-violet-100 bg-violet-50/60 text-violet-900', amber: 'border-amber-100 bg-amber-50/70 text-amber-900', slate: 'border-slate-200 bg-slate-50 text-slate-800' }
  return <section className={`rounded-xl border p-4 ${styles[tone]}`}>
    <h3 className="text-xs font-semibold uppercase tracking-[0.12em] opacity-65 mb-2.5">{title}</h3>
    <ul className="space-y-2">{items.map((item, index) => <li key={index} className="text-sm leading-6 flex gap-2"><span className="opacity-45">—</span><span>{item}</span></li>)}</ul>
  </section>
}

export function ResearchPage({ session, onSignIn, onSave }: { session: Session | null; onSignIn: () => void; onSave: (report: ResearchReport) => void }) {
  const [query, setQuery] = useState('')
  const [report, setReport] = useState<ResearchReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const generate = async () => {
    if (!session) return onSignIn()
    if (!query.trim()) return
    setLoading(true); setError(''); setSaved(false)
    try {
      const result = await serverRequest<{ report: ResearchReport }>('/research', session.access_token, { method: 'POST', body: JSON.stringify({ query }) })
      setReport(result.report)
    } catch (err) { setError(err instanceof Error ? err.message : '报告生成失败') }
    finally { setLoading(false) }
  }

  const name = String(report?.asset.name || report?.asset.ts_code || query)
  return <div>
    <header className="flex items-center justify-between px-7 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
      <div><h1 className="text-lg font-semibold text-slate-900">智能研究</h1><p className="text-xs text-slate-400 mt-0.5">数据可追溯 · 推断可区分 · 结论待验证</p></div>
      {report && <button onClick={() => { onSave(report); setSaved(true) }} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 cursor-pointer">{saved ? '已保存到笔记' : '保存研究报告'}</button>}
    </header>
    <div className="px-7 py-7 max-w-4xl">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 mb-7">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-violet-50/80 to-transparent pointer-events-none" />
        <div className="relative max-w-2xl"><p className="text-xs font-semibold tracking-[0.14em] text-violet-600 uppercase mb-2">Research desk / CN equities & funds</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">从标的识别到可保存的研究脉络</h2>
          <p className="text-sm text-slate-500 mt-2 leading-6">输入 A 股或公募基金名称、代码。系统将取得最新可用数据，再让 AI 在明确边界内整理事实、推断和待验证问题。</p>
          <div className="mt-5 flex gap-2"><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()} placeholder="例如：600519、贵州茅台、易方达蓝筹精选" className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
            <button onClick={generate} disabled={loading || !query.trim()} className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50 cursor-pointer">{loading ? '正在研究…' : '生成报告'}</button></div>
          {!session && <p className="mt-3 text-xs text-slate-400">生成报告前需要登录，以确保资料只同步到你的工作区。</p>}
          {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
      </div>
      {loading && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center"><div className="mx-auto mb-3 h-6 w-6 rounded-full border-2 border-violet-200 border-t-violet-700 animate-spin" /><p className="text-sm font-medium text-slate-700">正在核对标的并汇集数据</p><p className="text-xs text-slate-400 mt-1">这可能需要几秒钟</p></div>}
      {report && !loading && <article className="space-y-4">
        <div className="flex items-start justify-between gap-5 border-b border-slate-200 pb-5"><div><div className="flex items-center gap-2"><span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">{report.kind === 'stock' ? 'A 股' : '公募基金'}</span><span className="font-mono text-xs text-slate-400">{String(report.asset.ts_code || '')}</span></div><h2 className="mt-2 text-2xl font-semibold text-slate-950">{name}</h2></div><p className="text-xs text-right text-slate-400 leading-5">数据更新时间<br />{new Date(report.fetchedAt).toLocaleString('zh-CN')}</p></div>
        <ReportSection title="已核实事实 · 数据来源" tone="blue" items={report.analysis.fact_summary} />
        <ReportSection title="AI 推断 · 需要独立判断" tone="violet" items={report.analysis.ai_inferences} />
        <ReportSection title="风险与待验证项" tone="amber" items={report.analysis.risks_to_verify} />
        <ReportSection title="下一步研究问题" tone="slate" items={report.analysis.research_questions} />
        <footer className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-slate-600"><span>来源</span>{report.sources.map(source => <span key={source.endpoint} className="rounded bg-white border border-slate-200 px-2 py-1 font-mono text-[11px]">{source.provider} · {source.endpoint}</span>)}</div><p className="mt-3 text-xs leading-5 text-slate-500">{report.disclaimer || report.analysis.disclaimer}</p></footer>
      </article>}
    </div>
  </div>
}
