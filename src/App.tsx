import { useState, useEffect, useMemo } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { serverRequest } from './lib/api'
import { ResearchPage, type ResearchReport } from './ResearchPage'

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Knowledge {
  id: string; title: string; category: string; summary: string
  content: string; myUnderstanding: string; tags: string[]
  relatedKnowledge: string[]; createdAt: string; updatedAt: string
}
interface FinancialRow {
  year: string; revenue: string; netProfit: string
  grossMargin: string; operatingCashFlow: string
}
interface Company {
  id: string; name: string; code: string; industry: string
  description: string; products: string; businessModel: string
  industryPosition: string; competitors: string; whyStudy: string
  investmentLogic: string; risks: string; followUp: string
  financialData: FinancialRow[]; relatedKnowledge: string[]
  createdAt: string; updatedAt: string
}
interface Fund {
  id: string; name: string; code: string; type: string
  strategy: string; investmentDirection: string; holdings: string
  industryDistribution: string; whyRise: string; whyFall: string
  risks: string; myReason: string; myObservation: string
  relatedKnowledge: string[]; createdAt: string; updatedAt: string
}
interface Note {
  id: string; title: string; category: string; content: string
  tags: string[]; relatedCompany: string[]; relatedFund: string[]
  relatedKnowledge: string[]; createdAt: string; updatedAt: string
}

type Page = 'home' | 'knowledge' | 'companies' | 'funds' | 'notes' | 'search' | 'research'
type Sub = 'list' | 'detail' | 'edit' | 'new'
interface Nav { page: Page; sub: Sub; id?: string }

/* ─── Store ──────────────────────────────────────────────────────────────── */

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
const ts = () => new Date().toISOString()
const fmtDate = (d: string) => new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
const parseTags = (s: string): string[] => s.split(',').map(t => t.trim()).filter(Boolean)
const joinTags = (a: string[]): string => a.join(', ')

function useStore<T extends { id: string; updatedAt: string }>(key: string, seed: T[]) {
  const [items, setItems] = useState<T[]>(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : seed } catch { return seed }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(items)) } catch {} }, [items, key])

  const create = (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): T => {
    const item = { ...data, id: uid(), createdAt: ts(), updatedAt: ts() } as unknown as T
    setItems(p => [...p, item]); return item
  }
  const update = (id: string, data: Partial<T>) =>
    setItems(p => p.map(i => i.id === id ? { ...i, ...data, updatedAt: ts() } : i))
  const remove = (id: string) => setItems(p => p.filter(i => i.id !== id))
  const get = (id: string) => items.find(i => i.id === id)
  const recent = (n = 5) => [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, n)

  const replace = (next: T[]) => setItems(next)
  return { items, create, update, remove, get, recent, replace }
}

/* ─── Seed Data ──────────────────────────────────────────────────────────── */

const SK: Knowledge[] = [
  { id: 'k1', title: 'PE', category: '估值', summary: '公司市值相当于一年净利润的多少倍。',
    content: 'PE = 市值 ÷ 净利润\n\nPE 常用于比较公司估值高低。低 PE 不代表便宜，高 PE 也不一定贵，需要结合公司增长速度、行业特征、盈利质量和历史估值区间综合判断。\n\nPE 适合用于盈利稳定、可预期的公司，对于亏损公司或周期公司 PE 意义有限。',
    myUnderstanding: 'PE 本质上是在回答："市场愿意为公司现在一年的利润支付多少钱？"\n\n成长股 PE 可以很高，因为市场在为未来几年的利润增长定价。成熟行业 PE 通常较低。看 PE 不能脱离行业和成长性。',
    tags: ['估值', '基础指标'], relatedKnowledge: ['k2', 'k4'],
    createdAt: '2026-08-10T09:00:00.000Z', updatedAt: '2026-09-15T10:30:00.000Z' },
  { id: 'k2', title: 'ROE', category: '财务', summary: '净资产收益率，衡量公司用股东权益创造利润的能力。',
    content: 'ROE = 净利润 ÷ 净资产 × 100%\n\n巴菲特特别看重 ROE，认为持续高 ROE（>15%）是公司具备竞争护城河的体现。\n\n需要注意：高杠杆也能提升 ROE，因此要结合资产负债率一起看，避免被财务杠杆掩盖的"假高 ROE"。',
    myUnderstanding: 'ROE 就是在问：我投入的股东权益，公司能帮我赚多少回来？\n\n持续 15% 以上 ROE 的公司，往往有定价权、品牌力或专利壁垒。这才是我寻找的好公司。',
    tags: ['财务', '盈利质量', '核心指标'], relatedKnowledge: ['k1', 'k4'],
    createdAt: '2026-08-12T09:00:00.000Z', updatedAt: '2026-09-18T14:20:00.000Z' },
  { id: 'k3', title: '回撤', category: '基础', summary: '从历史高点到当前价格的下降幅度。',
    content: '回撤 = (历史最高价 - 当前价格) ÷ 历史最高价 × 100%\n\n最大回撤是衡量投资风险的重要指标，代表历史上最大的一次下跌幅度。回撤越小，策略抗跌性越好，但往往对应的收益也较低。\n\n评估一个基金时，夏普比率（收益 / 波动）和最大回撤比单纯的年化收益更重要。',
    myUnderstanding: '理解回撤帮助我认识自己的风险承受能力。如果一支基金最大回撤有 50%，意味着我 10 万变 5 万，我能承受吗？如果不能，就应该降低仓位或换低波动品种。',
    tags: ['风险', '基础'], relatedKnowledge: ['k5'],
    createdAt: '2026-08-15T09:00:00.000Z', updatedAt: '2026-09-10T11:00:00.000Z' },
  { id: 'k4', title: '自由现金流', category: '财务', summary: '公司经营活动现金流扣除资本支出后的剩余现金。',
    content: '自由现金流 = 经营活动现金流 - 资本支出\n\n净利润可以通过会计政策调整，但自由现金流难以造假，是判断公司真实盈利质量的重要指标。\n\n持续正自由现金流 + 高 ROE = 好公司的重要特征组合。\n\n重资产行业（钢铁、化工）资本支出大，自由现金流往往较低；轻资产行业（软件、消费品）自由现金流通常优秀。',
    myUnderstanding: '我把自由现金流看作公司的"真实血液"。净利润很高但现金流持续为负，通常是危险信号——可能存在应收账款质量问题，或者大量资本支出吞噬利润。',
    tags: ['财务', '现金流', '盈利质量'], relatedKnowledge: ['k2'],
    createdAt: '2026-08-20T09:00:00.000Z', updatedAt: '2026-09-12T09:30:00.000Z' },
  { id: 'k5', title: '仓位', category: '投资方法', summary: '某项资产占总投资组合的比例。',
    content: '仓位管理是控制投资风险的重要手段。\n\n满仓：全部资金投入某资产\n半仓：50% 资金投入\n空仓：不持有某资产\n\n合理的仓位控制可以降低单一资产波动对整体组合的影响，也给后续加仓保留空间。\n\n通常建议：单一标的仓位不超过 20%，高风险板块总仓位不超过 40%。',
    myUnderstanding: '仓位管理就是在问：我应该把多少鸡蛋放在这个篮子里？分散风险的同时也要避免过度分散导致收益平庸。分散是对抗无知的工具，但分散过度会稀释认知优势。',
    tags: ['风险管理', '投资方法'], relatedKnowledge: ['k3'],
    createdAt: '2026-08-25T09:00:00.000Z', updatedAt: '2026-09-08T16:00:00.000Z' },
]

const SC: Company[] = [
  { id: 'c1', name: '沈鼓集团', code: '601091', industry: '高端装备',
    description: '沈鼓集团是中国最大的流体机械制造商，主要产品包括大型压缩机组、泵类设备、风机及核主泵等，广泛应用于石化、天然气、核电等行业。是国内高端工业装备的核心供应商。',
    products: '大型压缩机组、核主泵、离心泵、离心风机',
    businessModel: 'B2B工业设备制造。以大额定制化订单为主，交货周期 1-3 年。后续提供配件更换和维修服务，形成持续的服务收入。设备单价高，客户切换成本极高。',
    industryPosition: '国内压缩机行业绝对龙头，核主泵核心国产供应商，部分产品已完成进口替代。',
    competitors: '霍尼韦尔、GE 压缩机（国际）；陕鼓动力（国内）',
    whyStudy: '处于高端装备国产替代赛道，既有核主泵的稀缺性，又有传统石化设备的稳定性。想研究其行业壁垒来源和增长驱动力。',
    investmentLogic: '1. 国产替代大背景，核主泵是稀缺资产\n2. 核电重启带来核主泵新增需求\n3. 石化景气复苏，压缩机订单持续增长\n4. 在手订单充裕，业绩可见度高\n5. ROE 持续改善，盈利质量提升',
    risks: '1. 核电审批节奏不及预期\n2. 石化行业资本开支缩减\n3. 应收账款持续增加\n4. 当前估值已偏高，安全边际不足',
    followUp: '□ 下一季度营收增速\n□ 净利润率变化\n□ 在手订单总金额\n□ 核主泵新签合同\n□ 经营活动现金流',
    financialData: [
      { year: '2023', revenue: '82.3亿', netProfit: '8.1亿', grossMargin: '28.5%', operatingCashFlow: '12.3亿' },
      { year: '2024', revenue: '96.7亿', netProfit: '10.2亿', grossMargin: '30.1%', operatingCashFlow: '14.8亿' },
      { year: '2025', revenue: '115.2亿', netProfit: '13.8亿', grossMargin: '31.5%', operatingCashFlow: '18.2亿' },
    ],
    relatedKnowledge: ['k1', 'k2', 'k4'],
    createdAt: '2026-09-01T09:00:00.000Z', updatedAt: '2026-09-19T10:00:00.000Z' },
  { id: 'c2', name: '立昂微', code: '605358', industry: '半导体',
    description: '立昂微主要从事半导体硅片的研发、生产和销售，是国内少数能规模化生产 8 英寸抛光片的企业，在半导体国产替代上游处于核心位置。',
    products: '8 英寸抛光硅片、外延片',
    businessModel: '半导体材料制造商，以长期供货协议向芯片制造商（Fab）供货。产品标准化程度高，规模效应明显，客户认证通过后粘性极强。',
    industryPosition: '国内 8 英寸硅片主要供应商，国产化率提升空间大。',
    competitors: '信越化学、SUMCO（国际）；沪硅产业（国内竞争）',
    whyStudy: '研究半导体材料国产替代机会。硅片是芯片制造最基础的原材料，国产替代逻辑清晰。',
    investmentLogic: '1. 半导体材料国产替代长期逻辑\n2. 8 英寸硅片需求与模拟芯片/功率器件挂钩\n3. 产能持续爬坡，规模效应逐步体现\n4. 客户认证一旦通过，粘性极强',
    risks: '1. 半导体行业周期下行\n2. 国际竞争对手降价打压\n3. 新建产能过剩\n4. 12 英寸硅片认证进度慢',
    followUp: '□ 8 英寸产能利用率\n□ 12 英寸研发进展\n□ 新客户认证情况\n□ ASP 平均销售价格变化',
    financialData: [
      { year: '2023', revenue: '21.5亿', netProfit: '3.2亿', grossMargin: '35.2%', operatingCashFlow: '5.1亿' },
      { year: '2024', revenue: '24.8亿', netProfit: '3.9亿', grossMargin: '36.8%', operatingCashFlow: '6.3亿' },
    ],
    relatedKnowledge: ['k1', 'k2'],
    createdAt: '2026-09-05T09:00:00.000Z', updatedAt: '2026-09-17T14:00:00.000Z' },
  { id: 'c3', name: '长鑫科技', code: '688825', industry: '半导体存储',
    description: '长鑫科技是中国领先的 DRAM 内存芯片设计和制造公司，填补了中国 DRAM 自主研发的空白，具有极强战略意义。',
    products: 'DRAM 内存芯片（DDR4、DDR5、LPDDR5）',
    businessModel: 'IDM 模式（自主设计 + 自主制造），产品主要销往国内手机厂商、PC 厂商及数据中心。',
    industryPosition: '中国唯一能量产 DRAM 的企业，战略地位极为重要。',
    competitors: '三星、SK 海力士、美光（国际三强垄断全球 90% 市场）',
    whyStudy: '作为国内唯一 DRAM 制造商，具有极强的战略意义。想研究其技术追赶进度和国产化替代空间。',
    investmentLogic: '1. 国产 DRAM 替代进口的战略级机会\n2. 国家支持力度大\n3. DRAM 行业景气度回升\n4. AI 服务器带动 HBM 需求爆发',
    risks: '1. 技术代际差距仍大（落后约两代）\n2. 资本开支巨大，持续需要融资\n3. 美国出口管制风险\n4. DRAM 价格周期性大幅波动',
    followUp: '□ 技术节点进展（从 19nm 到 17nm）\n□ 良品率提升情况\n□ HBM 研发进度\n□ 营收增速和毛利率',
    financialData: [],
    relatedKnowledge: ['k1', 'k2'],
    createdAt: '2026-09-10T09:00:00.000Z', updatedAt: '2026-09-16T09:00:00.000Z' },
]

const SF: Fund[] = [
  { id: 'f1', name: '天弘中证人工智能主题ETF联接C', code: '011840', type: '指数型-股票',
    strategy: '被动跟踪中证人工智能主题指数，覆盖 AI 产业链上中下游企业',
    investmentDirection: '人工智能产业链，包括算力芯片、AI 算法、数据服务、AI 应用（机器人、自动驾驶、智能医疗等）',
    holdings: '科大讯飞、寒武纪、中科曙光、海康威视、中国电信（云业务）',
    industryDistribution: '计算机 45%、电子 30%、通信 15%、其他 10%',
    whyRise: '1. AI 应用落地速度超预期\n2. 国内政策大力支持 AI 产业\n3. 海外 AI 龙头带动板块情绪\n4. 机器人、自动驾驶等场景加速落地',
    whyFall: '1. AI 商业化盈利不及预期\n2. 算力泡沫担忧情绪蔓延\n3. 监管收紧（数据安全、算法监管）\n4. 美国技术封锁升级',
    risks: '1. 板块整体估值偏高\n2. 个股集中度较高\n3. AI 技术迭代风险\n4. 成分股业绩兑现风险',
    myReason: '看好中国 AI 产业长期发展，该基金覆盖面广，适合作为 AI 板块的系统性敞口，通过定投摊低成本。',
    myObservation: '每季度关注持仓变化，关注寒武纪等核心持仓的业绩。当板块 PE 超过 60 倍时考虑减仓。',
    relatedKnowledge: ['k1', 'k5'],
    createdAt: '2026-08-01T09:00:00.000Z', updatedAt: '2026-09-14T10:00:00.000Z' },
  { id: 'f2', name: '易方达港股通红利低波联接C', code: '021458', type: '指数型-股票',
    strategy: '跟踪恒生港股通中国内地高股息低波动指数，选取股息率高且波动较低的港股',
    investmentDirection: '港股中高股息、低波动的内地上市公司，偏价值风格，适合稳健型投资者',
    holdings: '中国神华 H、工商银行 H、招商银行 H、中国移动、华润置地',
    industryDistribution: '金融 40%、能源 25%、电信 20%、地产 8%、其他 7%',
    whyRise: '1. 市场避险情绪升温，资金转向防御\n2. 高股息策略溢价上升\n3. 港股整体估值修复\n4. 南向资金持续流入',
    whyFall: '1. 无风险利率上升（10 年期国债收益率）\n2. 港股整体系统性下跌\n3. 内地经济预期恶化\n4. 持仓公司削减分红',
    risks: '1. 人民币 / 港元汇率风险\n2. 港股市场流动性风险\n3. 高股息可持续性不确定\n4. 能源、金融行业政策风险',
    myReason: '作为组合中的稳健底仓，提供持续股息收益，与高成长型持仓形成互补，整体降低组合波动。',
    myObservation: '关注持仓公司年度分红情况，以及指数股息率与 10 年期国债收益率的利差变化。',
    relatedKnowledge: ['k3', 'k5'],
    createdAt: '2026-08-05T09:00:00.000Z', updatedAt: '2026-09-13T11:00:00.000Z' },
]

const SN: Note[] = [
  { id: 'n1', title: '为什么沈鼓最近突然暴涨？', category: '股票',
    content: '**观察**\n\n近期沈鼓集团股价出现明显上涨，在没有明显财报催化剂的情况下，需要分析背后原因。\n\n**可能原因**\n\n1. 核电政策利好 — 国家能源局新批多个沿海核电项目，市场预期核主泵订单将大增\n2. 机构集中加仓 — 北向资金和主动基金集中调仓进入高端装备板块\n3. 石化景气复苏 — 国际油价企稳，下游石化企业资本开支意愿回升\n\n**我的判断**\n\n短期情绪可能存在超涨，但核主泵稀缺资产的逻辑没有变化。如果下季度在手订单继续增加，则基本面能支撑当前股价。\n\n**后续验证**\n\n- 下一季度财报是否有超预期订单\n- 管理层是否有新的订单指引',
    tags: ['沈鼓', '高端装备', '分析'],
    relatedCompany: ['c1'], relatedFund: [], relatedKnowledge: ['k1', 'k2'],
    createdAt: '2026-09-18T10:00:00.000Z', updatedAt: '2026-09-19T09:30:00.000Z' },
  { id: 'n2', title: '长鑫科技 2026 H1 初步分析', category: '股票',
    content: '**公司概况**\n\n长鑫科技是国内唯一能量产 DRAM 的企业，技术节点目前处于 19nm 制程，据报道良品率已提升至 75% 以上。\n\n**我的观察**\n\nDRAM 行业在 2026 年进入上行周期，受益于 AI 服务器对 HBM 需求的爆发，SK 海力士、三星均业绩超预期。长鑫科技能否跟上这波景气周期，取决于 HBM 产品的研发进度。\n\n**存疑点**\n\n- 是否获得了 HBM 封装的技术授权？\n- 国际客户认证进展如何？\n- 何时能盈利？',
    tags: ['长鑫科技', '半导体', 'DRAM'],
    relatedCompany: ['c3'], relatedFund: [], relatedKnowledge: ['k1'],
    createdAt: '2026-09-15T14:00:00.000Z', updatedAt: '2026-09-15T14:00:00.000Z' },
  { id: 'n3', title: '仓位管理：我的规则', category: '学习',
    content: '今天系统梳理了仓位管理的思路。\n\n**我的仓位规则**\n\n- 任何单一标的仓位不超过 20%\n- 高风险板块（科技成长股）总仓位不超过 40%\n- 稳健底仓（高股息 ETF）至少保持 30%\n- 始终保留 10-20% 现金应对机会\n\n**背后的逻辑**\n\n如果某个标的最大回撤是 50%，我持有 20% 仓位，对应组合最大损失是 10%，这是我能接受的范围。一旦超过 10% 的组合损失，我就开始焦虑，影响判断。所以仓位设计本质上是在管理自己的情绪。',
    tags: ['仓位', '风险管理', '规则'],
    relatedCompany: [], relatedFund: [], relatedKnowledge: ['k5', 'k3'],
    createdAt: '2026-09-10T09:00:00.000Z', updatedAt: '2026-09-10T09:00:00.000Z' },
  { id: 'n4', title: '我的第一次股票研究记录', category: '复盘',
    content: '**开始**：2026 年 8 月\n\n**选择沈鼓集团作为第一个研究对象**\n\n选择原因：听朋友提起高端装备国产替代概念，想从一家具体公司出发学习如何分析股票。\n\n**今天的收获**\n\n第一次把财务指标和真实公司对应起来：\n\n- 沈鼓的 PE 约 35 倍 → 和历史区间比并不算高\n- ROE 约 12% → 重资产设备制造的正常水平\n- 经营现金流持续为正 → 业务质量较好，没有"虚增利润"\n\n**感悟**\n\n财务指标只是工具，更重要的是理解公司的商业模式：为什么客户要买他们的产品？为什么竞争对手替代不了他们？想清楚这两个问题，才知道护城河在哪里。',
    tags: ['学习', '复盘', '沈鼓'],
    relatedCompany: ['c1'], relatedFund: [], relatedKnowledge: ['k1', 'k2', 'k4'],
    createdAt: '2026-08-20T09:00:00.000Z', updatedAt: '2026-08-20T09:00:00.000Z' },
]

/* ─── UI Primitives ──────────────────────────────────────────────────────── */

const CATEGORY_COLORS: Record<string, string> = {
  '估值': 'bg-violet-50 text-violet-700',
  '财务': 'bg-blue-50 text-blue-700',
  '基础': 'bg-slate-100 text-slate-600',
  '技术分析': 'bg-amber-50 text-amber-700',
  '行业': 'bg-teal-50 text-teal-700',
  '投资方法': 'bg-emerald-50 text-emerald-700',
  '股票': 'bg-blue-50 text-blue-700',
  '基金': 'bg-violet-50 text-violet-700',
  '学习': 'bg-emerald-50 text-emerald-700',
  '复盘': 'bg-amber-50 text-amber-700',
  '其他': 'bg-slate-100 text-slate-600',
}

function Badge({ label, className = '' }: { label: string; className?: string }) {
  const c = CATEGORY_COLORS[label] || 'bg-slate-100 text-slate-600'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c} ${className}`}>{label}</span>
}

function Tag({ label }: { label: string }) {
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 font-medium">{label}</span>
}

function Btn({ onClick, children, variant = 'primary', size = 'sm', className = '', disabled = false }:
  { onClick?: () => void; children: React.ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md'; className?: string; disabled?: boolean }) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm' }
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'text-red-600 hover:bg-red-50 border border-red-200',
  }
  return <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>{children}</button>
}

function Input({ value, onChange, placeholder = '', className = '' }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${className}`} />
}

function Textarea({ value, onChange, placeholder = '', rows = 4, className = '' }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; className?: string }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
    className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white font-sans leading-relaxed ${className}`} />
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return <select value={value} onChange={e => onChange(e.target.value)}
    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>{children}</div>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
    <span>{title}</span><div className="flex-1 h-px bg-slate-100" /></div>{children}</div>
}

function ContentBlock({ text }: { text: string }) {
  if (!text) return <p className="text-sm text-slate-400 italic">暂无内容</p>
  return <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{text}</p>
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{children}</code>
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors cursor-pointer mb-5">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>返回列表
  </button>
}

function EmptyState({ icon, title, desc, action }: { icon: string; title: string; desc: string; action?: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-4xl mb-4">{icon}</div>
    <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
    <p className="text-sm text-slate-500 mb-5 max-w-xs">{desc}</p>
    {action}
  </div>
}

/* ─── Sidebar ────────────────────────────────────────────────────────────── */

const NAV_ITEMS: { page: Page; icon: string; label: string }[] = [
  { page: 'home', icon: '🏠', label: '首页' },
  { page: 'knowledge', icon: '📚', label: '投资知识' },
  { page: 'companies', icon: '🔬', label: '公司研究' },
  { page: 'funds', icon: '💰', label: '基金研究' },
  { page: 'research', icon: '✦', label: '智能研究' },
  { page: 'notes', icon: '📝', label: '我的笔记' },
]

function Sidebar({ nav, go, counts, session, onSignIn, onSignOut, syncStatus }: { nav: Nav; go: (p: Page) => void; counts: Record<Page, number>; session: Session | null; onSignIn: () => void; onSignOut: () => void; syncStatus: string }) {
  const [sQuery, setSQuery] = useState('')
  return (
    <div className="w-56 shrink-0 h-screen flex flex-col bg-slate-50 border-r border-slate-200">
      <div className="px-4 pt-5 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3h10M2 7h6M2 11h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </div>
          <span className="text-sm font-semibold text-slate-900">投资知识库</span>
        </div>
        <p className="text-xs text-slate-400 ml-8">My Investment KB</p>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ page, icon, label }) => {
          const active = nav.page === page
          return (
            <button key={page} onClick={() => go(page)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors cursor-pointer ${active ? 'bg-white text-slate-900 font-medium shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'}`}>
              <span className="text-base">{icon}</span>
              <span className="flex-1 text-left">{label}</span>
              {page !== 'home' && page !== 'research' && counts[page] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${active ? 'bg-slate-100 text-slate-600' : 'text-slate-400'}`}>{counts[page]}</span>
              )}
            </button>
          )
        })}
        <div className="pt-1 mt-1 border-t border-slate-200">
          <button onClick={() => go('search')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors cursor-pointer ${nav.page === 'search' ? 'bg-white text-slate-900 font-medium shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-white/60 hover:text-slate-900'}`}>
            <span className="text-base">🔍</span><span>搜索</span>
          </button>
        </div>
      </nav>
      <div className="px-3 pb-4 pt-3 border-t border-slate-200">
        {session ? <div className="rounded-lg bg-white border border-slate-200 p-2.5">
          <p className="text-[11px] font-medium text-slate-700 truncate">{session.user.email}</p>
          <div className="mt-1.5 flex items-center justify-between gap-2"><span className="text-[10px] text-emerald-600">● {syncStatus}</span><button onClick={onSignOut} className="text-[10px] text-slate-400 hover:text-slate-700 cursor-pointer">退出</button></div>
        </div> : <button onClick={onSignIn} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 cursor-pointer">登录以开启同步</button>}
      </div>
    </div>
  )
}

/* ─── Page Header ────────────────────────────────────────────────────────── */

function PageHeader({ title, action }: { title: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-7 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}

/* ─── Home Page ──────────────────────────────────────────────────────────── */

function HomePage({ go, knowledge, companies, funds, notes }: {
  go: (p: Page, sub?: Sub, id?: string) => void
  knowledge: Knowledge[]; companies: Company[]; funds: Fund[]; notes: Note[]
}) {
  const recentCompanies = [...companies].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4)
  const recentKnowledge = [...knowledge].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5)
  const recentNotes = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4)

  const stats = [
    { label: '投资知识', count: knowledge.length, page: 'knowledge' as Page, icon: '📚', color: 'bg-blue-50 border-blue-100' },
    { label: '研究公司', count: companies.length, page: 'companies' as Page, icon: '🔬', color: 'bg-violet-50 border-violet-100' },
    { label: '研究基金', count: funds.length, page: 'funds' as Page, icon: '💰', color: 'bg-emerald-50 border-emerald-100' },
    { label: '我的笔记', count: notes.length, page: 'notes' as Page, icon: '📝', color: 'bg-amber-50 border-amber-100' },
  ]

  return (
    <div>
      <PageHeader title="首页" />
      <div className="px-7 py-6 max-w-4xl">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map(s => (
            <button key={s.page} onClick={() => go(s.page)} className={`rounded-xl border p-4 text-left hover:shadow-sm transition-shadow cursor-pointer ${s.color}`}>
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-2xl font-bold text-slate-900 mb-0.5">{s.count}</div>
              <div className="text-xs text-slate-500 font-medium">{s.label}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Recent Companies */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-800">最近研究</h2>
              <button onClick={() => go('companies')} className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer">查看全部</button>
            </div>
            <div className="space-y-2">
              {recentCompanies.length === 0 ? <p className="text-xs text-slate-400">暂无公司</p> : recentCompanies.map(c => (
                <button key={c.id} onClick={() => go('companies', 'detail', c.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all text-left cursor-pointer">
                  <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">{c.name.slice(0, 1)}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{c.name}</div>
                    <div className="text-xs text-slate-400"><Code>{c.code}</Code> · {c.industry}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Knowledge */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-800">最近学习</h2>
              <button onClick={() => go('knowledge')} className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer">查看全部</button>
            </div>
            <div className="space-y-1.5">
              {recentKnowledge.length === 0 ? <p className="text-xs text-slate-400">暂无知识</p> : recentKnowledge.map(k => (
                <button key={k.id} onClick={() => go('knowledge', 'detail', k.id)}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all text-left cursor-pointer">
                  <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">{k.title.slice(0, 2)}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900">{k.title}</div>
                    <div className="text-xs text-slate-400 truncate">{k.summary}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Notes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-800">最近笔记</h2>
              <button onClick={() => go('notes')} className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer">查看全部</button>
            </div>
            <div className="space-y-2">
              {recentNotes.length === 0 ? <p className="text-xs text-slate-400">暂无笔记</p> : recentNotes.map(n => (
                <button key={n.id} onClick={() => go('notes', 'detail', n.id)}
                  className="w-full p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all text-left cursor-pointer">
                  <div className="text-sm font-medium text-slate-900 mb-1 line-clamp-2 leading-snug">{n.title}</div>
                  <div className="flex items-center gap-1.5">
                    <Badge label={n.category} />
                    <span className="text-xs text-slate-400">{fmtDate(n.updatedAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Knowledge Page ─────────────────────────────────────────────────────── */

const K_CATS = ['全部', '基础', '财务', '估值', '技术分析', '行业', '投资方法']

const K_BLANK = (): Omit<Knowledge, 'id' | 'createdAt' | 'updatedAt'> => ({
  title: '', category: '基础', summary: '', content: '', myUnderstanding: '', tags: [], relatedKnowledge: []
})

function KnowledgePage({ nav, go, store, allKnowledge }: {
  nav: Nav; go: (p: Page, sub: Sub, id?: string) => void
  store: ReturnType<typeof useStore<Knowledge>>; allKnowledge: Knowledge[]
}) {
  const [cat, setCat] = useState('全部')
  const [q, setQ] = useState('')
  const [form, setForm] = useState(K_BLANK())
  const [tagsStr, setTagsStr] = useState('')

  const filtered = useMemo(() => {
    let list = store.items
    if (cat !== '全部') list = list.filter(k => k.category === cat)
    if (q) list = list.filter(k => k.title.includes(q) || k.summary.includes(q) || k.content.includes(q))
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [store.items, cat, q])

  const current = nav.id ? store.get(nav.id) : null

  const startEdit = (k: Knowledge) => {
    setForm({ title: k.title, category: k.category, summary: k.summary, content: k.content, myUnderstanding: k.myUnderstanding, tags: k.tags, relatedKnowledge: k.relatedKnowledge })
    setTagsStr(joinTags(k.tags))
    go('knowledge', 'edit', k.id)
  }
  const startNew = () => { setForm(K_BLANK()); setTagsStr(''); go('knowledge', 'new') }
  const save = () => {
    const data = { ...form, tags: parseTags(tagsStr) }
    if (nav.sub === 'new') { store.create(data); go('knowledge', 'list') }
    else if (nav.id) { store.update(nav.id, data); go('knowledge', 'detail', nav.id) }
  }
  const del = (id: string) => { if (confirm('确认删除这条知识？')) { store.remove(id); go('knowledge', 'list') } }
  const toggleRel = (id: string) => setForm(f => ({ ...f, relatedKnowledge: f.relatedKnowledge.includes(id) ? f.relatedKnowledge.filter(x => x !== id) : [...f.relatedKnowledge, id] }))

  if (nav.sub === 'detail' && current) {
    const related = allKnowledge.filter(k => current.relatedKnowledge.includes(k.id))
    return (
      <div>
        <PageHeader title={<span className="flex items-center gap-2">{current.title}<Badge label={current.category} /></span>}
          action={<><Btn variant="secondary" onClick={() => startEdit(current)}>编辑</Btn><Btn variant="danger" onClick={() => del(current.id)}>删除</Btn></>} />
        <div className="px-7 py-5 max-w-2xl space-y-6">
          <BackBtn onClick={() => go('knowledge', 'list')} />
          {current.summary && <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm font-medium text-blue-900">{current.summary}</p>
          </div>}
          <Section title="详细解释"><ContentBlock text={current.content} /></Section>
          <Section title="我的理解"><ContentBlock text={current.myUnderstanding} /></Section>
          {current.tags.length > 0 && <Section title="标签"><div className="flex flex-wrap gap-1.5">{current.tags.map(t => <Tag key={t} label={t} />)}</div></Section>}
          {related.length > 0 && <Section title="相关知识">
            <div className="flex flex-wrap gap-2">{related.map(k => (
              <button key={k.id} onClick={() => go('knowledge', 'detail', k.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all text-sm text-slate-700 cursor-pointer">
                {k.title}<Badge label={k.category} className="ml-1" />
              </button>
            ))}</div>
          </Section>}
          <div className="text-xs text-slate-400">更新于 {fmtDate(current.updatedAt)}</div>
        </div>
      </div>
    )
  }

  if (nav.sub === 'edit' || nav.sub === 'new') {
    return (
      <div>
        <PageHeader title={nav.sub === 'new' ? '新建知识' : `编辑：${form.title}`}
          action={<><Btn onClick={save} disabled={!form.title}>保存</Btn><Btn variant="secondary" onClick={() => go('knowledge', nav.sub === 'new' ? 'list' : 'detail', nav.id)}>取消</Btn></>} />
        <div className="px-7 py-5 max-w-2xl space-y-4">
          <BackBtn onClick={() => go('knowledge', nav.sub === 'new' ? 'list' : 'detail', nav.id)} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="知识名称"><Input value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="例如：PE" /></Field>
            <Field label="分类"><Select value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} options={K_CATS.slice(1)} /></Field>
          </div>
          <Field label="一句话解释"><Input value={form.summary} onChange={v => setForm(f => ({ ...f, summary: v }))} placeholder="简洁描述这个概念" /></Field>
          <Field label="详细内容"><Textarea value={form.content} onChange={v => setForm(f => ({ ...f, content: v }))} rows={6} placeholder="详细解释，支持自由格式书写..." /></Field>
          <Field label="我的理解"><Textarea value={form.myUnderstanding} onChange={v => setForm(f => ({ ...f, myUnderstanding: v }))} rows={4} placeholder="用自己的话写下理解..." /></Field>
          <Field label="标签（逗号分隔）"><Input value={tagsStr} onChange={setTagsStr} placeholder="例如：估值, 基础指标" /></Field>
          <Field label="相关知识">
            <div className="border border-slate-200 rounded-md p-3 space-y-1.5 max-h-40 overflow-y-auto bg-white">
              {allKnowledge.filter(k => k.id !== nav.id).length === 0 ? <p className="text-xs text-slate-400">暂无其他知识</p> :
                allKnowledge.filter(k => k.id !== nav.id).map(k => (
                  <label key={k.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.relatedKnowledge.includes(k.id)} onChange={() => toggleRel(k.id)} className="rounded border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-700">{k.title}</span><Badge label={k.category} />
                  </label>
                ))}
            </div>
          </Field>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="投资知识" action={<Btn onClick={startNew}>+ 新建知识</Btn>} />
      <div className="px-7 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex gap-1">
            {K_CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer ${cat === c ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{c}</button>
            ))}
          </div>
          <div className="ml-auto w-56">
            <Input value={q} onChange={setQ} placeholder="搜索知识…" />
          </div>
        </div>
        {filtered.length === 0 ? <EmptyState icon="📚" title="还没有知识卡片" desc="记录你学到的第一个投资概念吧。" action={<Btn onClick={startNew}>+ 新建知识</Btn>} /> : (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {filtered.map(k => (
              <button key={k.id} onClick={() => go('knowledge', 'detail', k.id)}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all text-left cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-base font-semibold text-slate-900">{k.title}</span>
                  <Badge label={k.category} />
                </div>
                <p className="text-sm text-slate-600 mb-3 line-clamp-2 leading-relaxed">{k.summary}</p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">{k.tags.slice(0, 2).map(t => <Tag key={t} label={t} />)}</div>
                  <span className="text-xs text-slate-400">{fmtDate(k.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Companies Page ─────────────────────────────────────────────────────── */

const C_BLANK = (): Omit<Company, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '', code: '', industry: '', description: '', products: '', businessModel: '',
  industryPosition: '', competitors: '', whyStudy: '', investmentLogic: '', risks: '',
  followUp: '', financialData: [], relatedKnowledge: []
})

const FIN_BLANK = (): FinancialRow => ({ year: '', revenue: '', netProfit: '', grossMargin: '', operatingCashFlow: '' })

function CompaniesPage({ nav, go, store, allKnowledge }: {
  nav: Nav; go: (p: Page, sub: Sub, id?: string) => void
  store: ReturnType<typeof useStore<Company>>; allKnowledge: Knowledge[]
}) {
  const [q, setQ] = useState('')
  const [form, setForm] = useState(C_BLANK())
  const sf = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  const toggleRel = (id: string) => setForm(f => ({ ...f, relatedKnowledge: f.relatedKnowledge.includes(id) ? f.relatedKnowledge.filter(x => x !== id) : [...f.relatedKnowledge, id] }))

  const filtered = useMemo(() => {
    let list = store.items
    if (q) list = list.filter(c => c.name.includes(q) || c.code.includes(q) || c.industry.includes(q))
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [store.items, q])

  const current = nav.id ? store.get(nav.id) : null

  const startEdit = (c: Company) => { setForm({ ...c }); go('companies', 'edit', c.id) }
  const startNew = () => { setForm(C_BLANK()); go('companies', 'new') }
  const save = () => {
    if (nav.sub === 'new') { store.create(form); go('companies', 'list') }
    else if (nav.id) { store.update(nav.id, form); go('companies', 'detail', nav.id) }
  }
  const del = (id: string) => { if (confirm('确认删除这家公司的研究档案？')) { store.remove(id); go('companies', 'list') } }

  const addFinRow = () => setForm(f => ({ ...f, financialData: [...f.financialData, FIN_BLANK()] }))
  const updateFinRow = (i: number, k: keyof FinancialRow, v: string) => setForm(f => ({ ...f, financialData: f.financialData.map((r, idx) => idx === i ? { ...r, [k]: v } : r) }))
  const removeFinRow = (i: number) => setForm(f => ({ ...f, financialData: f.financialData.filter((_, idx) => idx !== i) }))

  if (nav.sub === 'detail' && current) {
    const related = allKnowledge.filter(k => current.relatedKnowledge.includes(k.id))
    return (
      <div>
        <PageHeader title={<span className="flex items-center gap-2">{current.name}<Code>{current.code}</Code><Badge label={current.industry} /></span>}
          action={<><Btn variant="secondary" onClick={() => startEdit(current)}>编辑</Btn><Btn variant="danger" onClick={() => del(current.id)}>删除</Btn></>} />
        <div className="px-7 py-5 max-w-2xl space-y-6">
          <BackBtn onClick={() => go('companies', 'list')} />
          <Section title="公司简介"><ContentBlock text={current.description} /></Section>
          <div className="grid grid-cols-2 gap-6">
            <Section title="核心产品"><ContentBlock text={current.products} /></Section>
            <Section title="行业地位"><ContentBlock text={current.industryPosition} /></Section>
          </div>
          <Section title="商业模式"><ContentBlock text={current.businessModel} /></Section>
          <Section title="主要竞争对手"><ContentBlock text={current.competitors} /></Section>
          {current.financialData.length > 0 && <Section title="财务数据">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 border-b border-slate-200">
                  {['年份', '营收', '净利润', '毛利率', '经营现金流'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {current.financialData.map((r, i) => <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.year}</td>
                    <td className="px-3 py-2 text-slate-700">{r.revenue}</td>
                    <td className="px-3 py-2 text-slate-700">{r.netProfit}</td>
                    <td className="px-3 py-2 text-slate-700">{r.grossMargin}</td>
                    <td className="px-3 py-2 text-slate-700">{r.operatingCashFlow}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </Section>}
          <Section title="为什么研究这家公司"><ContentBlock text={current.whyStudy} /></Section>
          <Section title="我的投资逻辑"><ContentBlock text={current.investmentLogic} /></Section>
          <Section title="主要风险"><ContentBlock text={current.risks} /></Section>
          <Section title="后续观察"><ContentBlock text={current.followUp} /></Section>
          {related.length > 0 && <Section title="相关知识">
            <div className="flex flex-wrap gap-2">{related.map(k => (
              <button key={k.id} onClick={() => go('knowledge', 'detail', k.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-blue-300 transition-all text-sm text-slate-700 cursor-pointer">
                {k.title}<Badge label={k.category} className="ml-1" />
              </button>
            ))}</div>
          </Section>}
          <div className="text-xs text-slate-400">更新于 {fmtDate(current.updatedAt)}</div>
        </div>
      </div>
    )
  }

  if (nav.sub === 'edit' || nav.sub === 'new') {
    return (
      <div>
        <PageHeader title={nav.sub === 'new' ? '新建公司档案' : `编辑：${form.name}`}
          action={<><Btn onClick={save} disabled={!form.name}>保存</Btn><Btn variant="secondary" onClick={() => go('companies', nav.sub === 'new' ? 'list' : 'detail', nav.id)}>取消</Btn></>} />
        <div className="px-7 py-5 max-w-2xl space-y-4">
          <BackBtn onClick={() => go('companies', nav.sub === 'new' ? 'list' : 'detail', nav.id)} />
          <div className="grid grid-cols-3 gap-4">
            <Field label="公司名称" className="col-span-1"><Input value={form.name} onChange={sf('name')} placeholder="例如：沈鼓集团" /></Field>
            <Field label="股票代码"><Input value={form.code} onChange={sf('code')} placeholder="601091" /></Field>
            <Field label="所属行业"><Input value={form.industry} onChange={sf('industry')} placeholder="例如：高端装备" /></Field>
          </div>
          <Field label="公司简介"><Textarea value={form.description} onChange={sf('description')} rows={3} placeholder="公司主营业务简介..." /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="核心产品"><Textarea value={form.products} onChange={sf('products')} rows={2} placeholder="主要产品或服务..." /></Field>
            <Field label="行业地位"><Textarea value={form.industryPosition} onChange={sf('industryPosition')} rows={2} placeholder="市场地位、份额..." /></Field>
          </div>
          <Field label="商业模式"><Textarea value={form.businessModel} onChange={sf('businessModel')} rows={3} placeholder="如何赚钱、客户结构、收入模式..." /></Field>
          <Field label="主要竞争对手"><Input value={form.competitors} onChange={sf('competitors')} placeholder="例如：霍尼韦尔、GE" /></Field>
          <Field label="财务数据">
            <div className="space-y-2">
              {form.financialData.map((r, i) => (
                <div key={i} className="grid grid-cols-6 gap-2 items-center">
                  {(['year', 'revenue', 'netProfit', 'grossMargin', 'operatingCashFlow'] as const).map((k, j) => (
                    <input key={k} value={r[k]} onChange={e => updateFinRow(i, k, e.target.value)}
                      placeholder={['年份', '营收', '净利润', '毛利率', '现金流'][j]}
                      className="px-2 py-1.5 border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                  ))}
                  <button onClick={() => removeFinRow(i)} className="text-red-400 hover:text-red-600 text-sm cursor-pointer px-1">✕</button>
                </div>
              ))}
              <Btn variant="secondary" onClick={addFinRow}>+ 添加年份</Btn>
            </div>
          </Field>
          <Field label="为什么研究这家公司"><Textarea value={form.whyStudy} onChange={sf('whyStudy')} rows={3} /></Field>
          <Field label="我的投资逻辑"><Textarea value={form.investmentLogic} onChange={sf('investmentLogic')} rows={4} placeholder="1. \n2. \n3. " /></Field>
          <Field label="主要风险"><Textarea value={form.risks} onChange={sf('risks')} rows={3} placeholder="1. \n2. " /></Field>
          <Field label="后续需要观察"><Textarea value={form.followUp} onChange={sf('followUp')} rows={3} placeholder="□ \n□ " /></Field>
          <Field label="相关知识">
            <div className="border border-slate-200 rounded-md p-3 space-y-1.5 max-h-40 overflow-y-auto bg-white">
              {allKnowledge.length === 0 ? <p className="text-xs text-slate-400">暂无知识</p> :
                allKnowledge.map(k => (
                  <label key={k.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.relatedKnowledge.includes(k.id)} onChange={() => toggleRel(k.id)} className="rounded border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-700">{k.title}</span><Badge label={k.category} />
                  </label>
                ))}
            </div>
          </Field>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="公司研究" action={<Btn onClick={startNew}>+ 新建公司</Btn>} />
      <div className="px-7 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-56 ml-auto"><Input value={q} onChange={setQ} placeholder="搜索公司…" /></div>
        </div>
        {filtered.length === 0 ? <EmptyState icon="🔬" title="还没有公司研究档案" desc="建立你的第一个公司研究档案吧。" action={<Btn onClick={startNew}>+ 新建公司</Btn>} /> : (
          <div className="space-y-2.5">
            {filtered.map(c => (
              <button key={c.id} onClick={() => go('companies', 'detail', c.id)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all text-left cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-base font-bold text-slate-600 shrink-0">{c.name.slice(0, 1)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-900">{c.name}</span>
                    <Code>{c.code}</Code>
                    <Badge label={c.industry} />
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-1">{c.description}</p>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{fmtDate(c.updatedAt)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Funds Page ─────────────────────────────────────────────────────────── */

const F_BLANK = (): Omit<Fund, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '', code: '', type: '指数型-股票', strategy: '', investmentDirection: '',
  holdings: '', industryDistribution: '', whyRise: '', whyFall: '',
  risks: '', myReason: '', myObservation: '', relatedKnowledge: []
})

const FUND_TYPES = ['指数型-股票', '主动型-股票', '债券型', '混合型', '货币型', '商品型', 'QDII']

function FundsPage({ nav, go, store, allKnowledge }: {
  nav: Nav; go: (p: Page, sub: Sub, id?: string) => void
  store: ReturnType<typeof useStore<Fund>>; allKnowledge: Knowledge[]
}) {
  const [q, setQ] = useState('')
  const [form, setForm] = useState(F_BLANK())
  const sf = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  const toggleRel = (id: string) => setForm(f => ({ ...f, relatedKnowledge: f.relatedKnowledge.includes(id) ? f.relatedKnowledge.filter(x => x !== id) : [...f.relatedKnowledge, id] }))

  const filtered = useMemo(() => {
    let list = store.items
    if (q) list = list.filter(f => f.name.includes(q) || f.code.includes(q))
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [store.items, q])

  const current = nav.id ? store.get(nav.id) : null

  const startEdit = (f: Fund) => { setForm({ ...f }); go('funds', 'edit', f.id) }
  const startNew = () => { setForm(F_BLANK()); go('funds', 'new') }
  const save = () => {
    if (nav.sub === 'new') { store.create(form); go('funds', 'list') }
    else if (nav.id) { store.update(nav.id, form); go('funds', 'detail', nav.id) }
  }
  const del = (id: string) => { if (confirm('确认删除这个基金的研究档案？')) { store.remove(id); go('funds', 'list') } }

  if (nav.sub === 'detail' && current) {
    const related = allKnowledge.filter(k => current.relatedKnowledge.includes(k.id))
    return (
      <div>
        <PageHeader title={<span className="flex items-center gap-2 flex-wrap">{current.name}<Code>{current.code}</Code><Badge label={current.type} /></span>}
          action={<><Btn variant="secondary" onClick={() => startEdit(current)}>编辑</Btn><Btn variant="danger" onClick={() => del(current.id)}>删除</Btn></>} />
        <div className="px-7 py-5 max-w-2xl space-y-6">
          <BackBtn onClick={() => go('funds', 'list')} />
          <Section title="投资策略"><ContentBlock text={current.strategy} /></Section>
          <Section title="投资方向"><ContentBlock text={current.investmentDirection} /></Section>
          <div className="grid grid-cols-2 gap-6">
            <Section title="主要持仓"><ContentBlock text={current.holdings} /></Section>
            <Section title="行业分布"><ContentBlock text={current.industryDistribution} /></Section>
          </div>
          <Section title="为什么上涨？"><ContentBlock text={current.whyRise} /></Section>
          <Section title="为什么下跌？"><ContentBlock text={current.whyFall} /></Section>
          <Section title="主要风险"><ContentBlock text={current.risks} /></Section>
          <Section title="我的持有理由"><ContentBlock text={current.myReason} /></Section>
          <Section title="我的观察"><ContentBlock text={current.myObservation} /></Section>
          {related.length > 0 && <Section title="相关知识">
            <div className="flex flex-wrap gap-2">{related.map(k => (
              <button key={k.id} onClick={() => go('knowledge', 'detail', k.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-blue-300 transition-all text-sm text-slate-700 cursor-pointer">
                {k.title}<Badge label={k.category} className="ml-1" />
              </button>
            ))}</div>
          </Section>}
          <div className="text-xs text-slate-400">更新于 {fmtDate(current.updatedAt)}</div>
        </div>
      </div>
    )
  }

  if (nav.sub === 'edit' || nav.sub === 'new') {
    return (
      <div>
        <PageHeader title={nav.sub === 'new' ? '新建基金档案' : `编辑：${form.name}`}
          action={<><Btn onClick={save} disabled={!form.name}>保存</Btn><Btn variant="secondary" onClick={() => go('funds', nav.sub === 'new' ? 'list' : 'detail', nav.id)}>取消</Btn></>} />
        <div className="px-7 py-5 max-w-2xl space-y-4">
          <BackBtn onClick={() => go('funds', nav.sub === 'new' ? 'list' : 'detail', nav.id)} />
          <div className="grid grid-cols-3 gap-4">
            <Field label="基金名称" className="col-span-2"><Input value={form.name} onChange={sf('name')} placeholder="例如：天弘中证人工智能主题ETF联接C" /></Field>
            <Field label="基金代码"><Input value={form.code} onChange={sf('code')} placeholder="011840" /></Field>
          </div>
          <Field label="基金类型"><Select value={form.type} onChange={sf('type')} options={FUND_TYPES} /></Field>
          <Field label="投资策略"><Textarea value={form.strategy} onChange={sf('strategy')} rows={2} placeholder="跟踪的指数或主动管理策略..." /></Field>
          <Field label="投资方向"><Textarea value={form.investmentDirection} onChange={sf('investmentDirection')} rows={2} placeholder="投资于哪些行业和类型的公司..." /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="主要持仓"><Textarea value={form.holdings} onChange={sf('holdings')} rows={3} placeholder="前几大持仓..." /></Field>
            <Field label="行业分布"><Textarea value={form.industryDistribution} onChange={sf('industryDistribution')} rows={3} placeholder="各行业占比..." /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="为什么上涨？"><Textarea value={form.whyRise} onChange={sf('whyRise')} rows={4} placeholder="1. \n2. " /></Field>
            <Field label="为什么下跌？"><Textarea value={form.whyFall} onChange={sf('whyFall')} rows={4} placeholder="1. \n2. " /></Field>
          </div>
          <Field label="主要风险"><Textarea value={form.risks} onChange={sf('risks')} rows={3} placeholder="1. \n2. " /></Field>
          <Field label="我的持有理由"><Textarea value={form.myReason} onChange={sf('myReason')} rows={3} /></Field>
          <Field label="我的观察"><Textarea value={form.myObservation} onChange={sf('myObservation')} rows={3} /></Field>
          <Field label="相关知识">
            <div className="border border-slate-200 rounded-md p-3 space-y-1.5 max-h-40 overflow-y-auto bg-white">
              {allKnowledge.length === 0 ? <p className="text-xs text-slate-400">暂无知识</p> :
                allKnowledge.map(k => (
                  <label key={k.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.relatedKnowledge.includes(k.id)} onChange={() => toggleRel(k.id)} className="rounded border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-700">{k.title}</span><Badge label={k.category} />
                  </label>
                ))}
            </div>
          </Field>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="基金研究" action={<Btn onClick={startNew}>+ 新建基金</Btn>} />
      <div className="px-7 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-56 ml-auto"><Input value={q} onChange={setQ} placeholder="搜索基金…" /></div>
        </div>
        {filtered.length === 0 ? <EmptyState icon="💰" title="还没有基金研究档案" desc="记录你持有或研究的第一只基金吧。" action={<Btn onClick={startNew}>+ 新建基金</Btn>} /> : (
          <div className="space-y-2.5">
            {filtered.map(f => (
              <button key={f.id} onClick={() => go('funds', 'detail', f.id)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all text-left cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-slate-900">{f.name}</span>
                    <Code>{f.code}</Code>
                    <Badge label={f.type} />
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-1">{f.strategy}</p>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{fmtDate(f.updatedAt)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Notes Page ─────────────────────────────────────────────────────────── */

const N_CATS = ['全部', '学习', '股票', '基金', '复盘', '其他']

const N_BLANK = (): Omit<Note, 'id' | 'createdAt' | 'updatedAt'> => ({
  title: '', category: '学习', content: '', tags: [], relatedCompany: [], relatedFund: [], relatedKnowledge: []
})

function NotesPage({ nav, go, store, allCompanies, allFunds, allKnowledge }: {
  nav: Nav; go: (p: Page, sub: Sub, id?: string) => void
  store: ReturnType<typeof useStore<Note>>; allCompanies: Company[]; allFunds: Fund[]; allKnowledge: Knowledge[]
}) {
  const [cat, setCat] = useState('全部')
  const [q, setQ] = useState('')
  const [form, setForm] = useState(N_BLANK())
  const [tagsStr, setTagsStr] = useState('')
  const sf = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  const toggleC = (id: string) => setForm(f => ({ ...f, relatedCompany: f.relatedCompany.includes(id) ? f.relatedCompany.filter(x => x !== id) : [...f.relatedCompany, id] }))
  const toggleF = (id: string) => setForm(f => ({ ...f, relatedFund: f.relatedFund.includes(id) ? f.relatedFund.filter(x => x !== id) : [...f.relatedFund, id] }))
  const toggleK = (id: string) => setForm(f => ({ ...f, relatedKnowledge: f.relatedKnowledge.includes(id) ? f.relatedKnowledge.filter(x => x !== id) : [...f.relatedKnowledge, id] }))

  const filtered = useMemo(() => {
    let list = store.items
    if (cat !== '全部') list = list.filter(n => n.category === cat)
    if (q) list = list.filter(n => n.title.includes(q) || n.content.includes(q))
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [store.items, cat, q])

  const current = nav.id ? store.get(nav.id) : null

  const startEdit = (n: Note) => {
    setForm({ ...n }); setTagsStr(joinTags(n.tags)); go('notes', 'edit', n.id)
  }
  const startNew = () => { setForm(N_BLANK()); setTagsStr(''); go('notes', 'new') }
  const save = () => {
    const data = { ...form, tags: parseTags(tagsStr) }
    if (nav.sub === 'new') { store.create(data); go('notes', 'list') }
    else if (nav.id) { store.update(nav.id, data); go('notes', 'detail', nav.id) }
  }
  const del = (id: string) => { if (confirm('确认删除这篇笔记？')) { store.remove(id); go('notes', 'list') } }

  if (nav.sub === 'detail' && current) {
    const relC = allCompanies.filter(c => current.relatedCompany.includes(c.id))
    const relF = allFunds.filter(f => current.relatedFund.includes(f.id))
    const relK = allKnowledge.filter(k => current.relatedKnowledge.includes(k.id))
    return (
      <div>
        <PageHeader title={current.title}
          action={<><Btn variant="secondary" onClick={() => startEdit(current)}>编辑</Btn><Btn variant="danger" onClick={() => del(current.id)}>删除</Btn></>} />
        <div className="px-7 py-5 max-w-2xl space-y-5">
          <BackBtn onClick={() => go('notes', 'list')} />
          <div className="flex items-center gap-2 flex-wrap">
            <Badge label={current.category} />
            <span className="text-xs text-slate-400">{fmtDate(current.createdAt)}</span>
            {current.tags.map(t => <Tag key={t} label={t} />)}
          </div>
          <div className="prose prose-sm max-w-none">
            <ContentBlock text={current.content} />
          </div>
          {(relC.length > 0 || relF.length > 0 || relK.length > 0) && (
            <Section title="关联内容">
              <div className="space-y-2">
                {relC.length > 0 && <div className="flex flex-wrap gap-2">{relC.map(c => (
                  <button key={c.id} onClick={() => go('companies', 'detail', c.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all text-sm text-slate-700 cursor-pointer">
                    🔬 {c.name}<Code>{c.code}</Code>
                  </button>
                ))}</div>}
                {relF.length > 0 && <div className="flex flex-wrap gap-2">{relF.map(f => (
                  <button key={f.id} onClick={() => go('funds', 'detail', f.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all text-sm text-slate-700 cursor-pointer">
                    💰 {f.name}
                  </button>
                ))}</div>}
                {relK.length > 0 && <div className="flex flex-wrap gap-2">{relK.map(k => (
                  <button key={k.id} onClick={() => go('knowledge', 'detail', k.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-blue-300 transition-all text-sm text-slate-700 cursor-pointer">
                    📚 {k.title}<Badge label={k.category} className="ml-1" />
                  </button>
                ))}</div>}
              </div>
            </Section>
          )}
        </div>
      </div>
    )
  }

  if (nav.sub === 'edit' || nav.sub === 'new') {
    return (
      <div>
        <PageHeader title={nav.sub === 'new' ? '新建笔记' : `编辑：${form.title}`}
          action={<><Btn onClick={save} disabled={!form.title}>保存</Btn><Btn variant="secondary" onClick={() => go('notes', nav.sub === 'new' ? 'list' : 'detail', nav.id)}>取消</Btn></>} />
        <div className="px-7 py-5 max-w-2xl space-y-4">
          <BackBtn onClick={() => go('notes', nav.sub === 'new' ? 'list' : 'detail', nav.id)} />
          <Field label="标题"><Input value={form.title} onChange={sf('title')} placeholder="笔记标题..." /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="分类"><Select value={form.category} onChange={sf('category')} options={N_CATS.slice(1)} /></Field>
            <Field label="标签（逗号分隔）"><Input value={tagsStr} onChange={setTagsStr} placeholder="例如：沈鼓, 分析" /></Field>
          </div>
          <Field label="内容"><Textarea value={form.content} onChange={sf('content')} rows={12} placeholder="记录你的思考和分析..." /></Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="关联公司">
              <div className="border border-slate-200 rounded-md p-2.5 space-y-1.5 max-h-32 overflow-y-auto bg-white">
                {allCompanies.length === 0 ? <p className="text-xs text-slate-400">暂无公司</p> : allCompanies.map(c => (
                  <label key={c.id} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={form.relatedCompany.includes(c.id)} onChange={() => toggleC(c.id)} className="rounded border-slate-300 text-blue-600" />
                    <span className="text-xs text-slate-700 truncate">{c.name}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="关联基金">
              <div className="border border-slate-200 rounded-md p-2.5 space-y-1.5 max-h-32 overflow-y-auto bg-white">
                {allFunds.length === 0 ? <p className="text-xs text-slate-400">暂无基金</p> : allFunds.map(f => (
                  <label key={f.id} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={form.relatedFund.includes(f.id)} onChange={() => toggleF(f.id)} className="rounded border-slate-300 text-blue-600" />
                    <span className="text-xs text-slate-700 truncate">{f.name.slice(0, 12)}…</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="关联知识">
              <div className="border border-slate-200 rounded-md p-2.5 space-y-1.5 max-h-32 overflow-y-auto bg-white">
                {allKnowledge.length === 0 ? <p className="text-xs text-slate-400">暂无知识</p> : allKnowledge.map(k => (
                  <label key={k.id} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={form.relatedKnowledge.includes(k.id)} onChange={() => toggleK(k.id)} className="rounded border-slate-300 text-blue-600" />
                    <span className="text-xs text-slate-700">{k.title}</span>
                  </label>
                ))}
              </div>
            </Field>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="我的笔记" action={<Btn onClick={startNew}>+ 新建笔记</Btn>} />
      <div className="px-7 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex gap-1">
            {N_CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer ${cat === c ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{c}</button>
            ))}
          </div>
          <div className="ml-auto w-56"><Input value={q} onChange={setQ} placeholder="搜索笔记…" /></div>
        </div>
        {filtered.length === 0 ? <EmptyState icon="📝" title="还没有笔记" desc="记录你的第一篇投资思考吧。" action={<Btn onClick={startNew}>+ 新建笔记</Btn>} /> : (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {filtered.map(n => (
              <button key={n.id} onClick={() => go('notes', 'detail', n.id)}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all text-left cursor-pointer">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug flex-1">{n.title}</h3>
                  <Badge label={n.category} className="shrink-0 mt-0.5" />
                </div>
                <p className="text-xs text-slate-500 mb-3 line-clamp-3 leading-relaxed">{n.content.replace(/[#*_]/g, '').slice(0, 120)}</p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">{n.tags.slice(0, 2).map(t => <Tag key={t} label={t} />)}</div>
                  <span className="text-xs text-slate-400">{fmtDate(n.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Search Page ────────────────────────────────────────────────────────── */

function SearchPage({ go, knowledge, companies, funds, notes }: {
  go: (p: Page, sub: Sub, id?: string) => void
  knowledge: Knowledge[]; companies: Company[]; funds: Fund[]; notes: Note[]
}) {
  const [q, setQ] = useState('')

  const results = useMemo(() => {
    if (!q.trim()) return null
    const s = q.toLowerCase()
    return {
      knowledge: knowledge.filter(k => k.title.toLowerCase().includes(s) || k.summary.toLowerCase().includes(s) || k.content.toLowerCase().includes(s) || k.tags.some(t => t.toLowerCase().includes(s))),
      companies: companies.filter(c => c.name.includes(q) || c.code.includes(q) || c.industry.includes(q) || c.description.includes(q)),
      funds: funds.filter(f => f.name.includes(q) || f.code.includes(q) || f.strategy.includes(q)),
      notes: notes.filter(n => n.title.includes(q) || n.content.includes(q) || n.tags.some(t => t.includes(q))),
    }
  }, [q, knowledge, companies, funds, notes])

  const total = results ? results.knowledge.length + results.companies.length + results.funds.length + results.notes.length : 0

  return (
    <div>
      <PageHeader title="搜索" />
      <div className="px-7 py-6 max-w-2xl">
        <div className="relative mb-6">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 16 16" fill="none">
            <path d="M6.5 11a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="搜索知识、公司、基金、笔记..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white" />
        </div>

        {!q.trim() && (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-sm text-slate-500">在你的投资知识库中搜索</p>
            <p className="text-xs text-slate-400 mt-1">知识 · 公司 · 基金 · 笔记</p>
          </div>
        )}

        {results && total === 0 && (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">🤔</div>
            <p className="text-sm text-slate-700 font-medium">没有找到 "{q}"</p>
            <p className="text-xs text-slate-400 mt-1">试试其他关键词</p>
          </div>
        )}

        {results && total > 0 && (
          <div className="space-y-6">
            <p className="text-xs text-slate-500">找到 {total} 条结果</p>

            {results.knowledge.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">投资知识 ({results.knowledge.length})</h3>
                <div className="space-y-1.5">
                  {results.knowledge.map(k => (
                    <button key={k.id} onClick={() => go('knowledge', 'detail', k.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all text-left cursor-pointer">
                      <span className="text-base">📚</span>
                      <div className="flex-1 min-w-0"><span className="text-sm font-medium text-slate-900">{k.title}</span>
                        <span className="text-xs text-slate-500 ml-2">{k.summary}</span></div>
                      <Badge label={k.category} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.companies.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">公司研究 ({results.companies.length})</h3>
                <div className="space-y-1.5">
                  {results.companies.map(c => (
                    <button key={c.id} onClick={() => go('companies', 'detail', c.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all text-left cursor-pointer">
                      <span className="text-base">🔬</span>
                      <span className="text-sm font-medium text-slate-900">{c.name}</span>
                      <Code>{c.code}</Code>
                      <Badge label={c.industry} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.funds.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">基金研究 ({results.funds.length})</h3>
                <div className="space-y-1.5">
                  {results.funds.map(f => (
                    <button key={f.id} onClick={() => go('funds', 'detail', f.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all text-left cursor-pointer">
                      <span className="text-base">💰</span>
                      <span className="text-sm font-medium text-slate-900 flex-1 truncate">{f.name}</span>
                      <Code>{f.code}</Code>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.notes.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">我的笔记 ({results.notes.length})</h3>
                <div className="space-y-1.5">
                  {results.notes.map(n => (
                    <button key={n.id} onClick={() => go('notes', 'detail', n.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all text-left cursor-pointer">
                      <span className="text-base">📝</span>
                      <span className="text-sm font-medium text-slate-900 flex-1 truncate">{n.title}</span>
                      <Badge label={n.category} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SignInDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [retryAt, setRetryAt] = useState(() => Number(localStorage.getItem('ikb_login_retry_at') || 0))
  const coolingDown = retryAt > Date.now()
  const sendLink = async () => {
    if (!email.trim() || coolingDown) return
    setState('sending'); setErrorMessage('')
    const redirectTo = `${window.location.origin}${window.location.pathname}`
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
    const nextRetryAt = Date.now() + 60_000
    setRetryAt(nextRetryAt); localStorage.setItem('ikb_login_retry_at', String(nextRetryAt))
    if (error) {
      setErrorMessage(error.message.includes('rate limit') ? '邮件发送频率已达上限。请等待一段时间后仅使用最新邮件中的链接登录。' : error.message)
      setState('error')
    } else setState('sent')
  }
  return <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-[1px]">
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"><button onClick={onClose} className="float-right text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">Private workspace</p><h2 className="mt-2 text-xl font-semibold text-slate-950">登录并同步你的研究</h2><p className="mt-2 text-sm leading-6 text-slate-500">我们会发送一封一次性登录链接。你的研究记录会按账户隔离保存。</p>
      <input autoFocus value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendLink()} placeholder="you@example.com" className="mt-5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
      <button onClick={sendLink} disabled={state === 'sending' || !email.trim() || coolingDown} className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 cursor-pointer">{state === 'sending' ? '正在发送…' : coolingDown ? '请稍后再试' : '发送登录链接'}</button>
      {state === 'sent' && <p className="mt-3 text-sm text-emerald-700">链接已发送。请只打开最新一封邮件中的链接，并在同一浏览器完成登录。</p>}{state === 'error' && <p className="mt-3 text-sm text-red-700">发送失败：{errorMessage}</p>}
    </div>
  </div>
}

/* ─── App ────────────────────────────────────────────────────────────────── */

export default function App() {
  const kStore = useStore<Knowledge>('ikb_knowledge', SK)
  const cStore = useStore<Company>('ikb_companies', SC)
  const fStore = useStore<Fund>('ikb_funds', SF)
  const nStore = useStore<Note>('ikb_notes', SN)

  const [nav, setNav] = useState<Nav>({ page: 'home', sub: 'list' })
  const [session, setSession] = useState<Session | null>(null)
  const [showSignIn, setShowSignIn] = useState(false)
  const [syncStatus, setSyncStatus] = useState('仅本机')
  const [cloudReady, setCloudReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setCloudReady(false); setSyncStatus('仅本机'); return }
    let active = true
    setSyncStatus('正在同步…')
    serverRequest<{ workspace: { knowledge?: Knowledge[]; companies?: Company[]; funds?: Fund[]; notes?: Note[] } | null }>('/workspace', session.access_token)
      .then(({ workspace }) => {
        if (!active) return
        if (workspace) {
          if (workspace.knowledge) kStore.replace(workspace.knowledge)
          if (workspace.companies) cStore.replace(workspace.companies)
          if (workspace.funds) fStore.replace(workspace.funds)
          if (workspace.notes) nStore.replace(workspace.notes)
        }
        setCloudReady(true); setSyncStatus('云端已同步')
      })
      .catch(() => { if (active) setSyncStatus('同步稍后重试') })
    return () => { active = false }
  }, [session?.user.id])

  useEffect(() => {
    if (!session || !cloudReady) return
    setSyncStatus('正在保存…')
    const timer = window.setTimeout(() => {
      serverRequest('/workspace', session.access_token, { method: 'PUT', body: JSON.stringify({ knowledge: kStore.items, companies: cStore.items, funds: fStore.items, notes: nStore.items }) })
        .then(() => setSyncStatus('云端已同步')).catch(() => setSyncStatus('同步稍后重试'))
    }, 700)
    return () => window.clearTimeout(timer)
  }, [session, cloudReady, kStore.items, cStore.items, fStore.items, nStore.items])

  const go = (page: Page, sub: Sub = 'list', id?: string) => setNav({ page, sub, id })
  const goPage = (page: Page) => go(page, 'list')

  const counts: Record<Page, number> = {
    home: 0, knowledge: kStore.items.length, companies: cStore.items.length,
    funds: fStore.items.length, notes: nStore.items.length, search: 0, research: 0,
  }

  const saveReport = (report: ResearchReport) => {
    const block = (title: string, values?: string[]) => values?.length ? `**${title}**\n${values.map(value => `- ${value}`).join('\n')}` : ''
    nStore.create({ title: `${String(report.asset.name || report.query)} · AI 研究报告`, category: report.kind === 'stock' ? '股票' : '基金', content: [block('已核实事实', report.analysis.fact_summary), block('AI 推断（需独立判断）', report.analysis.ai_inferences), block('风险与待验证项', report.analysis.risks_to_verify), `数据来源：${report.sources.map(source => `${source.provider}/${source.endpoint}`).join('；')}\n更新时间：${new Date(report.fetchedAt).toLocaleString('zh-CN')}\n\n${report.disclaimer}`].filter(Boolean).join('\n\n'), tags: ['AI研究', report.kind === 'stock' ? 'A股' : '基金'], relatedCompany: [], relatedFund: [], relatedKnowledge: [] })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-900">
      <Sidebar nav={nav} go={goPage} counts={counts} session={session} onSignIn={() => setShowSignIn(true)} onSignOut={() => supabase.auth.signOut()} syncStatus={syncStatus} />
      <main className="flex-1 overflow-y-auto">
        {nav.page === 'home' && <HomePage go={go} knowledge={kStore.items} companies={cStore.items} funds={fStore.items} notes={nStore.items} />}
        {nav.page === 'knowledge' && <KnowledgePage nav={nav} go={go} store={kStore} allKnowledge={kStore.items} />}
        {nav.page === 'companies' && <CompaniesPage nav={nav} go={go} store={cStore} allKnowledge={kStore.items} />}
        {nav.page === 'funds' && <FundsPage nav={nav} go={go} store={fStore} allKnowledge={kStore.items} />}
        {nav.page === 'research' && <ResearchPage session={session} onSignIn={() => setShowSignIn(true)} onSave={saveReport} />}
        {nav.page === 'notes' && <NotesPage nav={nav} go={go} store={nStore} allCompanies={cStore.items} allFunds={fStore.items} allKnowledge={kStore.items} />}
        {nav.page === 'search' && <SearchPage go={go} knowledge={kStore.items} companies={cStore.items} funds={fStore.items} notes={nStore.items} />}
      </main>
      {showSignIn && <SignInDialog onClose={() => setShowSignIn(false)} />}
    </div>
  )
}
